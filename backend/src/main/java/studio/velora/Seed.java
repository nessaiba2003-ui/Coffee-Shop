package studio.velora;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class Seed implements CommandLineRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder passwords;

  @Value("${velora.admin-email}")
  String email;

  @Value("${velora.admin-password}")
  String password;

  Seed(JdbcTemplate db, PasswordEncoder passwords) {
    this.db = db;
    this.passwords = passwords;
  }

  public void run(String... args) {
    if (db.queryForObject("SELECT COUNT(*) FROM ingredients", Integer.class) == 0) {
      ingredient("espresso", "base", "Espresso", 250, 5, "Rich, concentrated, full of possibility");
      ingredient("cold-brew", "base", "Cold brew", 300, 5, "Slow steeped. Naturally smooth.");
      ingredient("filter", "base", "Pour-over", 280, 3, "Clear, delicate and quietly complex");
      ingredient("decaf", "base", "Decaf", 280, 5, "All the ritual, less caffeine");
      ingredient(
          "ethiopia", "origin", "Ethiopia", 60, 0, "Yirgacheffe · floral / bergamot / citrus");
      ingredient("colombia", "origin", "Colombia", 40, 0, "Huila · caramel / cacao / red fruit");
      ingredient("brazil", "origin", "Brazil", 30, 0, "Cerrado · hazelnut / chocolate / honey");
      ingredient("oat", "milk", "Oat", 70, 90, "Silky, plant-based");
      ingredient("whole", "milk", "Whole milk", 40, 110, "Rich and beautifully rounded");
      ingredient("almond", "milk", "Almond", 70, 35, "Light with a nutty finish");
      ingredient("coconut", "milk", "Coconut", 80, 75, "Soft, tropical creaminess");
      ingredient("vanilla", "syrup", "Vanilla", 40, 25, "Madagascar vanilla");
      ingredient("caramel", "syrup", "Salted caramel", 50, 30, "A little sweet, a little sea salt");
      ingredient("maple", "syrup", "Maple", 50, 25, "Deep amber warmth");
      ingredient("rose", "flavor", "Rose", 50, 5, "A soft floral note");
      ingredient("orange", "flavor", "Orange blossom", 50, 5, "Bright and fragrant");
      ingredient("cacao", "flavor", "Cacao", 40, 10, "Deep chocolate complexity");
      ingredient("cinnamon", "topping", "Cinnamon", 20, 2, "A warming final touch");
      ingredient("cocoa", "topping", "Cocoa dust", 20, 5, "Fine dark cocoa");
      ingredient("foam", "topping", "Cloud foam", 60, 40, "An airy, velvety finish");
      ingredient("cup", "cup", "Reusable cup service", 0, 0, "One cup per creation");
    }
    if (!email.isBlank()
        && !password.isBlank()
        && db.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email=?", Integer.class, email.toLowerCase())
            == 0) {
      if (password.length() < 12)
        throw new IllegalArgumentException("ADMIN_PASSWORD must have at least 12 characters");
      db.update(
          "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,?)",
          UUID.randomUUID().toString(),
          email.toLowerCase(),
          passwords.encode(password),
          "Atelier manager",
          "ADMIN");
    }
    if (db.queryForObject("SELECT COUNT(*) FROM cafe_tables", Integer.class) == 0)
      for (int i = 1; i <= 8; i++)
        db.update(
            "INSERT INTO cafe_tables(id,label,token) VALUES(?,?,?)",
            UUID.randomUUID().toString(),
            String.format("Table %02d", i),
            UUID.randomUUID().toString().replace("-", ""));
  }

  void ingredient(String id, String category, String name, int price, int calories, String notes) {
    db.update(
        "INSERT INTO ingredients(id,category,name,price,calories,stock,notes)"
            + " VALUES(?,?,?,?,?,200,?)",
        id,
        category,
        name,
        price,
        calories,
        notes);
  }
}
