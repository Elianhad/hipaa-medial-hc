import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.28),transparent_35%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.24),transparent_31%),radial-gradient(circle_at_44%_100%,rgba(245,158,11,0.2),transparent_30%),radial-gradient(circle_at_80%_84%,rgba(139,92,246,0.14),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#edf4f2_100%)]" />
        <div className="absolute inset-0 landing-grid opacity-45" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
