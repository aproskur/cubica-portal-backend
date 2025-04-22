module.exports = {
    routes: [
        {
            method: 'PUT',
            path: '/games/:documentId/update',
            handler: 'game.updateGameFields',
        },
    ],
};
