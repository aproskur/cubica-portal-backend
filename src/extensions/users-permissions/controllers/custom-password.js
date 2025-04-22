'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
    async changePassword(ctx) {
        const userId = ctx.state.user?.id;
        const { currentPassword, newPassword } = ctx.request.body;

        if (!userId) return ctx.unauthorized('User not authenticated');
        if (!currentPassword || !newPassword) {
            return ctx.badRequest('Current and new password are required');
        }

        const user = await strapi.db
            .query('plugin::users-permissions.user')
            .findOne({ where: { id: userId } });

        if (!user) return ctx.notFound('User not found');

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return ctx.unauthorized('Current password is incorrect');
        }

        const hashedPassword = await strapi
            .plugin('users-permissions')
            .service('user')
            .hashPassword({ password: newPassword });

        await strapi.db
            .query('plugin::users-permissions.user')
            .update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

        ctx.send({ message: 'Password updated successfully' });
    },
};
