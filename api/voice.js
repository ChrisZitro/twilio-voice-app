const twilio = require('twilio');

/**
 * TwiML endpoint used by the TwiML application to handle voice calls.
 *
 * When a call is initiated from the browser (via Twilio.Device.connect with a
 * `To` parameter), Twilio will request this endpoint and include the
 * destination phone number in the `To` parameter. This handler uses the
 * `<Dial>` verb with a `callerId` equal to your company’s Twilio number so
 * that the callee sees the main business phone on their caller ID. If
 * `To` is not provided, the endpoint responds with a short message; you can
 * customize this to play a greeting or route the call to available clients.
 *
 * Environment variables used:
 * - TWILIO_PHONE_NUMBER: the Twilio number to display as caller ID
 */
module.exports = function handler(req, res) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const callerId = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = (req.query.To || req.query.to || '').trim();
  const response = new VoiceResponse();

  if (toNumber) {
    // Outbound call: dial the specified number using our Twilio number as callerId
    const dial = response.dial({ callerId: callerId, answerOnBridge: true });
    dial.number(toNumber);
  } else {
    // Inbound call or client-to-client call: respond with a simple greeting
    response.say('Thank you for calling. Please wait while we connect you.');
    // In a production setting, you could dial one or more clients here
    // using dial.client() to ring web agents.
  }
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(response.toString());
};
