export type Config = {
  base: string;
  origin: string;
  roast: string;
  strength: number;
  milk: string;
  syrup: string;
  flavor: string;
  sweetness: number;
  temperature: number;
  ice: number;
  topping: string;
  size: string;
  shots: number;
  creativity: number;
  mood: string;
};
export type Ingredient = {
  id: string;
  category: string;
  name: string;
  price: number;
  calories: number;
  stock: number;
  reserved: number;
  threshold: number;
  available: boolean;
  notes: string;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "BARISTA" | "ADMIN";
};
export type DNA = Record<string, number>;
export type Recipe = {
  id: string;
  name: string;
  config: Config;
  dna: DNA;
  created_at: string;
  times_ordered: number;
  share_token?: string;
  barista?: string;
  location?: string;
};
export type Order = {
  id: string;
  recipe_id: string;
  status: string;
  stage: number;
  price: number;
  customer: string;
  table_label?: string;
  barista?: string;
  specialty?: string;
  experience?: number;
  image_url?: string;
  created_at: string;
  priority: number;
  snapshot: {
    name: string;
    config: Config;
    dna: DNA;
    ingredients: { id: string; name: string; quantity: number }[];
    calories: number;
    minutes: number;
  };
};
export type Passport = {
  favoriteIngredients: {name:string;portions:number}[];
  recipes: Recipe[];
  orders: Order[];
  completed: number;
  points: number;
  streak: number;
  badges: string[];
  favorite?: Recipe;
};
export const defaultConfig: Config = {
  base: "espresso",
  origin: "ethiopia",
  roast: "Medium",
  strength: 65,
  milk: "oat",
  syrup: "none",
  flavor: "none",
  sweetness: 30,
  temperature: 65,
  ice: 0,
  topping: "none",
  size: "Regular",
  shots: 0,
  creativity: 50,
  mood: "Creative",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export function preview(c: Config, ingredients: Ingredient[]) {
  let price =
      c.shots * 90 + (c.size === "Large" ? 100 : c.size === "Small" ? -30 : 0),
    calories = Math.floor(c.sweetness / 2);
  const items = ingredients.filter((i) =>
    [c.base, c.origin, c.milk, c.syrup, c.flavor, c.topping].includes(i.id),
  );
  for (const i of items) {
    const quantity =
      i.category === "origin"
        ? 1 + c.shots
        : i.category === "milk" && c.size === "Large"
          ? 2
          : 1;
    price += i.price * quantity;
    calories += i.calories * quantity;
  }
  return {
    price,
    calories,
    minutes: 3 + c.shots + (c.milk === "none" ? 0 : 1),
    items,
    dna: {
      Intensity: Math.min(100, c.strength + c.shots * 5),
      Sweetness: c.sweetness,
      Creaminess: c.milk === "none" ? 5 : c.milk === "almond" ? 55 : 85,
      Temperature: c.temperature,
      Creativity: Math.min(100, c.creativity + (c.flavor === "none" ? 0 : 10)),
    } as DNA,
  };
}
