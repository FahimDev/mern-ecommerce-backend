const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const userSchema = new mongoose.Schema(
    {
       name: {
        type: String,
        require: [true, "Name is required"],
        minlength: [2, "Name must be at least 2 characters"],
       },
       email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
       },
       role: {
        type: String,
        enum: ["customer", "admin", "vendor"],
        default: "customer"
       },
       emailVerified: {
        type: Boolean,
        default: false
       } ,
       password: { 
        type: String,
        required: [true, "Password is required!"],
        minlength: [6, "Password must be at least 6 characters"]
       },
    },
    { timestamps: true}
);

// Theory:
// Email already has `unique: true` on the field definition above, which makes
// Mongoose build the unique index automatically. Declaring it again with
// `schema.index()` would create a duplicate index and trigger a Mongoose warning.

// Theory:
// pre("save") is Mongoose middleware. We hash password before storing it.
// This keeps password hashing close to the User model, not scattered across controllers.
// Async hooks in modern Mongoose must NOT call `next()`; Mongoose awaits the
// returned promise and treats rejection as an error.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


// Theory:
// Instance methods keep model-related behavior near the schema.
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
}

// Theory:
// toJSON controls what is returned when a document becomes JSON.
// Password hash should never be exposed in API responses.
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema);
