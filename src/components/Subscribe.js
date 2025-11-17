// import React, { useState } from "react";

// export default function Subscribe() {
//   const [subscribed, setSubscribed] = useState(false);

//   const toggleSubscribe = () => {
//     setSubscribed(!subscribed);
//   };

//   return (
//     <button
//       onClick={toggleSubscribe}
//       style={{
//         padding: "10px 18px",
//         borderRadius: "8px",
//         border: "none",
//         fontSize: "15px",
//         cursor: "pointer",
//         fontWeight: "600",
//         color: subscribed ? "white" : "white",
//         backgroundColor: subscribed ? "#e63946" : "#1d3557", // red when subscribed, dark blue when not
//         transition: "0.2s ease",
//         boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
//       }}
//       onMouseEnter={(e) =>
//         (e.target.style.opacity = "0.85")
//       }
//       onMouseLeave={(e) =>
//         (e.target.style.opacity = "1")
//       }
//     >
//       {subscribed ? "Unsubscribe" : "Subscribe to Reminders"}
//     </button>
//   );
// }

import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function Subscribe() {
  const [user, setUser] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true); // fix lag

  // Run only once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // check subscription only once
        const docRef = doc(db, "subscribers", currentUser.uid);
        const snapshot = await getDoc(docRef);
        setSubscribed(snapshot.exists());
      }

      setLoading(false); // done
    });

    return () => unsubscribe();
  }, []);

  const toggleSubscribe = async () => {
    if (!user) return alert("Please login to subscribe!");

    const docRef = doc(db, "subscribers", user.uid);

    if (subscribed) {
      await deleteDoc(docRef);
      setSubscribed(false);
    } else {
      await setDoc(docRef, {
        email: user.email,
        subscribedAt: new Date(),
      });
      setSubscribed(true);
    }
  };

  if (loading) return null; // don't render button until ready

  return (
    <button
      onClick={toggleSubscribe}
      style={{
        padding: "10px 18px",
        borderRadius: "8px",
        border: "none",
        fontSize: "15px",
        cursor: "pointer",
        fontWeight: "600",
        color: "white",
        backgroundColor: subscribed ? "#e63946" : "#1d3557",
        transition: "0.2s ease",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.target.style.opacity = "1")}
    >
      {subscribed ? "Unsubscribe" : "Subscribe to Reminders"}
    </button>
  );
}