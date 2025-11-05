import React, { useState } from "react";
// 1. Import 'db' from your firebase config file
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
// 2. Import Firestore functions
import { doc, setDoc } from "firebase/firestore";

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
        console.log("Logged in successfully!"); // Use console.log instead of alert
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`,
        });

        // 3. Create a user document in Firestore with subscription
        // This path should match your Firestore rules and app structure
        // We will use the "users" collection here.
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          displayName: `${firstName} ${lastName}`,
          email: user.email,
          isSubscribed: true // Default new users to subscribed
        });

        console.log("Registered successfully!"); // Use console.log instead of alert
      }
    } catch (err) {
      console.error(err.message); // Use console.error instead of alert
    }
  };

  // Tailwind classes for a professional UI
  const inputClasses = "w-full px-4 py-3 mb-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200";
  const buttonClasses = "w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-300";
  const toggleButtonClasses = "text-blue-500 dark:text-blue-400 hover:underline focus:outline-none font-medium";

  return (
    <div className="max-w-md mx-auto mt-8 p-8 bg-white dark:bg-gray-800 shadow-2xl rounded-lg">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
        {isLogin ? "Welcome Back" : "Create Account"}
      </h2>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={inputClasses}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className={inputClasses}
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClasses}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputClasses}
        />

        <button type="submit" className={buttonClasses}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
        {isLogin ? (
          <>
            New user?{" "}
            <button onClick={() => setIsLogin(false)} className={toggleButtonClasses}>
              Register here
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => setIsLogin(true)} className={toggleButtonClasses}>
              Login here
            </button>
          </>
        )}
      </p>
    </div>
  );
}

