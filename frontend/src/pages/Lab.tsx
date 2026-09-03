import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Plus,
  Minus,
  Bookmark,
  FlaskConical,
  Check,
  Send,
  Thermometer,
  Clock,
  Leaf,
} from "lucide-react";
import { useApp } from "../context";
import { api } from "../api";
import {
  defaultConfig,
  preview,
  money,
  type Config,
  type Recipe,
  type Order,
} from "../types";
import { CoffeeVisual, Dna, Eyebrow, ErrorNote, Modal } from "../ui";
import { moods } from "./Home";
const steps = ["The foundation", "Make it yours", "The final touch"];
export function Lab() {
  const { ingredients, catalogError, user, signIn, notify, reloadCatalog } =
    useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config>(() => {
    try {
      return {
        ...defaultConfig,
        ...JSON.parse(localStorage.getItem("velora-draft-v1") || "{}"),
      };
    } catch {
      return defaultConfig;
    }
  });
  const [name, setName] = useState("My little ritual"),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [architect, setArchitect] = useState(false),
    [prompt, setPrompt] = useState(""),
    [suggestion, setSuggestion] = useState<{
      name: string;
      config: Config;
      price: number;
      minutes: number;
      explanation: string;
    } | null>(null),
    [table, setTable] = useState<{ label: string; token: string } | null>(null);
  const key = useRef(crypto.randomUUID());
  const current = preview(config, ingredients);
  const activeMood = params.get("mood");
  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSuggestion(null);
  }
  useEffect(() => {
    localStorage.setItem("velora-draft-v1", JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    const token = params.get("table") || sessionStorage.getItem("velora-table");
    if (token)
      api<{ label: string; token: string }>(
        "/tables/" + encodeURIComponent(token),
      )
        .then((t) => {
          setTable(t);
          sessionStorage.setItem("velora-table", t.token);
        })
        .catch(() => {
          setError(
            "This table link is no longer active. Your order will be for counter pickup.",
          );
          sessionStorage.removeItem("velora-table");
        });
  }, [params]);
  useEffect(() => {
    if (activeMood) {
      setBusy(true);
      api<{ name: string; config: Config }>("/recommend", "POST", {
        mood: activeMood,
        prompt: "",
        preferences: config,
      })
        .then((r) => {
          setConfig(r.config);
          setName(r.name);
          notify(
            "A starting point for your " +
              activeMood.toLowerCase() +
              " moment.",
          );
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }
  }, [activeMood]);
  async function save(order: boolean) {
    if (!user) {
      signIn();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<Recipe>("/recipes", "POST", { name, config });
      if (order) {
        const o = await api<Order>("/orders", "POST", {
          recipeId: r.id,
          tableToken: table?.token,
          idempotencyKey: key.current,
        });
        key.current = crypto.randomUUID();
        navigate("/craft/" + o.id);
      } else {
        notify("Your creation is now in your Coffee Passport.");
        navigate("/passport");
      }
    } catch (e) {
      setError((e as Error).message);
      reloadCatalog();
    } finally {
      setBusy(false);
    }
  }
  const choice = (
    category: "base" | "origin" | "milk" | "syrup" | "flavor" | "topping",
    title: string,
    optional = false,
  ) => (
    <div className="choice-group">
      <h3>{title}</h3>
      <div
        className={
          "choices " +
          (category === "base" || category === "origin" ? "wide-choices" : "")
        }
      >
        {optional && (
          <button
            className={
              config[category] === "none" ? "choice selected" : "choice"
            }
            onClick={() => update(category, "none")}
          >
            <span>None</span>
            {config[category] === "none" && <Check size={15} />}
          </button>
        )}
        {ingredients
          .filter((i) => i.category === category)
          .map((i) => (
            <button
              key={i.id}
              disabled={!i.available || i.stock - i.reserved < 1}
              className={
                config[category] === i.id ? "choice selected" : "choice"
              }
              onClick={() => update(category, i.id)}
            >
              <div>
                <span>{i.name}</span>
                {(category === "base" || category === "origin") && (
                  <small>{i.notes}</small>
                )}
              </div>
              <span className="choice-price">
                {i.available && i.stock > i.reserved ? (
                  config[category] === i.id ? (
                    <Check size={15} />
                  ) : (
                    money(i.price)
                  )
                ) : (
                  "Unavailable"
                )}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
  const slider = (
    field: "strength" | "sweetness" | "temperature" | "ice" | "creativity",
    title: string,
    left: string,
    right: string,
  ) => (
    <label className="slider-label">
      <span>
        {title}
        <strong>
          {config[field]}
          {field === "temperature" ? "° profile" : "%"}
        </strong>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={config[field]}
        onChange={(e) => update(field, Number(e.target.value))}
        style={{ "--range": config[field] + "%" } as React.CSSProperties}
      />
      <small>
        <span>{left}</span>
        <span>{right}</span>
      </small>
    </label>
  );
  return (
    <div className="page lab-page">
      <div className="page-intro">
        <div>
          <Eyebrow>THE COFFEE LAB / YOUR RULES APPLY</Eyebrow>
          <h1>
            A little experiment.
            <br />
            <em>A lot of you.</em>
          </h1>
        </div>
        <button className="architect-button" onClick={() => setArchitect(true)}>
          <Sparkles size={19} />
          <span>
            Not sure where to start?
            <strong>
              Ask the Coffee Architect <ArrowUpRight size={14} />
            </strong>
          </span>
        </button>
      </div>
      {catalogError && (
        <div className="error-note">
          {catalogError}{" "}
          <button className="text-link" onClick={reloadCatalog}>
            Reconnect
          </button>
        </div>
      )}
      <div className="lab-layout">
        <section className="lab-controls">
          <div className="step-tabs">
            {steps.map((s, i) => (
              <button
                key={s}
                className={step === i ? "active" : ""}
                onClick={() => setStep(i)}
              >
                <span>0{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          <div className="lab-step" key={step}>
            {step === 0 ? (
              <>
                {choice("base", "First, find your foundation.")}
                {choice("origin", "Every story starts somewhere.")}
                <div className="choice-group">
                  <h3>Your roast</h3>
                  <div className="segmented">
                    {["Light", "Medium", "Dark"].map((r) => (
                      <button
                        className={config.roast === r ? "active" : ""}
                        key={r}
                        onClick={() => update("roast", r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {slider(
                  "strength",
                  "Set the intensity",
                  "Light & delicate",
                  "Bold & intense",
                )}
              </>
            ) : step === 1 ? (
              <>
                {choice("milk", "Make it silky.", true)}
                {choice("syrup", "A little sweetness?", true)}
                {choice("flavor", "Take an unexpected turn.", true)}
                {slider(
                  "sweetness",
                  "Sweetness",
                  "Beautifully bitter",
                  "Sweet disposition",
                )}
                {slider(
                  "temperature",
                  "Your temperature",
                  "Ice cold",
                  "Comfortably hot",
                )}
                {config.temperature < 35 &&
                  slider("ice", "On the rocks", "No ice", "Extra ice")}
              </>
            ) : (
              <>
                {choice("topping", "The finishing touch.", true)}
                <div className="choice-group">
                  <h3>A moment, or a little longer?</h3>
                  <div className="segmented">
                    {["Small", "Regular", "Large"].map((size) => (
                      <button
                        className={config.size === size ? "active" : ""}
                        key={size}
                        onClick={() => update("size", size)}
                      >
                        {size}
                        <small>
                          {size === "Small"
                            ? "180"
                            : size === "Regular"
                              ? "250"
                              : "350"}{" "}
                          ml
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="extra-shots">
                  <span>
                    Extra espresso shots<small>A little more momentum.</small>
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      disabled={config.shots === 0}
                      onClick={() => update("shots", config.shots - 1)}
                      aria-label="Fewer extra shots"
                    >
                      <Minus size={16} />
                    </button>
                    <b>{config.shots}</b>
                    <button
                      className="icon-button"
                      disabled={config.shots === 3}
                      onClick={() => update("shots", config.shots + 1)}
                      aria-label="More extra shots"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {slider(
                  "creativity",
                  "Your creative signature",
                  "Keep it classic",
                  "Push the boundaries",
                )}
                <label className="name-label">
                  Give your creation a name.
                  <input
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The name of your next favorite"
                  />
                </label>
                <label className="name-label">
                  The feeling behind it
                  <select
                    value={config.mood}
                    onChange={(e) => update("mood", e.target.value)}
                  >
                    {moods.map((m) => (
                      <option key={m.name}>{m.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="step-footer">
            <button
              className="text-link"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <span>0{step + 1} / 03</span>
            {step < 2 ? (
              <button className="button" onClick={() => setStep(step + 1)}>
                Keep creating <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={() => save(false)}
                disabled={busy || !ingredients.length || !name.trim()}
              >
                <Bookmark size={16} /> Save creation
              </button>
            )}
          </div>
        </section>
        <aside className="lab-preview">
          <div className="preview-top">
            <Eyebrow>
              <span className="live-dot" /> YOUR CREATION, IN THE MAKING
            </Eyebrow>
            <span>↗</span>
          </div>
          <CoffeeVisual config={config} />
          <div className="preview-info">
            <div className="preview-name">
              <div>
                <span className="eyebrow">ONE OF A KIND. JUST LIKE YOU.</span>
                <h2>{name || "Your creation"}</h2>
              </div>
              <span className="price">
                {ingredients.length ? money(current.price) : "—"}
              </span>
            </div>
            <p className="ingredient-line">
              {current.items.map((i) => i.name).join(" · ") ||
                "Connecting to the atelier…"}
            </p>
            <div className="preview-meta">
              <span>
                <Clock size={13} />
                {current.minutes} min
              </span>
              <span>
                <Leaf size={13} />~{current.calories} kcal
              </span>
              <span>
                <Thermometer size={13} />
                {config.temperature < 35
                  ? "Iced"
                  : config.temperature > 70
                    ? "Hot"
                    : "Warm"}
              </span>
            </div>
            <div className="dna-header">
              <Eyebrow>YOUR COFFEE DNA</Eyebrow>
              <FlaskConical size={15} />
            </div>
            <Dna dna={current.dna} />
            <p className="personality">
              {current.dna.Intensity > 80
                ? "Bold spirit. Unstoppable energy."
                : current.dna.Creativity > 75
                  ? "Curious soul. Unexpectedly wonderful."
                  : current.dna.Creaminess > 70
                    ? "Soft edges. A quietly confident soul."
                    : "Pure focus. Beautifully uncomplicated."}
            </p>
            <div className="table-label">
              <span>
                {table
                  ? table.label + " · Atelier service"
                  : "Counter pickup · Pay at the atelier"}
              </span>
              {table && (
                <button
                  className="text-link"
                  onClick={() => {
                    setTable(null);
                    sessionStorage.removeItem("velora-table");
                  }}
                >
                  Change to pickup
                </button>
              )}
            </div>
            <ErrorNote message={error} />
            <button
              className="button order-button"
              disabled={busy || !ingredients.length || !name.trim()}
              onClick={() => save(true)}
            >
              {busy ? "Creating your moment…" : "Craft my coffee"}
              <ArrowUpRight size={18} />
            </button>
            <small className="preview-disclaimer">
              Made by real hands. Calories are estimates.
              <br />
              Allergens: check your selected ingredients with the barista.
            </small>
          </div>
        </aside>
      </div>
      {architect && (
        <Modal
          title="Tell us what you’re imagining."
          onClose={() => setArchitect(false)}
        >
          <Eyebrow>
            <Sparkles size={14} /> THE COFFEE ARCHITECT
          </Eyebrow>
          <p className="muted">
            A taste-matching engine, with a little room for serendipity.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                setSuggestion(
                  await api("/recommend", "POST", {
                    prompt,
                    mood: config.mood,
                    preferences: config,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <textarea
              maxLength={1000}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Something creamy, not too sweet, cold and energetic…"
            />
            <button className="button" disabled={busy}>
              {busy ? "Finding your blend…" : "Find my coffee"}
              <Send size={15} />
            </button>
          </form>
          <ErrorNote message={error} />
          {suggestion && (
            <div className="suggestion">
              <Eyebrow>WE CREATED THIS FOR YOU.</Eyebrow>
              <h3>{suggestion.name}</h3>
              <p>{suggestion.explanation}</p>
              <p>
                {money(suggestion.price)} · {suggestion.minutes} min ·{" "}
                {suggestion.config.milk} · {suggestion.config.base}
              </p>
              <div className="button-row">
                <button
                  className="button"
                  onClick={() => {
                    setConfig(suggestion.config);
                    setName(suggestion.name);
                    setArchitect(false);
                  }}
                >
                  Create this coffee <ArrowUpRight size={15} />
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    setConfig(suggestion.config);
                    setName(suggestion.name);
                    setArchitect(false);
                    setStep(0);
                  }}
                >
                  Change recipe
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

