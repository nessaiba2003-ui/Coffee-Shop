import { useEffect, useState } from "react";
import { AppContext } from "./context";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Menu,
  X,
  UserRound,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { api, login, refreshCsrf } from "./api";
import type { Ingredient, User } from "./types";
import { Wordmark, Modal, ErrorNote } from "./ui";
import { Home } from "./pages/Home";
import { Lab } from "./pages/Lab";
import { PassportPage, Craft, PublicCard } from "./pages/Journey";
import { Staff, Admin } from "./pages/Operations";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [ingredients, setIngredients] = useState<Ingredient[]>([]),
    [catalogError, setCatalogError] = useState(""),
    [auth, setAuth] = useState(false),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  function reloadCatalog() {
    api<{ ingredients: Ingredient[] }>("/catalog")
      .then((d) => {
        setIngredients(d.ingredients);
        setCatalogError("");
      })
      .catch((e) => setCatalogError(e.message));
  }
  useEffect(() => {
    reloadCatalog();
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {});
    refreshCsrf().catch(() => {});
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  return (
    <AppContext.Provider
      value={{
        user,
        ingredients,
        catalogError,
        signIn: () => setAuth(true),
        notify: setToast,
        reloadCatalog,
      }}
    >
      <div className="announcement">
        <span>GOOD COFFEE IS PERSONAL.</span>
        <span>
          MAKE SOMETHING THAT FEELS LIKE YOU <ArrowUpRight size={12} />
        </span>
      </div>
      <header className="header">
        <Link className="logo-link" to="/" aria-label="Velora home">
          <Wordmark />
        </Link>
        <nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">
          <NavLink to="/" end>
            Discover
          </NavLink>
          <NavLink to="/lab">
            Coffee Lab <span className="nav-dot" />
          </NavLink>
          <NavLink to="/passport">My Passport</NavLink>
          {user && user.role !== "CUSTOMER" && (
            <NavLink to="/staff">Craft station</NavLink>
          )}
          {user?.role === "ADMIN" && <NavLink to="/admin">Studio</NavLink>}
        </nav>
        <div className="header-actions">
          {user ? (
            <button
              className="account-button"
              title="Sign out"
              onClick={async () => {
                await api("/auth/logout", "POST");
                setUser(null);
                await refreshCsrf();
                navigate("/");
              }}
            >
              <span>{user.name.split(" ")[0]}</span>
              <LogOut size={16} />
            </button>
          ) : (
            <button className="account-button" onClick={() => setAuth(true)}>
              <UserRound size={17} />
              <span>Sign in</span>
            </button>
          )}
          <Link className="button header-create" to="/lab">
            Create a coffee <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/passport" element={<PassportPage />} />
          <Route path="/craft/:id" element={<Craft />} />
          <Route path="/card/:token" element={<PublicCard />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="*"
            element={
              <div className="page">
                <h1>This path is still unbrewed.</h1>
                <Link className="button" to="/">
                  Back to the atelier <ArrowRight size={16} />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <Wordmark />
        <span>A place where coffee becomes personal.</span>
        <div>
          <Link to="/lab">Make your mark ↗</Link>
          <span>© {new Date().getFullYear()} VELŌRA ATELIER</span>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {auth && <Auth onClose={() => setAuth(false)} onUser={setUser} />}
    </AppContext.Provider>
  );
}
function Auth({
  onClose,
  onUser,
}: {
  onClose: () => void;
  onUser: (u: User) => void;
}) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={
        register ? "Your story starts here." : "Welcome back to the atelier."
      }
      onClose={onClose}
    >
      <p className="muted">
        Keep your creations, follow their journey, and find your next favorite.
      </p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            const email = String(form.get("email")),
              password = String(form.get("password"));
            if (register)
              await api("/auth/register", "POST", {
                name: form.get("name"),
                email,
                password,
              });
            await login(email, password);
            onUser(await api<User>("/auth/me"));
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {register && (
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              required
              autoFocus
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus={!register}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 12 : 1}
            maxLength={72}
            required
          />
          {register && <small>At least 12 characters.</small>}
        </label>
        <ErrorNote message={error} />
        <button className="button" disabled={busy}>
          {busy ? "One moment…" : register ? "Create my passport" : "Sign in"}
          <ArrowRight size={16} />
        </button>
      </form>
      <button
        className="text-link auth-switch"
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have a passport? Sign in"
          : "New here? Create your passport"}
      </button>
    </Modal>
  );
}
