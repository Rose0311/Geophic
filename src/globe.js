// src/components/globe.js (or MyGlobe.js)

import React, { useState, useEffect } from "react";
import Globe from "react-globe.gl";
import NewsSidebar from "./NewsSidebar"; // <--- IMPORT THE NEW COMPONENT

function MyGlobe() {
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

  const handlePolygonClick = (feature) => {
    const country = feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown";
    // When polygon is clicked, use the current categoryFilter state
    fetchNews(country, categoryFilter); 
  };

  if (data.length === 0) return <div>Loading country globe...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: '#0a0d16' }}> {/* Added dark background to fill the screen */}
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        polygonsData={data}
        polygonCapColor={(feature) => feature.properties.color}
        polygonSideColor={() => "rgba(0,100,0,0.15)"}
        polygonStrokeColor={() => "#111"}
        polygonAltitude={0.01}
        polygonLabel={(feature) =>
          `<b>${feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown"}</b><br/>Click for news`
        }
        onPolygonClick={handlePolygonClick}
        ambientLightColor="white"
        ambientLightIntensity={3}
        pointLightColor="white"
        pointLightIntensity={1.5}
      />
      {/* ⚡ INTEGRATE NewsSidebar */}
      {sidebarOpen && (
        <NewsSidebar 
          // Filter State and Handlers
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          fetchNews={fetchNews} // Pass the fetching function
          onClose={() => setSidebarOpen(false)} // Pass the close handler
          
          // News Data
          sidebarCountry={sidebarCountry}
          countryNews={countryNews}
          isLoadingNews={isLoadingNews}
        />
      )}
    </div>
  );
}

export default MyGlobe;
