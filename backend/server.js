require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");

const authenticateToken = require("./authMiddleware");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const allowedOrigins = [
  "http://localhost:5173",
  "https://todo-nine-mu-94.vercel.app",
  "https://todo-xcem.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());


// =========================
// HELPER FUNCTIONS
// =========================

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp, purpose) {
  let subject = "Your Todo App OTP";

  if (purpose === "registration") {
    subject = "Verify your Todo App account";
  }

  if (purpose === "password_reset") {
    subject = "Reset your Todo App password";
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
  });
}

async function createOTP(userId, email, purpose) {
  const otp = generateOTP();

  const otpHash = await bcrypt.hash(otp, 10);

  // Delete old OTPs for this purpose
  await pool.query(
    "DELETE FROM email_otps WHERE user_id = $1 AND purpose = $2",
    [userId, purpose]
  );

  await pool.query(
    `INSERT INTO email_otps
     (user_id, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [userId, otpHash, purpose]
  );

  await sendOTP(email, otp, purpose);
}


// =========================
// DATABASE TEST
// =========================

pool.query("SELECT NOW()", (err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Database connected!");
  }
});


// =========================
// GET TASKS
// =========================

app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              task,
              time,
              TO_CHAR(date, 'YYYY-MM-DD') AS date,
              status
       FROM tasks
       WHERE user_id = $1
       ORDER BY date, time`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Database error",
    });
  }
});


// =========================
// POST TASK
// =========================

app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const { task, time, date, status } = req.body;

    if (!task || !time || !date || !status) {
      return res.status(400).json({
        error: "Task, time, date and status are required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks
       (task, time, date, status, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [task, time, date, status, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Database error",
    });
  }
});


// =========================
// PATCH TASK
// =========================

app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Database error",
    });
  }
});


// =========================
// DELETE TASK
// =========================

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found.",
      });
    }

    res.json({
      message: "Task deleted successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Database error",
    });
  }
});


// =========================
// REGISTER
// =========================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long.",
      });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: "Password must contain at least one letter and one number.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    // Check email case-insensitively
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (!existing.email_verified) {
        await createOTP(
          existing.id,
          existing.email,
          "registration"
        );

        return res.status(200).json({
          message: "Account exists but email is not verified. A new OTP has been sent.",
          requiresVerification: true,
          email: existing.email,
        });
      }

      return res.status(400).json({
        error: "Email already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
       (name, email, password, email_verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, name, email`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    const user = result.rows[0];

    await createOTP(
      user.id,
      user.email,
      "registration"
    );

    res.status(201).json({
      message: "Registration successful. OTP sent to your email.",
      requiresVerification: true,
      email: user.email,
    });

  } catch (err) {
    console.log("Registration error:", err);

    res.status(500).json({
      error: "Registration failed",
    });
  }
});


// =========================
// VERIFY REGISTRATION OTP
// =========================

app.post("/api/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const userResult = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Account not found.",
      });
    }

    const user = userResult.rows[0];

    const otpResult = await pool.query(
      `SELECT *
       FROM email_otps
       WHERE user_id = $1
       AND purpose = 'registration'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        error: "OTP not found. Please request a new OTP.",
      });
    }

    const otpRecord = otpResult.rows[0];

    if (new Date(otpRecord.expires_at) < new Date()) {
      await pool.query(
        "DELETE FROM email_otps WHERE id = $1",
        [otpRecord.id]
      );

      return res.status(400).json({
        error: "OTP has expired. Please request a new OTP.",
      });
    }

    const isCorrect = await bcrypt.compare(
      otp.toString(),
      otpRecord.otp_hash
    );

    if (!isCorrect) {
      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }

    await pool.query(
      "UPDATE users SET email_verified = TRUE WHERE id = $1",
      [user.id]
    );

    await pool.query(
      "DELETE FROM email_otps WHERE id = $1",
      [otpRecord.id]
    );

    res.json({
      message: "Email verified successfully. You can now login.",
    });

  } catch (err) {
    console.log("OTP verification error:", err);

    res.status(500).json({
      error: "OTP verification failed.",
    });
  }
});


