import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState(new URLSearchParams(window.location.search).get("token") || "");

  const clearFields = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setSuccess("");
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!role) return setError("Please select a role first.");

    try {
      const res = await axios.post("https://one-mocktest-system.onrender.com/api/auth/login", {
        email: email.trim(), password, role
      });
      const { token, role: userRole, user } = res.data;
      if (userRole !== role) {
        setError(`This account is registered as "${userRole}". Please select the correct role.`);
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("userId", user._id);
      localStorage.setItem("userName", user.name || "");
      clearFields();
      if (userRole === "student") navigate("/test");
      else if (userRole === "faculty") navigate("/faculty-dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err.response || err);
      setError(err.response?.data?.message?.toString() || "Login failed");
    }
  };

  // SIGNUP
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!role) return setError("Please select a role first.");

    try {
      await axios.post("https://one-mocktest-system.onrender.com/api/auth/register", {
        name: name.trim(), email: email.trim(), password, role
      });
      alert("Registration successful! You can now login.");
      clearFields();
      setShowSignup(false);
    } catch (err) {
      console.error("SIGNUP ERROR:", err.response || err);
      setError(err.response?.data?.message?.toString() || "Signup failed");
    }
  };

  // SEND PASSWORD RESET EMAIL
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await axios.post("https://one-mocktest-system.onrender.com/api/auth/forgot-password", {
        email: email.trim()
      });
      setSuccess(res.data.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.message?.toString() || "Unable to send reset link. Please try again.");
    }
  };

  // SAVE NEW PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await axios.post("https://one-mocktest-system.onrender.com/api/auth/reset-password", {
        token: resetToken, password
      });
      setSuccess(res.data.message || "Password reset successful. You can now log in.");
      setPassword("");
      setResetToken("");
      window.history.replaceState({}, document.title, "/login");
    } catch (err) {
      setError(err.response?.data?.message?.toString() || "Unable to reset password. Please request a new link.");
    }
  };

  const returnToLogin = () => {
    setShowForgotPassword(false);
    setShowSignup(false);
    setError("");
    setSuccess("");
    setPassword("");
    setResetToken("");
    window.history.replaceState({}, document.title, "/login");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>{resetToken ? "Create New Password" : showForgotPassword ? "Forgot Password?" : showSignup ? "Create Account" : "Welcome Back"}</h1>
          <p>{resetToken ? "Choose a new password for your account" : showForgotPassword ? "Enter your registered email to receive a reset link" : showSignup ? "Register to access the mock test platform" : "Login to continue to your dashboard"}</p>
        </div>

        {!resetToken && !showForgotPassword && (
          <div className="role-selection">
            <button type="button" className={role === "student" ? "active" : ""} onClick={() => setRole("student")}>Student</button>
            <button type="button" className={role === "faculty" ? "active" : ""} onClick={() => setRole("faculty")}>Faculty</button>
          </div>
        )}

        {resetToken ? (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="input-group">
              <label>New Password</label>
              <input type="password" placeholder="Enter your new password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" required />
            </div>
            <button type="submit" className="primary-btn">Reset Password</button>
            <p className="toggle-text"><span onClick={returnToLogin}>Back to Login</span></p>
          </form>
        ) : showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your registered email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="primary-btn">Send Reset Link</button>
            <p className="toggle-text">Remember your password? <span onClick={returnToLogin}>Back to Login</span></p>
          </form>
        ) : !showSignup ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <p className="forgot-password-link">
              <span onClick={() => { setShowForgotPassword(true); setError(""); setSuccess(""); setPassword(""); }}>Forgot Password?</span>
            </p>
            <button type="submit" className="primary-btn">Login</button>
            <p className="toggle-text">Don&apos;t have an account?{" "}
              <span onClick={() => { setShowSignup(true); setError(""); setSuccess(""); setPassword(""); }}>Sign Up</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Create password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="primary-btn">Register</button>
            <p className="toggle-text">Already have an account?{" "}
              <span onClick={() => { setShowSignup(false); setError(""); setSuccess(""); setPassword(""); }}>Login</span>
            </p>
          </form>
        )}

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
      </div>
    </div>
  );
}

export default LoginPage;
