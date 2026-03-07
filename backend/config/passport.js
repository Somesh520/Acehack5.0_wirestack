const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    },
        async function (accessToken, refreshToken, profile, done) {
            try {
                console.log('📬 Google Profile Received:', profile.id, profile.emails[0].value);

                let user = await User.findOne({ google_id: profile.id });

                if (!user) {
                    console.log('✨ Creating new user for Google ID:', profile.id);
                    user = new User({
                        google_id: profile.id,
                        email: profile.emails[0].value,
                        first_name: profile.name.givenName,
                        last_name: profile.name.familyName,
                        profile_picture: profile.photos[0].value
                    });
                    await user.save();
                    console.log('✅ User saved successfully in MongoDB');
                }
                return done(null, user);
            } catch (err) {
                console.error('❌ Passport Callback Error:', err);
                return done(err, null);
            }
        }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
