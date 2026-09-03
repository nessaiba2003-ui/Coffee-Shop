package studio.velora;

import java.util.*;
import java.util.concurrent.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
class Events {
  private final Map<String, CopyOnWriteArrayList<SseEmitter>> listeners = new ConcurrentHashMap<>();

  SseEmitter subscribe(String id, Object initial) {
    var emitter = new SseEmitter(600000L);
    var list = listeners.computeIfAbsent(id, k -> new CopyOnWriteArrayList<>());
    list.add(emitter);
    Runnable remove =
        () -> {
          list.remove(emitter);
          if (list.isEmpty()) listeners.remove(id, list);
        };
    emitter.onCompletion(remove);
    emitter.onTimeout(
        () -> {
          remove.run();
          emitter.complete();
        });
    emitter.onError(e -> remove.run());
    try {
      emitter.send(SseEmitter.event().name("order").data(initial));
    } catch (Exception e) {
      remove.run();
    }
    return emitter;
  }

  void publish(String id, Object order) {
    for (var e : listeners.getOrDefault(id, new CopyOnWriteArrayList<>()))
      try {
        e.send(SseEmitter.event().name("order").data(order));
      } catch (Exception x) {
        e.complete();
      }
  }
}
