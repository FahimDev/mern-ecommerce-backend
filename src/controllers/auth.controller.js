// HTTP handlers for /api/auth/*.
// Request validation uses Zod; OpenAPI documentation lives in JSDoc
// blocks inside src/routes/auth.routes.js.

const jwt = require("jsonwebtoken");
const { z } = require("zod");

const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");

const tokenService = require("../services/token.service");
const sessionService = require("../services/session.service");


const registerSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
});


const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});


// ────────── Cookie helpers ──────────
const cookieOptions = () => ({
    httpOnly: true,                       // JS cannot read this cookie → mitigates XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS-only in prod
    sameSite: "lax",                      // "strict" is also fine; lax balances CSRF vs. top-level navigation
    path: "/",                            // cookie is sent on every backend route
    maxAge: 7 * 24 * 60 * 60 * 1000,      // 7d, mirror REFRESH_TOKEN_EXPIRES_IN
});

const setRefreshCookie = (res,token) => res.cookie("rt", token, cookieOptions());
const clearRefreshCookie = (res) => res.clearCookie("rt", cookieOptions());

const register = asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
        const error = new Error("Email already exist!");
        error.statusCode = 409;
        throw error;
    }

    const user = await User.create(body);

    successResponse(res, 201, "User registered successfully", { user });
});

const login = asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({email: body.email});

    // Generic message: do not reveal whether the email exists.
    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const ok = await user.comparePassword(body.password);
    if (!ok) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    // Mint a new opaque sessionId; sign refresh JWT that embeds it.
    const sid = tokenService.newSessionId();
    const accessToken = tokenService.signAccessToken(user);
    const refreshToken = tokenService.signRefreshToken(user,sid);

    await sessionService.saveSession({
        sid,
        userId: user._id,
        refreshToken,
          userAgent: req.headers["user-agent"] || "unknown"
    });

    setRefreshCookie(res, refreshToken);
    return successResponse(res, 200, "Login successful", { accessToken })
});

const me = asyncHandler(async (req, res) => {
    // protect middleware already loaded req.user without password.
    return successResponse(res, 200, "Current user", { user: req.user });
});

// Order matters here:
//   1) no cookie        -> no identity                -> 401
//   2) Get valid JWT with SID  -> bad signature or expired   -> 401
//   3) Redis miss       -> revoked or never existed   -> 401
//   4) hash mismatch    -> token already rotated      -> 401
//
// We rotate (delete old, save new) on every successful refresh so a
// stolen cookie is dead by the time an attacker tries to reuse it.
const refresh = asyncHandler(async (req, res) => {
    // 1
    const token = req.cookies?.rt;
    if(!token){
        const error = new Error("Invalid or expired refresh token");
        error.statusCode = 401;
        throw error;
    }

    let decoded;

    try {
        decoded = tokenService.verifyRefreshToken(token);
    } catch (err) {
        // Distinguish the three real failure modes so Swagger documents each one.
        const message =
            err.name === "TokenExpiredError"
                ? "Refresh token expired"
                : "Invalid refresh token";
        const error = new Error(message);
        error.statusCode = 401;
        throw error;
    }
    // 2
    const session = await sessionService.getSession(decoded.sid);
    console.log("Hello2",session);
    if (!session) {
        const error = new Error("Session not found");
        error.statusCode = 401;
        throw error;
    }
    // 3
    const presentedHash = tokenService.hashToken(token)
    if (presentedHash !== session.refreshHash) {
        const error = new Error("Refresh token does not match session");
        error.statusCode = 401;
        throw error;
    }

    // 4
    // Re-read the user so role / email changes take effect immediately.
    const dbUser = await User.findById(session.userId).select("-password");
    if (!dbUser) {
        const error = new Error("User no longer exists");
        error.statusCode = 401;
        throw error;
    }

    const newSid = tokenService.newSessionId();
    const newRefreshToken = tokenService.signRefreshToken(dbUser, newSid);
    const newAccessToken = tokenService.signAccessToken(dbUser); 

    await sessionService.rotateSession({
        oldSid: decoded.sid,
        sid: newSid,
        newRefreshToken,                     // ← the missing piece
        userId: session.userId,
        userAgent: req.headers["user-agent"] || "unknown",
    });

    setRefreshCookie(res, newRefreshToken);
    return successResponse(res, 200, "Token refreshed", {accessToken: newAccessToken});
});

const logout = asyncHandler(async (req, res) => {
    // Best-effort cookie clear. Even if the cookie was missing, do not error.
    const token = req.cookies?.rt;
    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded?.sid) await sessionService.deleteSession(decoded.sid);
        } catch (_) { /* swallow */ }
    }
    clearRefreshCookie(res);
    successResponse(res, 200, "Logged out", null);
});

module.exports = {
    register,
    registerSchema,
    login,
    loginSchema,
    me,
    refresh,
    logout,
};