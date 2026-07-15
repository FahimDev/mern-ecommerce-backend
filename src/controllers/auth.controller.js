const { z } = require("zod");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
});

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

module.exports = {
    register,
    registerSchema,
};