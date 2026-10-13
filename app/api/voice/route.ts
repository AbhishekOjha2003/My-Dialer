import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    let to = '';

    // Handle form data (Twilio default) or JSON
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      to = (formData.get('To') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      to = body.To || '';
    }

    const twiml = new VoiceResponse();
    const callerId = (process.env.TWILIO_CALLER_ID || '+16469044198').replace(/[\s\-\(\)]/g, '');

    if (to) {
      // Clean phone number: remove whitespace and hyphens
      let cleaned = to.trim().replace(/[^\d+]/g, '');
      if (!cleaned.startsWith('+')) {
        cleaned = cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
      }

      console.log(`[Twilio Voice API] Routing call from ${callerId} to ${cleaned} with recording enabled`);

      const dial = twiml.dial({
        callerId: callerId,
        answerOnBridge: true,
        action: '/api/voice/dial-status',
        method: 'POST',
        timeout: 20,
        record: 'record-from-answer-dual',
        recordingStatusCallback: '/api/voice/recording-status',
        recordingStatusCallbackMethod: 'POST',
      });

      dial.number(cleaned);
    } else {
      twiml.say('No destination phone number was provided. Please check the number and try again.');
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('[Twilio Voice API Error]:', error);
    const twiml = new VoiceResponse();
    twiml.say('An error occurred connecting your call.');
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
