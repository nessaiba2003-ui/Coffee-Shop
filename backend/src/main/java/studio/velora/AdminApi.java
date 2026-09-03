package studio.velora;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import java.util.stream.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
class AdminApi {
  final CoffeeService c;
  final PasswordEncoder passwords;

  AdminApi(CoffeeService c, PasswordEncoder passwords) {
    this.c = c;
    this.passwords = passwords;
  }

  record Ingredient(
      @NotBlank @Size(max = 80) String name,
      @Pattern(regexp = "base|origin|milk|syrup|flavor|topping|cup") @NotNull String category,
      @Min(0) @Max(10000) int price,
      @Min(0) @Max(2000) int calories,
      @Min(0) @Max(1000000) int stock,
      @Min(0) int threshold,
      boolean available,
      @Size(max = 500) String notes) {}

  record Table(@NotBlank @Size(max = 40) String label, boolean active) {}

  record UserEdit(
      @NotBlank @Size(max = 80) String name,
      @Email @NotBlank @Size(max = 254) String email,
      @Pattern(regexp = "CUSTOMER|BARISTA|ADMIN") @NotNull String role,
      boolean active,
      @Size(max = 72) String password,
      @Size(max = 120) String specialty,
      @Min(0) @Max(70) Integer experience,
      @Size(max = 500) String imageUrl) {}

  @GetMapping("/ingredients")
  Object ingredients() {
    return c.catalog();
  }

  @PostMapping("/ingredients")
  Object create(@Valid @RequestBody Ingredient i) {
    String id = CoffeeService.id();
    c.database()
        .update(
            "INSERT INTO"
                + " ingredients(id,name,category,price,calories,stock,threshold,available,notes)"
                + " VALUES(?,?,?,?,?,?,?,?,?)",
            id,
            i.name(),
            i.category(),
            i.price(),
            i.calories(),
            i.stock(),
            i.threshold(),
            i.available(),
            Objects.toString(i.notes(), ""));
    return Map.of("id", id);
  }

  @PutMapping("/ingredients/{id}")
  void edit(@PathVariable String id, @Valid @RequestBody Ingredient i) {
    var old = c.one("SELECT * FROM ingredients WHERE id=?", id);
    if (((Number) old.get("reserved")).intValue() > i.stock())
      throw CoffeeService.bad("Stock cannot be lower than reserved portions.");
    c.database()
        .update(
            "UPDATE ingredients SET"
                + " name=?,category=?,price=?,calories=?,stock=?,threshold=?,available=?,notes=?"
                + " WHERE id=?",
            i.name(),
            i.category(),
            i.price(),
            i.calories(),
            i.stock(),
            i.threshold(),
            i.available(),
            Objects.toString(i.notes(), ""),
            id);
  }

  @DeleteMapping("/ingredients/{id}")
  void deleteIngredient(@PathVariable String id) {
    if (id.equals("cup"))
      throw CoffeeService.bad("The cup service is required. Adjust its stock instead.");
    c.database().update("DELETE FROM ingredients WHERE id=?", id);
  }

  @GetMapping("/tables")
  Object tables() {
    return c.database().queryForList("SELECT * FROM cafe_tables ORDER BY label");
  }

  @PostMapping("/tables")
  Object table(@Valid @RequestBody Table t) {
    String id = CoffeeService.id();
    c.database()
        .update(
            "INSERT INTO cafe_tables(id,label,token,active) VALUES(?,?,?,?)",
            id,
            t.label(),
            CoffeeService.id().replace("-", ""),
            t.active());
    return Map.of("id", id);
  }

  @PutMapping("/tables/{id}")
  void table(@PathVariable String id, @Valid @RequestBody Table t) {
    c.database()
        .update("UPDATE cafe_tables SET label=?,active=? WHERE id=?", t.label(), t.active(), id);
  }

  @DeleteMapping("/tables/{id}")
  void deleteTable(@PathVariable String id) {
    c.database().update("DELETE FROM cafe_tables WHERE id=?", id);
  }

  @GetMapping("/users")
  Object users() {
    return c.database()
        .queryForList(
            "SELECT"
                + " u.id,u.name,u.email,u.role,u.active,u.created_at,p.specialty,p.experience,p.image_url"
                + " FROM users u LEFT JOIN barista_profiles p ON p.user_id=u.id ORDER BY"
                + " u.created_at DESC");
  }

