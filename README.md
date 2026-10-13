# My Dialer (Dialer Pro) 📞

A web-based phone dialer and mini CRM built with Next.js, Twilio Voice SDK, and Google Sheets. 

I built this project because I wanted a fast, zero-friction dialer that runs directly in the browser—without needing to install desktop softphones, configure SIP desk phones, or set up a bloated CRM just to call leads. Everything is self-contained: contacts sync right out of a Google Sheet, calls connect over WebRTC, and recordings can be played back inside the app.

---

## Why I Built This & What It Does

When doing outbound calling or support work, switching between spreadsheets and softphone apps is annoying. I wanted a single dashboard where I can:

1. **Click-to-Call from a Google Sheet**: Instead of maintaining a separate database, the app reads contacts and lead statuses directly from a Google Spreadsheet. When you update the sheet, the contacts update here.
2. **Make In-Browser Calls via WebRTC**: Using `@twilio/voice-sdk`, the browser itself acts as the phone. You just need a microphone.
3. **Floating Call Controls (HUD)**: When a call connects, a floating overlay stays on screen with a live call timer, mute toggle, DTMF keypad (for navigating automated phone trees / IVRs), and end call button.
4. **Instant "User Cut Call" Detection & Voice Alert**: One thing that frustrated me with standard dialers is waiting for timeouts when someone hits the decline button. Here, as soon as the recipient rejects or cuts the call while ringing, the app detects the event and uses the browser's speech synthesis to say *"User cut the call"*, marking it accurately in the history.
5. **Dual-Channel Call Recordings with Waveform Playback**: Calls are recorded in dual-channel mode (agent on one channel, callee on the other). The contact history drawer includes a custom waveform audio player with speed controls (1x, 1.5x, 2x), volume control, and timeline scrubbing.
6. **Audio Streaming Proxy**: Twilio recordings require basic auth credentials to access. Instead of exposing my Twilio SID and Auth Token to the client, I built a proxy route (`/api/recordings/audio/[id]`) that streams the audio directly with byte-range support for smooth scrubbing.

---

## Tech Stack

- **Frontend & App Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Telephony & Audio**: `@twilio/voice-sdk` (v2), `twilio` Node SDK
- **CRM / Data Source**: Google Sheets API via `googleapis`
- **UI / Styling**: Vanilla CSS with custom design tokens (`design.css`), Lucide React icons, Radix UI primitives
- **Call Storage**: Local JSON store (`callStore.ts`) for fast history and recording caching

---

## How It Works (Under the Hood)

Here's the lifecycle of a call in the app:

```
1. Browser boots up
   └── Fetches /api/token ──> Signs a Twilio Voice AccessToken (JWT) with VoiceGrant
   └── Initializes Twilio.Device and registers WebRTC client ('online')

2. Agent clicks "Call" or dials a number
   └── Twilio.Device.connect({ To: '+1...' })
   └── Twilio server hits my webhook: POST /api/voice
   └── Webhook returns TwiML with <Dial record="record-from-answer-dual">

3. During the call
   └── Floating HUD shows active call duration and live visualizer
   └── Keypad can send DTMF tones to automated phone systems
   └── Record button can dynamically pause/resume Twilio recording

4. When call ends / rejected
   └── Twilio hits /api/voice/dial-status
   └── If callee declined, trigger speech synthesis: "User cut the call"
   └── Once recording is ready, Twilio hits /api/voice/recording-status callback
   └── Call record + recording URL are saved into local history
```

---

## Project Structure

