'use strict';

module.exports = {
  register() { },

  bootstrap({ strapi }) {

    console.log("Hello")
    const routes = strapi
      .plugin('users-permissions')
      ?.routes?.routes || [];

    console.log("📦 Custom Users-Permissions Plugin Routes:");
    routes.forEach((route) => {
      console.log(`[${route.method.toUpperCase()}] ${route.path}`);
    });
  },
};

