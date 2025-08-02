# Twilio Browser Voice App

This repository contains a lightweight web dialer that lets your remote sales team make and receive phone calls from their browsers while showing your Puerto Rico business number as the caller ID. The system uses [Twilio Programmable Voice](https://www.twilio.com/voice) and can be deployed for free to Vercel. Five or more agents can sign in with a simple name or extension—no Twilio Console login required.

## Why this works

* **Access tokens:** Twilio’s client‑side SDKs (Voice, Conversations, Sync, Video) require short‑lived access tokens that you generate on your server. The tokens authenticate the browser and grant permissions to make outbound calls or receive inbound calls【140476622839154†L103-L110】. Our `/api/token` route builds these tokens using your API key and TwiML Application SID.
* **Caller ID control:** TwiML’s `<Dial>` verb allows you to set the `callerId` attribute when dialing a phone number. When you include a `callerId`, the callee sees that number instead of the default. Twilio allows you to use either the `To`/`From` number, any phone number you’ve purchased from Twilio, or a verified number【637530495900837†L554-L561】. We use your Puerto Rico number as `callerId` so every outbound call appears to come from the same business line.
* **Browser‑based dialer:** The front‑end uses the Twilio Voice JavaScript SDK. After fetching a token and creating a `Twilio.Device`, a call is initiated by passing the destination number to `device.connect({...})`; the SDK handles the WebRTC connection behind the scenes【983764775874216†L1345-L1352】. A hang‑up simply calls `device.disconnectAll()`【983764775874216†L1345-L1352】.

## Folder structure

```
twilio-voice-app/
├── api/
│   ├── token.js      # Serverless function that returns a signed access token
│   └── voice.js      # TwiML endpoint that dials out with your business number
├── index.html        # Simple dialer UI for agents
├── package.json      # Declares the Twilio dependency
├── vercel.json       # Optional rewrite to expose /voice.xml (for Twilio webhook)
└── README.md         # This guide
```

### index.html

The UI is intentionally minimal to keep onboarding simple. Agents first enter their name (this becomes their Twilio Client identity), then the page fetches a token from `/api/token` and initialises a `Twilio.Device`. Once connected, agents can dial any phone number, see call status, and hang up. Incoming calls are automatically accepted.

### api/token.js

Generates a signed JWT for the Twilio Voice SDK. It reads the following environment variables:

* **TWILIO_ACCOUNT_SID** – your primary Twilio Account SID.
* **TWILIO_API_KEY_SID** and **TWILIO_API_KEY_SECRET** – an API key pair created in the Twilio console (see setup below).
* **TWILIO_APP_SID** – the SID of a TwiML Application configured to point at `/voice.xml` on your deployed domain.

The handler constructs a new `AccessToken`, adds a `VoiceGrant` pointing at your TwiML App, sets the agent’s identity, and returns the JWT.

### api/voice.js

Responds to Twilio’s webhook requests. When your client calls `device.connect({ To: '<destination>' })`, Twilio forwards the `To` parameter to this endpoint. The handler builds a TwiML `<Dial>` that calls the requested number and sets `callerId` to your Puerto Rico number. If no destination is provided, the function speaks a brief greeting—this could be replaced with logic to ring all logged‑in agents.

### vercel.json

Adds a rewrite so that `/voice.xml` resolves to the `/api/voice` function. Twilio can then call `https://<your-deployment>/voice.xml` when someone dials your business number.

## Twilio setup

1. **Buy or use an existing number:** You already have `+1 (787) 665‑9358`. Make sure it’s configured as a Voice number in the Twilio console.
2. **Create an API key:** In the Twilio console, navigate to **Account > API Keys** and create a new key. Note the SID and secret—these become `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`.
3. **Create a TwiML Application:** Go to **Voice > TwiML Apps** and create a new app. Set its _Voice request URL_ to `https://YOUR_VERCEL_DEPLOYMENT/voice.xml` and the HTTP method to **GET**. Save the app and copy its SID into `TWILIO_APP_SID`.
4. **Point your phone number at the TwiML App:** In the Twilio console, open the configuration page for `+1 (787) 665‑9358` and under “A CALL COMES IN”, choose **TwiML App** and select the app you just created. Twilio will now hit your `/voice.xml` endpoint whenever someone calls your number.

## Deploying to Vercel

1. **Import the repo:** Fork or clone this repository to your GitHub account. Visit [vercel.com](https://vercel.com), click **New Project**, and select your GitHub repo.
2. **Set environment variables:** In your Vercel project settings, add the following variables:

   | Name | Value |
   |-----|-------|
   | `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
   | `TWILIO_API_KEY_SID` | API key SID |
   | `TWILIO_API_KEY_SECRET` | API key secret |
   | `TWILIO_APP_SID` | TwiML App SID |
   | `TWILIO_PHONE_NUMBER` | `+17876659358` (your business line) |

3. **Deploy:** After setting the variables, trigger a deployment. Vercel will build your project and host `index.html` at the root. Note the deployment URL (e.g. `https://your-project.vercel.app`).
4. **Update your TwiML App:** Replace `YOUR_VERCEL_DEPLOYMENT` in the TwiML App configuration with the new deployment URL (e.g. `https://your-project.vercel.app`). Save the changes.

## Using the system

1. Each agent opens your deployment URL in a modern browser (Chrome works best) and enters their name or extension. The page requests a token and connects to Twilio.
2. When the device status displays **Ready**, agents can type a destination number (E.164 format like `+17871234567` or local) and click **Call**. The Twilio Voice SDK creates a call via your TwiML application; the callee sees the business number as the caller ID because the TwiML `<Dial>` sets `callerId`【637530495900837†L554-L561】.
3. Agents can end the call by clicking **Hang Up**. Behind the scenes, `device.connect()` starts a call and `device.disconnectAll()` ends it【983764775874216†L1345-L1352】.
4. Incoming calls to `+1 (787) 665‑9358` will trigger the `/api/voice` handler. Currently the handler plays a short greeting. To ring all connected agents instead, you could modify `voice.js` to call `dial.client()` for each logged‑in agent.

## Adding call recording

Twilio can record calls at the TwiML layer. To enable recordings, modify `voice.js` as follows:

```js
const dial = response.dial({
  callerId: process.env.TWILIO_PHONE_NUMBER,
  answerOnBridge: true,
  record: 'record-from-answer' // start recording when the call is answered
});
```

When set, Twilio will save recordings accessible via the REST API or the console. See the [Twilio recording guide](https://www.twilio.com/docs/voice/api/recordings#recording-calls) for details.

## CRM integration

There are two common ways to integrate with a CRM:

1. **Use Twilio webhooks:** Configure your TwiML `<Dial>` with an `action` URL. After each call, Twilio will make a request to that URL containing the call’s `DialCallStatus`, duration and other metadata. Your server can consume this webhook and update the CRM. For example, modify `voice.js` to add `action: '/api/call-status'` in the `<Dial>` options and implement an `/api/call-status` endpoint to process the data.
2. **Poll call logs:** Twilio’s REST API exposes detailed call records. A backend job can periodically query completed calls (e.g. via the `Call` resource) and push updates to your CRM.

## Next steps

* **Ring all agents:** Replace the greeting in `voice.js` with a `<Dial>` that calls one or more clients (`dial.client(‘agentName’)`). Each logged‑in agent has an identity you assign through `/api/token`, so you can build simple routing logic.
* **Add presence and queueing:** Twilio’s TaskRouter or Twilio Flex provide more advanced call routing and agent presence management. However, those products may incur additional per‑seat costs.
* **Secure the token endpoint:** Currently anyone with the URL can request a token. In production, restrict access (e.g. behind authentication) to prevent abuse.

With this setup your five sales agents can immediately start making calls from any browser, using one shared Puerto Rican phone number, at minimal cost. Consult the cited Twilio documentation to adjust call flows, add new features or adhere to regulatory requirements.