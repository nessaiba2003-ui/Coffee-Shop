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

const memory = global.veloraMemory || (global.veloraMemory = { users: new Map(), recipes: new Map() });
const defaults = { base: "espresso", origin: "ethiopia", milk: "oat", syrup: "none", flavor: "none", topping: "none", size: "Regular", roast: "Medium", shots: 0, sweetness: 30, strength: 65, temperature: 65, ice: 0, creativity: 50, mood: "Creative" };

function send(res, status, body) { res.status(status).json(body); }
function pathOf(req) { const value = req.query.path || []; return Array.isArray(value) ? value.join("/") : value; }
function bodyOf(req) { return typeof req.body === "object" && req.body ? req.body : {}; }
function sessionSecret() { return process.env.SESSION_SECRET || ""; }
function sign(value) { return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url"); }
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
  const route = pathOf(req); const current = user(req);
  if (req.method === "GET" && route === "health") return send(res, 200, { status: "up", runtime: "vercel-serverless" });
  if (req.method === "GET" && route === "catalog") return send(res, 200, { ingredients, currency: "EUR" });
  if (req.method === "GET" && route === "auth/csrf") return send(res, 200, { token: crypto.randomUUID(), headerName: "x-csrf-token" });
  if (req.method === "GET" && route === "auth/me") return current ? send(res, 200, current) : send(res, 401, { message: "Please sign in to continue." });
  if (req.method === "POST" && route === "auth/register") {
    const { email, name, password } = bodyOf(req);
    if (!email || !name || !password || String(password).length < 12) return send(res, 400, { message: "Use a name, an email and a password of at least 12 characters." });
    if (memory.users.has(String(email).toLowerCase())) return send(res, 409, { message: "An account with this email already exists." });
    memory.users.set(String(email).toLowerCase(), { id: crypto.randomUUID(), email: String(email).toLowerCase(), name: String(name), password: String(password), role: "CUSTOMER" });
    return send(res, 201, { id: memory.users.get(String(email).toLowerCase()).id });
  }
  if (req.method === "POST" && route === "auth/login") {
    const params = typeof req.body === "string" ? new URLSearchParams(req.body) : bodyOf(req);
    const email = typeof params.get === "function" ? params.get("email") : params.email;
    const password = typeof params.get === "function" ? params.get("password") : params.password;
    const account = memory.users.get(String(email || "").toLowerCase());
    if (!account || account.password !== password) return send(res, 401, { message: "Incorrect email or password." });
    const profile = { id: account.id, email: account.email, name: account.name, role: account.role };
    if (!sessionSecret()) return send(res, 500, { message: "SESSION_SECRET must be configured in Vercel before sign-in can be used." });
    const value = Buffer.from(JSON.stringify(profile)).toString("base64url");
    res.setHeader("Set-Cookie", `velora_session=${value}.${sign(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`);
    return send(res, 200, profile);
  }
  if (req.method === "POST" && route === "auth/logout") { res.setHeader("Set-Cookie", "velora_session=; Path=/; HttpOnly; Secure; Max-Age=0"); return res.status(204).end(); }
  if (req.method === "POST" && route === "recommend") { const request = bodyOf(req); const q = quote({ ...request.preferences, mood: request.mood || "Creative" }); return send(res, 200, { name: `${q.config.mood} atelier coffee`, config: q.config, price: q.price, minutes: q.minutes, explanation: "A VELŌRA composition shaped around your selected mood." }); }
  if (req.method === "POST" && route === "recipes/quote") return send(res, 200, quote(bodyOf(req)));
  if (req.method === "POST" && route === "recipes") {
    if (!current) return send(res, 401, { message: "Please sign in to save a creation." });
    const request = bodyOf(req); const q = quote(request.config || {}); const recipe = { id: crypto.randomUUID(), name: String(request.name || "Untitled coffee"), ...q, created_at: new Date().toISOString(), times_ordered: 0 };
    memory.recipes.set(recipe.id, { ...recipe, owner: current.id }); return send(res, 201, recipe);
  }
  if (req.method === "GET" && route === "recipes") return current ? send(res, 200, [...memory.recipes.values()].filter((recipe) => recipe.owner === current.id)) : send(res, 401, { message: "Please sign in to continue." });
  return send(res, 404, { message: "This Vercel API route is not available yet." });
};
