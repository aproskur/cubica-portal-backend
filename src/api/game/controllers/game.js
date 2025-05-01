'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::game.game', ({ strapi }) => ({
    async updateGameFields(ctx) {
        const { documentId } = ctx.params;
        const { pricePerLaunch, pricePerMonth, title, is_published, price_per_day, game_plot } = ctx.request.body;

        const user = ctx.state.user;
        console.log("Authenticated user:", ctx.state.user);
        console.log("REQ BODY:", ctx.request.body);

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

        if (typeof price_per_day === 'number') {
            updatedFields.price_per_day = price_per_day;
        }


        if (typeof title === 'string' && title.trim().length > 0) {
            updatedFields.title = title.trim();
        }
        if (typeof is_published === 'boolean') {
            updatedFields.is_published = is_published;

            if (is_published === true) {
                updatedFields.game_published_at = new Date();
            }
        }
        if (
            Array.isArray(game_plot) &&
            game_plot.every(block => typeof block === "object" && block.children)
        ) {
            updatedFields.game_plot = game_plot;
        }






        const updatedGame = await strapi.db.query('api::game.game').update({
            where: { id: game.id },
            data: updatedFields,
        });

        return ctx.send({ data: updatedGame });
    },

    async findOneBySlug(ctx) {
        const { slug } = ctx.params;
        const user = ctx.state.user;

        const game = await strapi.db.query('api::game.game').findOne({
            where: { slug },
            populate: {
                image: true,
                images: true,
                developed_by: true,
                game_plot: true,
                game_purpose: true,
                game_support: true,
                total_played: true, // or reviews_tmp
                about_author: true,
                reviews_tmp: true
                // ...anything else show on the game page
            }
        });


        if (!game) return ctx.notFound("Game not found");

        if (!game.is_published && game.developed_by?.id !== user?.id) {
            return ctx.unauthorized("You are not allowed to view this game");
        }

        return ctx.send({ data: game });
    }

}));
