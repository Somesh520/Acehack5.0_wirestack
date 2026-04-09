const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

function resolveGoogleCallbackURL() {
    const explicitCallbackUrl = String(process.env.GOOGLE_CALLBACK_URL || '').trim();
    if (explicitCallbackUrl) {
        return explicitCallbackUrl.replace(/\/$/, '');
    }

    const backendBaseUrl = String(process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
    if (backendBaseUrl) {
        return `${backendBaseUrl}/api/auth/google/callback`;
    }

    return `http://localhost:${process.env.PORT || 3000}/api/auth/google/callback`;
}

module.exports = function configureGooglePassport(passportInstance) {
    const callbackURL = resolveGoogleCallbackURL();
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientID || !clientSecret) {
        console.warn('⚠️ Google OAuth credentials are missing. Google login will not work until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.');
    }

    console.log('🔗 Google OAuth Callback URL:', callbackURL);
    passportInstance.use(new GoogleStrategy({
        clientID,
        clientSecret,
        callbackURL,
        proxy: true
    },
    async function (accessToken, refreshToken, profile, done) {
        try {
            console.log('📬 Google Profile Received:', profile.id, profile.emails?.[0]?.value || 'unknown-email');

            let user = await User.findOne({ google_id: profile.id });

            if (!user) {
                console.log('✨ Creating new user for Google ID:', profile.id);
                user = new User({
                    google_id: profile.id,
                    email: profile.emails?.[0]?.value,
                    first_name: profile.name?.givenName,
                    last_name: profile.name?.familyName,
                    profile_picture: profile.photos?.[0]?.value
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

    passportInstance.serializeUser((user, done) => {
        done(null, user.id);
    });

    passportInstance.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