  @PostMapping("/users")
  @Transactional
  Object user(@Valid @RequestBody UserEdit u) {
    if (u.password() == null || u.password().length() < 12)
      throw CoffeeService.bad("A password of at least 12 characters is required.");
    String id = CoffeeService.id();
    c.database()
        .update(
            "INSERT INTO users(id,name,email,role,active,password) VALUES(?,?,?,?,?,?)",
            id,
            u.name(),
            u.email().toLowerCase(),
            u.role(),
            u.active(),
            passwords.encode(u.password()));
    profile(id, u);
    return Map.of("id", id);
  }

  @PutMapping("/users/{id}")
  @Transactional
  void user(Principal principal, @PathVariable String id, @Valid @RequestBody UserEdit u) {
    if (c.user(principal.getName()).get("id").equals(id)
        && (!u.role().equals("ADMIN") || !u.active()))
      throw CoffeeService.bad("You cannot remove your own administrative access.");
    c.database()
        .update(
            "UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?",
            u.name(),
            u.email().toLowerCase(),
            u.role(),
            u.active(),
            id);
    if (u.password() != null && !u.password().isBlank()) {
      if (u.password().length() < 12)
        throw CoffeeService.bad("Password must have at least 12 characters.");
      c.database()
          .update("UPDATE users SET password=? WHERE id=?", passwords.encode(u.password()), id);
    }
    profile(id, u);
  }

  void profile(String id, UserEdit u) {
    c.database().update("DELETE FROM barista_profiles WHERE user_id=?", id);
    if (!u.role().equals("CUSTOMER"))
      c.database()
          .update(
              "INSERT INTO barista_profiles(user_id,specialty,experience,image_url)"
                  + " VALUES(?,?,?,?)",
              id,
              Objects.toString(u.specialty(), "Coffee craft"),
              u.experience() == null ? 0 : u.experience(),
              u.imageUrl());
  }

  @DeleteMapping("/users/{id}")
  void deleteUser(Principal p, @PathVariable String id) {
    if (c.user(p.getName()).get("id").equals(id))
      throw CoffeeService.bad("You cannot deactivate yourself.");
    c.database().update("UPDATE users SET active=FALSE WHERE id=?", id);
  }

  @GetMapping("/orders")
  Object orders() {
    return c.database().queryForList("SELECT id FROM orders ORDER BY created_at DESC").stream()
        .map(o -> c.orderView(o.get("id").toString()))
        .toList();
  }

  @GetMapping("/recipes")
  Object recipes() {
    return c
        .database()
        .queryForList("SELECT id,owner_id FROM recipes ORDER BY created_at DESC")
        .stream()
        .map(r -> c.recipe(r.get("id").toString(), r.get("owner_id").toString()))
        .toList();
  }

  @PostMapping("/recipes")
  Object recipe(Principal p, @Valid @RequestBody Api.RecipeRequest r) {
    return c.save(c.user(p.getName()).get("id").toString(), r.name(), r.config());
  }

  @PutMapping("/recipes/{id}")
  void recipe(@PathVariable String id, @Valid @RequestBody Api.RecipeRequest r) {
    var q = c.quote(r.config(), true);
    c.database()
        .update(
            "UPDATE recipes SET name=?,config=?,dna=? WHERE id=?",
            r.name(),
            c.write(q.config()),
            c.write(q.dna()),
            id);
  }

  @DeleteMapping("/recipes/{id}")
  void deleteRecipe(@PathVariable String id) {
    c.database().update("DELETE FROM recipes WHERE id=?", id);
  }

  void kind(String kind) {
    if (!List.of("promotions", "reviews", "settings", "locations").contains(kind))
      throw CoffeeService.bad("Unknown record category");
  }

  @GetMapping("/records/{kind}")
  Object records(@PathVariable String kind) {
    kind(kind);
    return c
        .database()
        .queryForList("SELECT * FROM records WHERE kind=? ORDER BY created_at DESC", kind)
        .stream()
        .map(
            r -> {
              r.put("body", c.read(r.get("body")));
              return r;
            })
        .toList();
  }

