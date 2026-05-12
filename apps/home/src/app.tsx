function TwinkleLayer() {
  return (
    <div className="pub-twinkle-layer" aria-hidden>
      {[...Array(14)].map((_, index) => (
        <span
          key={index}
          className="pub-twinkle"
          style={{
            width: `${2 + (index % 3)}px`,
            height: `${2 + (index % 3)}px`,
            top: `${8 + (index * 7.3) % 85}%`,
            left: `${5 + (index * 8.7) % 90}%`,
            animation: `twinkle ${2 + (index % 4) * 0.8}s ease-in-out ${index * 0.4}s infinite`,
            filter:
              index % 3 === 0
                ? "drop-shadow(0 0 4px rgba(120,80,255,0.8))"
                : index % 3 === 1
                  ? "drop-shadow(0 0 4px rgba(0,210,230,0.7))"
                  : "drop-shadow(0 0 3px rgba(255,255,255,0.6))"
          }}
        />
      ))}
    </div>
  );
}

const shootingStars = [
  { top: "-6%", left: "-18%", width: "78px", animationDelay: "1.5s", animationDuration: "18s" },
  { top: "7%", left: "-30%", width: "64px", animationDelay: "7s", animationDuration: "24s" },
  { top: "20%", left: "-22%", width: "88px", animationDelay: "13s", animationDuration: "28s" },
  { top: "-10%", left: "8%", width: "58px", animationDelay: "20s", animationDuration: "22s" },
  { top: "34%", left: "-36%", width: "72px", animationDelay: "31s", animationDuration: "30s" }
];

function ShootingStarLayer() {
  return (
    <div className="home-shooting-star-layer" aria-hidden>
      {shootingStars.map((star, index) => (
        <span key={index} className="home-shooting-star" style={star} />
      ))}
    </div>
  );
}

function App() {
  return (
    <div className="site-shell pub-shell">
      <div className="stardust-overlay" />
      <TwinkleLayer />
      <ShootingStarLayer />

      <main className="home-stage" aria-labelledby="home-title">
        <header className="home-header">
          <h1 className="home-title" id="home-title">Gabriel Alfonzo</h1>
          <p className="home-subtitle">~/ Home</p>
        </header>
      </main>
    </div>
  );
}

export default App;
