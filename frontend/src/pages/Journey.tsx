import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  Share2,
  Check,
  Clock,
  RefreshCw,
  Award,
  Bookmark,
  MapPin,
  UserRound,
} from "lucide-react";
import { useApp } from "../context";
import { api } from "../api";
import { type Recipe, type Order, type Passport, money } from "../types";
import {
  CoffeeVisual,
  Dna,
  Empty,
  ErrorNote,
  Eyebrow,
  ShareCard,
  DnaRadar,
} from "../ui";
export const stages = [
  {
    title: "Beans selected",
    desc: "A good story starts at the source. Your chosen origin, weighed with intention.",
    duration: "20 sec",
  },
  {
    title: "The daily grind",
    desc: "Freshly ground to unlock every aromatic possibility.",
    duration: "15 sec",
  },
  {
    title: "A golden extraction",
    desc: "Pressure, water and perfect timing. The heart of your creation.",
    duration: "28 sec",
  },
  {
    title: "Milk transformation",
    desc: "Texture takes shape. Your selected milk is prepared for a silky finish.",
    duration: "40 sec",
  },
  {
    title: "A little alchemy",
    desc: "Your chosen flavors find their place. This is where it becomes yours.",
    duration: "15 sec",
  },
  {
    title: "The human touch",
    desc: "A final flourish, placed by hand. Small details make a lasting impression.",
    duration: "25 sec",
  },
  {
    title: "Your creation is ready.",
    desc: "A creation. A story. A memory. All that’s left is your first sip.",
    duration: "Enjoy",
  },
];
export function PassportPage() {
  const { user, signIn, notify } = useApp();
  const [data, setData] = useState<Passport | null>(null),
    [error, setError] = useState(""),
    [share, setShare] = useState<{ recipe: Recipe; url: string } | null>(null),
    [busy, setBusy] = useState("");
  const navigate = useNavigate();
  function load() {
    if (user)
      api<Passport>("/passport")
        .then(setData)
        .catch((e) => setError(e.message));
  }
  useEffect(load, [user]);
  async function reorder(r: Recipe) {
    setBusy(r.id);
    try {
      const o = await api<Order>("/orders", "POST", {
        recipeId: r.id,
        tableToken: sessionStorage.getItem("velora-table"),
        idempotencyKey: crypto.randomUUID(),
      });
      navigate("/craft/" + o.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function sharing(r: Recipe) {
    try {
      const token =
        r.share_token ||
        (await api<{ token: string }>("/recipes/" + r.id + "/share", "POST"))
          .token;
      setShare({ recipe: r, url: location.origin + "/card/" + token });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <Eyebrow>YOUR COFFEE PASSPORT</Eyebrow>
          <h1>
            Every cup.
            <br />
            <em>A part of your story.</em>
          </h1>
        </div>
        <Link className="button" to="/lab">
          A new creation <ArrowUpRight size={16} />
        </Link>
      </div>
      <ErrorNote message={error} />
      {!user ? (
        <Empty
          title="Your story is waiting."
          description="Sign in to keep your creations, collect meaningful moments, and rediscover your favorites."
          action={
            <button className="button" onClick={signIn}>
              Start my passport <ArrowUpRight size={16} />
            </button>
          }
        />
      ) : !data ? (
        <p>Opening your passport…</p>
      ) : (
        <>
          <div className="passport-welcome">
            <h3>Welcome back, {user.name.split(" ")[0]}.</h3>
            <span>CREATIVE EXPLORER / MEMBER SINCE YOUR FIRST SIP</span>
          </div>
          <div className="stats-grid">
            {[
              {
                label: "Creations",
                value: data.recipes.length,
                icon: Bookmark,
              },
              {
                label: "Coffees experienced",
                value: data.completed,
                icon: Check,
              },
              { label: "Ritual points", value: data.points, icon: Award },
              { label: "Day streak", value: data.streak, icon: Clock },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <s.icon size={19} />
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          {data.favorite && data.favorite.times_ordered > 0 && (
            <div className="usual">
              <div>
                <Eyebrow>A FAMILIAR KIND OF WONDER</Eyebrow>
                <h2>Your usual?</h2>
                <p>
                  {data.favorite.name} · made for you{" "}
                  {data.favorite.times_ordered} times.
                </p>
              </div>
              <button
                className="button"
                disabled={!!busy}
                onClick={() => reorder(data.favorite!)}
              >
                Make it again <RefreshCw size={16} />
              </button>
              <Link className="text-link" to="/lab?mood=Adventure">
                Try something new <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          <div className="section-heading">
            <h2>
              Your <em>collection.</em>
            </h2>
            <span className="eyebrow">
              {data.recipes.length} PERSONAL CREATIONS
            </span>
          </div>
          {data.recipes.length === 0 ? (
            <Empty
              title="A blank page. Infinite possibilities."
              description="Your first saved coffee will live here. Make something that feels like you."
              action={
                <Link className="button" to="/lab">
                  Enter the lab <ArrowUpRight size={16} />
                </Link>
              }
            />
          ) : (
            <div className="recipe-grid">
              {data.recipes.map((r) => (
                <article className="recipe-card" key={r.id}>
                  <div className="recipe-art">
                    <CoffeeVisual config={r.config} small />
                    <span className="recipe-id">
                      #{r.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="recipe-body">
                    <Eyebrow>
                      {r.config.mood} /{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </Eyebrow>
                    <h3>{r.name}</h3>
                    <Dna dna={r.dna} />
                    <div className="button-row">
                      <button
                        className="button"
                        disabled={!!busy}
                        onClick={() => reorder(r)}
                      >
                        {busy === r.id ? "Sending…" : "Craft again"}
                        <ArrowUpRight size={15} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => sharing(r)}
                        aria-label={"Share " + r.name}
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                    {r.share_token && (
                      <button
                        className="text-link small-link"
                        onClick={async () => {
                          try {
                            await api("/recipes/" + r.id + "/share", "DELETE");
                            notify("Public card link revoked.");
                            load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Revoke public sharing
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="section-heading">
            <h2>
              Collected <em>along the way.</em>
            </h2>
          </div>
          {data.favoriteIngredients.length > 0 && <div className="favorite-notes"><Eyebrow>THE NOTES YOU COME BACK TO</Eyebrow><div className="ingredient-tags">{data.favoriteIngredients.map(i=><span key={i.name}>{i.name} · {i.portions} portions enjoyed</span>)}</div></div>}
          <div className="badge-row">
            {[
              "Espresso Explorer",
              "Coffee Scientist",
              "Night Owl",
              "Flavor Architect",
              "Latte Collector",
            ].map((b) => (
              <div
                title={
                  data.badges.includes(b)
                    ? "Earned"
                    : "Keep exploring to earn this achievement"
                }
                className={"badge " + (data.badges.includes(b) ? "earned" : "")}
                key={b}
              >
                <Award size={25} />
                <span>{b}</span>
                <small>
                  {data.badges.includes(b) ? "EARNED" : "STILL TO DISCOVER"}
                </small>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>
              Your <em>journeys.</em>
            </h2>
          </div>
          {data.orders.length ? (
            <div className="order-history">
              {data.orders.map((o) => (
                <Link to={"/craft/" + o.id} key={o.id}>
                  <div>
                    <strong>{o.snapshot.name}</strong>
                    <small>{new Date(o.created_at).toLocaleString()}</small>
                  </div>
                  <span className="status-pill">{o.status}</span>
                  <span>{money(o.price)}</span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">
              Your first order will start a new chapter here.
            </p>
          )}
        </>
      )}
      {share && <ShareCard {...share} onClose={() => setShare(null)} />}
    </div>
  );
}
export function Craft() {
  const { id } = useParams();
  const { user, signIn } = useApp();
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [share, setShare] = useState<{ recipe: Recipe; url: string } | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = () =>
      api<Order>("/orders/" + id)
        .then((o) => {
          if (mounted) {
            setOrder(o);
            setError("");
          }
        })
        .catch((e) => {
          if (mounted) setError(e.message);
        });
    load();
    const source = new EventSource("/api/orders/" + id + "/events", {
      withCredentials: true,
    });
    source.addEventListener("order", (event) => {
      setOrder(JSON.parse(event.data));
      setConnected(true);
    });
    source.onerror = () => setConnected(false);
    const poll = setInterval(load, 10000);
    return () => {
      mounted = false;
      source.close();
      clearInterval(poll);
    };
  }, [id, user]);
  const done =
    order && ["Ready", "Delivered", "Completed"].includes(order.status);
  async function sharing() {
    if (!order) return;
    try {
      const recipes = await api<Recipe[]>("/recipes");
      const recipe = recipes.find((r) => r.id === order.recipe_id)!;
      const token =
        recipe.share_token ||
        (
          await api<{ token: string }>(
            "/recipes/" + recipe.id + "/share",
            "POST",
          )
        ).token;
      setShare({ recipe, url: location.origin + "/card/" + token });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!user)
    return (
      <div className="page">
        <Empty
          title="Your coffee journey is personal."
          description="Sign in to follow your creation."
          action={
            <button className="button" onClick={signIn}>
              Sign in
            </button>
          }
        />
      </div>
    );
  return (
    <div className="page craft-page">
      <ErrorNote message={error} />
      {!order ? (
        <p>Finding your creation…</p>
      ) : (
        <>
          <div className="page-intro">
            <div>
              <Eyebrow>
                <span className="live-dot" />
                {connected
                  ? "LIVE FROM THE ATELIER"
                  : "SYNCING WITH THE ATELIER"}{" "}
                / #{order.id.slice(0, 8).toUpperCase()}
              </Eyebrow>
              <h1>
                {done
                  ? "Your creation."
                  : order.status === "Cancelled"
                    ? "Another time."
                    : "A moment in"}
                <br />
                <em>
                  {done
                    ? "Ready for its moment."
                    : order.status === "Cancelled"
                      ? "Another creation."
                      : "the making."}
                </em>
              </h1>
            </div>
            <span className="status-pill">{order.status}</span>
          </div>
          <div className="craft-layout">
            <div className={"craft-visual " + (done ? "ready" : "")}>
              <CoffeeVisual config={order.snapshot.config} />
              <h2>{order.snapshot.name}</h2>
              <p>
                {done
                  ? "Created specifically for you."
                  : order.stage < 0
                    ? "Your creation is waiting for a pair of expert hands."
                    : stages[order.stage].desc}
              </p>
              <div className="preview-meta">
                <span>
                  <MapPin size={15} />
                  {order.table_label || "Counter pickup"}
                </span>
                <span>{money(order.price)} · Pay at the atelier</span>
              </div>
              <div className="craft-actions">
                {done && (
                  <>
                    <button className="button" onClick={sharing}>
                      <Share2 size={16} /> Keep & share
                    </button>
                    <button
                      className="button secondary"
                      onClick={async () => {
                        try {
                          const o = await api<Order>("/orders", "POST", {
                            recipeId: order.recipe_id,
                            tableToken: sessionStorage.getItem("velora-table"),
                            idempotencyKey: crypto.randomUUID(),
                          });
                          navigate("/craft/" + o.id);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Order again <RefreshCw size={16} />
                    </button>
                  </>
                )}
                <Link className="text-link" to="/passport">
                  View Coffee DNA in your passport <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="craft-process">
              <div className="barista-card">
                {order.image_url ? (
                  <img
                    src={order.image_url}
                    alt={order.barista || "Your barista"}
                  />
                ) : (
                  <span className="barista-avatar">
                    <UserRound size={24} />
                  </span>
                )}
                <div>
                  <Eyebrow>THE HUMAN BEHIND YOUR COFFEE</Eyebrow>
                  <h3>
                    {order.barista || "Your barista will be assigned shortly"}
                  </h3>
                  <p>
                    {order.barista
                      ? (order.specialty || "Coffee craft") +
                        (order.experience
                          ? " · " + order.experience + " years of craft"
                          : "")
                      : "Craft begins when your order is accepted."}
                  </p>
                </div>
              </div>
              <div className="craft-timeline">
                {stages.map((s, i) => (
                  <div
                    key={s.title}
                    className={
                      "craft-stage " +
                      (order.stage === i
                        ? "current"
                        : order.stage > i
                          ? "complete"
                          : "")
                    }
                  >
                    <span className="stage-marker">
                      {order.stage > i ? (
                        <Check size={16} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <div className="stage-title">
                        <h3>{s.title}</h3>
                        <small>{s.duration}</small>
                      </div>
                      {order.stage === i && (
                        <>
                          <p>{s.desc}</p>
                          <span className="stage-indicator">
                            <i /> {done ? "READY FOR YOU" : "CRAFTING NOW"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <small className="muted">
                Stage times are estimates. Progress is updated by your barista.
              </small>
            </div>
          </div>
        </>
      )}
      {share && <ShareCard {...share} onClose={() => setShare(null)} />}
    </div>
  );
}
export function PublicCard() {
  const { token } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    api<Recipe>("/cards/" + token)
      .then(setRecipe)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <div className="page public-card-page">
      <ErrorNote message={error} />
      {recipe ? (
        <>
          <Eyebrow>A CREATION. A STORY. A MEMORY.</Eyebrow>
          <h1>{recipe.name}</h1>
          <div className="public-card-layout">
            <CoffeeVisual config={recipe.config} />
            <div>
              <Eyebrow>
                COFFEE DNA #{recipe.id.slice(0, 8).toUpperCase()}
              </Eyebrow>
              <DnaRadar dna={recipe.dna} />
              <Dna dna={recipe.dna} />
              <p>
                {[
                  recipe.config.base,
                  recipe.config.origin,
                  recipe.config.milk,
                  recipe.config.syrup,
                  recipe.config.flavor,
                  recipe.config.topping,
                ]
                  .filter((x) => x !== "none")
                  .join(" · ")}
              </p>
              <p className="muted">
                Created {new Date(recipe.created_at).toLocaleDateString()} ·
                Crafted {recipe.times_ordered} times
                <br />
                {recipe.barista ? "Crafted by " + recipe.barista + " · " : ""}
                {recipe.location}
              </p>
              <button
                className="button"
                onClick={() => {
                  localStorage.setItem(
                    "velora-draft-v1",
                    JSON.stringify(recipe.config),
                  );
                  navigate("/lab");
                }}
              >
                Make this your own <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </>
      ) : !error ? (
        <p>Opening this coffee memory…</p>
      ) : null}
    </div>
  );
}

