'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';

interface CallContextType {
    device: Device | null;
    currentCall: Call | null;
    activeNumber: string;
    callStatus: 'idle' | 'calling' | 'connected' | 'disconnected';
    disconnectReason: string;
    connectionStatus: 'offline' | 'connecting' | 'online' | 'error';
    isMuted: boolean;
    isRecording: boolean;
    makeCall: (number: string) => Promise<void>;
    hangUp: () => void;
    toggleMute: () => void;
    toggleRecord: () => Promise<void>;
    sendDigits: (digits: string) => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const [device, setDevice] = useState<Device | null>(null);
    const [currentCall, setCurrentCall] = useState<Call | null>(null);
    const [activeNumber, setActiveNumber] = useState<string>('');
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'disconnected'>('idle');
    const [disconnectReason, setDisconnectReason] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online' | 'error'>('offline');
    const [isMuted, setIsMuted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [activeRecordingSid, setActiveRecordingSid] = useState<string | null>(null);

    const userHangupRef = useRef(false);
    const wasConnectingRef = useRef(false);
    const connectTimeRef = useRef<number | null>(null);
    const activeNumberRef = useRef('');

    useEffect(() => {
        activeNumberRef.current = activeNumber;
    }, [activeNumber]);

    useEffect(() => {
        async function initDevice() {
            try {
                setConnectionStatus('connecting');
                const data = await fetch('/api/token').then((res) => res.json());

                if (data.error) throw new Error(data.error);

                const newDevice = new Device(data.token, {
                    logLevel: 1,
                    codecPreferences: ['opus', 'pcmu'] as any,
                });

                await newDevice.register();
                setDevice(newDevice);
                setConnectionStatus('online');

                newDevice.on('registered', () => {
                    setConnectionStatus('online');
                });

                newDevice.on('unregistered', () => {
                    setConnectionStatus('offline');
                });

                newDevice.on('incoming', (call) => {
                    call.accept();
                    setupCallListeners(call);
                });

                newDevice.on('error', (err) => {
                    console.error('Twilio Device Error:', err);
                    if (err.code === 20101 || err.code === 20104 || err.code === 31201) {
                        setConnectionStatus('error');
                    }
                });

            } catch (err) {
                console.error('Failed to initialize device:', err);
                setConnectionStatus('error');
            }
        }

        initDevice();

        return () => {
            if (device) device.destroy();
        };
    }, []);

    const setupCallListeners = (call: Call, number?: string) => {
        setCurrentCall(call);
        setIsMuted(false);
        setIsRecording(true); // Call recording is automatically enabled on answer
        if (number) {
            setActiveNumber(number);
            activeNumberRef.current = number;
        }

        call.on('accept', () => {
            wasConnectingRef.current = false;
            connectTimeRef.current = Date.now();
            setCallStatus('connected');
            setIsRecording(true);
        });

        call.on('disconnect', () => {
            const didUserCut = wasConnectingRef.current && !userHangupRef.current;
            const callSid = call.parameters?.CallSid || '';
            const duration = connectTimeRef.current
                ? Math.round((Date.now() - connectTimeRef.current) / 1000)
                : 0;

            if (didUserCut) {
                setDisconnectReason('User cut the call');
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    try {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance('User cut the call');
                        window.speechSynthesis.speak(utterance);
                    } catch (e) {}
                }
            } else {
                setDisconnectReason('Call ended');
            }

            // Immediately persist call log locally so history updates without delay
            if (callSid || activeNumberRef.current) {
                fetch('/api/recordings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callSid: callSid || `call_${Date.now()}`,
                        phoneNumber: activeNumberRef.current,
                        duration: duration,
                        status: didUserCut ? 'user-cut' : duration > 0 ? 'completed' : 'no-answer',
                        statusLabel: didUserCut ? 'User Cut Call' : duration > 0 ? 'Completed' : 'No Answer',
                        direction: 'outbound',
                    }),
                }).catch((e) => console.error('Failed to log call:', e));
            }

            wasConnectingRef.current = false;
            userHangupRef.current = false;
            connectTimeRef.current = null;
            setIsRecording(false);
            setActiveRecordingSid(null);
            setCallStatus('disconnected');

            setTimeout(() => {
                setCurrentCall(null);
                setCallStatus('idle');
                setActiveNumber('');
                setDisconnectReason('');
            }, 3000);
        });

        call.on('error', (err) => {
            console.error('Call Error:', err);
            const didUserCut = wasConnectingRef.current && !userHangupRef.current;
            if (didUserCut) {
                setDisconnectReason('User cut the call');
            } else {
                setDisconnectReason('Call failed');
            }
            wasConnectingRef.current = false;
            userHangupRef.current = false;
            connectTimeRef.current = null;
            setIsRecording(false);
            setActiveRecordingSid(null);
            setCurrentCall(null);
            setCallStatus('disconnected');
            setTimeout(() => {
                setCallStatus('idle');
                setActiveNumber('');
                setDisconnectReason('');
            }, 3000);
        });
    };

    const makeCall = async (number: string) => {
        if (!device) {
            console.error('Device not initialized');
            return;
        }
        console.log('Initiating call to:', number);
        userHangupRef.current = false;
        wasConnectingRef.current = true;
        connectTimeRef.current = null;
        setDisconnectReason('');
        setActiveNumber(number);
        activeNumberRef.current = number;
        setCallStatus('calling');

        try {
            const call = await device.connect({ params: { To: number } });
            setupCallListeners(call, number);
        } catch (err) {
            console.error('Failed to make call:', err);
            wasConnectingRef.current = false;
            setCallStatus('idle');
            setActiveNumber('');
            setDisconnectReason('');
            throw err;
        }
    };

    const hangUp = () => {
        userHangupRef.current = true;
        if (currentCall) {
            currentCall.disconnect();
        }
    };

    const toggleMute = () => {
        if (currentCall) {
            const newMuteStatus = !isMuted;
            currentCall.mute(newMuteStatus);
            setIsMuted(newMuteStatus);
        }
    };

    const toggleRecord = async () => {
        const callSid = currentCall?.parameters?.CallSid;
        if (!callSid) {
            // Local state toggle if callSid is not yet assigned
            setIsRecording((prev) => !prev);
            return;
        }

        try {
            if (isRecording) {
                // Stop recording
                const res = await fetch('/api/recordings/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callSid: callSid,
                        action: 'stop',
                        recordingSid: activeRecordingSid,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setIsRecording(false);
                    setActiveRecordingSid(null);
                }
            } else {
                // Start recording
                const res = await fetch('/api/recordings/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callSid: callSid,
                        action: 'start',
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setIsRecording(true);
                    if (data.recordingSid) {
                        setActiveRecordingSid(data.recordingSid);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to toggle recording:', e);
            // Fallback optimistic toggle
            setIsRecording((prev) => !prev);
        }
    };

    const sendDigits = (digits: string) => {
        if (currentCall) {
            currentCall.sendDigits(digits);
        }
    };

    return (
        <CallContext.Provider
            value={{
                device,
                currentCall,
                activeNumber,
                callStatus,
                disconnectReason,
                connectionStatus,
                isMuted,
                isRecording,
                makeCall,
                hangUp,
                toggleMute,
                toggleRecord,
                sendDigits,
            }}
        >
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
