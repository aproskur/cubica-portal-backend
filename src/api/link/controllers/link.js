'use strict';

const { randomUUID } = require('crypto');
const GAMESERVER_URL = process.env.GAMESERVER_URL || 'https://cubica.gameserver.dev/play';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::link.link', ({ strapi }) => ({
  async generate(ctx) {
    const user = ctx.state.user;
    const { purchaseId } = ctx.request.body;

    if (!user || !purchaseId) {
      return ctx.badRequest("Missing user or purchase ID");
    }

    // Find the purchase by documentId
    const purchase = await strapi.db.query('api::purchase.purchase').findOne({
      where: { documentId: purchaseId },
      populate: { links: true, game: { select: ['id'] } },
      users_permissions_user: { connect: [{ id: user.id }] }, 
    });

    if (!purchase) {
      return ctx.notFound("Purchase not found");
    }

    const type = purchase.package_type;

    // Reuse one-time link if already exists
    if (type === 'one-time') {
      const existing = purchase.links?.find(link => link.type === 'one-time');
      if (existing) {
        return { url: existing.url, linkId: existing.documentId };
      }
    }

    
    let linkStartDate = null;
    let linkEndDate = null;
    const now = new Date();
    
    if (type === 'day') {
      const startDate = new Date(purchase.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    
      const now = new Date();
    
      // Only check that the link hasn't expired
      const isNotExpired = now <= endDate;
      if (!isNotExpired) {
        return ctx.badRequest("Ссылка устарела");
      }
    
      linkStartDate = new Date(startDate);
      linkEndDate = new Date(endDate);
    }
    
    
    else if (type === 'month') {
      const now = new Date();
    
      const startDate = purchase.start_date ? new Date(purchase.start_date) : null;
      const endDate = purchase.end_date ? new Date(purchase.end_date) : null;
    
      const today = new Date(now);
      today.setHours(0, 0, 0, 0); // strip time
    
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (today < s) {
          return ctx.badRequest("Для месячной подписки ссылки действуют 48 часов, поэтому они не создаются раньше, чем начнется срок действия подписки.");
        }
      }
    
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (now > e) {
          return ctx.badRequest("Срок действия покупки истёк.");
        }
      }
    
      linkStartDate = now;
      linkEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 hours
    }
    
    
    // one-time: no start/end date applied
    
 

    // Create new link
// 1. Fetch latest label for this purchase
const lastLink = await strapi.db.query('api::link.link').findMany({
  where: { purchase: purchase.id },
  orderBy: { label: 'desc' },
  limit: 1,
});

const lastLabel = lastLink[0]?.label || 0;
const label = lastLabel + 1;

// 2. Generate token and URL
const token = randomUUID();
const url = `${GAMESERVER_URL}/${token}?label=${label}`;


// 3. Create new link
const newLink = await strapi.db.query('api::link.link').create({
  data: {
    token,
    type,
    url,
    label,
    start_date: linkStartDate,
    end_date: linkEndDate,
    purchase: { connect: [{ id: purchase.id }] },
    game: { connect: [{ id: purchase.game.id }] },
    users_permissions_user: { connect: [{ id: user.id }] }
  }
});


    return {
      url: newLink.url,
      linkId: newLink.documentId,
    };
  }
}));
