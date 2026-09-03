import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  MoveDown,
  Sun,
  Wind,
  Focus,
  Sparkles,
  Heart,
  Moon,
  Compass,
  Sprout,
  Play,
  Plus,
} from "lucide-react";
import { Eyebrow, DnaRadar, CoffeeVisual } from "../ui";
import { defaultConfig } from "../types";
export const moods = [
  { name: "Need Energy", icon: Sun, desc: "A little extra spark." },
  { name: "Calm", icon: Wind, desc: "Slow down. Sip softly." },
  { name: "Focus", icon: Focus, desc: "Find your flow." },
  { name: "Creative", icon: Sparkles, desc: "Think outside the cup." },
  { name: "Romantic", icon: Heart, desc: "Something to fall for." },
  { name: "Fresh Start", icon: Sprout, desc: "Turn a new leaf." },
  { name: "Late Night", icon: Moon, desc: "Keep the ritual. Unwind." },
  { name: "Adventure", icon: Compass, desc: "Take the unfamiliar path." },
];
export function Home() {
  const navigate = useNavigate();
  const [allMoods, setAllMoods] = useState(false);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>
            <span className="tiny-star">✳</span> NOT JUST COFFEE. A LITTLE MORE
            YOU.
          </Eyebrow>
          <h1>
            Your coffee.
            <br />
            Your <em>creation.</em>
          </h1>
          <p>
            A little science. A little soul. A coffee shaped
            <br className="desktop-break" /> around your taste, your mood, your
            moment.
          </p>
          <div className="hero-buttons">
            <Link to="/lab" className="button">
              Create my coffee <ArrowUpRight size={19} />
            </Link>
            <a href="#experience" className="experience-link">
              <span className="play-circle">
                <Play size={12} fill="currentColor" />
              </span>
              Explore the experience
            </a>
          </div>
          <div className="hero-footnote">
            <span className="line" />
            <span>YOUR TASTE. YOUR DNA. ONE OF A KIND.</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            className="hero-photo"
            src="/coffee-hero.jpg"
            alt="Sunlight falling across a freshly crafted coffee"
            fetchPriority="high"
          />
          <div className="photo-shade" />
          <div className="photo-top">
            <span>THE ART OF BECOMING YOURS</span>
            <span>01 / ∞</span>
          </div>
          <div className="photo-title">
            Made of moments.
            <br />
            <em>Made for you.</em>
          </div>
          <span className="photo-coordinate">ORIGIN → IMAGINATION → YOU</span>
          <div className="hero-dna-card">
            <div>
              <span className="live-dot" /> A UNIQUE COFFEE IDENTITY
            </div>
            <section>
              <DnaRadar
                dna={{
                  Intensity: 75,
                  Sweetness: 35,
                  Creaminess: 90,
                  Temperature: 68,
                  Creativity: 95,
                }}
              />
              <div>
                <small>MEET YOUR COFFEE DNA</small>
                <strong>
                  Beautifully
                  <br />
                  unrepeatable.
                </strong>
                <span>
                  Until you want it again. <ArrowUpRight size={14} />
                </span>
              </div>
            </section>
          </div>
          <div className="circle-stamp">
            HUMAN CRAFT
            <br />
            <span>✳</span>
            <br />
            INFINITE POSSIBILITY
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            <span className="live-dot" /> HUMAN-MADE. POSSIBILITY-POWERED.
          </span>
          <a href="#mood">
            SCROLL TO FIND YOUR MOMENT <MoveDown size={14} />
          </a>
        </div>
      </section>
      <section className="journey-strip" aria-label="Your coffee journey">
        {["Discover", "Create", "Craft", "Watch", "Experience", "Remember"].map(
          (s, i) => (
            <div key={s}>
              <span>0{i + 1}</span>
              {s}
              {i < 5 && <ArrowRight size={15} />}
            </div>
          ),
        )}
      </section>
      <section className="mood-section section" id="mood">
        <div className="section-heading">
          <div>
            <Eyebrow>01 / START WITH A FEELING</Eyebrow>
            <h2>
              What’s your <em>mood?</em>
            </h2>
          </div>
          <p>
            There’s a coffee for where you are.
            <br />
            And where you’d like to go.
          </p>
        </div>
        <div className="mood-grid">
          {moods.slice(0, allMoods ? 8 : 4).map((m, i) => (
            <button
              className={"mood-card mood-" + i}
              key={m.name}
              onClick={() =>
                navigate("/lab?mood=" + encodeURIComponent(m.name))
              }
            >
              <m.icon size={30} strokeWidth={1.25} />
              <span className="mood-number">0{i + 1}</span>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
              <span className="mood-arrow">
                <ArrowUpRight size={20} />
              </span>
            </button>
          ))}
        </div>
        <button className="more-moods" onClick={() => setAllMoods(!allMoods)}>
          {allMoods ? "A little less" : "Explore all 8 moods"}
          <Plus
            size={14}
            style={allMoods ? { transform: "rotate(45deg)" } : undefined}
          />
        </button>
      </section>
      <section className="experience-section section" id="experience">
        <div className="experience-visual">
          <CoffeeVisual config={{ ...defaultConfig, flavor: "orange" }} />
          <div className="annotation">
            A touch of curiosity.
            <br />
            <span>A taste that’s entirely yours.</span>
          </div>
        </div>
        <div className="experience-copy">
          <Eyebrow>02 / MEET THE COFFEE LAB</Eyebrow>
          <h2>
            Follow your taste.
            <br />
            <em>Break a few rules.</em>
          </h2>
          <p>
            Start with a bean. Follow a feeling. Find that unexpected note. From
            the first shot to the final flourish, every little detail is yours
            to decide.
          </p>
          <div className="feature-line">
            <span>01</span>
            <div>
              <h4>Make it unmistakably you.</h4>
              <p>Origins, textures, temperatures. Infinite directions.</p>
            </div>
          </div>
          <div className="feature-line">
            <span>02</span>
            <div>
              <h4>Give your coffee an identity.</h4>
              <p>A unique DNA. A recipe you can always return to.</p>
            </div>
          </div>
          <Link className="button" to="/lab">
            Step inside the lab <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="craft-banner section">
        <div>
          <Eyebrow>03 / TECHNOLOGY WITH A HUMAN TOUCH</Eyebrow>
          <h2>
            Precision in the process.
            <br />
            <em>Soul in every pour.</em>
          </h2>
        </div>
        <div>
          <span className="craft-symbol">✳</span>
          <p>
            Behind every creation is a real pair of hands. Meet your barista and
            follow your coffee’s journey, one thoughtful step at a time.
          </p>
          <Link to="/lab" className="text-link">
            Begin your story <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="closing section">
        <Eyebrow>A CREATION. A STORY. A MEMORY.</Eyebrow>
        <h2>
          Some things are worth
          <br />
          <em>making your own.</em>
        </h2>
        <Link className="button" to="/lab">
          Let’s make your coffee <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
