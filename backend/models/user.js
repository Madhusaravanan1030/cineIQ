const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ─────────────────────────────────────────────
//  What is a Mongoose Schema?
//
//  A schema defines the SHAPE of documents in a
//  MongoDB collection — like a blueprint.
//
//  MongoDB itself doesn't enforce structure
//  (you can store anything), but Mongoose adds
//  validation on top so bad data never reaches the DB.
//
//  Think of it like a Python dataclass with validation.
// ─────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    username: {
      type:     String,
      required: [true, "Username is required"],
      unique:   true,
      trim:     true,       // removes leading/trailing spaces
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },

    email: {
      type:     String,
      required: [true, "Email is required"],
      unique:   true,
      trim:     true,
      lowercase: true,      // always store email in lowercase
      match: [
        /^\S+@\S+\.\S+$/,   // basic email format check
        "Please enter a valid email address",
      ],
    },

    password: {
      type:     String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // We NEVER store the plain password.
      // It gets hashed before saving (see pre-save hook below)
    },

    watchlist: [
      // Array of movie objects the user has saved
      {
        tmdb_id:    { type: Number },          // TMDB movie ID (for fetching poster later)
        title:      { type: String, required: true },
        poster_path:{ type: String, default: "" },
        vote_average:{ type: Number, default: 0 },
        genre:      { type: String, default: "" },
        year:       { type: Number },
        watched:    { type: Boolean, default: false },  // has user watched it?
        addedAt:    { type: Date, default: Date.now },
      }
    ],

    // Google OAuth ID — filled only if user signs in with Google
    // We leave this for later (Phase 6 optional feature)
    googleId: {
      type: String,
      default: null,
    },
  },
  {
    // timestamps: true automatically adds:
    //   createdAt: Date  (when document was created)
    //   updatedAt: Date  (when document was last changed)
    timestamps: true,
  }
);

// ─────────────────────────────────────────────
//  Pre-save hook — runs BEFORE every .save() call
//
//  This is where we hash the password.
//  bcrypt converts "mypassword123" into a long
//  random string like "$2a$10$xyz..." that cannot
//  be reversed back to the original password.
//
//  The "10" is the salt rounds — how many times
//  bcrypt scrambles the password. 10 is the standard.
//  Higher = more secure but slower.
// ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if the password field was changed
  // (prevents re-hashing on every profile update)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─────────────────────────────────────────────
//  Instance method — comparePassword
//  Called during login to check if entered password
//  matches the stored hash.
//
//  Usage: const match = await user.comparePassword("mypassword123")
// ─────────────────────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
  // bcrypt.compare returns true if they match, false otherwise
};

module.exports = mongoose.model("User", userSchema);
// "User" → MongoDB collection name will be "users" (lowercase + plural, auto)