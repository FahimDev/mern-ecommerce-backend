const mongoose = require("mongoose");

/*
 * Tiny slug fallback. The AI service normally supplies a clean slug,
 * so this runs only if a future caller forgets. Defence in depth.
 */
function slugify(str) {
    return String(str)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);
}

const productSchema = new mongoose.Schema(
    {
        // User-supplied trusted facts
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [200, "Name must be at most 200 characters"],
        },
        brand: {
            type: String,
            required: [true, "Brand is required"],
            trim: true,
            maxlength: [120, "Brand must be at most 120 characters"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            maxlength: [120, "Category must be at most 120 characters"],
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },
        features: {
            type: [String],
            default: [],
        },

        // AI-generated SEO/marketing fields (validated by Zod before save)
        slug: {
            type: String,
            required: [true, "Slug is required"],
            unique: true,     // DB-level unique index → keeps duplicate slugs out
            lowercase: true,
            trim: true,
            index: true,
            match: [/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, digits and hyphens"],
            maxlength: [120, "Slug must be at most 120 characters"],
        },
        shortDescription: {
            type: String,
            required: [true, "Short description is required"],
            maxlength: [250, "Short description must be at most 250 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            maxlength: [1500, "Description must be at most 1500 characters"],
        },
        seoTitle: {
            type: String,
            required: [true, "SEO title is required"],
            maxlength: [60, "SEO title must be at most 60 characters"],
        },
        metaDescription: {
            type: String,
            required: [true, "Meta description is required"],
            maxlength: [160, "Meta description must be at most 160 characters"],
        },
        keywords: {
            type: [String],
            default: [],
        },
        bulletPoints: {
            type: [String],
            default: [],
        },

        // Audit
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

/*
 * Mongoose 9 async pre-hook. Returning a rejected promise signals the error;
 * there is no `next` parameter.
 */
productSchema.pre("save", async function () {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name);
    }
});

/*
 * Strip Mongoose's internal __v from API responses.
 */
productSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("Product", productSchema);