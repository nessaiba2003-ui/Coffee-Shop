package studio.velora;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

@Service
class CoffeeService {
  final JdbcTemplate db;
  final ObjectMapper json;
  final Events events;

  CoffeeService(JdbcTemplate db, ObjectMapper json, Events events) {
    this.db = db;
    this.json = json;
    this.events = events;
  }

  JdbcTemplate database() {
    return db;
  }

  Events eventBus() {
    return events;
  }

  static String id() {
    return UUID.randomUUID().toString();
  }

  static ResponseStatusException bad(String s) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, s);
  }

  String write(Object o) {
    try {
      return json.writeValueAsString(o);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  Map<String, Object> read(Object s) {
    try {
      return json.readValue(s.toString(), new TypeReference<Map<String, Object>>() {});
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  Map<String, Object> one(String sql, Object... args) {
    var list = db.queryForList(sql, args);
    if (list.isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This creation could not be found.");
    return new LinkedHashMap<>(list.get(0));
  }

  Map<String, Object> user(String email) {
    return one("SELECT id,email,name,role,active,created_at FROM users WHERE email=?", email);
  }

  List<Map<String, Object>> catalog() {
    return db.queryForList("SELECT * FROM ingredients ORDER BY category,name");
  }

  String text(Map<String, Object> c, String k, String def) {
    return Objects.toString(c.getOrDefault(k, def), def);
  }

  int number(Map<String, Object> c, String k, int def, int min, int max) {
    Object x = c.getOrDefault(k, def);
    if (!(x instanceof Number n)
        || n.doubleValue() != n.intValue()
        || n.intValue() < min
        || n.intValue() > max) throw bad("Invalid " + k);
    return n.intValue();
  }

  record Quote(
      Map<String, Object> config,
      Map<String, Integer> dna,
      List<Map<String, Object>> ingredients,
      int price,
      int calories,
      int minutes,
      Map<String, Integer> portions) {}

  Quote quote(Map<String, Object> input, boolean available) {
    var c = new LinkedHashMap<String, Object>();
    var portions = new TreeMap<String, Integer>();
    var items = new ArrayList<Map<String, Object>>();
    int price = 0, calories = 0;
    int shots = number(input, "shots", 0, 0, 3),
        sweetness = number(input, "sweetness", 30, 0, 100),
        strength = number(input, "strength", 65, 0, 100),
        temperature = number(input, "temperature", 65, 0, 100),
        ice = number(input, "ice", 0, 0, 100),
        creative = number(input, "creativity", 50, 0, 100);
    String size = text(input, "size", "Regular"),
        roast = text(input, "roast", "Medium"),
        mood = text(input, "mood", "Creative");
    if (!List.of("Small", "Regular", "Large").contains(size)
        || !List.of("Light", "Medium", "Dark").contains(roast)
        || mood.length() > 40) throw bad("Invalid recipe preferences");
    for (String category : List.of("base", "origin", "milk", "syrup", "flavor", "topping")) {
      String value =
          text(
              input,
              category,
              switch (category) {
                case "base" -> "espresso";
                case "origin" -> "ethiopia";
                case "milk" -> "oat";
                default -> "none";
              });
      c.put(category, value);
      if (value.equals("none") && !category.equals("base") && !category.equals("origin")) continue;
      var ingredient = one("SELECT * FROM ingredients WHERE id=? AND category=?", value, category);
      if (available && !Boolean.TRUE.equals(ingredient.get("available")))
        throw bad(ingredient.get("name") + " is currently unavailable.");
      int quantity =
          category.equals("origin")
              ? 1 + shots
              : (category.equals("milk") && size.equals("Large") ? 2 : 1);
      portions.put(value, quantity);
      price += ((Number) ingredient.get("price")).intValue() * quantity;
      calories += ((Number) ingredient.get("calories")).intValue() * quantity;
      items.add(
          Map.of(
              "id",
              value,
              "name",
              ingredient.get("name"),
              "quantity",
              quantity,
              "category",
              category));
    }
    portions.put("cup", 1);
    price += shots * 90 + (size.equals("Large") ? 100 : size.equals("Small") ? -30 : 0);
    calories += sweetness / 2;
    c.putAll(
        Map.of(
            "size",
            size,
            "roast",
            roast,
            "shots",
            shots,
            "sweetness",
            sweetness,
            "strength",
            strength,
            "temperature",
            temperature,
            "ice",
            ice,
            "creativity",
            creative,
            "mood",
            mood));
    var dna =
        Map.of(
            "Intensity",
            Math.min(100, strength + shots * 5),
            "Sweetness",
            sweetness,
            "Creaminess",
            c.get("milk").equals("none") ? 5 : c.get("milk").equals("almond") ? 55 : 85,
            "Temperature",
            temperature,
            "Creativity",
            Math.min(100, creative + (c.get("flavor").equals("none") ? 0 : 10)));
    return new Quote(
        c,
        dna,
        items,
        price,
        calories,
        3 + shots + (c.get("milk").equals("none") ? 0 : 1),
        portions);
  }

  Map<String, Object> quoteView(Map<String, Object> config) {
    var q = quote(config, true);
    return Map.of(
        "config",
        q.config(),
        "dna",
        q.dna(),
        "ingredients",
        q.ingredients(),
        "price",
        q.price(),
        "calories",
        q.calories(),
        "minutes",
        q.minutes());
  }

  @Transactional
  Map<String, Object> save(String owner, String name, Map<String, Object> config) {
    if (name == null || name.isBlank() || name.length() > 80)
      throw bad("Give your coffee a name of 1–80 characters.");
    var q = quote(config, true);
    String id = id();
    db.update(
        "INSERT INTO recipes(id,owner_id,name,config,dna) VALUES(?,?,?,?,?)",
        id,
        owner,
        name.strip(),
        write(q.config()),
        write(q.dna()));
    return recipe(id, owner);
  }

  Map<String, Object> recipe(String id, String owner) {
    var r = one("SELECT * FROM recipes WHERE id=? AND owner_id=?", id, owner);
    r.put("config", read(r.get("config")));
    r.put("dna", read(r.get("dna")));
    r.put(
        "times_ordered",
        db.queryForObject(
            "SELECT COUNT(*) FROM orders WHERE recipe_id=? AND status='Completed'",
            Integer.class,
            id));
    return r;
  }

  @Transactional
  Map<String, Object> order(String owner, String recipeId, String tableToken, String key) {
    try {
      UUID.fromString(key);
    } catch (Exception e) {
      throw bad("An idempotency key is required.");
    }
    // Serialize a customer's order requests so duplicate retries cannot reserve stock twice.
    one("SELECT id FROM users WHERE id=? FOR UPDATE", owner);
    var prior =
        db.queryForList("SELECT id FROM orders WHERE owner_id=? AND idempotency_key=?", owner, key);
    if (!prior.isEmpty()) return orderView(prior.get(0).get("id").toString());
    var r = recipe(recipeId, owner);
    var q = quote(read(write(r.get("config"))), true);
    String table = null;
    if (tableToken != null && !tableToken.isBlank())
      table =
          one("SELECT id FROM cafe_tables WHERE token=? AND active=TRUE", tableToken)
              .get("id")
              .toString();
    for (var entry : q.portions().entrySet()) {
      var stock = one("SELECT * FROM ingredients WHERE id=? FOR UPDATE", entry.getKey());
      if (!Boolean.TRUE.equals(stock.get("available"))
          || ((Number) stock.get("stock")).intValue() - ((Number) stock.get("reserved")).intValue()
              < entry.getValue())
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            stock.get("name") + " has just sold out. Please adjust your recipe.");
      db.update(
          "UPDATE ingredients SET reserved=reserved+? WHERE id=?",
          entry.getValue(),
          entry.getKey());
    }
    String id = id();
    var snapshot =
        Map.of(
            "name",
            r.get("name"),
            "config",
            q.config(),
            "dna",
            q.dna(),
            "ingredients",
            q.ingredients(),
            "calories",
            q.calories(),
            "minutes",
            q.minutes());
    db.update(
        "INSERT INTO orders(id,owner_id,recipe_id,snapshot,price,table_id,status,idempotency_key)"
            + " VALUES(?,?,?,?,?,?,'Created',?)",
        id,
        owner,
        recipeId,
        write(snapshot),
        q.price(),
        table,
        key);
    for (var entry : q.portions().entrySet())
      db.update(
          "INSERT INTO order_items(order_id,ingredient_id,quantity) VALUES(?,?,?)",
          id,
          entry.getKey(),
          entry.getValue());
    return orderView(id);
  }

  Map<String, Object> orderView(String id) {
    var o =
        one(
            "SELECT o.*,u.name AS customer,t.label AS table_label,b.name AS"
                + " barista,p.specialty,p.experience,p.image_url FROM orders o JOIN users u ON"
                + " u.id=o.owner_id LEFT JOIN cafe_tables t ON t.id=o.table_id LEFT JOIN users b ON"
                + " b.id=o.barista_id LEFT JOIN barista_profiles p ON p.user_id=b.id WHERE o.id=?",
            id);
    o.put("snapshot", read(o.get("snapshot")));
    return o;
  }

  void authorize(Map<String, Object> order, Map<String, Object> user) {
    if (!order.get("owner_id").equals(user.get("id")) && user.get("role").equals("CUSTOMER"))
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "This order belongs to another customer.");
  }

  @Transactional
  Map<String, Object> advance(String id, String staff, boolean cancel) {
    var o = one("SELECT * FROM orders WHERE id=? FOR UPDATE", id);
    String status = o.get("status").toString();
    int stage = ((Number) o.get("stage")).intValue();
    if (List.of("Completed", "Cancelled").contains(status))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This order is already closed.");
    if (cancel) {
      status = "Cancelled";
    } else
      switch (status) {
        case "Created" -> status = "Confirmed";
        case "Confirmed" -> status = "Queued";
        case "Queued" -> {
          status = "Preparing";
          stage = 0;
        }
        case "Preparing", "Crafting" -> {
          if (stage < 5) {
            stage++;
            status = "Crafting";
          } else {
            stage = 6;
            status = "Ready";
          }
        }
        case "Ready" -> status = "Delivered";
        case "Delivered" -> status = "Completed";
        default -> throw bad("Invalid order state");
      }
    if (status.equals("Completed") || status.equals("Cancelled"))
      for (var item :
          db.queryForList(
              "SELECT * FROM order_items WHERE order_id=? ORDER BY ingredient_id", id)) {
        int quantity = ((Number) item.get("quantity")).intValue();
        db.update(
            "UPDATE ingredients SET reserved=reserved-?,stock=stock-? WHERE id=?",
            quantity,
            status.equals("Completed") ? quantity : 0,
            item.get("ingredient_id"));
      }
    db.update(
        "UPDATE orders SET status=?,stage=?,barista_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        status,
        stage,
        staff,
        id);
    var result = orderView(id);
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          public void afterCommit() {
            events.publish(id, result);
          }
        });
    return result;
  }

  Map<String, Object> passport(String owner) {
    var recipes =
        db
            .queryForList("SELECT id FROM recipes WHERE owner_id=? ORDER BY created_at DESC", owner)
            .stream()
            .map(r -> recipe(r.get("id").toString(), owner))
            .toList();
    var orders =
        db
            .queryForList("SELECT id FROM orders WHERE owner_id=? ORDER BY created_at DESC", owner)
            .stream()
            .map(r -> orderView(r.get("id").toString()))
            .toList();
    long completed = orders.stream().filter(o -> o.get("status").equals("Completed")).count();
    var favorite =
        recipes.stream()
            .max(Comparator.comparingInt(r -> ((Number) r.get("times_ordered")).intValue()))
            .orElse(null);
    var dates = new HashSet<LocalDate>();
    for (var o : orders)
      if (o.get("status").equals("Completed"))
        dates.add(
            (o.get("created_at") instanceof java.sql.Timestamp ts
                    ? ts.toInstant().atOffset(ZoneOffset.UTC)
                    : OffsetDateTime.parse(o.get("created_at").toString().replace(" ", "T")))
                .toLocalDate());
    int streak = 0;
    LocalDate day = LocalDate.now(ZoneOffset.UTC);
    if (!dates.contains(day)) day = day.minusDays(1);
    while (dates.contains(day)) {
      streak++;
      day = day.minusDays(1);
    }
    var badges = new ArrayList<String>();
    if (completed > 0) badges.add("Espresso Explorer");
    if (recipes.size() >= 3) badges.add("Coffee Scientist");
    if (completed >= 5) badges.add("Latte Collector");
    if (recipes.stream()
        .anyMatch(r -> ((Number) read(write(r.get("dna"))).get("Creativity")).intValue() >= 80))
      badges.add("Flavor Architect");
    if (recipes.stream()
        .anyMatch(r -> read(write(r.get("config"))).get("mood").equals("Late Night")))
      badges.add("Night Owl");
    var out = new LinkedHashMap<String, Object>();
    out.put("recipes", recipes);
    out.put("orders", orders);
    out.put("completed", completed);
    out.put("points", completed * 25);
    out.put("streak", streak);
    out.put("badges", badges);
    out.put("favorite", favorite);
    out.put(
        "favoriteIngredients",
        db.queryForList(
            "SELECT i.name, SUM(oi.quantity) AS portions FROM order_items oi JOIN orders o ON"
                + " o.id=oi.order_id JOIN ingredients i ON i.id=oi.ingredient_id WHERE o.owner_id=?"
                + " AND o.status='Completed' AND i.category<>'cup' GROUP BY i.name ORDER BY"
                + " portions DESC LIMIT 5",
            owner));
    return out;
  }
}
