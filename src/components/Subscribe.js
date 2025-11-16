// import React from "react";
// import { auth } from "../firebase";
// import { getIdToken } from "firebase/auth";

// export default function Subscribe() {
//   const subscribe = async () => {
//     const token = await getIdToken(auth.currentUser);
//     await fetch("http://localhost:5000/api/subscribe", {
//       method: "POST",
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     alert("Subscribed!");
//   };

//   return <button onClick={subscribe}>Subscribe to Reminders</button>;
// }


import React, { useState } from "react";

export default function Subscribe() {
  const [subscribed, setSubscribed] = useState(false);

  const toggleSubscribe = () => {
    setSubscribed(!subscribed);
  };

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
        color: subscribed ? "white" : "white",
        backgroundColor: subscribed ? "#e63946" : "#1d3557", // red when subscribed, dark blue when not
        transition: "0.2s ease",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={(e) =>
        (e.target.style.opacity = "0.85")
      }
      onMouseLeave={(e) =>
        (e.target.style.opacity = "1")
      }
    >
      {subscribed ? "Unsubscribe" : "Subscribe to Reminders"}
    </button>
  );
}