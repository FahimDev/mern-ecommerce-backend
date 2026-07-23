const Product = require("../models/Product");

const { generateProductionContent } = require("./ai.service")


async function ensureUniqueSlug(baseSlug) {
    const taken = await Product.exists({slug: baseSlug});
    if (!taken) return baseSlug;

    const suffix = Math.random().toString(36).slice(2,8);
    const candidate = `${baseSlug}-${suffix}`;
    const stillTaken = await Product.exists({ slug: candidate });
    return stillTaken ? `${baseSlug}-${Date.now().toString(36).slice(-6)}` : candidate;
}

async function createProduct(productInput, userId) {
    const aiContent = await generateProductionContent(productInput);

    const slug = await ensureUniqueSlug(aiContent.slug);

    const product = await Product.create({
        ...productInput,
        ...aiContent,
        slug,
        createdBy: userId,
    });
    return product;
}

module.exports = { createProduct };
