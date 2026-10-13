import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Store recent call termination statuses so the frontend can query them if needed
const callStatusStore = new Map<string, { status: string; timestamp: number }>();

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let dialCallStatus = '';
    let callSid = '';

    let dialCallDuration = 0;
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      dialCallStatus = (formData.get('DialCallStatus') as string) || '';
      callSid = (formData.get('CallSid') as string) || '';
      dialCallDuration = parseInt((formData.get('DialCallDuration') as string) || '0', 10);
    } else {
      const body = await req.json().catch(() => ({}));
      dialCallStatus = body.DialCallStatus || '';
      callSid = body.CallSid || '';
      dialCallDuration = parseInt(body.DialCallDuration || '0', 10);
    }

    console.log(`[Twilio Dial Status] CallSid: ${callSid}, Status: ${dialCallStatus}, Duration: ${dialCallDuration}s`);

    if (callSid) {
      callStatusStore.set(callSid, { status: dialCallStatus, timestamp: Date.now() });
      if (callStatusStore.size > 200) {
        const oldest = Array.from(callStatusStore.keys())[0];
        callStatusStore.delete(oldest);
      }
    }

    const twiml = new VoiceResponse();

    // Immediately hang up so the caller's phone stops ringing as soon as the callee cuts or rejects
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('[Twilio Dial Status Error]:', error);
    const twiml = new VoiceResponse();
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callSid = searchParams.get('callSid');

  if (callSid && callStatusStore.has(callSid)) {
    return NextResponse.json(callStatusStore.get(callSid));
  }

  // Return most recent status if no callSid provided
  const entries = Array.from(callStatusStore.values());
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  return NextResponse.json({ latest });
}
