import React from "react";
import { auth } from "../firebase";
import { getIdToken } from "firebase/auth";

export default function Subscribe() {
  const subscribe = async () => {
    const token = await getIdToken(auth.currentUser);
    await fetch("http://localhost:5000/api/subscribe", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("Subscribed!");
  };

  return <button onClick={subscribe}>Subscribe to Reminders</button>;
}
