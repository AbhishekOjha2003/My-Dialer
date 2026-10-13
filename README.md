# My Dialer

A web dialer application built with Next.js, Twilio Voice SDK, and Google Sheets integration.

## Features

- **In-Browser Calling**: Make and receive calls directly in the browser via Twilio Client SDK.
- **Interactive Dialpad & Call Controls**: Dialpad with DTMF tones, mute, hold, call recording toggle, and hang up.
- **Contact Management & Google Sheets Sync**: View contacts and log call activities directly to Google Sheets.
- **Call History & Recording Playback**: Track call statuses, durations, and listen to recordings.
- **Floating Call Overlay**: Persistent call controls during active calls.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Voice & Telephony**: Twilio Voice SDK (`@twilio/voice-sdk`, `twilio`)
- **Integration**: Google APIs (`googleapis`)
- **UI & Icons**: Lucide React, Radix UI

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/AbhishekOjha2003/My-Dialer.git
cd My-Dialer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

Required variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY`
- `TWILIO_API_SECRET`
- `TWILIO_TWIML_APP_SID`
- `TWILIO_CALLER_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `SHEET_ID`

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
