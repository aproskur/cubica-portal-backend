"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::purchase.purchase", ({ strapi }) => ({
    async findUserPurchases(ctx) {
        try {
            console.log("Fetching all purchases (public access)");

            const purchases = await strapi.entityService.findMany("api::purchase.purchase", {
                populate: {
                    games: { populate: "*" },
                    users_permissions_users: true,
                    links: { populate: "*" }
                }
            });

            console.log("Returning Purchases:", JSON.stringify(purchases, null, 2));
            return ctx.send(purchases);
        } catch (error) {
            console.error("Error in findUserPurchases:", error);
            ctx.throw(500, "Error fetching purchases.");
        }
    }
}));
