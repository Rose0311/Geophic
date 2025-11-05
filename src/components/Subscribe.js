import React, { useState, useEffect } from "react";
// 1. Import 'db' and 'auth'
import { auth, db } from "../firebase";
// 2. Import Firestore functions for real-time updates
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";

export default function Subscribe() {
  // null = loading, true = subscribed, false = unsubscribed
  const [isSubscribed, setIsSubscribed] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // 3. Listen to auth state to get the user ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // 4. Listen to the user's subscription status in Firestore
  useEffect(() => {
    if (!userId) {
      setIsSubscribed(null);
      return;
    }

    // This path MUST match the one in Auth.js
    const userDocRef = doc(db, "users", userId); 
    
    // onSnapshot listens for real-time changes
    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        // User doc exists, check their status
        const data = docSnap.data();
        if (typeof data.isSubscribed === 'boolean') {
          setIsSubscribed(data.isSubscribed);
        } else {
          // Field doesn't exist, so create it (for users who registered before this logic)
          await updateDoc(userDocRef, { isSubscribed: false });
          setIsSubscribed(false);
        }
      } else {
        // This case might happen if signup was interrupted or for old users
        // As a fallback, create the doc.
        if (auth.currentUser) {
          await setDoc(userDocRef, { 
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            isSubscribed: false 
          }, { merge: true });
        }
        setIsSubscribed(false);
      }
    }, (error) => {
      console.error("Error listening to subscription:", error);
    });

    return () => unsubscribe(); // Cleanup listener
  }, [userId]); // Re-run if user ID changes

  // 5. Toggle subscription function
  const handleToggleSubscription = async () => {
    if (userId === null || isSubscribed === null) return;

    setIsLoading(true);
    const userDocRef = doc(db, "users", userId);
    try {
      // Update the value in Firestore
      await updateDoc(userDocRef, {
        isSubscribed: !isSubscribed
      });
      // The onSnapshot listener will automatically update the UI state
      console.log("Subscription status updated!");
    } catch (error) {
      console.error("Error toggling subscription:", error);
    }
    setIsLoading(false);
  };

  // 6. Render different button states
  if (isSubscribed === null) {
    return <p>Loading subscription status...</p>;
  }

  return (
    <button 
      onClick={handleToggleSubscription} 
      disabled={isLoading}
      style={{
        backgroundColor: isSubscribed ? '#f0ad4e' : '#5cb85c', // Orange for Unsub, Green for Sub
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        minWidth: '120px',
        fontSize: '1em',
        fontWeight: 'bold'
      }}
    >
      {isLoading 
        ? "Updating..." 
        : (isSubscribed ? "Unsubscribe" : "Subscribe")
      }
    </button>
  );
}

