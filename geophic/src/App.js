// src/App.js

import React, { useState, useEffect } from "react";
import { auth } from "./firebase"; // Your firebase.js file
import { onAuthStateChanged, signOut } from "firebase/auth";

import Auth from "./components/Auth";
import Subscribe from "./components/Subscribe";

function App() {
  const [user, setUser] = useState(null); // This state will hold the logged-in user object

  // This useEffect hook runs once when the component mounts
  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // This callback function will be executed whenever the auth state changes
      if (currentUser) {
        // User is signed in
        console.log("User is logged in:", currentUser);
        setUser(currentUser);
      } else {
        // User is signed out
        console.log("User is logged out");
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // The empty dependency array ensures this effect runs only once

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
          // If user IS logged in, show this content
          <div>
            <h2>Welcome, {user.displayName || user.email}!</h2>
            <p>You can now subscribe to our newsletters.</p>
            <Subscribe />
            <button onClick={handleLogout} style={{ marginLeft: "10px", backgroundColor: "red", color: "white" }}>
              Logout
            </button>
          </div>
        ) : (
          // If user is NOT logged in, show the Auth component
          <Auth />
        )}
      </main>
    </div>
  );
}

export default App;