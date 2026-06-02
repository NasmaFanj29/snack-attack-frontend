import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../style/home.css";
import logoburger from "../assets/logoburger.png";
import burgerHero from "../assets/burger_hero.png"; // Your real burger photo

const WIFI_NAME = "SnackAttack_Guest";
const WIFI_PASS = "snack2024!";

const TESTIMONIALS = [
  { name: "Maya R.", text: "Best burger I've ever had! 🤤", rating: 5 },
  { name: "Karim A.", text: "Insanely fast service, amazing food", rating: 5 },
  { name: "Lina M.", text: "Worth every penny. Coming back!", rating: 5 },
  { name: "Jad K.", text: "Finally, real quality food in Hamra", rating: 5 },
];

const STATS = [
  { label: "Happy Customers", value: 2850, emoji: "😋" },
  { label: "Menu Items", value: 35, emoji: "🍽️" },
  { label: "Orders Weekly", value: 1250, emoji: "📦" },
  { label: "Rating", value: "4.9", emoji: "⭐", suffix: "/5" },
];

function AnimatedCounter({ target, duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        const increment = target / (duration * 60);
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, 1000 / 60);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

function Home() {
  const [loaded, setLoaded] = useState(false);
  const [wifiOpen, setWifiOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollHintRef = useRef(null);

  // refs for the scroll-zoom hero
  const zoneRef = useRef(null);     // tall scroll zone
  const burgerRef = useRef(null);   // the image that zooms
  const heroLeftRef = useRef(null); // text that fades out

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(timer);
  }, []);

 useEffect(() => {
  const handleScroll = () => {
    if (scrollHintRef.current) {
      scrollHintRef.current.classList.toggle("fade-out", window.scrollY > 200);
    }

    const zone = zoneRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    const total = zone.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

   if (burgerRef.current) {
  const scale = 1 + progress * 1.5;
  const opacity = Math.max(1 - progress * 0.8, 0); // was 0.8, now 1.4 = fades faster
  burgerRef.current.style.transform = `scale(${scale})`;
  burgerRef.current.style.opacity = opacity;
}

    if (heroLeftRef.current) {
      heroLeftRef.current.style.opacity = Math.max(1 - progress * 2.2, 0);
      heroLeftRef.current.style.transform = `translateY(${progress * -40}px)`;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

  const copyPassword = () => {
    navigator.clipboard.writeText(WIFI_PASS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`home-wrapper ${loaded ? "loaded" : ""}`}>
      

      

      {/* ── SCROLL-ZOOM HERO ──────────────────────────────────
          The tall .hero-scroll-zone gives scroll distance.
          .hero-section is sticky inside it, so it stays pinned
          while the burger zooms, then releases to the sections below. */}
      <div className="hero-scroll-zone" ref={zoneRef}>
        <div className="hero-section">
          <div className="hero-left" ref={heroLeftRef}>
            <div className="logo-title-container">
              <span className="sticker-letter yellow-text">SN</span>
              <img
                src={logoburger}
                alt="Snack Attack"
                className="sticker-logo-img"
              />
              <span className="sticker-letter yellow-text">CK</span>
              <span className="sticker-letter green-text">ATTACK</span>
            </div>

           

            <Link to="/menu" className="btn-hero">
              Start Order
            </Link>
          </div>

          <div className="hero-right">
            <img
              src={burgerHero}
              alt="Perfect Burger"
              className="burger-image"
              ref={burgerRef}
            />
          </div>
        </div>
      </div>
      <section className="about-section">
  <div className="about-content">
    <span className="about-eyebrow">Our Story</span>
    <h2 className="about-title">Born in Hamra, Built on Flavor</h2>
    <p className="about-text">
  More than just a restaurant, Snack Attack is a place where cravings meet quality. 
  We bring together fresh ingredients, creative recipes, and a fun atmosphere to deliver 
  food that’s fast, flavorful, and impossible to resist.
</p>
    <a href="/menu" className="about-link">Explore Our Menu →</a>
  </div>
</section>

      <section className="stats-section">
        <div className="section-container">
          <h2 className="section-title">Why We're Different</h2>
          <div className="stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="stat-emoji">{stat.emoji}</div>
                <div className="stat-number">
                  <AnimatedCounter target={typeof stat.value === "number" ? stat.value : parseFloat(stat.value)} duration={2.5} />
                  {stat.suffix && <span className="stat-suffix">{stat.suffix}</span>}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">Customer Love</h2>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="testimonial-card" style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="stars">
                  {Array(testimonial.rating).fill("⭐").join("")}
                </div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <p className="testimonial-author">— {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-final-section">
        <div className="cta-content">
          <h2>Hungry? Order Now</h2>
          <p>Fresh food, fast delivery, unforgettable taste</p>
          <Link to="/menu" className="btn-primary btn-large">
            Start Your Order 🚀
          </Link>
        </div>
      </section>

      <div className="scroll-hint" ref={scrollHintRef}>
        <div className="scroll-mouse">
          <div className="scroll-wheel" />
        </div>
        <span>Scroll to Explore</span>
      </div>
    </div>
  );
}

export default Home;