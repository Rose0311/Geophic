// src/components/globe.js (or MyGlobe.js)

import React, { useState, useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import NewsSidebar from "./NewsSidebar"; 

function MyGlobe() {
  const [data, setData] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCountry, setSidebarCountry] = useState("");
  const [countryNews, setCountryNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  // ⚡ NEW STATES FOR SEARCH FUNCTIONALITY
  const [searchText, setSearchText] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const globeRef = useRef(); // Add this ref
  
  // ⚡ NEW STATE FOR CATEGORY FILTER
  const [categoryFilter, setCategoryFilter] = useState("general");
  // ⚡ CATEGORY DEFINITION
  const categories = ["All News", "Technology", "Sports", "Entertainment", "Business", "Politics", "Health"];
  
  // ⚡ NEW STATES FOR SUMMARY SIDEBAR
  const [summarySidebarOpen, setSummarySidebarOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState({
    title: '',
    summary: '',
    loading: false,
    error: null
  });
   
  

  const colorMap = [
    "#FF6B6B", // soft coral red
    "#FFD93D", // warm golden yellow
    "#6BCB77", // fresh green
    "#4D96FF", // calm blue
    "#9D4EDD", // rich purple
    "#00B4D8", // cyan blue
    "#FFB5E8", // pastel pink
    "#C77DFF"  // lavender violet
  ];


  // ⚡ SEARCH HELPER FUNCTIONS

    
  useEffect(() => {
    fetch("/countries.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson.features) {
          console.error("Invalid GeoJSON structure");
          return;
        }
        const augmented = geojson.features.map((f, idx) => ({
          ...f,
          properties: {
            ...f.properties,
            color: colorMap[idx % colorMap.length],
          },
        }));
        setData(augmented);
      })
      .catch((e) => console.error("Fetch geojson error: ", e));
  }, []);

  // ⚡ REUSABLE FETCH FUNCTION (Now accepts an optional category)
  const fetchNews = (country, category = categoryFilter) => {
      setSidebarCountry(country);
      setSidebarOpen(true);
      setCountryNews([]);
      setIsLoadingNews(true);
  
      if (country === "Unknown") {
          setCountryNews([{ title: "Country name not found in data." }]);
          setIsLoadingNews(false);
          return;
      }
      // Update prompt to include the category for the backend API
      const prompt = `What are the 4 latest news headlines about ${country} in ${category} category without summary?`;
      const url = `http://127.0.0.1:5000/news?prompt=${encodeURIComponent(prompt)}&category=${encodeURIComponent(category)}`;

  
      fetch(url)
          .then(response => {
              if (!response.ok) {
                  console.log("✅ Connection established. Status:", response.status);
                  throw new Error(`Network response was not ok (status: ${response.status})`);
              }
              return response.json();
          })
          .then(data => {
              console.log("news recieved",data);
              setCountryNews(data.headlines || []);
          })
          .catch(error => {
              console.error("Fetch error:", error);
              setCountryNews([{ title: "Error: Could not fetch news." }]);
          })
          .finally(() => {
              setIsLoadingNews(false);
          });
  };

  // ⚡ NEW FUNCTION TO HANDLE SUMMARY CLICK
  const handleSummaryClick = async (url, title) => {
    setSummarySidebarOpen(true);
    setCurrentSummary({
      title: title,
      summary: '',
      loading: true,
      error: null
    });

    try {
      const response = await fetch(`http://127.0.0.1:5001/summarize?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success) {
        setCurrentSummary({
          title: title,
          summary: data.summary,
          loading: false,
          error: null
        });
      } else {
        setCurrentSummary({
          title: title,
          summary: '',
          loading: false,
          error: data.error || 'Failed to fetch summary'
        });
      }
    } catch (error) {
      setCurrentSummary({
        title: title,
        summary: '',
        loading: false,
        error: 'Network error: Could not reach summary service'
      });
    }
  };

  const closeSummarySidebar = () => {
    setSummarySidebarOpen(false);
  };

  const handlePolygonClick = (feature) => {
    const country = feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown";
    // When polygon is clicked, use the current categoryFilter state
    fetchNews(country, categoryFilter); 
  };

  // Add this function to format bullets beautifully
  const formatSummaryWithBullets = (summary) => {
    if (!summary) return summary;
    
    // Split by common bullet indicators
    const lines = summary.split('\n');
    
    return lines.map((line, index) => {
      let formattedLine = line.trim();
      
      // Detect bullet points and format them
      if (formattedLine.startsWith('- ') || formattedLine.startsWith('• ') || formattedLine.startsWith('* ')) {
        return (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '12px',
            paddingLeft: '8px'
          }}>
            <span style={{
              color: '#667eea',
              marginRight: '12px',
              fontSize: '18px',
              lineHeight: '1.4',
              marginTop: '2px',
              flexShrink: 0
            }}>•</span>
            <span style={{ 
              flex: 1,
              lineHeight: '1.6'
            }}>
              {formatTextWithBold(formattedLine.substring(2))}
            </span>
          </div>
        );
      }
      
      // Detect sub-bullets (indented with spaces)
      if (formattedLine.startsWith('  - ') || formattedLine.startsWith('  • ') || formattedLine.startsWith('  * ')) {
        return (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '8px',
            paddingLeft: '32px'
          }}>
            <span style={{
              color: '#8a94b3',
              marginRight: '12px',
              fontSize: '14px',
              lineHeight: '1.4',
              marginTop: '2px',
              flexShrink: 0
            }}>◦</span>
            <span style={{ 
              flex: 1,
              lineHeight: '1.6',
              fontSize: '14px',
              color: '#b8bcc8'
            }}>
              {formatTextWithBold(formattedLine.substring(4))}
            </span>
          </div>
        );
      }
      
      // Regular text with bold formatting
      if (formattedLine && !formattedLine.startsWith('---') && !formattedLine.startsWith('===')) {
        return (
          <div key={index} style={{ marginBottom: '16px' }}>
            {formatTextWithBold(formattedLine)}
          </div>
        );
      }
      
      return null;
    });
  };

  // Helper function to handle bold text (**text**)
  const formatTextWithBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ color: '#4D96FF', fontWeight: '600' }}>{part}</strong>;
      }
      return part;
    });
  };

    
  // helper: compute centroid for Polygon / MultiPolygon
  const getCentroid = (feature) => {
    if (!feature || !feature.geometry) return null;
    const geom = feature.geometry;
    let points = [];

    if (geom.type === "Polygon") {
      const outer = geom.coordinates[0] || [];
      outer.forEach((p) => points.push(p));
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((poly) => {
        const outer = poly[0] || [];
        outer.forEach((p) => points.push(p));
      });
    } else if (geom.type === "Point") {
      return { lat: geom.coordinates[1], lng: geom.coordinates[0] };
    } else {
      return null;
    }

    if (points.length === 0) return null;
    const avg = points.reduce(
      (acc, p) => {
        acc.lon += p[0];
        acc.lat += p[1];
        return acc;
      },
      { lon: 0, lat: 0 }
    );
    const lon = avg.lon / points.length;
    const lat = avg.lat / points.length;
    return { lat, lng: lon };
  };

  // build list of country names for suggestions
  const countryList = useMemo(() => {
    return data
      .map((f) => {
        const name =
          f.properties.ADMIN ||
          f.properties.name ||
          f.properties.NAME ||
          f.properties.COUNTRY ||
          (f.properties?.iso_a3 ? f.properties.iso_a3 : null) ||
          "";
        return { id: f.id, name: name.trim(), feature: f };
      })
      .filter((c) => c.name);
  }, [data]);

  // suggestions filtered by search text
  const suggestions = useMemo(() => {
    if (!searchText) return [];
    const q = searchText.toLowerCase();
    return countryList
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchText, countryList]);

  // when selecting a suggestion
  const handleSearchSelect = (name, id, feature) => {
    setSearchText(name);
    setSuggestionsOpen(false);

    setSelectedFeatureId(id || feature?.id);
    const c = getCentroid(feature || data.find((d) => d.id === id));
    if (c && globeRef.current) {
      globeRef.current.pointOfView({ lat: c.lat, lng: c.lng, altitude: 0.6 }, 1000);
    }

    fetchNews(name, categoryFilter);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!searchText) return;
      const exact = countryList.find((c) => c.name.toLowerCase() === searchText.toLowerCase());
      if (exact) {
        handleSearchSelect(exact.name, exact.id, exact.feature);
      } else if (suggestions.length > 0) {
        const s = suggestions[0];
        handleSearchSelect(s.name, s.id, s.feature);
      } else {
        fetchNews(searchText, categoryFilter);
      }
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
    }
  };

  // Polygon styling for selected country
  const polygonCapColor = (feature) =>
    feature.id === selectedFeatureId ? "#ffff66" : feature.properties.color;
  const polygonAltitude = (feature) => (feature.id === selectedFeatureId ? 0.06 : 0.01);
  const polygonStrokeColor = (feature) => (feature.id === selectedFeatureId ? "#333" : "#111");

    if (data.length === 0) return <div>Loading country globe...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: '#0a0d16' }}>
      {/* ⚡ SEARCH UI COMPONENT - ADD THIS */}
    <div
      style={{
        position: "absolute",
        top: 40,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "auto",
        userSelect: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: 8,
          borderRadius: 12,
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
          boxShadow: "0 8px 30px rgba(2,6,23,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(6px)",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <input
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSuggestionsOpen(true);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search country (e.g. India)"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            outline: "none",
            fontSize: 14,
          }}
          onFocus={() => setSuggestionsOpen(true)}
        />
        <button
          onClick={() => {
            const exact = countryList.find((c) => c.name.toLowerCase() === searchText.toLowerCase());
            if (exact) handleSearchSelect(exact.name, exact.id, exact.feature);
            else if (suggestions.length > 0) handleSearchSelect(suggestions[0].name, suggestions[0].id, suggestions[0].feature);
            else fetchNews(searchText, categoryFilter);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "#2563eb",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(37,99,235,0.18)",
          }}
        >
          Go
        </button>
      </div>

      {/* Dropdown suggestions */}
      {suggestionsOpen && suggestions.length > 0 && (
        <ul
          style={{
            marginTop: 8,
            listStyle: "none",
            padding: 8,
            borderRadius: 8,
            maxHeight: 220,
            overflowY: "auto",
            background: "#071025",
            border: "1px solid rgba(255,255,255,0.06)",
            zIndex: 999999,
            width: "100%",
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.id + s.name}
              onClick={() => handleSearchSelect(s.name, s.id, s.feature)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                color: "#fff",
                borderRadius: 6,
                marginBottom: 4,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>

      <Globe
        ref={globeRef} // Add this ref
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        polygonsData={data}
        polygonCapColor={polygonCapColor} // Updated
        polygonSideColor={() => "rgba(0,100,0,0.15)"}
        polygonStrokeColor={polygonStrokeColor} // Updated
        polygonAltitude={polygonAltitude} // Updated
        polygonLabel={(feature) =>
          `<b>${feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown"}</b><br/>Click for news`
        }
        onPolygonClick={handlePolygonClick}
        ambientLightColor="white"
        ambientLightIntensity={3}
        pointLightColor="white"
        pointLightIntensity={1.5}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      
      {/* ⚡ INTEGRATE NewsSidebar WITH onSummaryClick */}
      {sidebarOpen && (
        <NewsSidebar 
          // Filter State and Handlers
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          fetchNews={fetchNews}
          onClose={() => setSidebarOpen(false)}
          
          // News Data
          sidebarCountry={sidebarCountry}
          countryNews={countryNews}
          isLoadingNews={isLoadingNews}

          // ⚡ NEW PROP FOR SUMMARY
          onSummaryClick={handleSummaryClick}
        />
      )}

      {/* ⚡ SUMMARY SIDEBAR - LEFT SIDE */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: summarySidebarOpen ? '0' : '-400px',
        width: '380px',
        height: '100vh',
        background: 'linear-gradient(135deg, #2d3250 0%, #1a1d2e 100%)',
        boxShadow: '2px 0 32px rgba(0,0,0,0.4)',
        transition: 'left 0.3s ease-in-out',
        zIndex: 1000,
        overflow: 'hidden',
        borderRight: '1px solid #4a5073'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'left'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '600' }}>
            📰 Article Summary
          </h3>
          <button
            onClick={closeSummarySidebar}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          height: 'calc(100vh - 72px)',
          overflowY: 'auto',
          color: '#e0e0e0'
        }}>
          {/* Title */}
          {currentSummary.title && (
            <h4 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '16px', 
              color: '#4D96FF',
              lineHeight: '1.5',
              fontWeight: '600'
            }}>
              {currentSummary.title}
            </h4>
          )}

          {/* Loading State */}
          {currentSummary.loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '5px solid #3c415e',
                borderTop: '5px solid #667eea',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: '#aaa', fontSize: '15px' }}>Generating summary...</p>
            </div>
          )}

          {/* Error State */}
          {currentSummary.error && (
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid #FF6B6B',
              borderRadius: '8px',
              padding: '16px',
              color: '#FF6B6B',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <strong>⚠️ Error:</strong><br/>
              {currentSummary.error}
            </div>
          )}

          {/* Summary Text */}
           {!currentSummary.loading && !currentSummary.error && currentSummary.summary && (
            <div style={{
              fontSize: '15px',
              lineHeight: '1.8',
              color: '#d0d0d0'
            }}>
              {formatSummaryWithBullets(currentSummary.summary)}
            </div>
          )}

          {/* Empty State */}
          {!currentSummary.loading && !currentSummary.error && !currentSummary.summary && !currentSummary.title && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
                Click on the <strong style={{ color: '#667eea' }}>📝 button</strong> next to any news article to see its summary here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop overlay when summary sidebar is open */}
      {summarySidebarOpen && (
        <div
          onClick={closeSummarySidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MyGlobe;