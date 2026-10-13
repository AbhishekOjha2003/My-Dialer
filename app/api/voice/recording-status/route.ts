import { NextRequest, NextResponse } from 'next/server';
import { attachRecordingToCall } from '@/lib/callStore';

export async function POST(req: NextRequest) {
  try {
    let callSid = '';
    let recordingSid = '';
    let duration = 0;
    let status = 'completed';
    let channels = 2;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      callSid = (formData.get('CallSid') as string) || '';
      recordingSid = (formData.get('RecordingSid') as string) || '';
      duration = parseInt((formData.get('RecordingDuration') as string) || '0', 10);
      status = (formData.get('RecordingStatus') as string) || 'completed';
      channels = parseInt((formData.get('RecordingChannels') as string) || '2', 10);
    } else {
      const body = await req.json().catch(() => ({}));
      callSid = body.CallSid || '';
      recordingSid = body.RecordingSid || '';
      duration = parseInt(body.RecordingDuration || '0', 10);
      status = body.RecordingStatus || 'completed';
      channels = parseInt(body.RecordingChannels || '2', 10);
    }

    console.log(`[Twilio Recording Status] Call: ${callSid}, Recording: ${recordingSid}, Duration: ${duration}s`);

    if (callSid && recordingSid) {
      attachRecordingToCall(callSid, {
        id: recordingSid,
        duration: duration,
        url: `/api/recordings/audio/${recordingSid}`,
        status: status,
        channels: channels,
        dateCreated: new Date().toISOString(),
      });
    }

    return new NextResponse('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('[Twilio Recording Status Error]:', error);
    return new NextResponse('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
