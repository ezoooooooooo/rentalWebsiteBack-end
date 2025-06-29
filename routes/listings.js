const express = require('express');
const { getAllListings, createListing, deleteListing, getUserListings,editListing,getListingById } = require('../Controllers/ListingController');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.get('/', getAllListings);
router.post('/', verifyToken,upload.array('images'), createListing);
router.get('/user', verifyToken, getUserListings);
router.put('/:id', verifyToken, upload.array('images'), editListing);

router.delete('/:id', verifyToken, deleteListing);
router.get('/:id', getListingById);

module.exports = router;
