"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const jwt = require("jsonwebtoken");

module.exports = createCoreController("api::purchase.purchase", ({ strapi }) => ({
    async findUserPurchases(ctx) {
        console.log("Received request to /api/purchases/my");
        console.log("Authorization Header:", ctx.request.header.authorization);

        let user = ctx.state.user;

        if (!user || !user.id) {
            console.warn("Unauthorized access - No user found.");
            return ctx.forbidden("You must be logged in to view your purchases.");
        }

        console.log(`Authenticated User ID: ${user.id}`);


        const fullUser = await strapi.db.query("plugin::users-permissions.user").findOne({
            where: { id: user.id },  // Fetching by ID but retrieving documentId
            select: ["documentId", "id", "email"]
        });

        console.log("Full User Data:", fullUser);

        const documentId = fullUser?.document_id || fullUser?.documentId;

        if (!documentId) {
            console.warn(" User does not have a document_id.");
            return ctx.forbidden("User must have a valid document_id.");
        }

        console.log(`User Document ID: ${documentId}`);


        /*
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
        console.log("Extracted Purchase IDs:", purchaseIds); */


        /*
        // Convert purchaseIds to a proper array for filtering
        const purchases = await strapi.db.query("api::purchase.purchase").findMany({
            where: { id: { $in: purchaseIds } }, // Ensure filtering uses $in for multiple IDs
            populate: {
                games: true, // Correct way to populate related entries
                links: true
            }
        });
*/
        const purchases = await strapi.db.query("api::purchase.purchase").findMany({
            where: {
                users_permissions_users: { documentId: fullUser.documentId } // Correct filtering
            },
            populate: {
                games: true, // Include related games
                links: true  // Include links (empty if not created)
            }
        });
        return ctx.send({ purchases });
    },


    async createPurchase(ctx) {
        console.log("Received Request:", ctx.request.body);

        // Extract documentId from the request body
        const { documentId } = ctx.request.body.data || {};

        console.log("CREATE PURCHASE body data", ctx.request.body.data);
        console.log("CREATE PURCHASE docuemntID", documentId);
        if (!documentId) {
            console.warn("Missing documentId.");
            return ctx.badRequest("documentId is required.");
        }



        // Query the purchase using documentId through strapi.documents()
        const order = await strapi.documents("api::order.order").findOne({
            documentId,  // Use the documentId to query the order
            fields: ["order_status"], // Any fields to retrieve
            populate: ["users_permissions_user", "game"]
        });


        /*
        // Use strapi.documents() to fetch the correct order document
        const order = await strapi.documents("api::order.order").findOne({
            filters: { documentId },  // Correct usage for Strapi 5
            fields: ["order_status"],
            populate: ["users_permissions_user"]  // Ensures user relation is fetched
        }); */


        if (!order) {
            console.warn(` Order not found for documentId: ${documentId}`);
            return ctx.notFound("Order not found.");
        }

        console.log(`Order found: ${order.documentId}`);
        console.log(`Order belongs to User: ${order.users_permissions_user?.id} (${order.users_permissions_user?.email})`);


        // return ctx.send({ message: "Order exists and belongs to a user.", order });
        console.log("🛠 Full Order Data:", JSON.stringify(order, null, 2));

        const userIds = order.users_permissions_user ? [{ id: order.users_permissions_user.id }] : [];

        // ✅ Ensure Games Are Passed as an Array (Many-to-Many)
        const gameIds = order.game ? [{ id: order.game.id }] : [];


        // Create a purchase entry. FIX! IT ADDS EMTY ENRIES into PURCHASES
        // **✅ Create a New Purchase Entry**
        // ✅ CREATE A NEW PURCHASE RECORD WITH CORRECT RELATIONS
        const newPurchase = await strapi.service("api::purchase.purchase").create({
            data: {
                documentId,
                purchaseDate: new Date(),
                users_permissions_users: userIds,  // many-to-many needs an array
                games: gameIds,  // many-to-many needs an array
                order: { id: order.id }  //Must use id
            }
        });

        console.log("Purchase successfully created:", newPurchase);

        return ctx.send({ message: "Purchase created successfully.", purchase: newPurchase });


    }




}));
