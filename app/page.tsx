'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContactDataTable } from '@/components/ContactDataTable';
import { Dialpad } from '@/components/Dialpad';
import { CallOverlay } from '@/components/CallOverlay';
import { useCall } from '@/contexts/CallContext';
import { Contact } from '@/lib/types';
import {
  Users,
  Grid3x3,
  Settings,
  Sparkles,
  UserPlus,
  Radio,
  Mic,
  ArrowRight,
  ShieldCheck,
  AudioLines,
  History,
} from 'lucide-react';

type View = 'contacts' | 'dialer';

const VIEW_META: Record<View, { title: string; crumb: string }> = {
  contacts: { title: 'Contacts', crumb: 'Workspace / Leads' },
  dialer: { title: 'Keypad', crumb: 'Workspace / Dialer' },
};

export default function Dashboard() {
  const { connectionStatus } = useCall();
  const [view, setView] = useState<View>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/contacts')
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load contacts', err))
      .finally(() => setLoading(false));
  }, []);

  // Live clock (client-only to avoid hydration mismatch)
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const greeting = useMemo(() => {
    if (!now) return 'Welcome back';
    const h = now.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, [now]);

  const newLeads = contacts.filter((c) => /new/i.test(c.leadStatus || c.email || 'new')).length;

  return (
    <>
      {/* Ambient background */}
      <div className="aurora" aria-hidden>
        <div className="aurora-blob b1" />
        <div className="aurora-blob b2" />
        <div className="aurora-blob b3" />
      </div>

      <div className="shell">
        {/* ---------------- Sidebar ---------------- */}
        <aside className="side">
          <div className="brand">
            <div className="brand-logo-wrap">
              <img src="/images/logo.jpg" alt="Dialer Pro logo" className="brand-logo" />
            </div>
            <div className="brand-text">
              <div className="brand-name">Dialer Pro</div>
              <div className="brand-sub">Cloud Calling</div>
            </div>
          </div>

          <div>
            <div className="nav-label">Menu</div>
            <nav className="nav" aria-label="Main navigation">
              <button
                id="nav-contacts"
                className={`nav-item ${view === 'contacts' ? 'active' : ''}`}
                onClick={() => setView('contacts')}
              >
                <Users />
                <span>Contacts</span>
                <span className="nav-badge">{contacts.length}</span>
              </button>
              <button
                id="nav-keypad"
                className={`nav-item ${view === 'dialer' ? 'active' : ''}`}
                onClick={() => setView('dialer')}
              >
                <Grid3x3 />
                <span>Keypad</span>
              </button>
              <button id="nav-settings" className="nav-item" disabled title="Coming soon">
                <Settings />
                <span>Settings</span>
                <span className="nav-badge">Soon</span>
              </button>
            </nav>
          </div>

          <div className="side-promo">
            <img src="/images/hero.jpg" alt="Call recording illustration" />
            <div className="side-promo-body">
              <div className="side-promo-title">Every call, recorded</div>
              <div className="side-promo-text">
                Click any phone number to replay conversations & see full history.
              </div>
            </div>
          </div>

          <div className="status-card">
            <span className={`dot ${connectionStatus}`} />
            <div className="status-card-text">
              <strong>{connectionStatus}</strong>
              Twilio voice line
            </div>
          </div>
        </aside>

        {/* ---------------- Main ---------------- */}
        <main className="main">
          <header className="topbar">
            <div>
              <div className="crumbs">{VIEW_META[view].crumb}</div>
              <h1 className="page-title">{VIEW_META[view].title}</h1>
            </div>
            <div className="topbar-right">
              {now && (
                <div className="clock mono">
                  {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div className="avatar-me" title="You">A</div>
            </div>
          </header>

          <div className="content">
            {view === 'contacts' ? (
              <div className="view" key="contacts">
                {/* Hero */}
                <section className="hero">
                  <img src="/images/hero.jpg" alt="" className="hero-img" aria-hidden />
                  <div className="hero-body">
                    <span className="eyebrow">
                      <Sparkles size={14} /> {greeting}
                    </span>
                    <h2 className="hero-title">
                      Turn every call into <span className="grad-text">a closed deal.</span>
                    </h2>
                    <p className="hero-text">
                      Dial leads straight from your browser, record conversations automatically
                      and review every interaction in one place.
                    </p>
                    <div className="hero-actions">
                      <button className="btn btn-primary" onClick={() => setView('dialer')}>
                        Open Keypad <ArrowRight />
                      </button>
                      <a className="btn btn-ghost" href="#contacts-panel">
                        <History /> View call logs
                      </a>
                    </div>
                  </div>
                </section>

                {/* Stats */}
                <section className="stats" aria-label="Overview">
                  <div className="stat" style={{ ['--accent' as string]: '#7c5cff', animationDelay: '0.05s' }}>
                    <div className="stat-icon"><Users /></div>
                    <div className="stat-label">Total Contacts</div>
                    <div className="stat-value">{loading ? '—' : contacts.length}</div>
                    <div className="stat-foot">Synced from Google Sheets</div>
                  </div>
                  <div className="stat" style={{ ['--accent' as string]: '#22d3ee', animationDelay: '0.12s' }}>
                    <div className="stat-icon"><UserPlus /></div>
                    <div className="stat-label">New Leads</div>
                    <div className="stat-value">{loading ? '—' : newLeads}</div>
                    <div className="stat-foot">Waiting for first call</div>
                  </div>
                  <div className="stat" style={{ ['--accent' as string]: '#10b981', animationDelay: '0.19s' }}>
                    <div className="stat-icon"><Radio /></div>
                    <div className="stat-label">Line Status</div>
                    <div className="stat-value" style={{ textTransform: 'capitalize', fontSize: 22 }}>
                      {connectionStatus}
                    </div>
                    <div className="stat-foot">Browser softphone</div>
                  </div>
                  <div className="stat" style={{ ['--accent' as string]: '#f472b6', animationDelay: '0.26s' }}>
                    <div className="stat-icon"><Mic /></div>
                    <div className="stat-label">Call Recording</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>Auto</div>
                    <div className="stat-foot">Dual-channel on answer</div>
                  </div>
                </section>

                <div id="contacts-panel">
                  <ContactDataTable contacts={contacts} loading={loading} />
                </div>
              </div>
            ) : (
              <div className="view keypad-layout" key="dialer">
                <section className="keypad-art">
                  <img src="/images/hero.jpg" alt="Calling illustration" />
                  <div className="keypad-art-body">
                    <span className="eyebrow"><AudioLines size={14} /> HD voice · WebRTC</span>
                    <h2 className="hero-title" style={{ marginBottom: 6 }}>
                      Call anyone, <span className="grad-text">anywhere.</span>
                    </h2>
                    <p className="hero-text" style={{ marginBottom: 0 }}>
                      Type a number or use your keyboard. Calls are recorded automatically
                      and appear in the contact&apos;s history.
                    </p>
                    <div className="feature-list">
                      <span className="pill pill-violet no-dot"><Mic /> Auto recording</span>
                      <span className="pill pill-green no-dot"><ShieldCheck /> Encrypted</span>
                      <span className="pill pill-blue no-dot"><History /> Call history</span>
                    </div>
                  </div>
                </section>
                <Dialpad />
              </div>
            )}
          </div>
        </main>
      </div>

      <CallOverlay />
    </>
  );
}
