// Exercises the real HTTP API and streaming transport against a running local server.
// Creates clearly named test accounts and orders; never contacts a payment service.
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base = process.env.SMOKE_URL || "http://127.0.0.1:8080/api";
class Client {
  cookie = "";
  csrf = null;
  async request(path, method = "GET", body, form = false) {
    const headers = {};
    if (method !== "GET") {
      if (!this.csrf) await this.token();
      headers[this.csrf.headerName] = this.csrf.token;
    }
    if (this.cookie) headers.Cookie = this.cookie;
    if (body)
      headers["Content-Type"] = form
        ? "application/x-www-form-urlencoded"
        : "application/json";
    const response = await fetch(base + path, {
      method,
      headers,
      body: body
        ? form
          ? new URLSearchParams(body)
          : JSON.stringify(body)
        : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      if (cookie.startsWith("JSESSIONID=")) this.cookie = cookie.split(";")[0];
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { status: response.status, data };
  }
  async token() {
    this.csrf = (await this.request("/auth/csrf")).data;
  }
  async login(email, password) {
    await this.token();
    const r = await this.request(
      "/auth/login",
      "POST",
      { email, password },
      true,
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    await this.token();
  }
  async ok(path, method = "GET", body) {
    const r = await this.request(path, method, body);
    assert.ok(
      r.status >= 200 && r.status < 300,
      `${method} ${path}: ${r.status} ${JSON.stringify(r.data)}`,
    );
    return r.data;
  }
}
const adminCredentials = JSON.parse(
  await readFile(".local/dev-credentials.json", "utf8"),
);
const admin = new Client();
await admin.login(adminCredentials.email, adminCredentials.password);
const catalog = await admin.ok("/catalog");
assert.ok(catalog.ingredients.length >= 20);
const customer = new Client(),
  other = new Client();
const email = "smoke-" + randomUUID().slice(0, 8) + "@example.test",
  password = randomUUID();
await customer.ok("/auth/register", "POST", {
  email,
  password,
  name: "Verification guest",
});
await customer.login(email, password);
assert.equal((await customer.request("/admin/users")).status, 403);
const suggestion = await customer.ok("/recommend", "POST", {
  prompt: "creamy, not too sweet, cold and energetic",
  mood: "Creative",
  preferences: {},
});
assert.equal(suggestion.config.sweetness, 15);
assert.equal(suggestion.config.temperature, 10);
const recipe = await customer.ok("/recipes", "POST", {
  name: "Verification · Cloud Theory",
  config: suggestion.config,
});
const tables = await admin.ok("/admin/tables");
const key = randomUUID();
const order = await customer.ok("/orders", "POST", {
  recipeId: recipe.id,
  tableToken: tables[0].token,
  idempotencyKey: key,
});
assert.equal(order.status, "Created");
assert.ok(order.table_label);
assert.equal(
  (
    await customer.ok("/orders", "POST", {
      recipeId: recipe.id,
      idempotencyKey: key,
    })
  ).id,
  order.id,
);
assert.equal((await other.request("/orders/" + order.id)).status, 401);
const stream = await fetch(base + "/orders/" + order.id + "/events", {
  headers: { Cookie: customer.cookie },
  signal: AbortSignal.timeout(20000),
});
assert.equal(stream.status, 200);
assert.match(stream.headers.get("content-type"), /text\/event-stream/);
const reader = stream.body.getReader();
const decoder = new TextDecoder();
let initial = "";
while (!initial.includes("event:order")) {
  const { value, done } = await reader.read();
  assert.equal(done, false);
  initial += decoder.decode(value);
}
await admin.ok("/staff/orders/" + order.id + "/advance", "POST");
let changed = "";
while (!changed.includes("Confirmed")) {
  const { value, done } = await reader.read();
  assert.equal(done, false);
  changed += decoder.decode(value);
}
await reader.cancel();
for (let i = 0; i < 10; i++)
  await admin.ok("/staff/orders/" + order.id + "/advance", "POST");
const completed = await customer.ok("/orders/" + order.id);
assert.equal(completed.status, "Completed");
const passport = await customer.ok("/passport");
assert.equal(passport.completed, 1);
assert.equal(passport.points, 25);
assert.equal(passport.favorite.id, recipe.id);
const share = await customer.ok("/recipes/" + recipe.id + "/share", "POST");
const card = await other.ok("/cards/" + share.token);
assert.equal(card.name, recipe.name);
assert.equal(card.owner_id, undefined);
await customer.ok("/recipes/" + recipe.id + "/share", "DELETE");
assert.equal((await other.request("/cards/" + share.token)).status, 404);
const analytics = await admin.ok("/admin/analytics");
assert.ok(analytics.revenue >= order.price);
assert.ok(analytics.completed >= 1);
await writeFile(
  ".local/verification-account.json",
  JSON.stringify(
    { email, password, orderId: order.id, recipeId: recipe.id },
    null,
    2,
  ),
);
console.log(
  "PASS: registration, session login, role protection, recommendations, recipe persistence, table order, idempotent retry, authenticated SSE update, full crafting lifecycle, passport, sharing/revocation, analytics.",
);
console.log(
  "Local verification account saved in .local/verification-account.json. No credentials logged.",
);
