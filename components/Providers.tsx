'use client';

import { CallProvider } from '@/contexts/CallContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <CallProvider>
            {children}
        </CallProvider>
    );
}
