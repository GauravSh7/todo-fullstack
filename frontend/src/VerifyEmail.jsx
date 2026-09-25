import { useState } from "react";
import API_URL from "./api";
function VerifyEmail({
  email,
  onVerified,
  onBackToRegister,
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
       `${API_URL}/api/verify-email-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid OTP.");
        return;
      }

      setMessage("Email verified successfully!");

      setTimeout(() => {
        onVerified();
      }, 800);
    } catch (error) {
      console.log("OTP verification error:", error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await fetch(
        `${API_URL}/api/resend-email-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to resend OTP.");
        return;
      }

      setMessage("A new OTP has been sent to your email.");
    } catch (error) {
      console.log("Resend OTP error:", error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Verify Email ✦</h1>

          <p>
            We sent a 6-digit OTP to
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleVerify}
        >

          <div className="auth-field">
            <label>Verification Code</label>

            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setOtp(value);
              }}
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
              ? "Verifying..."
              : "Verify Email"}
          </button>

        </form>

        <button
          className="forgot-password-button"
          type="button"
          onClick={handleResend}
          disabled={resending}
        >
          {resending
            ? "Sending..."
            : "Didn't receive the code? Resend OTP"}
        </button>

        <div className="auth-switch">
          <button
            type="button"
            onClick={onBackToRegister}
          >
            ← Back to Register
          </button>
        </div>

      </div>
    </div>
  );
}

export default VerifyEmail;