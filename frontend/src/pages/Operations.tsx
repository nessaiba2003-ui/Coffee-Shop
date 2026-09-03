import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  QrCode,
  Check,
  Activity,
  Package,
  Users,
  Coffee,
  Grid2X2,
  BarChart3,
  Settings,
  Tag,
  MessageSquare,
  Search,
  Download,
} from "lucide-react";
import QRCode from "qrcode";
import { useApp } from "../context";
import { api } from "../api";
import { type Order, type User, money, defaultConfig } from "../types";
import { Eyebrow, Empty, ErrorNote, Modal } from "../ui";
import { stages } from "./Journey";
export function Staff() {
  const { user, signIn } = useApp();
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState("");
  function load() {
    if (user && user.role !== "CUSTOMER")
      api<Order[]>("/staff/orders")
        .then((o) => {
          setOrders(o);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [user]);
  async function action(id: string, action: string) {
    setBusy(id);
    try {
      await api("/staff/orders/" + id + "/" + action, "POST");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <Eyebrow>THE HUMAN SIDE OF THE PROCESS</Eyebrow>
          <h1>
            The craft <em>station.</em>
          </h1>
        </div>
        <button className="button secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh queue
        </button>
      </div>
      {!user || user.role === "CUSTOMER" ? (
        <Access user={user} signIn={signIn} />
      ) : (
        <>
          <div className="ops-summary">
            <span>
              <i className="live-dot" /> LIVE QUEUE · UPDATES EVERY 5 SECONDS
            </span>
            <strong>{orders.length} active orders</strong>
          </div>
          <ErrorNote message={error} />
          {loading ? (
            <p>Opening the craft station…</p>
          ) : orders.length === 0 ? (
            <Empty
              title="A quiet moment in the atelier."
              description="New customer orders will arrive here. Enjoy the pause between pours."
            />
          ) : (
            <div className="staff-grid">
              {orders.map((o) => (
                <article className="staff-card" key={o.id}>
                  <div className="staff-card-head">
                    <span className="eyebrow">
                      #{o.id.slice(0, 8).toUpperCase()} /{" "}
                      {o.table_label || "PICKUP"}
                    </span>
                    <span className="status-pill">{o.status}</span>
                  </div>
                  <h3>{o.snapshot.name}</h3>
                  <p>
                    {o.customer} ·{" "}
                    {Math.max(
                      0,
                      Math.floor(
                        (Date.now() - new Date(o.created_at).getTime()) / 60000,
                      ),
                    )}{" "}
                    min ago
                  </p>
                  <div className="ingredient-tags">
                    {o.snapshot.ingredients.map((i) => (
                      <span key={i.id}>
                        {i.quantity}× {i.name}
                      </span>
                    ))}
                  </div>
                  <p className="customization-summary">
                    {o.snapshot.config.size} · {o.snapshot.config.roast} roast ·
                    intensity {o.snapshot.config.strength}% · sweetness{" "}
                    {o.snapshot.config.sweetness}% · temperature{" "}
                    {o.snapshot.config.temperature}% · ice{" "}
                    {o.snapshot.config.ice}% · {o.snapshot.config.shots} extra
                    shots
                  </p>
                  <div className="mini-stages">
                    {stages.map((s, i) => (
                      <span
                        key={s.title}
                        title={s.title}
                        className={i <= o.stage ? "done" : ""}
                      />
                    ))}
                  </div>
                  <div className="current-stage">
                    <small>CURRENT STEP</small>
                    <strong>
                      {o.stage < 0
                        ? "Awaiting preparation"
                        : stages[o.stage].title}
                    </strong>
                  </div>
                  <div className="button-row">
                    <button
                      className="button"
                      disabled={!!busy}
                      onClick={() => action(o.id, "advance")}
                    >
                      {busy === o.id
                        ? "Updating…"
                        : o.status === "Created"
                          ? "Confirm order"
                          : o.status === "Confirmed"
                            ? "Add to queue"
                            : o.status === "Queued"
                              ? "Start crafting"
                              : o.status === "Ready"
                                ? "Mark delivered"
                                : o.status === "Delivered"
                                  ? "Complete order"
                                  : "Next crafting stage"}
                      <ArrowRight size={15} />
                    </button>
                    <button
                      className="text-link danger"
                      disabled={!!busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancel this order and release its reserved ingredients?",
                          )
                        )
                          action(o.id, "cancel");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <label className="priority-label">
                    Priority
                    <select
                      value={o.priority}
                      onChange={async (e) => {
                        try {
                          await api(
                            "/staff/orders/" + o.id + "/priority",
                            "PATCH",
                            { priority: Number(e.target.value) },
                          );
                          load();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      <option value={0}>Normal</option>
                      <option value={1}>High</option>
                      <option value={2}>Urgent</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function Access({ user, signIn }: { user: User | null; signIn: () => void }) {
  return (
    <Empty
      title="For the hands behind the craft."
      description={
        user
          ? "This area requires a barista or administrator account."
          : "Sign in with your staff account to continue."
      }
      action={
        !user ? (
          <button className="button" onClick={signIn}>
            Staff sign in <ArrowUpRight size={16} />
          </button>
        ) : (
          <Link className="button" to="/lab">
            Back to the lab
          </Link>
        )
      }
    />
  );
}
type Row = Record<string, any>;
const sections = [
  ["Dashboard", Activity],
  ["Orders", Coffee],
  ["Customers", Users],
  ["Coffee Recipes", Coffee],
  ["Ingredients", Package],
  ["Coffee Beans", LeafIcon],
  ["Menu", Grid2X2],
  ["Pricing", Tag],
  ["Baristas", Users],
  ["Tables", QrCode],
  ["Availability", Check],
  ["Promotions", Tag],
  ["Analytics", BarChart3],
  ["Reviews", MessageSquare],
  ["Settings", Settings],
] as const;
function LeafIcon({ size = 18 }: { size?: number }) {
  return <span style={{ fontSize: size }}>♧</span>;
}
function endpoint(section: string) {
  if (
    ["Ingredients", "Coffee Beans", "Menu", "Pricing", "Availability"].includes(
      section,
    )
  )
    return "ingredients";
  if (["Customers", "Baristas"].includes(section)) return "users";
  if (section === "Coffee Recipes") return "recipes";
  if (["Promotions", "Reviews", "Settings"].includes(section))
    return "records/" + section.toLowerCase();
  return section.toLowerCase();
}
function defaults(section: string): Row {
  const ep = endpoint(section);
  if (ep === "ingredients")
    return {
      name: "",
      category: section === "Coffee Beans" ? "origin" : "base",
      price: 0,
      calories: 0,
      stock: 100,
      threshold: 10,
      available: true,
      notes: "",
    };
  if (ep === "users")
    return {
      name: "",
      email: "",
      role: section === "Baristas" ? "BARISTA" : "CUSTOMER",
      active: true,
      password: "",
      specialty: "Coffee craft",
      experience: 0,
      imageUrl: "",
    };
  if (ep === "tables") return { label: "", active: true };
  if (ep === "recipes")
    return { name: "", config: JSON.stringify(defaultConfig, null, 2) };
  return { title: "", description: "", active: true };
}
export function Admin() {
  const { user, signIn, notify, reloadCatalog } = useApp();
  const [section, setSection] = useState("Dashboard"),
    [data, setData] = useState<Row[]>([]),
    [analytics, setAnalytics] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Row | null>(null),
    [search, setSearch] = useState(""),
    [qr, setQr] = useState<{
      label: string;
      image: string;
      url: string;
    } | null>(null);
  async function load() {
    if (user?.role !== "ADMIN") return;
    setBusy(true);
    try {
      if (["Dashboard", "Analytics"].includes(section))
        setAnalytics(await api<Row>("/admin/analytics"));
      else setData(await api<Row[]>("/admin/" + endpoint(section)));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setData([]);
    setSearch("");
    load();
  }, [user, section]);
  async function remove(row: Row) {
    if (
      !window.confirm(
        endpoint(section) === "users"
          ? "Deactivate this account?"
          : "Delete this record? Records used in orders cannot be deleted.",
      )
    )
      return;
    try {
      await api("/admin/" + endpoint(section) + "/" + row.id, "DELETE");
      load();
      reloadCatalog();
      notify("Record updated.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const filtered = data.filter(
    (r) =>
      (section !== "Coffee Beans" || r.category === "origin") &&
      (section !== "Baristas" || r.role !== "CUSTOMER") &&
      (section !== "Customers" || r.role === "CUSTOMER") &&
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page admin-page">
      <div className="page-intro">
        <div>
          <Eyebrow>VELŌRA / BEHIND THE EXPERIENCE</Eyebrow>
          <h1>
            The <em>studio.</em>
          </h1>
        </div>
        <Link className="button secondary" to="/staff">
          Open craft station <ArrowUpRight size={16} />
        </Link>
      </div>
      {user?.role !== "ADMIN" ? (
        <Access user={user} signIn={signIn} />
      ) : (
        <div className="admin-layout">
          <aside className="admin-nav">
            {sections.map(([name, Icon]) => (
              <button
                className={section === name ? "active" : ""}
                key={name}
                onClick={() => setSection(name)}
              >
                <Icon size={17} />
                {name}
              </button>
            ))}
          </aside>
          <section className="admin-content">
            <div className="admin-content-heading">
              <h2>{section}</h2>
              <div className="button-row">
                <button
                  className="icon-button"
                  onClick={load}
                  aria-label="Refresh data"
                >
                  <RefreshCw size={17} />
                </button>
                {!["Dashboard", "Analytics", "Orders"].includes(section) && (
                  <button
                    className="button"
                    onClick={() => setEditing(defaults(section))}
                  >
                    <Plus size={16} />
                    Add {section === "Tables" ? "table" : "record"}
                  </button>
                )}
              </div>
            </div>
            <ErrorNote message={error} />
            {busy ? (
              <p>Loading atelier data…</p>
            ) : ["Dashboard", "Analytics"].includes(section) ? (
              analytics && <Analytics data={analytics} />
            ) : (
              <>
                <div className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search records"
                    placeholder="Find a record…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {section === "Promotions" && (
                  <p className="muted">
                    Campaign planning records. Automatic checkout discounts are
                    not enabled.
                  </p>
                )}
                {section === "Settings" && (
                  <p className="muted">
                    Atelier metadata. Deployment security and integrations are
                    configured through environment variables.
                  </p>
                )}
                {filtered.length === 0 ? (
                  <Empty
                    title="Room for something new."
                    description="No matching records yet. Add your first one to get started."
                  />
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{section === "Orders" ? "Creation" : "Name"}</th>
                          <th>Details</th>
                          <th>
                            {endpoint(section) === "ingredients"
                              ? "Available stock"
                              : "Status"}
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>
                                {r.name ||
                                  r.label ||
                                  r.snapshot?.name ||
                                  r.body?.title ||
                                  r.id.slice(0, 8)}
                              </strong>
                              <small>
                                {r.email ||
                                  r.category ||
                                  "#" + r.id.slice(0, 8)}
                              </small>
                            </td>
                            <td>
                              {endpoint(section) === "ingredients" ? (
                                <>
                                  {money(r.price)}
                                  <small>{r.calories} kcal / portion</small>
                                </>
                              ) : endpoint(section) === "users" ? (
                                <>
                                  {r.role}
                                  <small>{r.specialty}</small>
                                </>
                              ) : section === "Orders" ? (
                                <>
                                  {r.customer}
                                  <small>
                                    {r.table_label || "Counter pickup"} ·{" "}
                                    {money(r.price)}
                                  </small>
                                </>
                              ) : endpoint(section) === "recipes" ? (
                                <>
                                  {r.config.origin}
                                  <small>
                                    {r.config.milk} · {r.config.size}
                                  </small>
                                </>
                              ) : endpoint(section) === "tables" ? (
                                "QR table ordering"
                              ) : (
                                r.body?.description || "—"
                              )}
                            </td>
                            <td>
                              {endpoint(section) === "ingredients" ? (
                                <span
                                  className={
                                    r.stock - r.reserved <= r.threshold
                                      ? "stock-low"
                                      : ""
                                  }
                                >
                                  {r.stock - r.reserved} portions
                                  <small>
                                    {r.reserved} reserved ·{" "}
                                    {r.available ? "Available" : "Paused"}
                                  </small>
                                </span>
                              ) : (
                                <span className="status-pill">
                                  {r.status ||
                                    (r.active === false ||
                                    r.body?.active === false
                                      ? "Inactive"
                                      : "Active")}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                {section === "Orders" ? (
                                  <Link
                                    to={"/craft/" + r.id}
                                    aria-label="View order"
                                  >
                                    <ArrowUpRight size={17} />
                                  </Link>
                                ) : (
                                  <>
                                    <button
                                      className="icon-button"
                                      aria-label="Edit record"
                                      onClick={() =>
                                        setEditing(
                                          endpoint(section).startsWith(
                                            "records",
                                          )
                                            ? { id: r.id, ...r.body }
                                            : endpoint(section) === "recipes"
                                              ? {
                                                  id: r.id,
                                                  name: r.name,
                                                  config: JSON.stringify(
                                                    r.config,
                                                    null,
                                                    2,
                                                  ),
                                                }
                                              : {
                                                  ...defaults(section),
                                                  ...r,
                                                  password: "",
                                                  imageUrl: r.image_url || "",
                                                },
                                        )
                                      }
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    {endpoint(section) === "tables" && (
                                      <button
                                        className="icon-button"
                                        aria-label="Show table QR"
                                        onClick={async () => {
                                          const url =
                                            location.origin +
                                            "/lab?table=" +
                                            r.token;
                                          setQr({
                                            label: r.label,
                                            url,
                                            image: await QRCode.toDataURL(url, {
                                              width: 600,
                                              margin: 2,
                                              color: {
                                                dark: "#601f31",
                                                light: "#f5f2ea",
                                              },
                                            }),
                                          });
                                        }}
                                      >
                                        <QrCode size={17} />
                                      </button>
                                    )}
                                    <button
                                      className="icon-button"
                                      aria-label="Delete or deactivate record"
                                      onClick={() => remove(r)}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {editing && (
        <EditModal
          data={editing}
          section={section}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const id = body.id;
            const cleaned = { ...body };
            delete cleaned.id;
            if (endpoint(section) === "recipes")
              cleaned.config = JSON.parse(cleaned.config);
            await api(
              "/admin/" + endpoint(section) + (id ? "/" + id : ""),
              id ? "PUT" : "POST",
              cleaned,
            );
            setEditing(null);
            load();
            reloadCatalog();
            notify("Saved to the atelier.");
          }}
        />
      )}
      {qr && (
        <Modal
          title={qr.label + " / make a moment"}
          onClose={() => setQr(null)}
        >
          <img
            src={qr.image}
            alt="Scannable table ordering QR"
            className="table-qr"
          />
          <p className="muted">
            Print this card for the table. Guests scan it to begin a creation
            with their table already selected.
          </p>
          <a
            className="button"
            href={qr.image}
            download={"velora-" + qr.label + ".png"}
          >
            <Download size={16} />
            Download table QR
          </a>
        </Modal>
      )}
    </div>
  );
}
function EditModal({
  data,
  section,
  onClose,
  onSave,
}: {
  data: Row;
  section: string;
  onClose: () => void;
  onSave: (body: Row) => Promise<void>;
}) {
  const [body, setBody] = useState(data),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={
        (data.id ? "Edit " : "New ") +
        (section === "Tables" ? "table" : "record")
      }
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            await onSave(body);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {Object.keys(defaults(section)).map((key) => (
          <label key={key}>
            {key.replace(/([A-Z])/g, " $1")}
            {typeof body[key] === "boolean" ? (
              <input
                type="checkbox"
                checked={body[key]}
                onChange={(e) => setBody({ ...body, [key]: e.target.checked })}
              />
            ) : key === "category" || key === "role" ? (
              <select
                value={body[key]}
                onChange={(e) => setBody({ ...body, [key]: e.target.value })}
              >
                {(key === "category"
                  ? [
                      "base",
                      "origin",
                      "milk",
                      "syrup",
                      "flavor",
                      "topping",
                      "cup",
                    ]
                  : ["CUSTOMER", "BARISTA", "ADMIN"]
                ).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : ["config", "notes", "description"].includes(key) ? (
              <textarea
                value={body[key] || ""}
                rows={key === "config" ? 10 : 3}
                onChange={(e) => setBody({ ...body, [key]: e.target.value })}
              />
            ) : (
              <input
                type={
                  key === "password"
                    ? "password"
                    : key === "email"
                      ? "email"
                      : typeof body[key] === "number"
                        ? "number"
                        : "text"
                }
                min={0}
                required={["name", "email", "label", "title"].includes(key)}
                value={body[key] ?? ""}
                placeholder={
                  key === "password" && data.id
                    ? "Leave blank to keep existing password"
                    : ""
                }
                onChange={(e) =>
                  setBody({
                    ...body,
                    [key]:
                      typeof data[key] === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}{" "}
            {key === "price" && (
              <small>Price in euro cents, per portion.</small>
            )}
            {key === "stock" && (
              <small>Total portions including reservations.</small>
            )}
          </label>
        ))}
        <ErrorNote message={error} />
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save record"}
          <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
function Analytics({ data }: { data: Row }) {
  return (
    <>
      <div className="stats-grid admin-stats">
        {[
          ["Orders", data.orders],
          ["Completed revenue", money(data.revenue)],
          ["Average order", money(data.average)],
          ["Repeat customers", data.retention + "%"],
        ].map(([title, value]) => (
          <div className="stat-card" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Revenue reflects completed orders; payment is collected in store.
        Retention is the share of purchasing customers with more than one
        completed order.
      </p>
      <div className="analytics-grid">
        <Chart title="Coffee, by feeling" values={data.moods} />
        <Chart title="The favorite creations" values={data.coffees} />
        <Chart title="Rituals through the day (atelier time)" values={data.hours} />
        <Chart title="Popular customizations" values={data.customizations} />
        <Chart
          title="Ingredients used"
          values={Object.fromEntries(
            data.ingredients.map((r: Row) => [r.name, r.portions]),
          )}
        />
        <Chart
          title="Creative signatures"
          values={Object.fromEntries(
            data.creative.map((r: Row) => [r.name, r.score]),
          )}
        />
      </div>
      <div className="analytics-panel">
        <h3>Stock that needs a little attention</h3>
        {data.lowStock.length ? (
          data.lowStock.map((i: Row) => (
            <p key={i.name} className="stock-low">
              {i.name} · {i.stock - i.reserved} portions available
            </p>
          ))
        ) : (
          <p className="muted">
            All ingredients are above their low-stock thresholds.
          </p>
        )}
      </div>
      <div className="analytics-panel">
        <h3>Daily atelier journal</h3>
        {data.daily.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Atelier date</th>
                  <th>Orders</th>
                  <th>Completed revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d: Row) => (
                  <tr key={d.report_day}>
                    <td>{d.report_day}</td>
                    <td>{d.orders}</td>
                    <td>{money(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Your first order starts the journal.</p>
        )}
        <p className="muted">
          {data.repeatOrders} repeat orders · {data.completed} completed
          creations
        </p>
      </div>
    </>
  );
}
function Chart({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const entries = Object.entries(values);
  const max = Math.max(1, ...Object.values(values));
  return (
    <div className="analytics-panel">
      <h3>{title}</h3>
      {entries.length ? (
        entries
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => (
            <div className="chart-row" key={name}>
              <span>{name}</span>
              <div>
                <i style={{ width: (value / max) * 100 + "%" }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))
      ) : (
        <p className="muted">A story waiting for its first data point.</p>
      )}
    </div>
  );
}



