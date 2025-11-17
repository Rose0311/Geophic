// import React, { useState } from "react";
// import { auth } from "../firebase";
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

// export default function Auth() {
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isLogin, setIsLogin] = useState(true);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (isLogin) {
//         // Login
//         await signInWithEmailAndPassword(auth, email, password);
//         alert("Logged in successfully!");
//       } else {
//         // Register
//         const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//         await updateProfile(userCredential.user, {
//           displayName: `${firstName} ${lastName}`,
//         });
//         alert("Registered successfully!");
//       }
//     } catch (err) {
//       alert(err.message);
//     }
//   };

//   return (
//     <div style={{ maxWidth: "400px", margin: "20px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
//       <h2>{isLogin ? "Login" : "Register"}</h2>

//       <form onSubmit={handleSubmit}>
//         {!isLogin && (
//           <>
//             <input
//               type="text"
//               placeholder="First Name"
//               value={firstName}
//               onChange={(e) => setFirstName(e.target.value)}
//               required
//               style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
//             />
//             <input
//               type="text"
//               placeholder="Last Name"
//               value={lastName}
//               onChange={(e) => setLastName(e.target.value)}
//               required
//               style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
//             />
//           </>
//         )}

//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//           style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
//         />

//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           style={{ display: "block", margin: "8px 0", width: "100%", padding: "8px" }}
//         />

//         <button type="submit" style={{ marginTop: "10px", padding: "10px", width: "100%", cursor: "pointer" }}>
//           {isLogin ? "Login" : "Register"}
//         </button>
//       </form>

//       <p style={{ marginTop: "15px", textAlign: "center" }}>
//         {isLogin ? (
//           <>
//             New user?{" "}
//             <button onClick={() => setIsLogin(false)} style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}>
//               Register here
//             </button>
//           </>
//         ) : (
//           <>
//             Already have an account?{" "}
//             <button onClick={() => setIsLogin(true)} style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }}>
//               Login here
//             </button>
//           </>
//         )}
//       </p>
//     </div>
//   );
// }






import React, { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Auth() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const db = getFirestore();

  const saveLoginToDB = async (user) => {
    const loginRef = doc(db, "login", user.uid);
    await setDoc(
      loginRef,
      { email: user.email, lastLogin: serverTimestamp() },
      { merge: true }
    );
  };

  // ✅ Strong password rule
  const validatePassword = () => {
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!strongPassword.test(password)) {
      setErrorMsg(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setErrorMsg("");

    try {
      let userCredential;

      // 🔥 Apply password rules ONLY for Register
      if (!isLogin) {
        if (!validatePassword()) {
          return; // stop here, show error
        }
      }

      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setStatusMsg("Logged in successfully!");
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: `${firstName} ${lastName}`,
        });
        setStatusMsg("Registered successfully!");
      }

      await saveLoginToDB(userCredential.user);

    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    setStatusMsg("");
    setErrorMsg("");

    if (!email) {
      setErrorMsg("Enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setStatusMsg("Password reset link sent to your email.");
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ padding: "10px 5px" }}>
      <h2>{isLogin ? "Login" : "Register"}</h2>

      {/* Status messages */}
      {statusMsg && (
        <div
          style={{
            background: "#d4edda",
            color: "#155724",
            padding: "8px",
            borderRadius: "5px",
            marginBottom: "10px",
            fontSize: "14px",
          }}
        >
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "8px",
            borderRadius: "5px",
            marginBottom: "10px",
            fontSize: "14px",
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {isLogin && (
          <p
            onClick={handleForgotPassword}
            style={{
              color: "#007bff",
              cursor: "pointer",
              marginTop: "5px",
              marginBottom: "10px",
              fontSize: "14px",
              textDecoration: "underline",
              width: "fit-content",
            }}
          >
            Forgot Password?
          </p>
        )}

        <button type="submit" style={submitBtn}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "15px", textAlign: "center" }}>
        {isLogin ? (
          <>
            New user?{" "}
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMsg("");
                setStatusMsg("");
              }}
              style={linkBtn}
            >
              Register here
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMsg("");
                setStatusMsg("");
              }}
              style={linkBtn}
            >
              Login here
            </button>
          </>
        )}
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  margin: "8px 0",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const submitBtn = {
  width: "100%",
  padding: "10px",
  background: "#222",
  color: "white",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};

const linkBtn = {
  background: "none",
  border: "none",
  color: "#007bff",
  cursor: "pointer",
  textDecoration: "underline",
};