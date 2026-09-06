const crypto = require("crypto");

const ingredients = [
  ["espresso", "base", "Espresso", 250, 5, "Rich, concentrated, full of possibility"],
  ["cold-brew", "base", "Cold brew", 300, 5, "Slow steeped. Naturally smooth."],
  ["filter", "base", "Pour-over", 280, 3, "Clear, delicate and quietly complex"],
  ["decaf", "base", "Decaf", 280, 5, "All the ritual, less caffeine"],
  ["ethiopia", "origin", "Ethiopia", 60, 0, "Yirgacheffe · floral / bergamot / citrus"],
  ["colombia", "origin", "Colombia", 40, 0, "Huila · caramel / cacao / red fruit"],
  ["brazil", "origin", "Brazil", 30, 0, "Cerrado · hazelnut / chocolate / honey"],
  ["oat", "milk", "Oat", 70, 90, "Silky, plant-based"],
  ["whole", "milk", "Whole milk", 40, 110, "Rich and beautifully rounded"],
  ["almond", "milk", "Almond", 70, 35, "Light with a nutty finish"],
  ["coconut", "milk", "Coconut", 80, 75, "Soft, tropical creaminess"],
  ["vanilla", "syrup", "Vanilla", 40, 25, "Madagascar vanilla"],
  ["caramel", "syrup", "Salted caramel", 50, 30, "A little sweet, a little sea salt"],
  ["maple", "syrup", "Maple", 50, 25, "Deep amber warmth"],
  ["rose", "flavor", "Rose", 50, 5, "A soft floral note"],
  ["orange", "flavor", "Orange blossom", 50, 5, "Bright and fragrant"],
  ["cacao", "flavor", "Cacao", 40, 10, "Deep chocolate complexity"],
  ["cinnamon", "topping", "Cinnamon", 20, 2, "A warming final touch"],
  ["cocoa", "topping", "Cocoa dust", 20, 5, "Fine dark cocoa"],
  ["foam", "topping", "Cloud foam", 60, 40, "An airy, velvety finish"],
].map(([id, category, name, price, calories, notes]) => ({ id, category, name, price, calories, notes, stock: 200, reserved: 0, threshold: 10, available: true }));

const memory = global.veloraMemory || (global.veloraMemory = { users: new Map(), recipes: new Map(), orders: new Map(), feedback: [] });
const defaults = { base: "espresso", origin: "ethiopia", milk: "oat", syrup: "none", flavor: "none", topping: "none", size: "Regular", roast: "Medium", shots: 0, sweetness: 30, strength: 65, temperature: 65, ice: 0, creativity: 50, mood: "Creative" };

