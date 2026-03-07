const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    google_id: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    first_name: String,
    last_name: String,
    profile_picture: String,
    user_type: {
        type: String,
        enum: ['developer', 'non-developer', null],
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
