import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || !id) {
      return new NextResponse('Unauthorized or missing parameters', { status: 400 });
    }

    const recordingSid = id.replace(/\.(mp3|wav)$/, '');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const twilioRes = await fetch(twilioUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!twilioRes.ok) {
      return new NextResponse('Recording not found', { status: twilioRes.status });
    }

    const audioBuffer = await twilioRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('Audio streaming error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
