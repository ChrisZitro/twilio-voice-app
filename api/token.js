const twilio = require('twilio');

/**
 * API route to generate a Voice access token for Twilio's client SDK.
 *
 * The token is scoped to a given identity (agent name) and grants permission
 * to make outbound calls through the TwiML application defined by
 * TWILIO_APP_SID and receive inbound calls when allowed.
 *
 * Environment variables used:
 * - TWILIO_ACCOUNT_SID: your primary Account SID
 * - TWILIO_API_KEY_SID: API key SID used for token generation
 * - TWILIO_API_KEY_SECRET: API key secret used for token generation
 * - TWILIO_APP_SID: TwiML Application SID that points to /api/voice
 */
module.exports = function handler(req, res) {
  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_APP_SID } = process.env;
  const identity = (req.query.identity || 'anonymous').toString();
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_APP_SID) {
    res.status(500).json({ error: 'Twilio environment variables are not configured.' });
    return;
  }
  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY_SID,
      TWILIO_API_KEY_SECRET,
      { ttl: 3600 }
    );
    token.identity = identity;
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_APP_SID,
      incomingAllow: true
    });
    token.addGrant(voiceGrant);
    const jwt = token.toJwt();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ identity, token: jwt });
  } catch (err) {
    console.error('Error generating token', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};
