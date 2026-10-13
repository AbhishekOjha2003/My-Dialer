# 📞 Dialer Pro — Cloud Telephony & CRM Dialer

> A full-featured in-browser cloud dialer and CRM telephony workspace built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Twilio Voice SDK (WebRTC)**, and **Google Sheets API**.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61dafb?style=flat&logo=react)](https://react.dev/)
[![Twilio Voice](https://img.shields.io/badge/Twilio_Voice-SDK_v2.18-F22F46?style=flat&logo=twilio)](https://www.twilio.com/docs/voice/sdks/javascript)
[![WebRTC](https://img.shields.io/badge/WebRTC-In--Browser_Calling-333333?style=flat&logo=webrtc)](https://webrtc.org/)
[![Google Sheets](https://img.shields.io/badge/Google_Sheets-CRM_Sync-34a853?style=flat&logo=googlesheets)](https://developers.google.com/sheets/api)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Call Architecture & Telephony Lifecycle](#-call-architecture--telephony-lifecycle)
  - [1. WebRTC Device Token & Registration](#1-webrtc-device-token--registration)
  - [2. Outbound Call Flow & TwiML Routing](#2-outbound-call-flow--twiml-routing)
  - [3. Dual-Channel Call Recording & Webhook Callbacks](#3-dual-channel-call-recording--webhook-callbacks)
  - [4. Smart Disconnect & Voice Synthesized Alerts](#4-smart-disconnect--voice-synthesized-alerts)
  - [5. Audio Streaming & Proxy Architecture](#5-audio-streaming--proxy-architecture)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Automated Twilio Setup Script](#automated-twilio-setup-script)
  - [Running the Development Server](#running-the-development-server)
  - [Setting up Webhook Tunneling (ngrok)](#setting-up-webhook-tunneling-ngrok)
- [Google Sheets CRM Configuration](#-google-sheets-crm-configuration)
- [Deployment (Vercel)](#-deployment-vercel)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)
- [License](#-license)

---

## 🌟 Overview

**Dialer Pro** transforms your browser into a full-fledged cloud telephony workstation. Designed for sales reps, support agents, and outreach teams, it eliminates the need for desk phones or third-party softphone software. 

Contacts and leads are synchronized in real-time from a **Google Sheet**. With one click, agents can dial any number, control active calls through a floating HUD (Mute, Hold, Record, DTMF Digits, Hang Up), listen to recordings via an integrated custom waveform audio player, and review detailed call histories.

---

## ✨ Key Features

- 🌐 **In-Browser WebRTC Calling**: Make and receive carrier-grade voice calls directly from Chrome, Safari, Edge, or Firefox using `@twilio/voice-sdk`.
- 🎛️ **Persistent Floating Call HUD**: A sleek, non-intrusive floating call overlay featuring:
  - Live call timer and dynamic audio waveform visualizer.
  - One-tap Mute / Unmute.
  - Active call recording indicator with on-the-fly pause/resume.
  - DTMF keypad popover for IVR navigation.
  - Instant Hang Up.
- 🗣️ **Intelligent Call Termination & Voice Alerts**:
  - Distinguishes between intentional agent hang-ups, completed conversations, no-answers, and callee disconnects.
  - Integrates the **Web Speech API** (`window.speechSynthesis`) to audibly notify the agent (*"User cut the call"*) when a recipient rejects or hangs up during connection.
- 🎙️ **Dual-Channel Call Recording & Custom Waveform Player**:
  - Automatic `record-from-answer-dual` recording via TwiML.
  - Custom audio player with interactive waveform scrubber, variable playback speeds (`1x`, `1.5x`, `2x`), volume controls, and time display.
  - Secure backend audio streaming proxy supporting HTTP `206 Partial Content` (byte ranges) without exposing raw Twilio credentials to the client.
- 📊 **Real-Time Google Sheets CRM Sync**:
  - Live contact ingestion from Google Sheets (`googleapis` Service Account).
  - Search by name, phone number, or notes.
  - Filter by lead status (`New`, `Contacted`, `Qualified`, `Closed`).
  - One-click click-to-dial.
- 📜 **Contact Call History & Metrics Modal**:
  - Contact-specific call history drawer with total calls, answered rate, missed calls, and total talk time.
  - Chronological timeline displaying date, time, duration, and embedded audio player for calls with recordings.
- 🤖 **Automated Twilio Provisioning CLI**:
  - Built-in script (`setup_twilio.js`) to automatically provision API Keys and TwiML Applications directly into your Twilio account.

---

## 🏗️ Call Architecture & Telephony Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT (BROWSER)                                     │
│                                                                                        │
│   ┌───────────────┐     ┌───────────────────┐     ┌────────────────────────────────┐   │
│   │ Contact Table │ ──▶ │ CallContext (SDK) │ ──▶ │ Floating Overlay / Audio Player│   │
│   └───────────────┘     └─────────┬─────────┘     └────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────────────────────┘
                                    │ WebRTC Voice Stream
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              TWILIO VOICE CLOUD & CARRIERS                             │
│                                                                                        │
│   ┌─────────────────┐      ┌────────────────────┐      ┌───────────────────────────┐   │
│   │ Device Registry │ ───▶ │ TwiML App VoiceURL │ ───▶ │ Public Telephone Network  │   │
│   └─────────────────┘      └─────────┬──────────┘      └─────────────┬─────────────┘   │
└──────────────────────────────────────┼───────────────────────────────┼─────────────────┘
                                       │ POST Webhooks                 │ Audio Stream
                                       ▼                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NEXT.js BACKEND API                                    │
│                                                                                        │
│   ┌──────────────────────────┐    ┌───────────────────────────┐   ┌────────────────┐   │
│   │ /api/voice               │    │ /api/voice/dial-status    │   │ /api/recordings│   │
│   │ (Generates Dial TwiML)   │    │ (Termination Callbacks)   │   │ (Storage/Audio)│   │
│   └──────────────────────────┘    └───────────────────────────┘   └────────────────┘   │
│                                                   │                                    │
│                                                   ▼                                    │
│                                    ┌─────────────────────────────┐                     │
│                                    │   Local Call Store / DB     │                     │
│                                    │   (callStore.ts)            │                     │
│                                    └─────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. WebRTC Device Token & Registration
1. When the client loads, `CallContext` sends a `GET` request to `/api/token`.
2. The server signs a **Twilio Access Token** with a `VoiceGrant` (configured with `TWILIO_TWIML_APP_SID`, `TWILIO_API_KEY`, and `TWILIO_API_SECRET`).
3. The browser initializes `new Device(token)` and registers with Twilio Voice servers.
4. Connection status updates from `connecting` to `online`.

### 2. Outbound Call Flow & TwiML Routing
1. Agent clicks **Call** or types a phone number in the dialpad.
2. `device.connect({ params: { To: '+1...' } })` opens a WebRTC channel to Twilio.
3. Twilio queries the Voice URL webhook: **`POST /api/voice`**.
4. The server sanitizes the destination phone number and returns a TwiML response:
   ```xml
   <Response>
     <Dial callerId="+16469044198"
           answerOnBridge="true"
           action="/api/voice/dial-status"
           method="POST"
           timeout="20"
           record="record-from-answer-dual"
           recordingStatusCallback="/api/voice/recording-status"
           recordingStatusCallbackMethod="POST">
       <Number>+1234567890</Number>
     </Dial>
   </Response>
   ```
5. Twilio connects the call to the callee while streaming audio back to the agent's browser.

### 3. Dual-Channel Call Recording & Webhook Callbacks
- `record="record-from-answer-dual"` records the agent on Channel 0 and the customer on Channel 1.
- When the recording completes, Twilio calls **`POST /api/voice/recording-status`**.
- The server associates the recording SID and audio URL (`/api/recordings/audio/{recordingSid}`) with the corresponding call in `callStore`.

### 4. Smart Disconnect & Voice Synthesized Alerts
- If the callee rejects or cuts the call while it is ringing (`dialCallStatus: 'no-answer' | 'busy' | 'canceled'`), `/api/voice/dial-status` executes `<Hangup/>`.
- The frontend recognizes that the connection was terminated before being answered and triggers:
  ```typescript
  const utterance = new SpeechSynthesisUtterance('User cut the call');
  window.speechSynthesis.speak(utterance);
  ```
- The call event is automatically recorded into local storage with status `User Cut Call`.

### 5. Audio Streaming & Proxy Architecture
- Twilio media recordings require HTTP Basic Auth with Account SID and Auth Token.
- Rather than exposing private credentials to the browser, requests are routed to **`/api/recordings/audio/[id]`**.
- The route handler fetches the `.mp3` stream from Twilio, sets `Content-Type: audio/mpeg`, and passes through `Accept-Ranges: bytes` for seamless waveform scrubbing.

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | React full-stack framework with Server & Client components |
| **Frontend** | [React 19](https://react.dev/) | Core UI rendering with client-side state management |
| **Voice & Telephony** | [`@twilio/voice-sdk`](https://www.npmjs.com/package/@twilio/voice-sdk) | Browser WebRTC calling, device registration & audio streams |
| **Backend Telephony** | [`twilio`](https://www.npmjs.com/package/twilio) | TwiML generation, Access Token signing & REST API client |
| **CRM Integration** | [`googleapis`](https://www.npmjs.com/package/googleapis) | Google Sheets v4 API for real-time contact synchronization |
| **UI Components & Icons**| [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) | Accessible UI primitives & modern SVG icons |
| **Styles** | Vanilla CSS + CSS Design Tokens | High-performance custom glassmorphism design system (`design.css`) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict end-to-end type safety |

---

## 📁 Directory Structure

```text
my-caller/
├── app/
│   ├── api/
│   │   ├── contacts/
│   │   │   └── route.ts             # GET contacts from Google Sheets
│   │   ├── recordings/
│   │   │   ├── audio/[id]/route.ts  # Audio streaming proxy for Twilio MP3 recordings
│   │   │   ├── toggle/route.ts      # Start / Stop live call recording
│   │   │   └── route.ts             # GET call history & POST call logs
│   │   ├── token/
│   │   │   └── route.ts             # Generates Twilio WebRTC Voice JWT access token
│   │   └── voice/
│   │       ├── dial-status/route.ts # Webhook for call disposition & callee termination
│   │       ├── recording-status/    # Webhook for recording ready notifications
│   │       └── route.ts             # TwiML Voice Webhook (dials outbound calls)
│   ├── design.css                   # Custom theme & typography tokens
│   ├── globals.css                  # Core CSS reset & utility classes
│   ├── layout.tsx                   # Root HTML structure and CallProvider wrapper
│   └── page.tsx                     # Main dashboard: Leads view & Dialpad switcher
├── components/
│   ├── ui/                          # Radix-based Button, Card, Input, Table, Tabs
│   ├── CallOverlay.tsx              # Persistent floating active call HUD
│   ├── ContactCallHistoryModal.tsx  # Call history modal with waveform audio player
│   ├── ContactDataTable.tsx         # Google Sheets contacts list with search & click-to-dial
│   ├── Dialpad.tsx                  # DTMF phone dialer with audio feedback
│   └── Providers.tsx                # Context providers wrapper
├── contexts/
│   └── CallContext.tsx              # WebRTC Device lifecycle, active call states & listeners
├── data/
│   └── .gitkeep                     # Preserves data directory for runtime call_store.json
├── lib/
│   ├── callStore.ts                 # Local persistence layer for call records & recordings
│   ├── sheets.ts                    # Google Sheets client & contact parser
│   ├── twilioClient.ts              # Twilio REST API client factory
│   ├── types.ts                     # TypeScript definitions for calls, contacts & responses
│   └── ui.ts                        # UI helpers (avatars, phone formatting, color tokens)
├── public/
│   └── images/                      # App logos, empty states, and hero artwork
├── .env.example                     # Environment variables template
├── package.json                     # Dependencies & scripts
├── setup_twilio.js                  # Automated Twilio API key & TwiML App configuration script
├── tsconfig.json                    # TypeScript compiler configuration
└── README.md                        # Documentation
```

---

## 📡 API Reference

| Endpoint | Method | Parameters | Description |
|---|---|---|---|
| `/api/token` | `GET` | None | Returns a signed JWT token for `@twilio/voice-sdk` device initialization. |
| `/api/voice` | `POST` | `To` (string) | Returns TwiML XML instructing Twilio to dial the destination number and record the call. |
| `/api/voice/dial-status` | `POST`, `GET` | `CallSid`, `DialCallStatus` | Webhook triggered when the dial action finishes; triggers hangup if the user cuts the call. |
| `/api/voice/recording-status` | `POST` | `CallSid`, `RecordingSid`, `RecordingDuration` | Webhook triggered when Twilio finishes processing a dual-channel recording. |
| `/api/recordings` | `GET` | `phone` (query string), `name` (optional) | Retrieves call records, recording links, and summary metrics for a specific phone number. |
| `/api/recordings` | `POST` | `callSid`, `phoneNumber`, `duration`, `status` | Instantly logs or updates a call event locally. |
| `/api/recordings/audio/[id]` | `GET` | `id` (Recording SID) | Streams Twilio MP3 audio with byte range support for waveform scrubbing. |
| `/api/recordings/toggle` | `POST` | `callSid`, `action` (`start` \| `stop`), `recordingSid` | Dynamically pauses or resumes recording on an active call. |
| `/api/contacts` | `GET` | None | Fetches, parses, and returns contacts from the connected Google Sheet. |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.18.0` or higher
- **Twilio Account**: With a purchased Voice-capable phone number ([twilio.com](https://www.twilio.com/))
- **Google Cloud Platform Project**: With the Google Sheets API enabled and a Service Account key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AbhishekOjha2003/My-Dialer.git
   cd My-Dialer
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

```env
# Twilio Telephony Credentials
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_API_SECRET=your_twilio_api_secret
TWILIO_TWIML_APP_SID=APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_CALLER_ID=+1234567890

# Google Sheets CRM Configuration
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
SHEET_ID=your_google_sheet_id_here
```

---

### Automated Twilio Setup Script

If you don't have an API Key or TwiML App configured yet, use the included helper script:

1. Add your `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_CALLER_ID` to `.env.local`.
2. Run:
   ```bash
   node setup_twilio.js
   ```
3. The script will automatically:
   - Generate a new Twilio API Key & Secret (`SK...`).
   - Create a new TwiML App named **Dialer App** with the voice webhook configured.
   - Print the exact values to paste into your `.env.local`.

---

### Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Setting up Webhook Tunneling (ngrok)

For Twilio to communicate with your local machine during development (for `/api/voice`, `/api/voice/dial-status`, and `/api/voice/recording-status`), expose your local port:

1. Install and start ngrok:
   ```bash
   ngrok http 3000
   ```
2. Copy your forwarding URL (e.g., `https://xyz.ngrok-free.app`).
3. In the [Twilio Console](https://console.twilio.com/) → **Voice** → **Manage** → **TwiML Apps** → Click your **Dialer App**:
   - Set **Voice Request URL** to: `https://xyz.ngrok-free.app/api/voice` (HTTP POST).
4. Save the configuration.

---

## 📊 Google Sheets CRM Configuration

To populate contacts in the Dialer:

1. Create a Google Spreadsheet.
2. In **Row 1**, set up the following columns:
   - **Column A**: `Name` (e.g. *John Doe*)
   - **Column B**: `Phone` (e.g. *+1234567890*)
   - **Column C**: `Lead Status` (e.g. *New*, *Contacted*, *Qualified*)
   - **Column D**: `Notes` (e.g. *Interested in enterprise tier*)
3. Share the Google Sheet with your Google Service Account email (`GOOGLE_CLIENT_EMAIL`) with **Viewer** permissions.
4. Copy the Sheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`) and set it as `SHEET_ID` in `.env.local`.

---

## 🚢 Deployment (Vercel)

1. Push your code to GitHub.
2. Connect your repository on [Vercel](https://vercel.com/new).
3. Under **Settings → Environment Variables**, add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_API_KEY`
   - `TWILIO_API_SECRET`
   - `TWILIO_TWIML_APP_SID`
   - `TWILIO_CALLER_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `SHEET_ID`
4. Update your Twilio TwiML App's **Voice Request URL** to your production Vercel domain:
   `https://your-domain.vercel.app/api/voice`
5. Click **Deploy**.

---

## ❓ Troubleshooting & FAQs

### 1. `Twilio Device Error: 20101` or `20104` (Access Token Invalid or Expired)
- Verify `TWILIO_API_KEY` and `TWILIO_API_SECRET` in `.env.local`. Ensure they belong to the same `TWILIO_ACCOUNT_SID`.
- Check that the system clock on your local machine is accurate (clock drift can invalidate JWT timestamps).

### 2. Microphone Permissions Blocked
- WebRTC requires browser microphone access. In your browser settings, grant microphone permissions to `http://localhost:3000` (or your production HTTPS domain).

### 3. Outbound Call Fails Immediately
- Ensure the destination phone number includes the international country code prefix (e.g., `+1` for USA, `+91` for India).
- If your Twilio account is a trial account, verify that the destination number is added to your **Verified Caller IDs** in the Twilio console.
- Check that `TWILIO_CALLER_ID` is a verified Twilio number on your account.

### 4. Audio Playback Shows Error or Fails to Stream
- Ensure `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are valid.
- Verify that call recordings are enabled in your Twilio account under Voice Settings.

---

## 📄 License

This project is licensed under the ISC License.
