module.exports = ({ env }) => ({
    "users-permissions": {
        config: {
            jwtSecret: env("JWT_SECRET"),
            expiresIn: "7d",
        }
    }
});
