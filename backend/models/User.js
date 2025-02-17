const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    hobbies: [{
        type: String,
        required: true
    }],
    interestsVector: {
        type: [Number],
        default: []
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    hobbyEmbeddings: {
        type: [Number],
        default: []
    },
    matches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Create vector search index
userSchema.index(
    { hobbyEmbeddings: "2dsphere" },
    { 
        name: "hobby_vector_index",
        vectorSearchOptions: {
            numDimensions: 100,
            similarity: "cosine"
        }
    }
);

module.exports = mongoose.model('User', userSchema);



