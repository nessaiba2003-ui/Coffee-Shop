import type { Config, DNA, Recipe } from "./types";

export type CoffeePersonality = {
  name: string;
  traits: string[];
  description: string;
};

const personalities = [
  "The Explorer", "The Dreamer", "The Strategist", "The Rebel",
  "The Minimalist", "The Romantic", "The Night Thinker", "The Optimist",
];

export function coffeePersonality(dna: DNA): CoffeePersonality {
  const signature = dna.Intensity * 3 + dna.Sweetness * 5 + dna.Creaminess * 7 + dna.Temperature * 11 + dna.Creativity * 13;
  const name = personalities[signature % personalities.length];
  const traits = [
    dna.Intensity > 70 ? "Deep" : "Light",
    dna.Creaminess > 65 ? "Creamy" : "Clean",
    dna.Creativity > 70 ? "Unexpected" : dna.Sweetness > 60 ? "Soft" : "Precise",
  ];
  const endings: Record<string, string> = {
    "The Explorer": "Always looking for a new edge of the map.",
    "The Dreamer": "A quiet thought, made warm enough to hold.",
    "The Strategist": "Every note has a reason for being here.",
    "The Rebel": "Comfort, with one beautiful rule broken.",
    "The Minimalist": "Nothing extra. Nothing missing.",
    "The Romantic": "A little tenderness in every layer.",
    "The Night Thinker": "Built for ideas that arrive after dark.",
    "The Optimist": "A bright turn in the shape of a cup.",
  };
  return { name, traits, description: endings[name] };
}

export function coffeeStory(config: Config, dna: DNA) {
  const p = coffeePersonality(dna);
  const origin = config.origin === "ethiopia" ? "Ethiopian" : config.origin === "colombia" ? "Colombian" : "Brazilian";
  const milk = config.milk === "none" ? "a clean finish" : `soft ${config.milk} milk`;
  const flavor = config.flavor === "none" ? "" : ` and a trace of ${config.flavor}`;
  return `Born for ${config.mood.toLowerCase()} moments, this ${p.name.toLowerCase()} balances ${origin} coffee with ${milk}${flavor}.`;
}

export function timeMoment(now = new Date()) {
  const hour = now.getHours();
  if (hour < 11) return { title: "Good morning.", prompt: "Want something energizing?", mood: "Need Energy" };
  if (hour < 17) return { title: "A pause with purpose.", prompt: "Need a focus boost?", mood: "Focus" };
  if (hour < 22) return { title: "Ease into the evening.", prompt: "Something slower tonight?", mood: "Calm" };
  return { title: "Still awake?", prompt: "Make room for one more idea.", mood: "Late Night" };
}

export const discoveries: Array<{ title: string; note: string; config: Partial<Config> }> = [
  { title: "Coffee for late-night ideas", note: "Deep, calm, and quietly awake.", config: { mood: "Late Night", strength: 82, sweetness: 25, flavor: "cacao" } },
  { title: "A recipe born in Bogotá", note: "Colombian coffee with soft edges.", config: { mood: "Creative", origin: "colombia", milk: "oat", flavor: "vanilla" } },
  { title: "The barista’s favorite", note: "Oat, vanilla, and a little sea-cloud finish.", config: { mood: "Romantic", shots: 2, milk: "oat", syrup: "vanilla", topping: "foam" } },
];

export function recipeDistance(a: Recipe, b: Recipe) {
  return Math.sqrt(Object.keys(a.dna).reduce((sum, key) => sum + (a.dna[key] - b.dna[key]) ** 2, 0));
}
