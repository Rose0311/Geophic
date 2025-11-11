// src/components/globe.js (or MyGlobe.js)

import React, { useState, useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import NewsSidebar from "./NewsSidebar"; // <--- IMPORT THE NEW COMPONENT

function MyGlobe() {
  const globeRef = useRef();
  const [data, setData] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCountry, setSidebarCountry] = useState("");
  const [countryNews, setCountryNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  
  // ⚡ NEW STATE FOR CATEGORY FILTER
  const [categoryFilter, setCategoryFilter] = useState("general");
  // ⚡ CATEGORY DEFINITION
  const categories = ["All News", "Technology", "Sports", "Entertainment", "Business", "Politics", "Health"];

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

   // search UI state
  const [searchText, setSearchText] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);


// single geojson loader
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
          // stable id fallback
          id: f.properties.ISO_A3 || f.properties.iso_a3 || f.properties.ADMIN || idx,
          properties: {
            ...f.properties,
            color: colorMap[idx % colorMap.length],
          },
        }));
        setData(augmented);
      })
      .catch((e) => console.error("Fetch geojson error: ", e));
  }, []);

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

  // fetch news (reusable)
  const fetchNews = (country, category = categoryFilter) => {
    setSidebarCountry(country);
    setSidebarOpen(true);
    setCountryNews([]);
    setIsLoadingNews(true);

    if (!country || country === "Unknown") {
      setCountryNews([{ title: "Country name not found in data." }]);
      setIsLoadingNews(false);
      return;
    }
    const prompt = `What are the 4 latest news headlines about ${country} in ${category} category without summary?`;
    const url =
      `http://127.0.0.1:5000/news?prompt=${encodeURIComponent(prompt)}` +
      `&category=${encodeURIComponent(category)}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (status: ${response.status})`);
        }
        return response.json();
      })
      .then((data) => setCountryNews(data.headlines || []))
      .catch((error) => {
        console.error("Fetch error:", error);
        setCountryNews([{ title: "Error: Could not fetch news." }]);
      })
      .finally(() => setIsLoadingNews(false));
  };
  // handle polygon click
  const handlePolygonClick = (feature) => {
    const country =
      feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown";
    setSelectedFeatureId(feature.id);
    const c = getCentroid(feature);
    if (c && globeRef.current) {
      globeRef.current.pointOfView({ lat: c.lat, lng: c.lng, altitude: 0.6 }, 1000);
    }
    fetchNews(country, categoryFilter);
  };

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

  const polygonCapColor = (feature) =>
    feature.id === selectedFeatureId ? "#ffff66" : feature.properties.color;
  const polygonAltitude = (feature) => (feature.id === selectedFeatureId ? 0.06 : 0.01);
  const polygonStrokeColor = (feature) => (feature.id === selectedFeatureId ? "#333" : "#111");

  if (data.length === 0) return <div style={{ padding: 20 }}>Loading country globe...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#0a0d16" }}>
      {/* Middle search UI */}
      <div
        style={{
          position: "absolute",
          top: 40,               // distance from top
          left: "50%",           // start in middle
          transform: "translateX(-50%)", // perfectly center horizontally
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
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        polygonsData={data}
        polygonCapColor={polygonCapColor}
        polygonSideColor={() => "rgba(0,100,0,0.15)"}
        polygonStrokeColor={polygonStrokeColor}
        polygonAltitude={polygonAltitude}
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

      {/* NewsSidebar */}
      {sidebarOpen && (
        <NewsSidebar
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          fetchNews={fetchNews}
          onClose={() => setSidebarOpen(false)}
          sidebarCountry={sidebarCountry}
          countryNews={countryNews}
          isLoadingNews={isLoadingNews}
        />
      )}
    </div>
  );
}


  // // ⚡ REUSABLE FETCH FUNCTION (Now accepts an optional category)
  // const fetchNews = (country, category = categoryFilter) => {
  //     setSidebarCountry(country);
  //     setSidebarOpen(true);
  //     setCountryNews([]);
  //     setIsLoadingNews(true);
  
  //     if (country === "Unknown") {
  //         setCountryNews([{ title: "Country name not found in data." }]);
  //         setIsLoadingNews(false);
  //         return;
  //     }
  //     // Update prompt to include the category for the backend API
  //     const prompt = `What are the 4 latest news headlines about ${country} in ${category} category without summary?`;
  //     const url = `http://127.0.0.1:5000/news?prompt=${encodeURIComponent(prompt)}&category=${encodeURIComponent(category)}`;
  
  //     fetch(url)
  //         .then(response => {
  //             if (!response.ok) {
  //                 console.log("✅ Connection established. Status:", response.status);
  //                 throw new Error(`Network response was not ok (status: ${response.status})`);
  //             }
  //             return response.json();
  //         })
  //         .then(data => {
  //             console.log("news recieved",data);
  //             setCountryNews(data.headlines || []);
  //         })
  //         .catch(error => {
  //             console.error("Fetch error:", error);
  //             setCountryNews([{ title: "Error: Could not fetch news." }]);
  //         })
  //         .finally(() => {
  //             setIsLoadingNews(false);
  //         });
  // };

  // const handlePolygonClick = (feature) => {
  //   const country = feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown";
  //   // When polygon is clicked, use the current categoryFilter state
  //   fetchNews(country, categoryFilter); 
  // };

  // if (data.length === 0) return <div>Loading country globe...</div>;

  // return (
  //   <div style={{ width: "100vw", height: "100vh", position: "relative", background: '#0a0d16' }}> {/* Added dark background to fill the screen */}
  //     <Globe
  //       globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
  //       polygonsData={data}
  //       polygonCapColor={(feature) => feature.properties.color}
  //       polygonSideColor={() => "rgba(0,100,0,0.15)"}
  //       polygonStrokeColor={() => "#111"}
  //       polygonAltitude={0.01}
  //       polygonLabel={(feature) =>
  //         `<b>${feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown"}</b><br/>Click for news`
  //       }
  //       onPolygonClick={handlePolygonClick}
  //       ambientLightColor="white"
  //       ambientLightIntensity={3}
  //       pointLightColor="white"
  //       pointLightIntensity={1.5}
  //     />
  //     {/* ⚡ INTEGRATE NewsSidebar */}
  //     {sidebarOpen && (
  //       <NewsSidebar 
  //         // Filter State and Handlers
  //         categories={categories}
  //         categoryFilter={categoryFilter}
  //         setCategoryFilter={setCategoryFilter}
  //         fetchNews={fetchNews} // Pass the fetching function
  //         onClose={() => setSidebarOpen(false)} // Pass the close handler
          
  //         // News Data
  //         sidebarCountry={sidebarCountry}
  //         countryNews={countryNews}
  //         isLoadingNews={isLoadingNews}
  //       />
  //     )}
  //   </div>
  // );


export default MyGlobe;