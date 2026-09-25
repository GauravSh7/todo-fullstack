import API_URL from "./api";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

function Login({
  onLogin,
  onRegister,
  onForgotPassword,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
         `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Login failed."
        );
        return;
      }

      // Save login information
      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Send user information to App.jsx
      onLogin(data.user);

    } catch (error) {
      console.log(
        "Login error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (
    credentialResponse
  ) => {
    setError("");

    try {
      const response = await fetch(
       `${API_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential:
              credentialResponse.credential,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Google login failed."
        );
        return;
      }

      // Save Google login information
      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Send Google user information to App.jsx
      onLogin(data.user);

    } catch (error) {
      console.log(
        "Google login error:",
        error
      );

      setError(
        "Google login failed. Please try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Welcome Back ✦</h1>

          <p>
            Stay organized. One task at a time.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >

          <div className="auth-field">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div className="auth-field">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        <button
          className="forgot-password-button"
          type="button"
          onClick={onForgotPassword}
        >
          Forgot password?
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => {
              setError(
                "Google login failed. Please try again."
              );
            }}
            width="100%"
          />
        </div>

        <div className="auth-switch">
          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={onRegister}
          >
            Create account
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;