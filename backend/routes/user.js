const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getProfile, 
    updateProfile, 
    findMatches 
} = require('../controllers/userController');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/matches', protect, findMatches);

module.exports = router;