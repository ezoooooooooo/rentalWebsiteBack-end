const jwt = require('jsonwebtoken');
const User = require('../Models/userModel');

exports.isAdmin = async (req, res, next) => {
    try {
        // First verify that the user is authenticated
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // First check if role is in the token
        if (decoded.role && decoded.role === 'admin') {
            // Add user info to request
            req.user = decoded;
            return next();
        }
        
        // If role is not in token or not admin, check the database
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        // Add user info to request
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(401).json({ message: 'Invalid token or insufficient permissions' });
    }
};
