const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { hobbiesToVector } = require('../utils/vectorUtils');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Register user
const registerUser = async (req, res) => {
    try {
        const { username, email, password, hobbies } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate hobby embeddings
        const hobbyEmbeddings = hobbiesToVector(hobbies);

        // Create user with plain password (it will be hashed by the pre-save middleware)
        const user = await User.create({
            username,
            email,
            password, // Don't hash here, let the model middleware handle it
            hobbies,
            hobbyEmbeddings
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                hobbies: user.hobbies,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ message: error.message });
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password using the model method
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            hobbies: user.hobbies,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ message: 'Invalid credentials' });
    }
};

module.exports = {
    registerUser,
    loginUser
};