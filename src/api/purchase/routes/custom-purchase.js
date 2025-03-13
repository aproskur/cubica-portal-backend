"use strict";
module.exports = {
    routes: [
        {
            method: "GET",
            path: "/purchases/my",
            handler: "purchase.findUserPurchases",
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
    ],
};



