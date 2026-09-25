import { useState } from "react";
import API_URL from "./api";
function VerifyResetOTP({
  email,
  onVerified,
  onBackToForgotPassword,
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/verify-reset-otp`,
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

      // Pass the temporary reset token to the next page
      onVerified(data.resetToken);
    } catch (error) {
      console.log("Reset OTP verification error:", error);

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
          <h1>Verify OTP ✦</h1>

          <p>
            Enter the 6-digit code sent to
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

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Verifying..."
              : "Verify OTP"}
          </button>

        </form>

        <div className="auth-switch">
          <button
            type="button"
            onClick={onBackToForgotPassword}
          >
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}

export default VerifyResetOTP;