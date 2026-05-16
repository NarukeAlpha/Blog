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
  { top: "1%", left: "4%", width: "78px", animationDelay: "-24s", animationDuration: "24s" },
  { top: "1%", left: "18%", width: "96px", animationDelay: "-17s", animationDuration: "34s" },
  { top: "1%", left: "36%", width: "62px", animationDelay: "-9s", animationDuration: "28s" },
  { top: "1%", left: "52%", width: "86px", animationDelay: "-2s", animationDuration: "38s" },
  { top: "1%", left: "68%", width: "70px", animationDelay: "4s", animationDuration: "30s" },
  { top: "1%", left: "28%", width: "74px", animationDelay: "9s", animationDuration: "42s" },
  { top: "1%", left: "59%", width: "54px", animationDelay: "13s", animationDuration: "36s" },
  { top: "1%", left: "11%", width: "90px", animationDelay: "18s", animationDuration: "46s" },
  { top: "8%", left: "1%", width: "66px", animationDelay: "22s", animationDuration: "32s" },
  { top: "16%", left: "1%", width: "82px", animationDelay: "27s", animationDuration: "44s" },
  { top: "25%", left: "1%", width: "58px", animationDelay: "31s", animationDuration: "26s" },
  { top: "34%", left: "1%", width: "104px", animationDelay: "35s", animationDuration: "48s" },
  { top: "43%", left: "1%", width: "72px", animationDelay: "39s", animationDuration: "40s" },
  { top: "52%", left: "1%", width: "88px", animationDelay: "44s", animationDuration: "45s" },
  { top: "61%", left: "1%", width: "64px", animationDelay: "48s", animationDuration: "29s" },
  { top: "70%", left: "1%", width: "94px", animationDelay: "52s", animationDuration: "43s" },
  { top: "1%", left: "44%", width: "76px", animationDelay: "57s", animationDuration: "35s" },
  { top: "21%", left: "1%", width: "60px", animationDelay: "61s", animationDuration: "39s" }
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
