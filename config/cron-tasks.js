// ./config/cron-tasks.js
module.exports = {
    archiveExpiredLinks: {
      task: async ({ strapi }) => {
        const now = new Date();
        strapi.log.info(`[Cron] Checking for expired month links at ${now.toISOString()}`);
  
        const expiredLinks = await strapi.db.query('api::link.link').findMany({
          where: {
            type: 'month',
            end_date: { $lt: now },
            archived: { $in: [false, null] }, // handle both unset and false
          },
        });
  
        strapi.log.info(`[Cron] Found ${expiredLinks.length} expired month links`);
  
        for (const link of expiredLinks) {
          await strapi.db.query('api::link.link').update({
            where: { id: link.id },
            data: { archived: true },
          });
          strapi.log.info(`[Cron] Archived link ID: ${link.id}`);
        }
      },
      options: {
        rule: "0 * * * * *", // every minute
      },
    },
  };
  