```
my-caller/
├── app/
│   ├── api/
│   │   ├── contacts/route.ts            # Pulls leads from Google Sheets
│   │   ├── recordings/
│   │   │   ├── audio/[id]/route.ts      # Audio streaming proxy for Twilio MP3s
│   │   │   ├── toggle/route.ts          # Live recording start / stop
│   │   │   └── route.ts                 # Fetches & saves call history
│   │   ├── token/route.ts               # Issues Twilio WebRTC client tokens
│   │   └── voice/
│   │       ├── dial-status/route.ts     # Hangup & disconnect event webhook
│   │       ├── recording-status/        # Recording finished webhook
│   │       └── route.ts                 # Main TwiML voice router
│   ├── design.css                       # My custom dark theme styling
│   ├── globals.css                      # Global styles
│   ├── layout.tsx                       # Root layout & CallProvider
│   └── page.tsx                         # Main dashboard (Contacts table & Dialpad)
├── components/
│   ├── CallOverlay.tsx                  # Floating active call HUD
│   ├── ContactCallHistoryModal.tsx      # Contact history modal + waveform audio player
│   ├── ContactDataTable.tsx             # Leads table with search and filters
│   └── Dialpad.tsx                      # DTMF phone keypad with tones
├── contexts/
│   └── CallContext.tsx                  # Core WebRTC state & call actions
├── lib/
│   ├── callStore.ts                     # Local file storage for call logs
│   ├── sheets.ts                        # Google Sheets reader
│   ├── twilioClient.ts                  # Twilio client helper
│   ├── types.ts                         # Type definitions
│   └── ui.ts                            # UI & formatting helpers
├── setup_twilio.js                      # Automated script to configure Twilio
└── .env.example                         # Example environment variables
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/AbhishekOjha2003/My-Dialer.git
cd My-Dialer
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

You'll need credentials for both **Twilio** and **Google Sheets**:

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CALLER_ID=+1234567890

# Google Sheets
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_ID=your_google_sheet_id
```

> **Pro Tip**: I wrote a script (`setup_twilio.js`) to make the Twilio setup painless. Just add your `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_CALLER_ID` to `.env.local`, then run:
> ```bash
> node setup_twilio.js
> ```
> It automatically creates a new API Key/Secret and sets up the TwiML App for you, then outputs the values you need to copy into `.env.local`.

### 3. Setting Up Google Sheets

To get your contacts showing up in the app:
1. Create a Google Spreadsheet.
2. In the first row, set up your columns:
   - **Column A**: Name
   - **Column B**: Phone (in international format with `+`, e.g. `+1234567890` or `+919876543210`)
   - **Column C**: Lead Status (e.g. `New`, `Contacted`, `Qualified`)
   - **Column D**: Notes
3. Share the spreadsheet with your Google Service Account email (give it **Viewer** permission).
4. Put the spreadsheet's ID into `SHEET_ID` in `.env.local`.

### 4. Running Locally & Twilio Webhooks

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Important Note for Local Testing**:
Because Twilio needs to send webhooks to your app when calls connect and disconnect, Twilio needs a public URL. When developing locally on `localhost:3000`, use **ngrok**:

```bash
ngrok http 3000
```

Then go to your **Twilio Console → Voice → Manage → TwiML Apps → Dialer App**:
- Set **Voice Request URL** to: `https://<your-ngrok-subdomain>.ngrok-free.app/api/voice` (HTTP POST).

Now you can place calls from your browser and test recordings, disconnects, and status callbacks locally!

---

## Notes & Gotchas I Ran Into

- **Microphone Permissions**: The browser will ask for microphone permissions on first call. If you block it, `@twilio/voice-sdk` will throw an error and you won't hear anything.
- **Trial Twilio Accounts**: If you're on a free/trial Twilio account, remember that you can only make calls to verified phone numbers. Once you upgrade your Twilio account, you can call any number.
- **Audio Scrubbing on Safari / Chrome**: Twilio audio files wouldn't scrub properly when fetched directly because Safari requires HTTP byte ranges (`Accept-Ranges: bytes`). The custom proxy endpoint `/api/recordings/audio/[id]` solves this by handling byte ranges and setting proper audio streaming headers.
- **Call Disconnect Detection**: Detecting whether *you* hung up vs *the callee* rejected the call required keeping track of the call state in `CallContext` using refs. If the call state was connecting and the disconnect event fired without the user clicking hangup, we know the callee declined it.

---

## Author

Built by **Abhishek Ojha**
- GitHub: [@AbhishekOjha2003](https://github.com/AbhishekOjha2003)

Feel free to open an issue or fork this repo if you want to use it or contribute!
