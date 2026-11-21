const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// REGISTER
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password, role } = req.body;
  console.log('Login attempt:', { email, password, role });
  try {
    const user = await User.findOne({ email, role });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for email:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "secretkey",
      { expiresIn: "1h" }
    );
    console.log('Login successful for:', email, 'role:', user.role);
    res.json({
      token,
      role: user.role,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Please enter your email address." });

  try {
    const user = await User.findOne({ email });
    // Use the same response whether the account exists or not.
    if (!user) {
      return res.json({ message: "If an account exists for this email, a password reset link has been sent." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const frontendUrl = (process.env.FRONTEND_URL || "https://1-mocktest-system-7p9n-htjbkps8z.vercel.app").replace(/\/$/, "");

    if (!resendApiKey || !emailFrom) {
      console.error("Password reset email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
      return res.status(503).json({ message: "Password reset email is temporarily unavailable. Please contact the administrator." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetUrl = `${frontendUrl}/login?token=${rawToken}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [user.email],
        subject: "Reset your Mock Test System password",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1f2937">
          <h2>Password reset request</h2>
          <p>Hello ${String(user.name || "there").replace(/[&<>"']/g, "")},</p>
          <p>We received a request to reset your Mock Test System password.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px">Reset Password</a></p>
          <p>This link expires in 15 minutes and can only be used once.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>`
      })
    });

    if (!emailResponse.ok) {
      console.error("Password reset email provider error:", await emailResponse.text());
      return res.status(502).json({ message: "Unable to send the password reset email right now. Please try again later." });
    }

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return res.json({ message: "If an account exists for this email, a password reset link has been sent." });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Unable to process your request right now." });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "A valid reset link and a password with at least 6 characters are required." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired. Please request a new one." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Unable to reset your password right now." });
  }
};
