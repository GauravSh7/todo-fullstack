import API_URL from "./api";
import { useState } from "react";

function ForgotPassword({
  onOTPRequested,
  onBackToLogin,
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
      `${API_URL}/api/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setMessage(
        "If an account exists with this email, an OTP has been sent."
      );

      setTimeout(() => {
        onOTPRequested(email.trim().toLowerCase());
      }, 800);
    } catch (error) {
      console.log("Forgot password error:", error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Forgot Password ✦</h1>

          <p>
            Enter your email and we'll send you
            <br />
            a verification code.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          <div className="auth-field">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending OTP..."
              : "Send OTP"}
          </button>

        </form>

        <div className="auth-switch">
          <button
            type="button"
            onClick={onBackToLogin}
          >
            ← Back to Login
          </button>
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;