function send(res, status, body) { res.status(status).json(body); }
function pathOf(req) {
  // Vercel normally exposes a catch-all parameter through req.query.path.
  // Fall back to the URL because this value can be absent with a static build
  // output configuration, which previously made every /api/* request return 404.
  const value = req.query?.path;
  if (value) return Array.isArray(value) ? value.join("/") : value;
  const pathname = new URL(req.url || "/api", "http://localhost").pathname;
  return pathname.replace(/^\/api\/?/, "");
}
function bodyOf(req) { return typeof req.body === "object" && req.body ? req.body : {}; }
function ensureAdmins() {
  for (const slot of ["1", "2"]) {
    const email = process.env[`ADMIN_${slot}_EMAIL`]?.trim().toLowerCase();
    const password = process.env[`ADMIN_${slot}_PASSWORD`];
    if (email && password && !memory.users.has(email)) {
      memory.users.set(email, { id: crypto.randomUUID(), email, password, name: process.env[`ADMIN_${slot}_NAME`] || `Atelier admin ${slot}`, role: "ADMIN" });
    }
  }
}
function requireAdmin(current, res) {
  if (current?.role === "ADMIN") return true;
  send(res, 403, { message: "This area is reserved for Atelier administrators." });
  return false;
}
function sessionSecret() { return process.env.SESSION_SECRET || ""; }
function sign(value) { return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url"); }
function startSession(res, profile) {
  if (!sessionSecret()) return false;
  const value = Buffer.from(JSON.stringify(profile)).toString("base64url");
  res.setHeader("Set-Cookie", `velora_session=${value}.${sign(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`);
  return true;
}
function user(req) {
  const token = (req.headers.cookie || "").match(/velora_session=([^;]+)/)?.[1];
  if (!token) return null;
  try {
    const [value, signature] = token.split(".");
    if (!sessionSecret() || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value)))) return null;
    return JSON.parse(Buffer.from(value, "base64url").toString());
  } catch { return null; }
}
function quote(input) {
  const config = { ...defaults, ...input };
  let price = config.shots * 90 + (config.size === "Large" ? 100 : config.size === "Small" ? -30 : 0);
  let calories = Math.floor(config.sweetness / 2);
  const items = ["base", "origin", "milk", "syrup", "flavor", "topping"].flatMap((category) => {
    const ingredient = ingredients.find((item) => item.id === config[category]);
    if (!ingredient) return [];
    const quantity = category === "origin" ? 1 + Number(config.shots) : category === "milk" && config.size === "Large" ? 2 : 1;
    price += ingredient.price * quantity; calories += ingredient.calories * quantity;
    return [{ id: ingredient.id, name: ingredient.name, category, quantity }];
  });
  return { config, ingredients: items, price, calories, minutes: 3 + Number(config.shots) + (config.milk === "none" ? 0 : 1), dna: { Intensity: Math.min(100, Number(config.strength) + Number(config.shots) * 5), Sweetness: Number(config.sweetness), Creaminess: config.milk === "none" ? 5 : config.milk === "almond" ? 55 : 85, Temperature: Number(config.temperature), Creativity: Math.min(100, Number(config.creativity) + (config.flavor === "none" ? 0 : 10)) } };
}

