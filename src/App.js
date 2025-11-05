// src/App.js

import React, { useState, useEffect, lazy, Suspense } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Auth from "./components/Auth";
import Subscribe from "./components/Subscribe";
import './App.css'; // Assuming you have this file for base styles

// 1. Use React.lazy() to dynamically import the component
const LazyGlobe = lazy(() => import("./globe")); 

function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Added auth loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setIsLoadingAuth(false); // Auth check is complete
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("You have been logged out.");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Show a global loader while auth state is being determined
  if (isLoadingAuth) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.5em' }}>Loading...</div>;
  }

  return (
    <div className="App">
      <header>
        <h1 style={{ textAlign: 'center', margin: '20px 0' }}>Interactive Globe Newsletters 🌍</h1>
      </header>
      <main>
        {/* 1. The Globe is now ALWAYS rendered */}
        {/* Added a container with a defined height for the globe */}
        <div className="GlobeContainer" style={{ height: '70vh', minHeight: '500px', width: '100%', position: 'relative', background: '#f0f0f0', marginBottom: '20px' }}>
          <Suspense 
            fallback={
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', textAlign: 'center', fontSize: '1.2em' }}>
                <strong>🌍 Loading Interactive Globe...</strong>
              </div>
            }
          >
            <LazyGlobe /> 
          </Suspense>
        </div>

        {/* 2. Controls & Auth are rendered conditionally underneath */}
        {user ? (
          // --- LOGGED-IN VIEW ---
          <div className="UserControls" style={{ padding: '20px', textAlign: 'center', background: '#f9f9f9', margin: '20px auto', borderRadius: '8px', maxWidth: '500px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h2>Welcome, {user.displayName || user.email}!</h2>
            <p style={{ margin: '10px 0 20px' }}>Manage your newsletter subscription below.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
              <Subscribe />
              <button
                onClick={handleLogout}
                style={{ 
                  backgroundColor: "#d9534f", // Red
                  color: "white", 
                  border: 'none', 
                  padding: '10px 15px', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          // --- LOGGED-OUT VIEW ---
          <Auth />
        )}
      </main>
    </div>
  );
}

export default App;

