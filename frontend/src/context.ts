import { createContext, useContext } from "react";
import type { Ingredient, User } from "./types";

type Context = {
  user: User | null;
  ingredients: Ingredient[];
  catalogError: string;
  signIn: () => void;
  notify: (message: string) => void;
  reloadCatalog: () => void;
};

export const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
