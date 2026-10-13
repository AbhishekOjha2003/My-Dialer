import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilioClient';
import { attachRecordingToCall } from '@/lib/callStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callSid, action, recordingSid } = body;

    if (!callSid) {
      return NextResponse.json({ error: 'callSid is required' }, { status: 400 });
    }

    const client = getTwilioClient();

    if (action === 'stop' && recordingSid) {
      console.log(`[Twilio Recording] Stopping recording ${recordingSid} for call ${callSid}`);
      const updated = await client
        .calls(callSid)
        .recordings(recordingSid)
        .update({ status: 'stopped' });

      return NextResponse.json({
        success: true,
        action: 'stopped',
        recordingSid: updated.sid,
        status: updated.status,
      });
    } else {
      console.log(`[Twilio Recording] Starting on-demand recording for call ${callSid}`);
      const recording = await client.calls(callSid).recordings.create({
        recordingChannels: 'dual',
        recordingStatusCallback: '/api/voice/recording-status',
        recordingStatusCallbackMethod: 'POST',
      });

      attachRecordingToCall(callSid, {
        id: recording.sid,
        duration: 0,
        url: `/api/recordings/audio/${recording.sid}`,
        status: recording.status || 'in-progress',
        channels: 2,
        dateCreated: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        action: 'started',
        recordingSid: recording.sid,
        status: recording.status,
      });
    }
  } catch (error: any) {
    console.error('[Recording Toggle Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle recording' },
      { status: 500 }
    );
  }
}
