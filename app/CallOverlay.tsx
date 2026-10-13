'use client';

import { useEffect, useState } from 'react';
import { useCall } from '@/contexts/CallContext';
import { Mic, MicOff, PhoneOff, Phone, PhoneIncoming, Disc, Circle } from 'lucide-react';
import { formatPhone } from '@/lib/ui';

export function CallOverlay() {
    const {
        currentCall,
        activeNumber,
        callStatus,
        disconnectReason,
        toggleMute,
        isMuted,
        isRecording,
        toggleRecord,
        hangUp,
    } = useCall();
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        if (callStatus === 'connected') {
            setDuration(0);
            timer = setInterval(() => setDuration((d) => d + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [callStatus]);

    if (!currentCall && callStatus === 'idle') return null;

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isCut = disconnectReason === 'User cut the call';
    const connected = callStatus === 'connected';
    const calling = callStatus === 'calling';
    const ended = callStatus === 'disconnected';

    const number = activeNumber || currentCall?.parameters.To || currentCall?.parameters.From || 'Unknown';

    const stateText = calling
        ? 'Ringing…'
        : connected
        ? isMuted
            ? 'Connected · You are muted'
            : 'Connected'
        : isCut
        ? 'Recipient declined the call'
        : disconnectReason || 'Call ended';

    const cardClass = ['call-card', connected && 'connected', isCut && 'cut'].filter(Boolean).join(' ');

    return (
        <div className={cardClass} role="dialog" aria-live="polite" aria-label="Active call">
            <div className="call-top">
                <div className="call-status-row">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className={`dot ${connected ? 'online' : ended ? 'error' : 'connecting'}`} />
                        {calling ? 'Outgoing call' : connected ? 'Live call' : 'Call ended'}
                    </span>
                    {connected && isRecording ? (
                        <span className="rec-badge"><i /> REC</span>
                    ) : connected ? (
                        <span className="call-timer">{formatDuration(duration)}</span>
                    ) : null}
                </div>

                <div className="call-avatar-wrap">
                    {calling && (
                        <>
                            <span className="pulse-ring" />
                            <span className="pulse-ring r2" />
                            <span className="pulse-ring r3" />
                        </>
                    )}
                    <div className="call-avatar">
                        {ended ? <PhoneOff /> : calling ? <PhoneIncoming /> : <Phone />}
                    </div>
                </div>

                <div className="call-number">{formatPhone(number)}</div>
                <div className="call-state">{stateText}</div>
                {connected && isRecording && (
                    <div className="call-timer" style={{ marginTop: 6 }}>{formatDuration(duration)}</div>
                )}

                {(connected || calling) && (
                    <div className={`wave ${!connected || isMuted ? 'paused' : ''}`} aria-hidden>
                        {Array.from({ length: 22 }).map((_, i) => (
                            <span key={i} style={{ animationDelay: `${(i % 7) * 0.09}s` }} />
                        ))}
                    </div>
                )}
            </div>

            {isCut && <div className="cut-banner">User cut the call before answering</div>}

            <div className="call-controls">
                <div className="ctrl">
                    <button
                        id="call-mute"
                        className={`ctrl-btn ${isMuted ? 'on-amber' : ''}`}
                        onClick={toggleMute}
                        disabled={!connected}
                        aria-pressed={isMuted}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <MicOff /> : <Mic />}
                    </button>
                    {isMuted ? 'Unmute' : 'Mute'}
                </div>
                <div className="ctrl">
                    <button
                        id="call-record"
                        className={`ctrl-btn ${isRecording && connected ? 'on-red' : ''}`}
                        onClick={toggleRecord}
                        disabled={!connected}
                        aria-pressed={isRecording}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    >
                        {isRecording && connected ? <Disc className="spin" style={{ animationDuration: '3s' }} /> : <Circle />}
                    </button>
                    {isRecording && connected ? 'Recording' : 'Record'}
                </div>
                <div className="ctrl">
                    <button
                        id="call-end"
                        className="ctrl-btn end"
                        onClick={hangUp}
                        disabled={ended}
                        aria-label="End call"
                    >
                        <PhoneOff />
                    </button>
                    End
                </div>
            </div>
        </div>
    );
}
