package studio.velora;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
class Api {
  final CoffeeService c;
  final PasswordEncoder passwords;
  final RecommendationProvider architect;

  Api(CoffeeService c, PasswordEncoder passwords, RecommendationProvider architect) {
    this.c = c;
    this.passwords = passwords;
    this.architect = architect;
  }

  record Registration(
      @Email @NotBlank @Size(max = 254) String email,
      @NotBlank @Size(min = 12, max = 72) String password,
      @NotBlank @Size(max = 80) String name) {}

  record RecipeRequest(
      @NotBlank @Size(max = 80) String name, @NotNull Map<String, Object> config) {}

  record OrderRequest(
      @NotBlank String recipeId, String tableToken, @NotBlank String idempotencyKey) {}

  record RecommendRequest(
      @Size(max = 1000) String prompt,
      @Size(max = 40) String mood,
      Map<String, Object> preferences) {}

  Map<String, Object> me(Principal p) {
    var u = c.user(p.getName());
    if (!Boolean.TRUE.equals(u.get("active")))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been deactivated.");
    return u;
  }

  String owner(Principal p) {
    return me(p).get("id").toString();
  }

  @GetMapping("/health")
  Map<String, Object> health() {
    return Map.of(
        "status", "up", "database", c.database().queryForObject("SELECT 1", Integer.class) == 1);
  }

  @GetMapping("/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> register(@Valid @RequestBody Registration r) {
    String id = CoffeeService.id();
    c.database()
        .update(
            "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,'CUSTOMER')",
            id,
            r.email().strip().toLowerCase(),
            passwords.encode(r.password()),
            r.name().strip());
    return Map.of("id", id);
  }

  @GetMapping("/auth/me")
  Map<String, Object> current(Principal p) {
    return me(p);
  }

  @GetMapping("/catalog")
  Map<String, Object> catalog() {
    return Map.of("ingredients", c.catalog(), "currency", "EUR");
  }

  @PostMapping("/recommend")
  Map<String, Object> recommend(@Valid @RequestBody RecommendRequest r) {
    return architect.recommend(
        Objects.toString(r.prompt(), ""),
        Objects.toString(r.mood(), "Creative"),
        r.preferences() == null ? Map.of() : r.preferences());
  }

  @PostMapping("/recipes/quote")
  Map<String, Object> quote(@RequestBody Map<String, Object> config) {
    return c.quoteView(config);
  }

  @PostMapping("/recipes")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> save(Principal p, @Valid @RequestBody RecipeRequest r) {
    return c.save(owner(p), r.name(), r.config());
  }

  @GetMapping("/recipes")
  Object recipes(Principal p) {
    return c.passport(owner(p)).get("recipes");
  }

  @PostMapping("/recipes/{id}/share")
  Map<String, Object> share(Principal p, @PathVariable String id) {
    c.recipe(id, owner(p));
    String token = CoffeeService.id().replace("-", "");
    c.database().update("UPDATE recipes SET share_token=? WHERE id=?", token, id);
    return Map.of("token", token);
  }

  @DeleteMapping("/recipes/{id}/share")
  void unshare(Principal p, @PathVariable String id) {
    c.recipe(id, owner(p));
    c.database().update("UPDATE recipes SET share_token=NULL WHERE id=?", id);
  }

  @GetMapping("/cards/{token}")
  Map<String, Object> card(@PathVariable String token) {
    var r = c.one("SELECT id,name,config,dna,created_at FROM recipes WHERE share_token=?", token);
    r.put("config", c.read(r.get("config")));
    r.put("dna", c.read(r.get("dna")));
    r.put(
        "times_ordered",
        c.database()
            .queryForObject(
                "SELECT COUNT(*) FROM orders WHERE recipe_id=? AND status='Completed'",
                Integer.class,
                r.get("id")));
    var orders =
        c.database()
            .queryForList(
                "SELECT b.name FROM orders o LEFT JOIN users b ON b.id=o.barista_id WHERE"
                    + " recipe_id=? AND status='Completed' ORDER BY updated_at DESC",
                r.get("id"));
    r.put("barista", orders.isEmpty() ? null : orders.get(0).get("name"));
    r.put("location", "VELŌRA Atelier");
    return r;
  }

  @GetMapping("/tables/{token}")
  Object table(@PathVariable String token) {
    return c.one("SELECT label,token FROM cafe_tables WHERE token=? AND active=TRUE", token);
  }

  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  Object order(Principal p, @Valid @RequestBody OrderRequest r) {
    return c.order(owner(p), r.recipeId(), r.tableToken(), r.idempotencyKey());
  }

  @GetMapping("/orders/{id}")
  Map<String, Object> order(Principal p, @PathVariable String id) {
    var o = c.orderView(id);
    c.authorize(o, me(p));
    return o;
  }

  @GetMapping(value = "/orders/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  SseEmitter events(Principal p, @PathVariable String id) {
    return c.eventBus().subscribe(id, order(p, id));
  }

  @GetMapping("/passport")
  Object passport(Principal p) {
    return c.passport(owner(p));
  }

  @GetMapping("/staff/orders")
  Object queue(Principal p) {
    me(p);
    return c
        .database()
        .queryForList(
            "SELECT id FROM orders WHERE status NOT IN ('Completed','Cancelled') ORDER BY priority"
                + " DESC,created_at")
        .stream()
        .map(o -> c.orderView(o.get("id").toString()))
        .toList();
  }

  @PostMapping("/staff/orders/{id}/advance")
  Object advance(Principal p, @PathVariable String id) {
    return c.advance(id, owner(p), false);
  }

  @PostMapping("/staff/orders/{id}/cancel")
  Object cancel(Principal p, @PathVariable String id) {
    return c.advance(id, owner(p), true);
  }

  @PatchMapping("/staff/orders/{id}/priority")
  void priority(Principal p, @PathVariable String id, @RequestBody Map<String, Object> body) {
    me(p);
    c.orderView(id);
    c.database()
        .update("UPDATE orders SET priority=? WHERE id=?", c.number(body, "priority", 0, 0, 2), id);
  }
}

@RestControllerAdvice
class Errors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> known(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("message", Objects.toString(e.getReason(), "Request failed")));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException e) {
    return ResponseEntity.badRequest()
        .body(
            Map.of(
                "message",
                e.getBindingResult().getFieldErrors().stream()
                    .map(f -> f.getField() + " " + f.getDefaultMessage())
                    .findFirst()
                    .orElse("Invalid input")));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> conflict(DataIntegrityViolationException e) {
    return ResponseEntity.status(409)
        .body(
            Map.of(
                "message",
                "This record already exists or is still in use. Check unique fields and linked"
                    + " records."));
  }

  @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
  ResponseEntity<?> invalid() {
    return ResponseEntity.badRequest().body(Map.of("message", "Please send a valid request."));
  }
}
