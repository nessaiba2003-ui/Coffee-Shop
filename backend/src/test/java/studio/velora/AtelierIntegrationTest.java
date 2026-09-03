package studio.velora;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "server.servlet.session.cookie.secure=false"
    })
@AutoConfigureMockMvc
class AtelierIntegrationTest {
  @Test
  void analyticsAndImmediateRoleRevocation() throws Exception {
    coffee.database().update("UPDATE users SET role='ADMIN' WHERE id=?", customer);
    String id =
        coffee
            .order(customer, recipe().get("id").toString(), null, CoffeeService.id())
            .get("id")
            .toString();
    for (int i = 0; i < 11; i++) coffee.advance(id, barista, false);
    mvc.perform(get("/api/admin/analytics").with(user(email).roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.daily").isArray())
        .andExpect(jsonPath("$.completed").isNumber());
    coffee.database().update("UPDATE users SET role='CUSTOMER' WHERE id=?", customer);
    mvc.perform(get("/api/admin/analytics").with(user(email).roles("ADMIN")))
        .andExpect(status().isForbidden());
    coffee.database().update("UPDATE users SET active=FALSE WHERE id=?", customer);
    mvc.perform(get("/api/passport").with(user(email))).andExpect(status().isUnauthorized());
  }

  @Autowired CoffeeService coffee;
  @Autowired MockMvc mvc;
  @Autowired PasswordEncoder passwords;
  @Autowired RecommendationProvider architect;
  String customer, barista;
  String email;

  @BeforeEach
  void setup() {
    customer = CoffeeService.id();
    barista = CoffeeService.id();
    email = customer + "@example.test";
    coffee
        .database()
        .update(
            "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,?)",
            customer,
            email,
            passwords.encode("test-only-password"),
            "Test creator",
            "CUSTOMER");
    coffee
        .database()
        .update(
            "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,?)",
            barista,
            barista + "@example.test",
            passwords.encode("test-only-password"),
            "Test barista",
            "BARISTA");
  }

  Map<String, Object> config() {
    return new LinkedHashMap<>(Map.of("base", "espresso", "origin", "ethiopia", "milk", "oat"));
  }

  Map<String, Object> recipe() {
    return coffee.save(customer, "The integration ritual", config());
  }

  @Test
  void serverComputesPriceAndRejectsInvalidBounds() {
    var cfg = config();
    cfg.put("price", 1);
    var q = coffee.quote(cfg, true);
    assertThat(q.price()).isEqualTo(380);
    cfg.put("shots", 99);
    assertThatThrownBy(() -> coffee.quote(cfg, true)).hasMessageContaining("Invalid shots");
    cfg.put("shots", 0);
    cfg.put("milk", "espresso");
    assertThatThrownBy(() -> coffee.quote(cfg, true)).hasMessageContaining("404");
  }

  @Test
  void inventoryIsReservedThenDeductedExactlyOnce() {
    int stock =
        ((Number) coffee.one("SELECT stock FROM ingredients WHERE id='oat'").get("stock"))
            .intValue();
    var r = recipe();
    String key = CoffeeService.id();
    var o = coffee.order(customer, r.get("id").toString(), null, key);
    assertThat(coffee.order(customer, r.get("id").toString(), null, key).get("id"))
        .isEqualTo(o.get("id"));
    assertThat(coffee.one("SELECT stock FROM ingredients WHERE id='oat'").get("stock"))
        .isEqualTo(stock);
    String id = o.get("id").toString();
    for (int i = 0; i < 11; i++) o = coffee.advance(id, barista, false);
    assertThat(o.get("status")).isEqualTo("Completed");
    assertThat(coffee.one("SELECT stock FROM ingredients WHERE id='oat'").get("stock"))
        .isEqualTo(stock - 1);
    assertThatThrownBy(() -> coffee.advance(id, barista, false))
        .hasMessageContaining("already closed");
    assertThat(coffee.passport(customer).get("completed")).isEqualTo(1L);
  }

  @Test
  void cancellationReleasesReservations() {
    var before = coffee.one("SELECT stock,reserved FROM ingredients WHERE id='oat'");
    var o = coffee.order(customer, recipe().get("id").toString(), null, CoffeeService.id());
    coffee.advance(o.get("id").toString(), barista, true);
    assertThat(coffee.one("SELECT stock,reserved FROM ingredients WHERE id='oat'"))
        .containsAllEntriesOf(before);
  }

  @Test
  void concurrentRetriesCreateOnlyOneOrder() throws Exception {
    String recipe = recipe().get("id").toString(), key = CoffeeService.id();
    var pool = Executors.newFixedThreadPool(2);
    try {
      Callable<Object> task = () -> coffee.order(customer, recipe, null, key).get("id");
      var results = pool.invokeAll(List.of(task, task));
      assertThat(results.get(0).get()).isEqualTo(results.get(1).get());
      assertThat(
              coffee
                  .database()
                  .queryForObject(
                      "SELECT COUNT(*) FROM orders WHERE owner_id=?", Integer.class, customer))
          .isEqualTo(1);
    } finally {
      pool.shutdown();
    }
  }

  @Test
  void shortageRollsBackAllReservations() {
    coffee
        .database()
        .update(
            "INSERT INTO ingredients(id,category,name,price,calories,stock)"
                + " VALUES('test-empty','milk','Empty milk',10,10,0)");
    var cfg = config();
    cfg.put("milk", "test-empty");
    var r = coffee.save(customer, "Unavailable", cfg);
    int reserved =
        coffee
            .database()
            .queryForObject("SELECT reserved FROM ingredients WHERE id='espresso'", Integer.class);
    assertThatThrownBy(
            () -> coffee.order(customer, r.get("id").toString(), null, CoffeeService.id()))
        .hasMessageContaining("sold out");
    assertThat(
            coffee
                .database()
                .queryForObject(
                    "SELECT reserved FROM ingredients WHERE id='espresso'", Integer.class))
        .isEqualTo(reserved);
  }

  @Test
  void ownershipAndRoleBoundariesAreEnforced() throws Exception {
    var o = coffee.order(customer, recipe().get("id").toString(), null, CoffeeService.id());
    mvc.perform(get("/api/orders/" + o.get("id"))).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/users").with(user(email).roles("CUSTOMER")))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/staff/orders/" + o.get("id") + "/advance")
                .with(user(email).roles("CUSTOMER"))
                .with(csrf()))
        .andExpect(status().isForbidden());
    var stranger = Map.<String, Object>of("id", CoffeeService.id(), "role", "CUSTOMER");
    assertThatThrownBy(() -> coffee.authorize(o, stranger))
        .hasMessageContaining("belongs to another");
  }

