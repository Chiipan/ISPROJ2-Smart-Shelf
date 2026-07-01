const express = require("express");
const AuthService = require("../services/authServices");
const authMiddleware = require("../middleware/Middleware");
const { RolesRepository } = require("../repositories/rolesRepository");

const authRouter = express.Router();
const authService = new AuthService();
const roleRepo = new RolesRepository();
// Register a new user
authRouter.post("/register", async (req, res) => {
  try {
        if (!req.body.first_name || !req.body.last_name) {
            return res.status(400).json({ error: "First name and last name required." });
        }

        const registrationDetails = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            password: req.body.password
        }
        await authService.register(registrationDetails, req.body.role);
        res.status(200).json({ message: "User successfully created!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error?.message || error });
  }
});

// Login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const retrieveUser = await authService.login(email, password);
    res.status(200).json({ message: "User successfully found!", data: retrieveUser.token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error?.message || error });
  }
});

// Update password
authRouter.post("/update-password", async (req, res) => {
  try {
    const { email, confirmPassword, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (confirmPassword !== password) {
      return res.status(400).json({ error: "Password and confirm password are mismatched" });
    }

    await authService.updatePassword(password, email);
    res.status(200).json({ message: "Password successfully updated!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error?.message || error });
  }
});

// Protected route example
authRouter.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "You accessed a protected route!", user: req.user });
});

module.exports = authRouter;
