'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Contact, CallRecord, ContactHistoryResponse } from '@/lib/types';
import { useCall } from '@/contexts/CallContext';
import { avatarGradient, formatPhone, initials, leadTone, titleCase } from '@/lib/ui';
import {
  X,
  Phone,
  Clock,
  Calendar,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  AlertCircle,
  Download,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';

interface ContactCallHistoryModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

type Filter = 'all' | 'answered' | 'missed' | 'recorded';

/* ------------------------------------------------------------------ */
/* Waveform audio player                                               */
/* ------------------------------------------------------------------ */
const BAR_COUNT = 56;
const SPEEDS = [1, 1.5, 2];

function seededBars(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const r = ((h >>> 0) % 1000) / 1000;
    const envelope = 0.55 + 0.45 * Math.sin((i / BAR_COUNT) * Math.PI);
    return Math.max(0.14, r * envelope);
  });
}

function RecordingAudioPlayer({ id, url, duration }: { id: string; url: string; duration: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const bars = useMemo(() => seededBars(id), [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) setTotalDuration(audio.duration);
      setIsLoading(false);
    };
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => { setIsLoading(false); setIsPlaying(true); };
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause();
    else {
      // Pause any other recording that is currently playing
      document.querySelectorAll('audio').forEach((el) => el !== a && el.pause());
      a.play().catch((err) => console.error('Audio play failed:', err));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * totalDuration;
    a.currentTime = t;
    setCurrentTime(t);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration ? currentTime / totalDuration : 0;

  return (
    <div className="player">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        className={`play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
      >
        {isLoading ? <RefreshCw className="spin" /> : isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" style={{ marginLeft: 2 }} />}
      </button>

      <div className="player-mid">
        <div className="bars" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(totalDuration)} aria-valuenow={Math.round(currentTime)}>
          {bars.map((h, i) => (
            <span key={i} className={i / BAR_COUNT <= progress && progress > 0 ? 'done' : ''} style={{ height: `${h * 100}%` }} />
          ))}
        </div>
        <div className="player-times">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalDuration)}</span>
        </div>
      </div>

      <div className="player-tools">
        <button className="tool-btn speed-btn" onClick={cycleSpeed} title="Playback speed">
          {SPEEDS[speedIdx]}×
        </button>
        <button className="tool-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
        <a className="tool-btn" href={url} download={`recording-${id}.mp3`} title="Download recording">
          <Download />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */
const STATUS_META: Record<CallRecord['status'], { label: string; pill: string; color: string; Icon: React.ElementType }> = {
  completed: { label: 'Completed', pill: 'pill-green', color: '#10b981', Icon: CheckCircle2 },
  'user-cut': { label: 'User Cut Call', pill: 'pill-red', color: '#f43f5e', Icon: PhoneOff },
  'no-answer': { label: 'No Answer', pill: 'pill-amber', color: '#f59e0b', Icon: PhoneMissed },
  missed: { label: 'Missed', pill: 'pill-amber', color: '#f59e0b', Icon: PhoneMissed },
  busy: { label: 'Busy', pill: 'pill-blue', color: '#60a5fa', Icon: AlertCircle },
  failed: { label: 'Failed', pill: 'pill-gray', color: '#9097b8', Icon: XCircle },
};

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function ContactCallHistoryModal({ contact, isOpen, onClose }: ContactCallHistoryModalProps) {
  const { makeCall } = useCall();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContactHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen || !contact) return;
    setFilter('all');
    setData(null);
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/recordings?phone=${encodeURIComponent(contact.phone)}&name=${encodeURIComponent(contact.name)}`
        );
        if (!res.ok) throw new Error('Failed to load call history');
        setData(await res.json());
      } catch (err: any) {
        console.error('Call history load error:', err);
        setError(err.message || 'Unable to retrieve call history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [isOpen, contact]);

  // ESC to close + lock background scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !contact || !mounted) return null;

  const stats = data?.stats;
  const calls = data?.calls || [];
  const status = contact.leadStatus || contact.email || 'New';

  const filtered = calls.filter((c) => {
    if (filter === 'answered') return c.status === 'completed';
    if (filter === 'missed') return c.status !== 'completed';
    if (filter === 'recorded') return c.recordings.length > 0;
    return true;
  });

  const counts = {
    all: calls.length,
    answered: calls.filter((c) => c.status === 'completed').length,
    missed: calls.filter((c) => c.status !== 'completed').length,
    recorded: calls.filter((c) => c.recordings.length > 0).length,
  };

  const statTiles = [
    { label: 'Times Called', value: stats?.totalCalls ?? 0, foot: `${stats?.completedCalls ?? 0} connected`, Icon: Phone, accent: '#7c5cff' },
    { label: 'Talk Time', value: stats?.formattedTotalDuration ?? '0s', foot: 'total duration', Icon: Clock, accent: '#10b981' },
    { label: 'Recordings', value: stats?.totalRecordings ?? 0, foot: 'audio files', Icon: Mic, accent: '#f472b6' },
    { label: 'Last Call', value: stats?.lastCallDate ?? 'Never', foot: stats?.lastCallTime ?? '—', Icon: Calendar, accent: '#22d3ee', small: true },
  ];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero header */}
        <div className="modal-hero">
          <div className="modal-head">
            <div className="avatar modal-avatar" style={{ background: avatarGradient(contact.name) }}>
              {initials(contact.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 className="modal-name" id="history-title">
                {contact.name.trim()}
                <span className={`pill ${leadTone(status)}`}>{titleCase(status)}</span>
              </h2>
              <div className="modal-phone">
                <Phone /> {formatPhone(contact.phone)}
                {contact.notes && <span style={{ fontFamily: 'var(--font-sans)' }}>· {contact.notes}</span>}
              </div>
            </div>
            <div className="modal-head-actions">
              <button
                id="history-call-now"
                className="btn btn-call"
                onClick={() => {
                  makeCall(contact.phone);
                  onClose();
                }}
              >
                <PhoneCall /> Call now
              </button>
              <button id="history-close" className="modal-close" onClick={onClose} aria-label="Close">
                <X />
              </button>
            </div>
          </div>

          <div className="modal-stats">
            {statTiles.map((s, i) => {
              const Icon = s.Icon;
              return (
                <div key={s.label} className="stat" style={{ ['--accent' as string]: s.accent, animationDelay: `${0.1 + i * 0.06}s` }}>
                  <div className="stat-icon"><Icon /></div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={s.small ? { fontSize: 16, marginTop: 6 } : undefined}>
                    {loading ? <span className="skel" style={{ display: 'inline-block', width: 60, height: 20 }} /> : s.value}
                  </div>
                  <div className="stat-foot mono">{s.foot}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="section-head">
            <div className="section-title">
              <History size={14} /> Call timeline
              {loading && <RefreshCw size={13} className="spin" style={{ color: 'var(--violet-2)' }} />}
            </div>
            <div className="filter-tabs" role="tablist">
              {(['all', 'answered', 'missed', 'recorded'] as Filter[]).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} · {counts[f]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-box"><AlertCircle size={16} /> {error}</div>
          )}

          {loading && (
            <div className="timeline">
              {[0, 1, 2].map((i) => (
                <div key={i} className="log" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="log-top">
                    <div className="log-when">
                      <div className="skel" style={{ width: 36, height: 36, borderRadius: 11 }} />
                      <div>
                        <div className="skel" style={{ width: 110, height: 14 }} />
                        <div className="skel" style={{ width: 70, height: 11, marginTop: 6 }} />
                      </div>
                    </div>
                    <div className="skel" style={{ width: 160, height: 26, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="empty">
              <img src="/images/empty.jpg" alt="" aria-hidden />
              <div className="empty-title">
                {calls.length === 0 ? 'No calls with this contact yet' : `No ${filter} calls`}
              </div>
              <p className="empty-text">
                Calls you place to {contact.name.trim()} appear here with duration, time and a
                playable recording.
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="timeline">
              {filtered.map((call, idx) => {
                const meta = STATUS_META[call.status] || STATUS_META.failed;
                const DirIcon = call.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
                return (
                  <article
                    key={call.id}
                    className="log"
                    style={{ ['--node' as string]: meta.color, animationDelay: `${Math.min(idx, 10) * 0.05}s` }}
                  >
                    <span className="log-node" />
                    <div className="log-top">
                      <div className="log-when">
                        <div className="log-dir"><DirIcon /></div>
                        <div>
                          <div className="log-date">{call.formattedDate}</div>
                          <div className="log-time">
                            {call.formattedTime} · {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                          </div>
                        </div>
                      </div>
                      <div className="log-right">
                        <span className="dur"><Clock /> {call.formattedDuration}</span>
                        <span className={`pill ${meta.pill} no-dot`}><meta.Icon /> {meta.label}</span>
                      </div>
                    </div>

                    {call.recordings.length > 0 ? (
                      call.recordings.map((rec) => (
                        <RecordingAudioPlayer key={rec.id} id={rec.id} url={rec.url} duration={rec.duration} />
                      ))
                    ) : (
                      <div className="log-note">
                        <Mic />
                        {call.duration > 0
                          ? 'Answered call · no recording was captured'
                          : 'Not answered · nothing to record'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