  @Test
  void csrfAndRegistrationValidationAreEnforced() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(
                    "{\"email\":\"x@example.test\",\"password\":\"valid-password\",\"name\":\"Test\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType("application/json")
                .content("{\"email\":\"bad\",\"password\":\"short\",\"name\":\"Test\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void publicSharingIsOptInAndRevocable() throws Exception {
    var recipe = recipe();
    String id = recipe.get("id").toString();
    mvc.perform(get("/api/cards/" + id)).andExpect(status().isNotFound());
    var result =
        mvc.perform(post("/api/recipes/" + id + "/share").with(user(email)).with(csrf()))
            .andExpect(status().isOk())
            .andReturn();
    String token = coffee.read(result.getResponse().getContentAsString()).get("token").toString();
    mvc.perform(get("/api/cards/" + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.owner_id").doesNotExist())
        .andExpect(jsonPath("$.name").value("The integration ritual"));
    mvc.perform(delete("/api/recipes/" + id + "/share").with(user(email)).with(csrf()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/cards/" + token)).andExpect(status().isNotFound());
  }

  @Test
  void recommendationUnderstandsRequestAndRespectsAvailability() {
    var result =
        architect.recommend("creamy, not too sweet, cold and energetic", "Creative", config());
    var cfg = coffee.read(coffee.write(result.get("config")));
    assertThat(cfg)
        .containsEntry("sweetness", 15)
        .containsEntry("temperature", 10)
        .containsEntry("shots", 2)
        .containsEntry("milk", "oat");
  }

  @Test
  void tableTokensAreValidated() {
    var r = recipe();
    assertThatThrownBy(
            () ->
                coffee.order(customer, r.get("id").toString(), "guessed-table", CoffeeService.id()))
        .hasMessageContaining("404");
    String token =
        coffee
            .database()
            .queryForList("SELECT token FROM cafe_tables")
            .get(0)
            .get("token")
            .toString();
    assertThat(
            coffee
                .order(customer, r.get("id").toString(), token, CoffeeService.id())
                .get("table_label"))
        .isNotNull();
  }
}
