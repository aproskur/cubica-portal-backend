"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const jwt = require("jsonwebtoken");

module.exports = createCoreController("api::purchase.purchase", ({ strapi }) => ({
    async findUserPurchases(ctx) {
        console.log("Received request to /api/purchases/my");
        console.log("Authorization Header:", ctx.request.header.authorization);

        let user = ctx.state.user;

        if (!user) {
            console.warn("ctx.state.user is undefined. Attempting manual JWT decoding...");

            const authHeader = ctx.request.header.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                const token = authHeader.split(" ")[1];

                try {
                    console.log("JWT Secret:", strapi.config.get("plugin.users-permissions.jwtSecret"));
                    user = jwt.verify(token, strapi.config.get("plugin.users-permissions.jwtSecret"));
                    console.log("Manually Decoded User:", user);
                } catch (error) {
                    console.error("JWT Verification Failed:", error);
                    return ctx.unauthorized({ error: "Invalid or expired token." });
                }
            }
        }

        if (!user || !user.id) {
            console.warn("Unauthorized access - No user found.");
            return ctx.forbidden("You must be logged in to view your purchases.");
        }

        console.log(`Authenticated User ID: ${user.id}`);

        // Fetch user explicitly selecting document_id
        const fullUser = await strapi.db.query("plugin::users-permissions.user").findOne({
            where: { id: user.id },
            select: ["document_id", "id", "email"]
        });

        console.log("Full User Data:", fullUser);

        const documentId = fullUser?.document_id || fullUser?.documentId;

        if (!documentId) {
            console.warn(" User does not have a document_id.");
            return ctx.forbidden("User must have a valid document_id.");
        }

        console.log(`User Document ID: ${documentId}`);

        // Step 1: Fetch all purchase IDs linked to the user via purchases_users_permissions_users_lnk
        const userPurchasesLinks = await strapi.db.connection("purchases_users_permissions_users_lnk")
            .select("purchase_id")
            .where("user_id", user.id);

        console.log("User Purchases Links:", userPurchasesLinks);

        if (!userPurchasesLinks.length) {
            console.log(`No purchases found for user ${documentId}`);
            return ctx.send({ purchases: [] });
        }

        // Extract purchase IDs
        const purchaseIds = userPurchasesLinks.map(link => link.purchase_id);
        console.log("Extracted Purchase IDs:", purchaseIds);

        // Convert purchaseIds to a proper array for filtering
        const purchases = await strapi.db.query("api::purchase.purchase").findMany({
            where: { id: { $in: purchaseIds } }, // Ensure filtering uses $in for multiple IDs
            populate: {
                games: true, // Correct way to populate related entries
                links: true
            }
        });

        console.log(`Found ${purchases.length} purchases for user ${documentId}`);

        return ctx.send({ purchases });
    }
}));
