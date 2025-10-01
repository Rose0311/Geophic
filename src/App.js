// src/App.js

import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Auth from "./components/Auth";
import Subscribe from "./components/Subscribe";
import MyGlobe from "./globe"; // her globe.js is now in src
import './App.css'; // merged CSS for both apps

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("You have been logged out.");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Interactive Globe Newsletters 🌍</h1>
      </header>
      <main>
        {user ? (
          <div>
            <h2>Welcome, {user.displayName || user.email}!</h2>
            <p>You can now subscribe to our newsletters.</p>
            <Subscribe />

            {/* Globe component directly integrated */}
            <div className="GlobeContainer">
              <MyGlobe />
            </div>

            <button
              onClick={handleLogout}
              style={{ marginLeft: "10px", backgroundColor: "red", color: "white" }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Auth />
        )}
      </main>
    </div>
  );
}

export default App;
