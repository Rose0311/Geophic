import React, { useState, useEffect } from "react";
import Globe from "react-globe.gl";


function MyGlobe() {
  const [data, setData] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCountry, setSidebarCountry] = useState("");
  const [countryNews, setCountryNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const colorMap = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F6", "#33FFF6", "#F633FF", "#33F6FF"];
  

  useEffect(() => {
    fetch("/countries.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson.features) {
          console.error("Invalid GeoJSON structure");
          return;
        }
        // Assign colors only, no news
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

  const handlePolygonClick = (feature) => {
    const country = feature.properties.ADMIN || feature.properties.name || feature.properties.COUNTRY || "Unknown";
    
    setSidebarCountry(country);
    setSidebarOpen(true);
    setCountryNews([]); // 1. Clears old news immediately
    setIsLoadingNews(true); // 2. Uses a dedicated state for loading

    if (country === "Unknown") {
      setCountryNews([{ title: "Country name not found in data." }]);
      setIsLoadingNews(false);
      return;
    }
    const prompt = `What are the top 3 latest news headlines about ${country} without summary?`;
    fetch(`http://127.0.0.1:5000/news?prompt=${encodeURIComponent(prompt)}`)
      .then(response => {
        if (!response.ok) {
          console.log("✅ Connection established. Status:", response.status);
          throw new Error(`Network response was not ok (status: ${response.status})`);
        }
        return response.json();
      })
      .then(data => {
        setCountryNews(data.headlines || []); // Correctly sets the array of objects
      })
      .catch(error => {
        console.error("Fetch error:", error);
        // Sets an error object for consistent rendering
        setCountryNews([{ title: "Error: Could not fetch news." }]);
      })
      .finally(() => {
        setIsLoadingNews(false); // 3. Hides loading indicator, regardless of success/failure
      });
  };

  if (data.length === 0) return <div>Loading country globe...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
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
      {sidebarOpen && (
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "350px",
          height: "100vh",
          background: "#fff",
          boxShadow: "-2px 0 8px rgba(0,0,0,0.15)",
          zIndex: 10,
          overflowY: "auto",
          padding: "24px"
        }}>
          <button style={{ float: "right" }} onClick={() => setSidebarOpen(false)}>Close</button>
          <h2>{sidebarCountry} News</h2>
          {isLoadingNews ? (
            <p>Loading news...</p> // 1. Shows a loading message
          ) : (
            <ul>
              {countryNews.length > 0 ? (
                countryNews.map((newsItem, idx) => ( // 2. Maps over objects, not strings
                  <li key={idx} style={{ marginBottom: "16px", listStyle: "none" }}>
                    {/* 3. Creates a clickable link for the title */}
                    {newsItem.url ? (
                      <a href={newsItem.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#007BFF' }}>
                        <strong>{newsItem.url}</strong>
                        <strong>{newsItem.title}</strong>
                      </a>
                    ) : (
                      <strong>{newsItem.title}</strong>
                    )}
                    {/* 4. Displays summary if it exists */}
                    {newsItem.summary && <p style={{ margin: '4px 0 0', fontSize: '0.9em', color: '#555' }}>{newsItem.summary}</p>}
                  </li>
                ))
              ) : (
                // 5. Shows a clear message if no news is found
                <li>No news found.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default MyGlobe;