// =========================
// RESEND REGISTRATION OTP
// =========================

app.post("/api/resend-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Account not found.",
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        error: "Email is already verified.",
      });
    }

    await createOTP(
      user.id,
      user.email,
      "registration"
    );

    res.json({
      message: "A new OTP has been sent.",
    });

  } catch (err) {
    console.log("Resend OTP error:", err);

    res.status(500).json({
      error: "Unable to send OTP.",
    });
  }
});


// =========================
// LOGIN
// =========================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.email_verified && !user.google_id) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    if (!user.password) {
      return res.status(401).json({
        error: "This account uses Google login. Please continue with Google.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.log("Login error:", err);

    res.status(500).json({
      error: "Something went wrong while logging in.",
    });
  }
});


// =========================
// FORGOT PASSWORD
// =========================

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (user.password) {
        await createOTP(
          user.id,
          user.email,
          "password_reset"
        );
      }
    }

    res.json({
      message: "If an account exists with that email, a password reset OTP has been sent.",
    });

  } catch (err) {
    console.log("Forgot password error:", err);

    res.status(500).json({
      error: "Unable to process password reset.",
    });
  }
});


// =========================
// VERIFY RESET OTP
// =========================

app.post("/api/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const userResult = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }

    const user = userResult.rows[0];

    const otpResult = await pool.query(
      `SELECT *
       FROM email_otps
       WHERE user_id = $1
       AND purpose = 'password_reset'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        error: "OTP not found or expired.",
      });
    }

    const otpRecord = otpResult.rows[0];

    if (new Date(otpRecord.expires_at) < new Date()) {
      await pool.query(
        "DELETE FROM email_otps WHERE id = $1",
        [otpRecord.id]
      );

      return res.status(400).json({
        error: "OTP has expired.",
      });
    }

    const isCorrect = await bcrypt.compare(
      otp.toString(),
      otpRecord.otp_hash
    );

    if (!isCorrect) {
      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }

    await pool.query(
      "DELETE FROM email_otps WHERE id = $1",
      [otpRecord.id]
    );

    const resetToken = jwt.sign(
      {
        id: user.id,
        purpose: "password_reset",
      },
      JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

    res.json({
      message: "OTP verified.",
      resetToken,
    });

  } catch (err) {
    console.log("Reset OTP verification error:", err);

    res.status(500).json({
      error: "OTP verification failed.",
    });
  }
});


// =========================
// RESET PASSWORD
// =========================

app.post("/api/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        error: "Reset token and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long.",
      });
    }

    if (
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        error: "Password must contain at least one letter and one number.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        resetToken,
        JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        error: "Reset session expired. Please request a new OTP.",
      });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(401).json({
        error: "Invalid reset token.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, decoded.id]
    );

    res.json({
      message: "Password changed successfully. You can now login.",
    });

  } catch (err) {
    console.log("Reset password error:", err);

    res.status(500).json({
      error: "Unable to reset password.",
    });
  }
});


// =========================
// GOOGLE LOGIN / REGISTER
// =========================

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({
        error: "Unable to get Google account information.",
      });
    }

    if (!payload.email_verified) {
      return res.status(400).json({
        error: "Google email is not verified.",
      });
    }

    const googleId = payload.sub;
    const email = normalizeEmail(payload.email);
    const name = payload.name || email.split("@")[0];

    const existingResult = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      user = existingResult.rows[0];

      await pool.query(
        `UPDATE users
         SET google_id = $1,
             email_verified = TRUE
         WHERE id = $2`,
        [googleId, user.id]
      );

      user.google_id = googleId;
      user.email_verified = true;

    } else {
      const result = await pool.query(
        `INSERT INTO users
         (name, email, password, email_verified, google_id)
         VALUES ($1, $2, NULL, TRUE, $3)
         RETURNING id, name, email, google_id, email_verified`,
        [name.trim(), email, googleId]
      );

      user = result.rows[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Google login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.log("Google authentication error:", err);

    res.status(401).json({
      error: "Google authentication failed.",
    });
  }
});


// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});