// src/App.js

import React, { useState, useEffect } from "react";
import { auth } from "./firebase"; // Assuming you have firebase setup
import { onAuthStateChanged, signOut } from "firebase/auth";

import Auth from "./components/Auth"; // Assuming you have this component
import Subscribe from "./components/Subscribe"; // Assuming you have this component
import MyGlobe from "./globe"; // Your main globe component
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowSubscribe(false);
      alert("You have been logged out.");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const toggleAuth = () => {
    setShowAuth((prev) => !prev);
    setShowSubscribe(false); // close subscribe if open
  };

  const toggleSubscribe = () => {
    setShowSubscribe((prev) => !prev);
    setShowAuth(false); // close auth if open
  };

  return (
    <div className="App" style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Renders the main Globe component */}
      <MyGlobe />

      {/* Login/Subscribe Overlay - Styled to contrast with the new dark UI */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 100,
          padding: "10px",
          borderRadius: "10px",
          backdropFilter: "blur(12px)",
          // Adjusted background for better visibility on a dark theme
          background: "rgba(37,42,65,0.75)", 
          boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
          width: "280px",
        }}
      >
        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={toggleSubscribe}
              style={buttonStyle}
            >
              {showSubscribe ? "✖ Close Subscribe" : "📩 Subscribe"}
            </button>

            {showSubscribe && (
              <div style={cardStyle}>
                <Subscribe />
              </div>
            )}

            <button onClick={handleLogout} style={{ ...buttonStyle, color: "#ff4b4b" }}>
              🚪 Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={toggleAuth} style={buttonStyle}>
              {showAuth ? "✖ Close Login" : "🔑 Login / Signup"}
            </button>
            {showAuth && <div style={cardStyle}><Auth /></div>}
          </div>
        )}
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "10px 15px",
  border: "none",
  background: "transparent",
  color: "white", // Set text color to white for visibility on dark overlay
  fontSize: "16px",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "500",
  letterSpacing: "0.5px",
  backdropFilter: "blur(5px)",
  // Optional hover effect for better UX
  transition: 'background-color 0.2s',
};

const cardStyle = {
  // Adjusted background to be slightly opaque and lighter for form content
  background: "rgba(255,255,255,0.95)", 
  borderRadius: "8px",
  padding: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
};

export default App;
