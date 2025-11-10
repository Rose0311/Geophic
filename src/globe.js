import React, { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";

export default function MyGlobe() {
  const [data, setData] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCountry, setSidebarCountry] = useState("");
  const [countryNews, setCountryNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);

  const neonPalette = ["#39FF14","#FF073A","#F9F871","#00FFFF","#FF6EFF",
    "#7DF9FF","#FFAA1D","#B026FF","#4BFF81","#FF2079","#00F5D4","#FE53BB"];

  useEffect(() => {
    fetch("/countries.geojson")
      .then(res => res.json())
      .then(geojson => {
        const augmented = geojson.features.map((f, i) => ({
          ...f,
          properties: { ...f.properties, color: neonPalette[i % neonPalette.length] }
        }));
        setData(augmented);
        setTimeout(() => setLoading(false), 1200);
      })
      .catch(() => setLoading(false));
  }, []);

  // ✅ UPDATED SOUND FUNCTION
  // This version plays sound immediately by setting volume directly,
  // avoiding the setInterval() that was blocked by globe loading.
  const toggleSound = () => {
    if (!audioRef.current) {
      console.log("Audio ref not ready");
      return;
    }

    if (soundOn) {
      // Fade out (optional, but nice)
      let v = audioRef.current.volume;
      const fadeOut = setInterval(() => {
        if (v > 0.05) {
          v -= 0.05;
          audioRef.current.volume = v;
        } else {
          clearInterval(fadeOut);
          audioRef.current.pause();
          setSoundOn(false);
        }
      }, 30);
    } else {
      // Set volume directly, don't use setInterval to fade in
      audioRef.current.volume = 0.4;
      
      const p = audioRef.current.play();

      if (p !== undefined) {
        p.then(() => {
          // It's playing!
          setSoundOn(true);
        }).catch(e => {
          // Browser blocked it
          console.log("Audio play was blocked", e);
          setSoundOn(false);
          audioRef.current.volume = 0;
        });
      }
    }
  };

  const handlePolygonClick = (feature) => {
    const country = feature.properties.ADMIN || feature.properties.name || "Unknown";
    setSidebarCountry(country);
    setSidebarOpen(true);
    setCountryNews([]);

    setIsLoadingNews(true);
    fetch(`http://127.0.0.1:5000/news?prompt=${encodeURIComponent(`What are the top 3 latest news headlines about ${country} without summary?`)}`)
      .then(r => r.json())
      .then(d => setCountryNews(d.headlines || []))
      .catch(() => setCountryNews([{ title: "Error fetching news." }]))
      .finally(() => setIsLoadingNews(false));
  };

  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative" }}>

      {/* 🎧 AUDIO ALWAYS MOUNTED */}
      <audio ref={audioRef} loop>
        <source src="/sounds/space-hum.mp3" type="audio/mpeg" />
      </audio>

      {/* ✅ SOUND ICON — ABOVE LOADER */}
      <button
        onClick={toggleSound}
        style={{
          position:"absolute", top:"20px", left:"20px",
          zIndex:100000, fontSize:"22px",
          padding:"6px 10px",
          background:"rgba(0,0,0,0.55)",
          border:"1px solid #00ffe5",
          borderRadius:"8px", color:"#00ffe5",
          cursor:"pointer"
        }}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>

      {/* 🌍 GLOBE */}
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        polygonsData={data}
        polygonCapColor={f => f.properties.color}
        polygonSideColor={() => "rgba(255,255,255,0.15)"}
        polygonStrokeColor={() => "#111"}
        polygonAltitude={0.01}
        polygonLabel={f => `<b>${f.properties.ADMIN}</b><br/>Click for news`}
        onPolygonClick={handlePolygonClick}
      />

      {/* 🚀 LOADING SCREEN */}
      {loading && (
        <div style={{
          pointerEvents:"none", /* ✅ allows clicks to pass through to sound icon */
          position:"absolute", top:0, left:0, width:"100%", height:"100%",
          display:"flex", flexDirection:"column", justifyContent:"center",
          alignItems:"center", background:"rgba(0,0,0,0.85)",
          zIndex:9999, color:"#00FFE5"
        }}>
          <div className="starfield">
            {Array.from({ length:200 }).map((_,i)=>(
              <span key={i} style={{
                top:Math.random()*100+"%", left:Math.random()*100+"%",
                animationDuration:(2+Math.random()*3)+"s",
                animationDelay:Math.random()*5+"s"
              }} />
            ))}
          </div>

          <div className="globe-spinner" />
          <h2 style={{ marginTop:"20px" }}>Initializing Universe...</h2>
        </div>
      )}

      {/* 📰 Sidebar */}
      {sidebarOpen && (
        <div style={{
          position:"absolute", top:0, right:0, width:"300px", height:"100vh",
          background:"#fff", padding:"20px", zIndex:100
        }}>
          <button onClick={()=>setSidebarOpen(false)}>Close</button>
          <h2>{sidebarCountry} News</h2>
          {isLoadingNews ? <p>Loading...</p> : (
            <ul>{countryNews.map((n,i)=>(
              <li key={i}>
                {n.url ? <a href={n.url} target="_blank"><b>{n.title}</b></a> : <b>{n.title}</b>}
              </li>
            ))}</ul>
          )}
        </div>
      )}

    </div>
  );
}