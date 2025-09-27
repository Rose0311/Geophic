import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function Auth() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        alert("Logged in successfully!");
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: `${firstName} ${lastName}`,
        });
        alert("Registered successfully!");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h2>{isLogin ? "Login" : "Register"}</h2>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
        />

        <button type="submit" style={{ marginTop: "10px", padding: "10px", width: "100%", cursor: "pointer" }}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "15px", textAlign: "center" }}>
        {isLogin ? (
          <>
            New user?{" "}
            <button onClick={() => setIsLogin(false)} style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}>
              Register here
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => setIsLogin(true)} style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}>
              Login here
            </button>
          </>
        )}
      </p>
    </div>
  );
}
