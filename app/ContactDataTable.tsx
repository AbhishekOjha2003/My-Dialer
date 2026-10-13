'use client';

import { useEffect, useRef, useState } from 'react';
import { Contact } from '@/lib/types';
import { Phone, Search, History, PhoneCall, Users } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { ContactCallHistoryModal } from '@/components/ContactCallHistoryModal';
import { avatarGradient, formatPhone, initials, leadTone, titleCase } from '@/lib/ui';

interface ContactDataTableProps {
    contacts: Contact[];
    loading?: boolean;
}

export function ContactDataTable({ contacts, loading = false }: ContactDataTableProps) {
    const [search, setSearch] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const { makeCall, connectionStatus } = useCall();

    // "/" focuses search, like modern SaaS apps
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const q = search.toLowerCase();
    const filteredContacts = contacts.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(search)
    );

    const openContactHistory = (contact: Contact) => {
        setSelectedContact(contact);
        setIsHistoryModalOpen(true);
    };

    return (
        <section className="panel" aria-labelledby="contacts-title">
            <div className="panel-head">
                <div>
                    <h3 className="panel-title" id="contacts-title">
                        Contact List <span className="count-pill">{contacts.length}</span>
                    </h3>
                    <div className="panel-sub">Click a phone number to open call logs &amp; recordings</div>
                </div>
                <label className="search">
                    <Search />
                    <input
                        id="contact-search"
                        ref={searchRef}
                        placeholder="Search name or phone…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search contacts"
                    />
                    {!search && <span className="kbd">/</span>}
                </label>
            </div>

            <div className="tbl-wrap">
                <table className="tbl">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Lead Status</th>
                            <th>Notes</th>
                            <th className="right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading &&
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={`sk-${i}`} style={{ animationDelay: `${i * 0.06}s` }}>
                                    <td>
                                        <div className="person">
                                            <div className="skel" style={{ width: 38, height: 38, borderRadius: 12 }} />
                                            <div className="skel" style={{ width: 120, height: 14 }} />
                                        </div>
                                    </td>
                                    <td><div className="skel" style={{ width: 170, height: 30, borderRadius: 11 }} /></td>
                                    <td><div className="skel" style={{ width: 70, height: 24, borderRadius: 99 }} /></td>
                                    <td><div className="skel" style={{ width: 100, height: 14 }} /></td>
                                    <td className="right"><div className="skel" style={{ width: 150, height: 34, marginLeft: 'auto' }} /></td>
                                </tr>
                            ))}

                        {!loading &&
                            filteredContacts.map((contact, i) => {
                                const status = contact.leadStatus || contact.email || 'New';
                                return (
                                    <tr key={`${contact.phone}-${i}`} style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                                        <td>
                                            <div className="person">
                                                <div className="avatar" style={{ background: avatarGradient(contact.name) }}>
                                                    {initials(contact.name)}
                                                </div>
                                                <div>
                                                    <div className="person-name">{contact.name.trim()}</div>
                                                    <div className="person-meta">Lead #{String(i + 1).padStart(3, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                id={`phone-${i}`}
                                                className="phone-chip"
                                                onClick={() => openContactHistory(contact)}
                                                title="View call logs & recordings"
                                            >
                                                <Phone />
                                                {formatPhone(contact.phone)}
                                                <span className="chip-tag"><History /> Logs</span>
                                            </button>
                                        </td>
                                        <td>
                                            <span className={`pill ${leadTone(status)}`}>{titleCase(status)}</span>
                                        </td>
                                        <td>
                                            <div className="notes" title={contact.notes || ''}>
                                                {contact.notes || <span style={{ color: 'var(--text-dim)' }}>No notes yet</span>}
                                            </div>
                                        </td>
                                        <td className="right">
                                            <div className="row-actions">
                                                <button
                                                    id={`history-${i}`}
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => openContactHistory(contact)}
                                                >
                                                    <History /> History
                                                </button>
                                                <button
                                                    id={`call-${i}`}
                                                    className="btn btn-call btn-sm"
                                                    onClick={() => makeCall(contact.phone)}
                                                    disabled={connectionStatus !== 'online'}
                                                >
                                                    <PhoneCall /> Call
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                        {!loading && filteredContacts.length === 0 && (
                            <tr>
                                <td colSpan={5}>
                                    <div className="empty">
                                        <img src="/images/empty.jpg" alt="" aria-hidden />
                                        <div className="empty-title">
                                            {search ? 'No matching contacts' : 'No contacts yet'}
                                        </div>
                                        <p className="empty-text">
                                            {search
                                                ? `Nothing matches “${search}”. Try a different name or number.`
                                                : 'Add rows to your Google Sheet and they will appear here automatically.'}
                                        </p>
                                        {search && (
                                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => setSearch('')}>
                                                <Users /> Show all contacts
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ContactCallHistoryModal
                contact={selectedContact}
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
            />
        </section>
    );
}
