'use strict';

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
    async create(ctx) {
        try {
            const { gameDocumentId, packageType, startDate, endDate, price } = ctx.request.body;
            const user = ctx.state.user; // Get AUTHENTICATED user 

            if (!user) {
                return ctx.send({
                    success: false,
                    message: "You must be logged in to create an order.",
                    error_code: "AUTHENTICATION_REQUIRED"
                }, 401);
            }

            console.log("create order", ctx.request.body);

            // Fetch the game using documentId
            const game = await strapi.db.query("api::game.game").findOne({
                where: { documentId: gameDocumentId },  // Searching by documentId
            });

            if (!game) {
                return ctx.send({
                    success: false,
                    message: "Game not found.",
                    error_code: "GAME_NOT_FOUND"
                }, 404);
            }

            // Set default order status 
            const orderStatus = "pending";


            // Create new order in strapi. I use game.id when saving the order because relations require id (not docuemntId)
            const newOrder = await strapi.service("api::order.order").create({
                data: {
                    users_permissions_user: user.id,
                    game: { id: game.id },  // id this time, not document_id
                    package_type: packageType,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    price: price,
                    order_status: orderStatus,
                },
            });



            /* unnecessary, as documentID should be a part of newOrder
            // Fetch the newly created order to get documentId
            const createdOrder = await strapi.db.query("api::order.order").findOne({
                where: { id: newOrder.id }, // Use id to retrieve documentId
            }); */

            console.log("New order created", newOrder);
            console.log("HERE IS DOCID", newOrder.documentId);

            return ctx.send({
                message: "Order created successfully",
                order: {
                    documentId: newOrder.documentId, // Use documentId
                    ...newOrder, // Include all other fields
                },
            });
        }
        catch (error) {
            console.error("Order Creation Error:", error);

            return ctx.send({
                success: false,
                message: "An error occurred while creating the order.",
                error_code: "ORDER_CREATION_FAILED",
                details: error.message || "Unknown error"
            }, 500);
        }
    },

    async updateOrderStatus(ctx) {
        const { orderDocumentId, status } = ctx.request.body;
        console.log("updateOrder controller got following data from frontebd", ctx.request.body);

        if (!orderDocumentId || !status) {
            return ctx.badRequest("Missing orderDocumentId or status.");
        }

        const order = await strapi.db.query("api::order.order").findOne({
            where: { documentId: orderDocumentId }
        });

        if (!order) {
            return ctx.notFound("Order not found.");
        }

        // Update order status
        order.order_status = status;
        await strapi.db.query("api::order.order").update({
            where: { documentId: orderDocumentId },
            data: { order_status: status }
        });

        return ctx.send({ message: `Order status updated to ${status}.` });
    },


}));
