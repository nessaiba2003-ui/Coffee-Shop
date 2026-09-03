import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, ArrowUpRight, Check, Copy, Download } from "lucide-react";
import QRCode from "qrcode";
import type { Config, DNA, Recipe } from "./types";

export function Wordmark() {
  return (
    <span className="wordmark">
      velōra<span className="wordmark-star">✳</span>
    </span>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
export function ErrorNote({ message }: { message: string }) {
  return message ? (
    <div className="error-note" role="alert">
      {message}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <button
        className="icon-button close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
export function CoffeeVisual({
  config,
  small = false,
}: {
  config: Config;
  small?: boolean;
}) {
  const id = useRef("coffee-" + Math.random().toString(36).slice(2)).current;
  const milk = config.milk !== "none",
    cold = config.temperature < 35;
  return (
    <div className={"coffee-visual " + (small ? "small" : "")}>
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <svg
        viewBox="0 0 400 410"
        role="img"
        aria-label={`${cold ? "Iced" : "Warm"} ${milk ? "milky" : "black"} coffee with ${config.topping === "none" ? "a smooth finish" : config.topping}`}
      >
        <defs>
          <linearGradient id={id + "glass"} x1="0" x2="1">
            <stop stopColor="#fff" stopOpacity=".35" />
            <stop offset=".3" stopColor="#fff" stopOpacity=".05" />
            <stop offset="1" stopColor="#fff" stopOpacity=".5" />
          </linearGradient>
          <linearGradient id={id + "coffee"} x1="0" y1="1" x2=".2" y2="0">
            <stop stopColor={milk ? "#bf8761" : "#422819"} />
            <stop offset=".48" stopColor={milk ? "#ddbb90" : "#704625"} />
            <stop offset=".72" stopColor="#875037" />
            <stop offset="1" stopColor="#513221" />
          </linearGradient>
          <radialGradient id={id + "top"}>
            <stop stopColor="#dec4a0" />
            <stop offset=".8" stopColor="#a8794c" />
            <stop offset="1" stopColor="#724128" />
          </radialGradient>
          <filter id={id + "shadow"}>
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <ellipse
          cx="200"
          cy="362"
          rx="121"
          ry="15"
          fill="#39462d"
          opacity=".16"
          filter={`url(#${id}shadow)`}
        />
        <ellipse cx="200" cy="350" rx="130" ry="20" fill="#e2dfca" />
        <ellipse cx="200" cy="345" rx="129" ry="18" fill="#f0eddf" />
        <path
          d="M283 167 C371 146 362 270 280 262"
          fill="none"
          stroke="#f5f2e4"
          strokeWidth="15"
          opacity=".65"
        />
        <path
          d="M103 145 Q105 274 122 307 Q200 343 278 307 Q295 240 297 145Z"
          fill={`url(#${id}glass)`}
          stroke="#f5f0e5"
          strokeWidth="2"
        />
        <path
          d="M111 175 L129 301 Q200 329 271 301 L289 175Z"
          fill={`url(#${id}coffee)`}
        />
        {milk && (
          <path
            d="M112 231 C171 289 224 223 281 252 L272 300 Q200 329 129 300Z"
            fill="#ead6b2"
            opacity=".5"
          />
        )}
        <ellipse cx="200" cy="173" rx="89" ry="24" fill={`url(#${id}top)`} />
        {!cold && milk ? (
          <g fill="none" stroke="#f4e6cf" strokeLinecap="round">
            <path
              d="M200 189 C153 177 155 157 177 160 C192 162 197 178 200 186 C204 171 214 157 232 161 C257 169 223 187 200 189"
              strokeWidth="6"
            />
            <path
              d="M200 187 C178 174 181 164 190 167 M202 185 C222 172 220 166 211 168 M200 185 L196 157"
              strokeWidth="3"
            />
          </g>
        ) : cold ? (
          <g fill="#f5ece0" opacity=".5" stroke="#fff">
            <rect
              x="148"
              y="157"
              width="35"
              height="22"
              rx="6"
              transform="rotate(-15 160 160)"
            />
            <rect
              x="211"
              y="156"
              width="31"
              height="25"
              rx="6"
              transform="rotate(20 225 160)"
            />
            <rect x="185" y="169" width="25" height="19" rx="5" />
          </g>
        ) : null}
        <ellipse
          cx="200"
          cy="146"
          rx="97"
          ry="29"
          fill="none"
          stroke="#fffaf0"
          strokeWidth="2"
          opacity=".55"
        />
        <path
          d="M115 183 L132 290"
          stroke="white"
          strokeWidth="4"
          opacity=".3"
          strokeLinecap="round"
        />
        <text
          x="200"
          y="270"
          textAnchor="middle"
          fill={milk ? "#5e4934" : "#e8d8b9"}
          fontSize="25"
          fontFamily="Georgia"
          letterSpacing="2"
        >
          velōra
        </text>
        {!cold && (
          <g
            className="steam"
            stroke="#f5f3e8"
            strokeWidth="3"
            opacity=".8"
            fill="none"
          >
            <path d="M170 116 C147 89 193 74 172 45" />
            <path d="M204 110 C180 83 226 67 204 26" />
            <path d="M235 115 C212 87 251 81 235 53" />
          </g>
        )}
        {config.topping !== "none" && (
          <g fill="#69402e">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <circle
                key={n}
                cx={145 + n * 15}
                cy={173 + Math.sin(n * 2) * 9}
                r="1.7"
              />
            ))}
          </g>
        )}
      </svg>
      <div className="visual-caption">
        <span>CRAFTED AROUND YOU</span>
        <span>↗</span>
      </div>
    </div>
  );
}
export function Dna({ dna }: { dna: DNA }) {
  return (
    <div className="dna-bars">
      {['Intensity','Sweetness','Creaminess','Temperature','Creativity'].map(key => [key,dna[key]] as const).map(([key, value]) => (
        <div className="dna-row" key={key}>
          <span>{key}</span>
          <div>
            <i style={{ width: `${value}%` }} />
          </div>
          <span>{value}%</span>
        </div>
      ))}
    </div>
  );
}
export function DnaRadar({ dna }: { dna: DNA }) {
  const vals = ['Intensity','Sweetness','Creaminess','Temperature','Creativity'].map(key=>dna[key]);
  const point = (i: number, r: number) =>
    `${100 + Math.sin((i * Math.PI * 2) / 5) * r},${100 - Math.cos((i * Math.PI * 2) / 5) * r}`;
  return (
    <svg
      className="dna-radar"
      viewBox="0 0 200 200"
      aria-label="Your five-dimensional coffee DNA"
      role="img"
    >
      {[20, 40, 60, 80].map((r) => (
        <polygon
          key={r}
          points={vals.map((_, i) => point(i, r)).join(" ")}
          fill="none"
          stroke="currentColor"
          opacity=".16"
        />
      ))}
      {vals.map((_, i) => (
        <line
          key={i}
          x1="100"
          y1="100"
          x2={point(i, 80).split(",")[0]}
          y2={point(i, 80).split(",")[1]}
          stroke="currentColor"
          opacity=".15"
        />
      ))}
      <polygon
        points={vals.map((v, i) => point(i, v * 0.8)).join(" ")}
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {vals.map((v, i) => (
        <circle
          key={i}
          cx={point(i, v * 0.8).split(",")[0]}
          cy={point(i, v * 0.8).split(",")[1]}
          r="3"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
export function ShareCard({
  recipe,
  url,
  onClose,
}: {
  recipe: Recipe;
  url: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 300,
      margin: 1,
      color: { dark: "#601f31", light: "#f5f2ea" },
    }).then(setQr);
  }, [url]);
  async function download() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#601f31";
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "#d5e88b";
    ctx.font = "80px Georgia";
    ctx.fillText("velōra ✳", 90, 160);
    ctx.fillStyle = "#f5f2ea";
    ctx.font = "28px sans-serif";
    ctx.fillText("A CREATION. A STORY. A MEMORY.", 90, 260);
    ctx.font = "84px Georgia";
    const words = recipe.name.split(" ");
    let line = "",
      y = 530;
    for (const word of words) {
      if (ctx.measureText(line + word).width > 880) {
        ctx.fillText(line, 90, y);
        y += 100;
        line = "";
      }
      line += word + " ";
    }
    ctx.fillText(line, 90, y);
    y += 160;
    ctx.font = "26px monospace";
    for (const [name, value] of Object.entries(recipe.dna)) {
      ctx.fillText(`${name.toUpperCase()}  ${value}%`, 90, y);
      ctx.fillStyle = "#d5e88b";
      ctx.fillRect(90, y + 25, value * 8, 5);
      ctx.fillStyle = "#f5f2ea";
      y += 120;
    }
    const img = new Image();
    img.src = qr;
    await img.decode();
    ctx.drawImage(img, 90, 1530, 240, 240);
    ctx.font = "22px monospace";
    ctx.fillText("#" + recipe.id.slice(0, 8).toUpperCase(), 380, 1600);
    ctx.fillText("YOUR COFFEE. YOUR CREATION.", 380, 1660);
    const a = document.createElement("a");
    a.download = "velora-" + recipe.id.slice(0, 8) + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
  return (
    <Modal title="A memory worth keeping." onClose={onClose}>
      <div className="share-card">
        <Wordmark />
        <Eyebrow>PERSONAL COFFEE IDENTITY</Eyebrow>
        <h3>{recipe.name}</h3>
        <DnaRadar dna={recipe.dna} />
        <Dna dna={recipe.dna} />
        <div className="share-bottom">
          {qr && (
            <img
              src={qr}
              width="78"
              height="78"
              alt="QR code to this coffee card"
            />
          )}
          <span>
            COFFEE #{recipe.id.slice(0, 8).toUpperCase()}
            <br />
            {new Date(recipe.created_at).toLocaleDateString()}
            <br />
            Created specifically for you.
          </span>
        </div>
      </div>
      <p className="muted">
        Anyone with this link can view the recipe and DNA. Your account details
        stay private.
      </p>
      <div className="button-row">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              window.prompt("Copy your coffee card link", url);
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button className="button" disabled={!qr} onClick={download}>
          <Download size={16} /> Save story card
        </button>
      </div>
    </Modal>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-star">✳</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
