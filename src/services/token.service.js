// Why two secrets: short-lived access tokens and long-lived refresh
// tokens should not share a signing key. Rotation also requires that
// REFRESH_TOKEN_SECRET differs from JWT_SECRET

const jwt = require("jsonwebtoken");

const crypto = require("crypto");

// Issue an access token. Stateless — server does not keep it
const signAccessToken = (user) => {
    return jwt.sign(
        {id: user._id.toString(), role: user.role},
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_EXPIRES_IN || "15m"}
    );
};

// Issue a refresh token. We mint a JWT *and* embed a sessionId so we
// can look up the session in Redis. The sessionId is the public cookie
// reference but is NOT the secret — the secret lives in Redis.
const signRefreshToken = (user, sessionId) => {
    return jwt.sign(
        { id: user._id.toString(), sid: sessionId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" }
    );
};

// Encapsulates the *exact* secret a refresh JWT was signed with so
// controllers stay free of jwt / secret imports.
const verifyRefreshToken = (token) =>
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

const newSessionId = () => crypto.randomBytes(24).toString("base64url");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");


module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    newSessionId,
    hashToken,
};

