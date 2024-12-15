const express = require('express');
const { getAllListings, createListing, deleteListing, getUserListings } = require('../Controllers/ListingController');
const { verifyToken } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getAllListings);
router.post('/', verifyToken,upload.array('images', 5), createListing);
router.get('/user', verifyToken, getUserListings);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;
