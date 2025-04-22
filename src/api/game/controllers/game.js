'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::game.game', ({ strapi }) => ({
    async updateGameFields(ctx) {
        const { documentId } = ctx.params;
        const { pricePerLaunch, pricePerMonth, title } = ctx.request.body;

        const user = ctx.state.user;
        console.log("Authenticated user:", ctx.state.user);
        if (!user) {
            return ctx.unauthorized("Authentication required");
        }

        const game = await strapi.db.query('api::game.game').findOne({
            where: { documentId },
            populate: { developed_by: true },
        });

        if (!game) {
            return ctx.notFound("Game not found");
        }

        if (!game.developed_by || game.developed_by.id !== user.id) {
            return ctx.forbidden("You are not allowed to update this game");
        }

        const updatedFields = {};

        if (typeof pricePerLaunch === 'number') {
            updatedFields.pricePerLaunch = pricePerLaunch;
        }

        if (typeof pricePerMonth === 'number') {
            updatedFields.pricePerMonth = pricePerMonth;
        }

        if (typeof title === 'string' && title.trim().length > 0) {
            updatedFields.title = title.trim();
        }

        const updatedGame = await strapi.db.query('api::game.game').update({
            where: { id: game.id },
            data: updatedFields,
        });

        return ctx.send({ data: updatedGame });
    },
}));
