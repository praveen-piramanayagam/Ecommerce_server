require("dotenv").config();
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const mongoose = require("mongoose");
const cors = require("cors");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");

const app = express();

app.use(
    cors({
      origin: "https://ecommercewithpayment.netlify.app", // Replace with your Netlify URL
      credentials: true, // Allow credentials (cookies) from the frontend
    })
  );
  
  

// Set up express-session middleware
app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false, // Set to false to avoid creating a session if no data is set
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set this to true if using HTTPS
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // Session expires after 1 day
    }
  }));
  
  
  

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://ecommerce-server-ki4x.onrender.com/auth/google/callback"
    },
      async (accessToken, refreshToken, profile, done) => {
        let user = await User.findOne({ googleId: profile.id });
  
        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePic: profile.photos[0].value,
          });
          await user.save();
        }
  
        done(null, user);
      }
    )
  );
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);

  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
  });
  

// Google OAuth Login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));


// Google OAuth Callback
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("https://ecommercewithpayment.netlify.app/home"); // Redirect to frontend
    }
  );
  

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next(); // Continue to the next route handler
    }
    res.status(401).json({ message: "Unauthorized" }); // If not authenticated
  }
  
  // Protect /profile route
  app.get("/profile", isAuthenticated, (req, res) => {
    console.log("Session:", req.session); // Log session to see if user is authenticated
    res.json(req.user); // Send user data if logged in
  });
  
  


// Logout Route
app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
      if (err) return next(err);
      res.redirect("https://ecommercewithpayment.netlify.app/login"); // Redirect to frontend login page
    });
  });
  


// connect db
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));


// Start Server locally
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
