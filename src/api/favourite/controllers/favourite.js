"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::favourite.favourite", ({ strapi }) => ({



    async addFavorite(ctx) {
        try {
            console.log("Received request body:", ctx.request.body);

            if (!ctx.request.body) {
                return ctx.badRequest("Request body is missing");
            }

            const { userDocumentId, gameDocumentId } = ctx.request.body;

            if (!userDocumentId || !gameDocumentId) {
                return ctx.badRequest("User Document ID and Game Document ID are required");
            }

            // Find user by document_id
            const user = await strapi.documents("plugin::users-permissions.user").findFirst({
                filters: { documentId: userDocumentId }
            });

            if (!user) {
                return ctx.badRequest("User not found");
            }

            console.log("User found:", user.documentId);

            // Find game by document_id
            const game = await strapi.documents("api::game.game").findFirst({
                filters: { documentId: gameDocumentId }
            });

            if (!game) {
                return ctx.badRequest("Game not found");
            }

            console.log("Game found:", game.documentId);

            // Check if the favorite entry already exists
            const existingFavourite = await strapi.documents("api::favourite.favourite").findFirst({
                filters: {
                    users_permissions_users: { documentId: user.documentId },
                    games: { documentId: game.documentId }
                }
            });

            if (existingFavourite) {
                return ctx.badRequest("Game is already in favourites");
            }

            // Create the favourite entry WITH relations in one step
            const favourite = await strapi.documents("api::favourite.favourite").create({
                data: {
                    favouritedAt: new Date(),
                    users_permissions_users: [{ documentId: user.documentId }], // Correct way to link Many-to-Many relation
                    games: [{ documentId: game.documentId }]
                }
            });

            console.log("Created favourite entry with relations:", JSON.stringify(favourite, null, 2));

            return ctx.send({ message: "Game added to favourites", favourite });

        } catch (err) {
            console.error("Error adding favourite:", err);
            ctx.throw(500, err);
        }
    },

    /*

    // Remove a game from favourites MANUALLY
    async removeFavorite(ctx) {
        try {
            const { userDocumentId, gameDocumentId } = ctx.request.body;
            console.log("Removing favorite for:", { userDocumentId, gameDocumentId });

            if (!userDocumentId || !gameDocumentId) {
                console.error("Missing userDocumentId or gameDocumentId");
                return ctx.badRequest("User Document ID and Game Document ID are required");
            }

            // Find user by document_id
            const user = await strapi.db.query("plugin::users-permissions.user").findOne({
                where: { document_id: userDocumentId },
            });

            if (!user) {
                console.error("User not found:", userDocumentId);
                return ctx.badRequest("User not found");
            }

            console.log("User found:", user.id);

            // Find game by document_id
            const game = await strapi.db.query("api::game.game").findOne({
                where: { document_id: gameDocumentId },
            });

            if (!game) {
                console.error("Game not found:", gameDocumentId);
                return ctx.badRequest("Game not found");
            }

            console.log("Game found:", game.id);

            // Find the favourite entry using user ID and game ID
            const favourite = await strapi.db.query("api::favourite.favourite").findOne({
                where: {
                    users_permissions_users: user.id, // Find by actual user ID
                    games: game.id, // Find by actual game ID
                },
            });

            if (!favourite) {
                console.error(`No favourite entry found for User ID: ${user.id} and Game ID: ${game.id}`);
                return ctx.notFound("No favourite entry found");
            }

            console.log("Favourite entry found:", favourite.id);

            // Remove the user-game favorite entry. MANUAL DELETE not according best preactices :(
            await strapi.db.connection("favourites_users_permissions_users_lnk").where({
                favourite_id: favourite.id,
                user_id: user.id,
            }).del();

            await strapi.db.connection("favourites_games_lnk").where({
                favourite_id: favourite.id,
                game_id: game.id,
            }).del();

            // If no more links exist for this favourite, delete it
            const remainingLinks = await strapi.db.connection("favourites_games_lnk").where({ favourite_id: favourite.id }).count("* as count");
            if (remainingLinks[0].count === 0) {
                await strapi.entityService.delete("api::favourite.favourite", favourite.id);
            }

            console.log("Successfully removed favourite:", favourite.id);
            return ctx.send({ message: "Game removed from favourites" });

        } catch (err) {
            console.error("Error removing favourite:", err);
            ctx.throw(500, err);
        }
    },
*/
    async removeFavorite(ctx) {
        try {
            const { userDocumentId, gameDocumentId } = ctx.request.body;
            console.log("Removing favorite for:", { userDocumentId, gameDocumentId });

            if (!userDocumentId || !gameDocumentId) {
                console.error("Missing userDocumentId or gameDocumentId");
                return ctx.badRequest("User Document ID and Game Document ID are required");
            }

            // Find user by documentId
            const user = await strapi.documents("plugin::users-permissions.user").findFirst({
                filters: { documentId: userDocumentId }
            });

            if (!user) {
                console.error("User not found:", userDocumentId);
                return ctx.badRequest("User not found");
            }

            console.log("User found:", user.documentId);

            // Find game by documentId
            const game = await strapi.documents("api::game.game").findFirst({
                filters: { documentId: gameDocumentId }
            });

            if (!game) {
                console.error("Game not found:", gameDocumentId);
                return ctx.badRequest("Game not found");
            }

            console.log("Game found:", game.documentId);

            // Find the favourite entry using user & game documentId
            const favourite = await strapi.documents("api::favourite.favourite").findFirst({
                filters: {
                    users_permissions_users: { documentId: user.documentId },
                    games: { documentId: game.documentId }
                },
                populate: ["users_permissions_users", "games"], // Ensure related data is retrieved
            });

            if (!favourite) {
                return ctx.notFound("No favourite entry found");
            }

            console.log("Favourite entry found:", favourite.documentId);

            // Remove user & game from the favourite relation
            await strapi.documents("api::favourite.favourite").update({
                documentId: favourite.documentId,
                data: {
                    users_permissions_users: favourite.users_permissions_users
                        .filter((u) => u.documentId !== user.documentId) // Remove user from relation
                        .map((u) => ({ documentId: u.documentId })), // Ensure correct format

                    games: favourite.games
                        .filter((g) => g.documentId !== game.documentId) // Remove game from relation
                        .map((g) => ({ documentId: g.documentId })), // Ensure correct format
                },
            });

            // Check if the favourite still has linked users or games
            const updatedFavourite = await strapi.documents("api::favourite.favourite").findOne({
                documentId: favourite.documentId,
                populate: ["users_permissions_users", "games"],
            });

            if (
                updatedFavourite.users_permissions_users.length === 0 &&
                updatedFavourite.games.length === 0
            ) {
                // If no linked users or games remain, delete the favourite
                await strapi.documents("api::favourite.favourite").delete({
                    documentId: favourite.documentId
                });
                console.log("Deleted empty favourite entry:", favourite.documentId);
            }

            console.log("Successfully removed favourite:", favourite.documentId);
            return ctx.send({ message: "Game removed from favourites" });

        } catch (err) {
            console.error("Error removing favourite:", err);
            ctx.throw(500, err);
        }
    },

    async getFavorites(ctx) {
        try {
            const userDocumentId = ctx.params.userDocumentId;

            if (!userDocumentId) {
                return ctx.badRequest("User Document ID is required");
            }

            // Find user by documentId
            const user = await strapi.documents("plugin::users-permissions.user").findFirst({
                filters: { documentId: userDocumentId }
            });

            if (!user) {
                return ctx.badRequest("User not found");
            }

            console.log("User found:", user.documentId);

            // Get all favourite games for the user (using relations, not raw SQL)
            const favourites = await strapi.documents("api::favourite.favourite").findMany({
                filters: {
                    users_permissions_users: { documentId: user.documentId } // Correctly filter by user's documentId
                },
                populate: {
                    games: { fields: ["documentId", "title"] } // Retrieve related games
                }
            });

            if (!favourites || favourites.length === 0) {
                return ctx.send({ message: "No favourite games found", data: [] });
            }

            // Extract game data from favourites
            const favouriteGames = favourites.flatMap(fav =>
                fav.games.map(game => ({
                    gameDocumentId: game.documentId,
                    gameTitle: game.title
                }))
            );

            console.log("Retrieved favourites:", JSON.stringify(favouriteGames, null, 2));

            return ctx.send({ data: favouriteGames });

        } catch (err) {
            console.error("Error fetching favourites:", err);
            ctx.throw(500, err);
        }
    }


    /*
        // Get all favourite games for a user with RAW request to database (not a best practice, but it works) TODO
        async getFavorites(ctx) {
            try {
                const userDocumentId = ctx.params.userDocumentId;
    
                if (!userDocumentId) {
                    return ctx.badRequest("User Document ID is required");
                }
    
                // Find user by `document_id`
                const user = await strapi.db.query("plugin::users-permissions.user").findOne({
                    where: { document_id: userDocumentId },
                });
    
                if (!user) {
                    return ctx.badRequest("User not found");
                }
    
                // Find all favourite games for the user
                const favourites = await strapi.db.connection("favourites_users_permissions_users_lnk")
                    .join("favourites", "favourites_users_permissions_users_lnk.favourite_id", "favourites.id")
                    .join("favourites_games_lnk", "favourites.id", "favourites_games_lnk.favourite_id")
                    .join("games", "favourites_games_lnk.game_id", "games.id")
                    .select("games.document_id as gameDocumentId", "games.title as gameTitle")
                    .where("favourites_users_permissions_users_lnk.user_id", user.id);
    
                console.log(" Retrieved favourites:", JSON.stringify(favourites, null, 2));
    
                return ctx.send({ data: favourites });
    
            } catch (err) {
                console.error("Error fetching favourites:", err);
                ctx.throw(500, err);
            }
        }
    
    */


}));
