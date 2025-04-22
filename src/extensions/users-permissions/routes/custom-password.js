console.log("custom-password.js loaded");

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/user/change-password',
            handler: 'custom-password.changePassword',
            config: {
                policies: [],
            },
        },
    ],
};
