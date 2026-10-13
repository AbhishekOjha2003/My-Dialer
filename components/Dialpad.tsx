'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, Delete } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

const KEYS: { k: string; sub: string }[] = [
    { k: '1', sub: '\u00a0' }, { k: '2', sub: 'ABC' }, { k: '3', sub: 'DEF' },
    { k: '4', sub: 'GHI' }, { k: '5', sub: 'JKL' }, { k: '6', sub: 'MNO' },
    { k: '7', sub: 'PQRS' }, { k: '8', sub: 'TUV' }, { k: '9', sub: 'WXYZ' },
    { k: '*', sub: '\u00a0' }, { k: '0', sub: '+' }, { k: '#', sub: '\u00a0' },
];

export function Dialpad() {
    const [number, setNumber] = useState('');
    const [pressed, setPressed] = useState<string | null>(null);
    const { makeCall, connectionStatus, callStatus } = useCall();
    const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressed = useRef(false);

    const flash = (k: string) => {
        setPressed(k);
        setTimeout(() => setPressed(null), 140);
    };

    const handleDigit = useCallback((digit: string) => {
        setNumber((prev) => prev + digit);
        flash(digit);
    }, []);

    const handleDelete = useCallback(() => setNumber((prev) => prev.slice(0, -1)), []);

    const canCall = !!number && connectionStatus === 'online' && callStatus === 'idle';
    const handleCall = useCallback(() => {
        if (canCall) makeCall(number);
    }, [canCall, makeCall, number]);

    // Physical keyboard support when the display input isn't focused
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (/^[0-9*#+]$/.test(e.key)) handleDigit(e.key);
            else if (e.key === 'Backspace') handleDelete();
            else if (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') handleCall();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleDigit, handleDelete, handleCall]);

    const spawnRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const span = document.createElement('span');
        span.className = 'ripple';
        span.style.width = span.style.height = `${size}px`;
        span.style.left = `${e.clientX - rect.left - size / 2}px`;
        span.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(span);
        setTimeout(() => span.remove(), 650);
    };

    const onKeyDown = (key: string, e: React.PointerEvent<HTMLButtonElement>) => {
        spawnRipple(e);
        longPressed.current = false;
        if (key === '0') {
            longPressRef.current = setTimeout(() => {
                longPressed.current = true;
                handleDigit('+');
            }, 550);
        }
    };

    const onKeyUp = (key: string) => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
        if (!longPressed.current) handleDigit(key);
    };

    return (
        <section className="dialpad" aria-label="Dial pad">
            <div className="dial-display">
                <input
                    id="dial-input"
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/[^\d+*#]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCall()}
                    placeholder="Enter a number"
                    aria-label="Phone number"
                    inputMode="tel"
                />
                <div className="dial-hint">
                    {number ? `${number.replace(/\D/g, '').length} digits` : 'Include country code, e.g. +91…'}
                </div>
                {number && (
                    <button id="dial-backspace" className="dial-back" onClick={handleDelete} aria-label="Delete digit">
                        <Delete />
                    </button>
                )}
            </div>

            <div className="keys">
                {KEYS.map(({ k, sub }) => (
                    <button
                        key={k}
                        id={`key-${k === '*' ? 'star' : k === '#' ? 'hash' : k}`}
                        className={`key ${pressed === k ? 'pressed' : ''}`}
                        onPointerDown={(e) => onKeyDown(k, e)}
                        onPointerUp={() => onKeyUp(k)}
                        onPointerLeave={() => longPressRef.current && clearTimeout(longPressRef.current)}
                        aria-label={`Dial ${k}`}
                    >
                        <span className="key-num">{k}</span>
                        <span className="key-sub">{sub}</span>
                    </button>
                ))}
            </div>

            <button id="dial-call" className="btn btn-call dial-call" onClick={handleCall} disabled={!canCall}>
                <Phone /> {connectionStatus === 'online' ? 'Call' : 'Connecting line…'}
            </button>
        </section>
    );
}
