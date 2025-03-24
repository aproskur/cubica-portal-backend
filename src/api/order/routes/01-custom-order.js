"use strict";

module.exports = {
    routes: [
        {
            method: "PUT",  // Use PUT for updating the order status
            path: "/orders/:documentId/status",  // URL with documentId as a parameter
            handler: "order.updateOrderStatus",  // Make sure it matches your controller method
            config: {
                // You can add policies here if needed (e.g., authentication)
            }
        }
    ]
};
