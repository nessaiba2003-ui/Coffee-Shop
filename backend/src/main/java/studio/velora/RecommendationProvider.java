package studio.velora;

import java.util.*;
import org.springframework.stereotype.Component;

interface RecommendationProvider {
  Map<String, Object> recommend(String prompt, String mood, Map<String, Object> preferences);
}

/**
 * Replace this provider with an external AI adapter; never let model output bypass recipe
 * validation.
 */
@Component
class LocalCoffeeArchitect implements RecommendationProvider {
  private final CoffeeService coffee;

  LocalCoffeeArchitect(CoffeeService coffee) {
    this.coffee = coffee;
  }

  public Map<String, Object> recommend(
      String prompt, String mood, Map<String, Object> preferences) {
    String p = prompt.toLowerCase();
    var c = new LinkedHashMap<String, Object>(preferences);
    c.putIfAbsent("base", "espresso");
    c.putIfAbsent("origin", "ethiopia");
    c.putIfAbsent("milk", "oat");
    c.putIfAbsent("sweetness", 30);
    c.put("mood", mood);
    c.putIfAbsent("flavor", "none");
    c.putIfAbsent("syrup", "none");
    c.putIfAbsent("topping", "none");
    switch (mood) {
      case "Need Energy" -> {
        c.put("strength", 90);
        c.put("shots", 2);
      }
      case "Calm", "Late Night" -> {
        c.put("base", "decaf");
        c.put("strength", 30);
        c.put("shots", 0);
      }
      case "Focus" -> {
        c.put("milk", "none");
        c.put("strength", 75);
      }
      case "Creative", "Adventure" -> {
        c.put("flavor", "orange");
        c.put("creativity", 90);
      }
      case "Romantic" -> {
        c.put("flavor", "rose");
        c.put("sweetness", 45);
      }
      case "Fresh Start" -> {
        c.put("base", "cold-brew");
        c.put("temperature", 10);
        c.put("ice", 70);
      }
    }
    if (p.contains("cold") || p.contains("iced")) {
      c.put("temperature", 10);
      c.put("ice", 70);
    }
    if (p.contains("hot")) {
      c.put("temperature", 80);
      c.put("ice", 0);
    }
    if (p.contains("creamy")) c.put("milk", "oat");
    if (p.contains("no milk") || p.contains("black")) c.put("milk", "none");
    if (p.contains("not too sweet") || p.contains("less sweet")) c.put("sweetness", 15);
    else if (p.contains("sweet")) c.put("sweetness", 60);
    if (p.contains("no sugar") || p.contains("unsweetened")) {
      c.put("sweetness", 0);
      c.put("syrup", "none");
    }
    if (p.contains("energetic") || p.contains("energy")) {
      c.put("strength", 90);
      c.put("shots", 2);
    }
    if (p.contains("decaf") || p.contains("no caffeine")) {
      c.put("base", "decaf");
      c.put("shots", 0);
    }
    if (p.contains("almond")) c.put("milk", "almond");
    if (p.contains("caramel")) c.put("syrup", "caramel");
    if (p.contains("vanilla")) c.put("syrup", "vanilla");
    var available =
        coffee.catalog().stream()
            .filter(
                i ->
                    Boolean.TRUE.equals(i.get("available"))
                        && ((Number) i.get("stock")).intValue()
                            > ((Number) i.get("reserved")).intValue())
            .toList();
    for (String category : List.of("base", "origin", "milk", "syrup", "flavor", "topping")) {
      Object selected = c.get(category);
      if (!Objects.equals(selected, "none")
          && available.stream().noneMatch(i -> i.get("id").equals(selected)))
        c.put(
            category,
            available.stream()
                .filter(i -> i.get("category").equals(category))
                .map(i -> i.get("id"))
                .findFirst()
                .orElse("none"));
    }
    var result = new LinkedHashMap<String, Object>(coffee.quoteView(c));
    result.put(
        "name",
        mood.equals("Late Night")
            ? "The Midnight Ritual"
            : mood.equals("Romantic")
                ? "A Rose, Remembered"
                : ((Number) c.getOrDefault("temperature", 65)).intValue() < 35
                    ? "The Cloud Theory"
                    : "The Golden Interval");
    result.put("provider", "Taste-matching engine");
    result.put(
        "explanation",
        "Built around your words, preferences and ingredients currently in the atelier. Fine-tune"
            + " every detail in the lab.");
    return result;
  }
}
