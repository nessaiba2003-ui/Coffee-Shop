package studio.velora;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
class Security {
  @Bean
  PasswordEncoder passwords() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  UserDetailsService users(JdbcTemplate db) {
    return email -> {
      var rows = db.queryForList("SELECT * FROM users WHERE email=?", email.toLowerCase());
      if (rows.isEmpty()) throw new UsernameNotFoundException("Invalid credentials");
      var u = rows.get(0);
      return User.withUsername((String) u.get("email"))
          .password((String) u.get("password"))
          .roles((String) u.get("role"))
          .disabled(!Boolean.TRUE.equals(u.get("active")))
          .build();
    };
  }

  @Bean
  SecurityFilterChain chain(HttpSecurity http, JdbcTemplate db) throws Exception {
    http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/auth/csrf",
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/catalog",
                        "/api/recommend",
                        "/api/cards/**",
                        "/api/tables/**",
                        "/api/health")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/staff/**")
                    .hasAnyRole("ADMIN", "BARISTA")
                    .requestMatchers("/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .formLogin(
            f ->
                f.loginProcessingUrl("/api/auth/login")
                    .usernameParameter("email")
                    .successHandler(
                        (q, r, a) -> {
                          r.setContentType("application/json");
                          r.getWriter().write("{\"ok\":true}");
                        })
                    .failureHandler(
                        (q, r, e) -> {
                          r.setStatus(401);
                          r.setContentType("application/json");
                          r.getWriter().write("{\"message\":\"Email or password is incorrect.\"}");
                        }))
        .logout(
            l ->
                l.logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler((q, r, a) -> r.setStatus(204))
                    .invalidateHttpSession(true)
                    .deleteCookies("JSESSIONID"))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (q, r, x) -> {
                          r.setStatus(401);
                          r.setContentType("application/json");
                          r.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
                        })
                    .accessDeniedHandler(
                        (q, r, x) -> {
                          r.setStatus(403);
                          r.setContentType("application/json");
                          r.getWriter()
                              .write(
                                  "{\"message\":\"You do not have access, or your session token"
                                      + " expired. Refresh and try again.\"}");
                        }))
        .addFilterBefore(new LoginRateLimit(), UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(new CurrentAccountFilter(db), AuthorizationFilter.class);
    return http.build();
  }

  static class CurrentAccountFilter extends OncePerRequestFilter {
    private final JdbcTemplate db;

    CurrentAccountFilter(JdbcTemplate db) {
      this.db = db;
    }

    protected void doFilterInternal(HttpServletRequest q, HttpServletResponse r, FilterChain chain)
        throws ServletException, IOException {
      var auth = SecurityContextHolder.getContext().getAuthentication();
      if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
        var rows = db.queryForList("SELECT active,role FROM users WHERE email=?", auth.getName());
        if (rows.isEmpty() || !Boolean.TRUE.equals(rows.get(0).get("active"))) {
          SecurityContextHolder.clearContext();
          if (q.getSession(false) != null) q.getSession(false).invalidate();
          r.setStatus(401);
          r.setContentType("application/json");
          r.getWriter().write("{\"message\":\"This account is no longer active.\"}");
          return;
        }
        var current =
            new UsernamePasswordAuthenticationToken(
                auth.getPrincipal(),
                null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_" + rows.get(0).get("role"))));
        SecurityContextHolder.getContext().setAuthentication(current);
      }
      chain.doFilter(q, r);
    }
  }

  static class LoginRateLimit extends OncePerRequestFilter {
    private final Map<String, long[]> attempts = new ConcurrentHashMap<>();

    protected void doFilterInternal(HttpServletRequest q, HttpServletResponse r, FilterChain chain)
        throws ServletException, IOException {
      if (q.getMethod().equals("POST")
          && (q.getRequestURI().equals("/api/auth/login")
              || q.getRequestURI().equals("/api/auth/register"))) {
        long now = Instant.now().getEpochSecond();
        if (attempts.size() > 10000) attempts.entrySet().removeIf(e -> now - e.getValue()[0] > 300);
        long[] v =
            attempts.compute(
                q.getRemoteAddr(),
                (k, old) ->
                    old == null || now - old[0] > 300
                        ? new long[] {now, 1}
                        : new long[] {old[0], old[1] + 1});
        if (v[1] > 30) {
          r.setStatus(429);
          r.setContentType("application/json");
          r.getWriter().write("{\"message\":\"Too many attempts. Please wait five minutes.\"}");
          return;
        }
      }
      chain.doFilter(q, r);
    }
  }
}
