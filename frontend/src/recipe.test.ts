import { describe, it, expect } from "vitest";
import { preview, defaultConfig, type Ingredient } from "./types";
const ingredients: Ingredient[] = [
  {
    id: "espresso",
    category: "base",
    name: "Espresso",
    price: 250,
    calories: 5,
    stock: 20,
    reserved: 0,
    threshold: 5,
    available: true,
    notes: "",
  },
  {
    id: "ethiopia",
    category: "origin",
    name: "Ethiopia",
    price: 60,
    calories: 0,
    stock: 20,
    reserved: 0,
    threshold: 5,
    available: true,
    notes: "",
  },
  {
    id: "oat",
    category: "milk",
    name: "Oat",
    price: 70,
    calories: 90,
    stock: 20,
    reserved: 0,
    threshold: 5,
    available: true,
    notes: "",
  },
];
describe("Customer estimates", () => {
  it("matches the server portion and shot pricing contract", () => {
    expect(preview(defaultConfig, ingredients).price).toBe(380);
    expect(
      preview({ ...defaultConfig, size: "Large", shots: 2 }, ingredients).price,
    ).toBe(850);
  });
  it("keeps DNA bounded and removes creaminess for black coffee", () => {
    const dna = preview(
      {
        ...defaultConfig,
        strength: 100,
        shots: 3,
        milk: "none",
        creativity: 100,
        flavor: "rose",
      },
      ingredients,
    ).dna;
    expect(dna.Intensity).toBe(100);
    expect(dna.Creativity).toBe(100);
    expect(dna.Creaminess).toBe(5);
  });
});
