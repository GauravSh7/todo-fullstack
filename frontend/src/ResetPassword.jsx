import API_URL from "./api";
import { useState } from "react";

function ResetPassword({
  email,
  resetToken,
  onResetSuccess,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!resetToken) {
      setError(
        "Your reset session has expired. Please request a new OTP."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill both password fields.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      setError(
        "Password must contain at least one letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
       `${API_URL}/api/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken: resetToken,
            newPassword: password,
          }),
        }
      );

      const rawResponse = await response.text();

      let data = {};

      try {
        data = rawResponse
          ? JSON.parse(rawResponse)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        setError(
          data.error ||
            `Server error (${response.status}). Please try again.`
        );
        return;
      }

      setMessage(
        "Password changed successfully!"
      );

      setTimeout(() => {
        onResetSuccess();
      }, 1000);
    } catch (error) {
      console.log(
        "Reset password error:",
        error
      );

      setError(
        error instanceof TypeError
          ? "Could not reach the backend. Please try again."
          : "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1>New Password ✦</h1>

          <p>
            Create a new password for
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleReset}
        >

          <div className="auth-field">
            <label>New Password</label>

            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div className="auth-field">
            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
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
              ? "Changing Password..."
              : "Change Password"}
          </button>

        </form>

      </div>
    </div>
  );
}

export default ResetPassword;