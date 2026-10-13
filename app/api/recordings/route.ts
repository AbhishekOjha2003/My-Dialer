import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilioClient';
import { getLocalCallsForPhone, logCallEvent } from '@/lib/callStore';
import { CallRecord, CallRecording, ContactHistoryResponse, ContactHistoryStats } from '@/lib/types';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';
    const contactName = searchParams.get('name') || '';

    if (!phone) {
      return NextResponse.json({ error: 'Phone number parameter is required' }, { status: 400 });
    }

    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    const client = getTwilioClient();

    // Fetch calls and recordings in parallel from Twilio
    const [twilioCalls, twilioRecordings] = await Promise.all([
      client.calls.list({ limit: 60 }).catch((err) => {
        console.error('Twilio calls list error:', err.message);
        return [];
      }),
      client.recordings.list({ limit: 60 }).catch((err) => {
        console.error('Twilio recordings list error:', err.message);
        return [];
      }),
    ]);

    // Map recordings by callSid
    const recordingsByCallSid = new Map<string, CallRecording[]>();
    twilioRecordings.forEach((r) => {
      const rec: CallRecording = {
        id: r.sid,
        duration: parseInt(r.duration || '0', 10),
        url: `/api/recordings/audio/${r.sid}`,
        status: r.status,
        dateCreated: r.dateCreated ? r.dateCreated.toISOString() : new Date().toISOString(),
        channels: r.channels || 2,
      };
      if (!recordingsByCallSid.has(r.callSid)) {
        recordingsByCallSid.set(r.callSid, []);
      }
      recordingsByCallSid.get(r.callSid)!.push(rec);
    });

    // Match Twilio calls
    const matchingTwilioCalls = twilioCalls.filter((c) => {
      const toDigits = (c.to || '').replace(/\D/g, '');
      const fromDigits = (c.from || '').replace(/\D/g, '');
      return toDigits.endsWith(phoneDigits) || fromDigits.endsWith(phoneDigits);
    });

    // Also get local logged calls
    const localCalls = getLocalCallsForPhone(phone);
    const seenCallSids = new Set<string>();

    const mergedCalls: CallRecord[] = [];

    // Process Twilio calls
    for (const c of matchingTwilioCalls) {
      seenCallSids.add(c.sid);
      const duration = parseInt(c.duration || '0', 10);
      const dateObj = c.dateCreated || new Date();
      const recs = recordingsByCallSid.get(c.sid) || [];

      let status: CallRecord['status'] = 'completed';
      let statusLabel = 'Completed';

      if (c.status === 'no-answer') {
        status = 'no-answer';
        statusLabel = 'No Answer / Missed';
      } else if (c.status === 'busy') {
        status = 'busy';
        statusLabel = 'Busy';
      } else if (c.status === 'canceled') {
        status = 'user-cut';
        statusLabel = 'User Cut Call';
      } else if (c.status === 'failed') {
        status = 'failed';
        statusLabel = 'Call Failed';
      } else if (c.status === 'completed') {
        status = 'completed';
        statusLabel = 'Completed';
      }

      mergedCalls.push({
        id: c.sid,
        callSid: c.sid,
        phoneNumber: c.to || phone,
        contactName: contactName,
        direction: c.direction.startsWith('inbound') ? 'inbound' : 'outbound',
        status: status,
        statusLabel: statusLabel,
        duration: duration,
        formattedDuration: formatDuration(duration),
        timestamp: dateObj.toISOString(),
        formattedDate: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        formattedTime: dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        recordings: recs,
      });
    }

    // Add local calls if not already present
    for (const lc of localCalls) {
      if (!seenCallSids.has(lc.callSid)) {
        seenCallSids.add(lc.callSid);
        mergedCalls.push(lc);
      }
    }

    // Sort calls newest first
    mergedCalls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate aggregated stats
    const totalCalls = mergedCalls.length;
    let completedCalls = 0;
    let missedCalls = 0;
    let totalDuration = 0;
    let totalRecordings = 0;

    mergedCalls.forEach((c) => {
      totalDuration += c.duration;
      if (c.status === 'completed') {
        completedCalls++;
      } else {
        missedCalls++;
      }
      totalRecordings += c.recordings.length;
    });

    const stats: ContactHistoryStats = {
      totalCalls: totalCalls,
      completedCalls: completedCalls,
      missedCalls: missedCalls,
      totalDuration: totalDuration,
      formattedTotalDuration: formatDuration(totalDuration),
      totalRecordings: totalRecordings,
      lastCallDate: mergedCalls[0]?.formattedDate,
      lastCallTime: mergedCalls[0]?.formattedTime,
    };

    const response: ContactHistoryResponse = {
      contactPhone: phone,
      contactName: contactName,
      stats: stats,
      calls: mergedCalls,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Recordings API GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch recordings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callSid, phoneNumber, contactName, duration, status, statusLabel, direction } = body;

    if (!callSid) {
      return NextResponse.json({ error: 'callSid is required' }, { status: 400 });
    }

    const recorded = logCallEvent({
      callSid,
      phoneNumber,
      contactName,
      duration,
      status,
      statusLabel,
      direction,
    });

    return NextResponse.json({ success: true, call: recorded });
  } catch (error: any) {
    console.error('[Recordings API POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to log call' }, { status: 500 });
  }
}