module.exports = async (req, res) => {
  ensureAdmins();
  const route = pathOf(req); const current = user(req);
  if (req.method === "GET" && route === "health") return send(res, 200, { status: "up", runtime: "vercel-serverless" });
  if (req.method === "GET" && route === "catalog") return send(res, 200, { ingredients, currency: "EUR" });
  if (req.method === "GET" && route === "auth/csrf") return send(res, 200, { token: crypto.randomUUID(), headerName: "x-csrf-token" });
  if (req.method === "GET" && route === "auth/me") return current ? send(res, 200, current) : send(res, 401, { message: "Please sign in to continue." });
  if (req.method === "POST" && route === "auth/register") {
    const { email, name, password } = bodyOf(req);
    if (!email || !name || !password || String(password).length < 12) return send(res, 400, { message: "Use a name, an email and a password of at least 12 characters." });
    if (memory.users.has(String(email).toLowerCase())) return send(res, 409, { message: "An account with this email already exists. Admin accounts use the password configured for them in Vercel." });
    const account = { id: crypto.randomUUID(), email: String(email).toLowerCase(), name: String(name), password: String(password), role: "CUSTOMER" };
    memory.users.set(account.email, account);
    const profile = { id: account.id, email: account.email, name: account.name, role: account.role };
    if (!startSession(res, profile)) return send(res, 500, { message: "SESSION_SECRET must be configured in Vercel before Passport accounts can be used." });
    return send(res, 201, profile);
  }
  if (req.method === "POST" && route === "auth/login") {
    const params = typeof req.body === "string" ? new URLSearchParams(req.body) : bodyOf(req);
    const email = typeof params.get === "function" ? params.get("email") : params.email;
    const password = typeof params.get === "function" ? params.get("password") : params.password;
    const account = memory.users.get(String(email || "").toLowerCase());
    if (!account || account.password !== password) return send(res, 401, { message: "Incorrect email or password." });
    const profile = { id: account.id, email: account.email, name: account.name, role: account.role };
    if (!startSession(res, profile)) return send(res, 500, { message: "SESSION_SECRET must be configured in Vercel before sign-in can be used." });
    return send(res, 200, profile);
  }
  if (req.method === "POST" && route === "auth/logout") { res.setHeader("Set-Cookie", "velora_session=; Path=/; HttpOnly; Secure; Max-Age=0"); return res.status(204).end(); }
  if (req.method === "POST" && route === "recommend") { const request = bodyOf(req); const q = quote({ ...request.preferences, mood: request.mood || "Creative" }); return send(res, 200, { name: `${q.config.mood} atelier coffee`, config: q.config, price: q.price, minutes: q.minutes, explanation: "A VELŌRA composition shaped around your selected mood." }); }
  if (req.method === "POST" && route === "recipes/quote") return send(res, 200, quote(bodyOf(req)));
  if (req.method === "POST" && route === "recipes") {
    if (!current) return send(res, 401, { message: "Please sign in to save a creation." });
    const request = bodyOf(req); const q = quote(request.config || {});
    const parent = request.parentId && memory.recipes.get(request.parentId);
    if (parent && parent.owner !== current.id) return send(res, 404, { message: "This original coffee could not be found." });
    const recipe = { id: crypto.randomUUID(), name: String(request.name || "Untitled coffee"), ...q, created_at: new Date().toISOString(), times_ordered: 0, parent_id: parent ? (parent.parent_id || parent.id) : undefined, version: parent ? (parent.version || 1) + 1 : 1, reactions: [] };
    memory.recipes.set(recipe.id, { ...recipe, owner: current.id }); return send(res, 201, recipe);
  }
  if (req.method === "GET" && route === "recipes") return current ? send(res, 200, [...memory.recipes.values()].filter((recipe) => recipe.owner === current.id)) : send(res, 401, { message: "Please sign in to continue." });
  if (req.method === "GET" && route === "passport") {
    if (!current) return send(res, 401, { message: "Please sign in to continue." });
    const recipes = [...memory.recipes.values()].filter((recipe) => recipe.owner === current.id);
    const orders = [...memory.orders.values()].filter((order) => order.owner_id === current.id);
    const counts = new Map();
    recipes.forEach((recipe) => recipe.ingredients.forEach((item) => counts.set(item.name, (counts.get(item.name) || 0) + item.quantity)));
    const favoriteIngredients = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, portions]) => ({ name, portions }));
    return send(res, 200, { recipes, orders, favoriteIngredients, completed: orders.filter((order) => order.status === "Completed").length, points: recipes.length * 10, streak: recipes.length ? 1 : 0, badges: recipes.length ? ["Espresso Explorer"] : [], favorite: recipes.slice().sort((a, b) => b.times_ordered - a.times_ordered)[0] });
  }
  const shareMatch = route.match(/^recipes\/([^/]+)\/share$/);
  if (shareMatch && req.method === "POST") {
    if (!current) return send(res, 401, { message: "Please sign in to share a coffee." });
    const recipe = memory.recipes.get(shareMatch[1]);
    if (!recipe || recipe.owner !== current.id) return send(res, 404, { message: "This coffee could not be found." });
    recipe.share_token ||= crypto.randomUUID().replaceAll("-", ""); return send(res, 200, { token: recipe.share_token });
  }
  if (shareMatch && req.method === "DELETE") {
    if (!current) return send(res, 401, { message: "Please sign in to continue." });
    const recipe = memory.recipes.get(shareMatch[1]);
    if (!recipe || recipe.owner !== current.id) return send(res, 404, { message: "This coffee could not be found." });
    delete recipe.share_token; return res.status(204).end();
  }
  const cardMatch = route.match(/^cards\/([^/]+)$/);
  if (cardMatch && req.method === "GET") {
    const recipe = [...memory.recipes.values()].find((item) => item.share_token === cardMatch[1]);
    return recipe ? send(res, 200, recipe) : send(res, 404, { message: "This coffee card could not be found." });
  }
  if (req.method === "POST" && route === "orders") {
    if (!current) return send(res, 401, { message: "Please sign in to create an order." });
    const recipe = memory.recipes.get(bodyOf(req).recipeId);
    if (!recipe || recipe.owner !== current.id) return send(res, 404, { message: "Save this coffee before crafting it." });
    const order = { id: crypto.randomUUID(), owner_id: current.id, recipe_id: recipe.id, status: "Created", stage: -1, price: recipe.price, customer: current.name, created_at: new Date().toISOString(), priority: 0, snapshot: { name: recipe.name, config: recipe.config, dna: recipe.dna, ingredients: recipe.ingredients, calories: recipe.calories, minutes: recipe.minutes } };
    recipe.times_ordered += 1; memory.orders.set(order.id, order); return send(res, 201, order);
  }
  const orderMatch = route.match(/^orders\/([^/]+)$/);
  if (orderMatch && req.method === "GET") {
    const order = memory.orders.get(orderMatch[1]);
    return order && current?.id === order.owner_id ? send(res, 200, order) : send(res, 404, { message: "This coffee journey could not be found." });
  }
  if (req.method === "GET" && route === "staff/orders") {
    if (!requireAdmin(current, res)) return;
    return send(res, 200, [...memory.orders.values()].filter((order) => !["Completed", "Cancelled"].includes(order.status)));
  }
  const staffMatch = route.match(/^staff\/orders\/([^/]+)\/(advance|cancel|priority)$/);
  if (staffMatch && ["POST", "PATCH"].includes(req.method)) {
    if (!requireAdmin(current, res)) return;
    const order = memory.orders.get(staffMatch[1]);
    if (!order) return send(res, 404, { message: "This order could not be found." });
    if (staffMatch[2] === "priority") order.priority = Math.max(0, Math.min(2, Number(bodyOf(req).priority) || 0));
    else if (staffMatch[2] === "cancel") { order.status = "Cancelled"; order.stage = -1; }
    else { const stages = ["Confirmed", "Queued", "Preparing", "Crafting", "Ready", "Delivered", "Completed"]; order.stage = Math.min(order.stage + 1, stages.length - 1); order.status = stages[order.stage]; }
    return send(res, 200, order);
  }
  if (route === "admin/analytics" && req.method === "GET") {
    if (!requireAdmin(current, res)) return;
    const recipes = [...memory.recipes.values()], orders = [...memory.orders.values()];
    return send(res, 200, { totalOrders: orders.length, totalRecipes: recipes.length, totalCustomers: [...memory.users.values()].filter((item) => item.role === "CUSTOMER").length, revenue: orders.reduce((sum, order) => sum + order.price, 0), activeOrders: orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length });
  }
  const adminMatch = route.match(/^admin\/(ingredients|users|recipes|orders|tables|records\/[^/]+)$/);
  if (adminMatch && req.method === "GET") {
    if (!requireAdmin(current, res)) return;
    const resource = adminMatch[1];
    if (resource === "ingredients") return send(res, 200, ingredients);
    if (resource === "users") return send(res, 200, [...memory.users.values()].map(({ password, ...account }) => account));
    if (resource === "recipes") return send(res, 200, [...memory.recipes.values()]);
    if (resource === "orders") return send(res, 200, [...memory.orders.values()]);
    return send(res, 200, []);
  }
  if (req.method === "POST" && route === "feedback") {
    if (!current) return send(res, 401, { message: "Please sign in to share feedback." });
    const { reaction, message, recipeId } = bodyOf(req);
    const note = String(message || "").trim();
    const allowed = ["Loved it", "Made my morning", "Gave me energy", "Helped me focus", "Perfect night coffee"];
    if (!allowed.includes(reaction)) return send(res, 400, { message: "Choose one of the coffee memories." });
    if (note.length > 1000)
      return send(res, 400, { message: "Your feedback must be 1,000 characters or fewer." });
    const feedback = {
      id: crypto.randomUUID(),
      customerId: current.id,
      reaction,
      recipeId,
      message: note,
      createdAt: new Date().toISOString(),
    };
    const recipe = recipeId && memory.recipes.get(recipeId);
    if (recipe && recipe.owner === current.id) recipe.reactions = [...(recipe.reactions || []), reaction];
    memory.feedback.push(feedback);
    return send(res, 201, { id: feedback.id });
  }
  return send(res, 404, { message: "This Vercel API route is not available yet." });
};
