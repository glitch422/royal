/**
 * ==========================================
 * ROYAL CASINO - ADMIN AUTHORIZATION
 * ==========================================
 */

const isAdmin = (req, res, next) => {
    // req.user comes from our protectRoute middleware
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

module.exports = { isAdmin };