  @PostMapping("/records/{kind}")
  Object record(@PathVariable String kind, @RequestBody Map<String, Object> body) {
    kind(kind);
    if (c.write(body).length() > 10000) throw CoffeeService.bad("Record is too large");
    String id = CoffeeService.id();
    c.database().update("INSERT INTO records(id,kind,body) VALUES(?,?,?)", id, kind, c.write(body));
    return Map.of("id", id);
  }

  @PutMapping("/records/{kind}/{id}")
  void record(
      @PathVariable String kind, @PathVariable String id, @RequestBody Map<String, Object> body) {
    kind(kind);
    if (c.write(body).length() > 10000) throw CoffeeService.bad("Record is too large");
    c.database().update("UPDATE records SET body=? WHERE id=? AND kind=?", c.write(body), id, kind);
  }

  @DeleteMapping("/records/{kind}/{id}")
  void deleteRecord(@PathVariable String kind, @PathVariable String id) {
    kind(kind);
    c.database().update("DELETE FROM records WHERE id=? AND kind=?", id, kind);
  }

  @GetMapping("/analytics")
  Object analytics() {
    var all = c.database().queryForList("SELECT * FROM orders");
    var completed = all.stream().filter(o -> o.get("status").equals("Completed")).toList();
    long revenue = completed.stream().mapToLong(o -> ((Number) o.get("price")).longValue()).sum();
    var customers =
        completed.stream()
            .collect(
                Collectors.groupingBy(o -> o.get("owner_id").toString(), Collectors.counting()));
    long repeat = customers.values().stream().filter(n -> n > 1).count();
    var moods = new TreeMap<String, Long>();
    var coffees = new TreeMap<String, Long>();
    var hours = new TreeMap<String, Long>();
    var custom = new TreeMap<String, Long>();
    for (var o : completed) {
      var snapshot = c.read(o.get("snapshot"));
      var config = c.read(c.write(snapshot.get("config")));
      moods.merge(config.get("mood").toString(), 1L, Long::sum);
      coffees.merge(snapshot.get("name").toString(), 1L, Long::sum);
      String time = o.get("created_at").toString();
      hours.merge(time.substring(11, 13) + ":00", 1L, Long::sum);
      for (String key : List.of("milk", "syrup", "flavor", "topping", "origin"))
        if (!config.get(key).equals("none"))
          custom.merge(config.get(key).toString(), 1L, Long::sum);
    }
    var result = new LinkedHashMap<String, Object>();
    result.put("orders", all.size());
    result.put("completed", completed.size());
    result.put("revenue", revenue);
    result.put("average", completed.isEmpty() ? 0 : revenue / completed.size());
    result.put(
        "retention", customers.isEmpty() ? 0 : Math.round(100.0 * repeat / customers.size()));
    result.put("repeatOrders", completed.size() - customers.size());
    result.put("moods", moods);
    result.put("coffees", coffees);
    result.put("hours", hours);
    result.put("customizations", custom);
    result.put(
        "daily",
        c.database()
            .queryForList(
                "SELECT CAST(created_at AS DATE) AS report_day,COUNT(*) AS orders,SUM(CASE WHEN"
                    + " status='Completed' THEN price ELSE 0 END) AS revenue FROM orders GROUP BY"
                    + " CAST(created_at AS DATE) ORDER BY report_day DESC"));
    result.put(
        "ingredients",
        c.database()
            .queryForList(
                "SELECT i.name,SUM(oi.quantity) AS portions FROM order_items oi JOIN orders o ON"
                    + " oi.order_id=o.id JOIN ingredients i ON i.id=oi.ingredient_id WHERE"
                    + " o.status='Completed' GROUP BY i.name ORDER BY portions DESC"));
    result.put(
        "lowStock",
        c.database()
            .queryForList(
                "SELECT name,stock,reserved,threshold FROM ingredients WHERE"
                    + " stock-reserved<=threshold"));
    result.put(
        "creative",
        c.database().queryForList("SELECT name,dna FROM recipes").stream()
            .map(
                r -> Map.of("name", r.get("name"), "score", c.read(r.get("dna")).get("Creativity")))
            .sorted(
                (a, b) ->
                    Integer.compare(
                        ((Number) b.get("score")).intValue(), ((Number) a.get("score")).intValue()))
            .limit(5)
            .toList());
    return result;
  }
}

