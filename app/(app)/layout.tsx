import { getUserContext } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();

  return (
    <AppShell isLoggedIn={Boolean(ctx)} isAdmin={ctx?.profile?.role === 'admin'}>
      {children}
    </AppShell>
  );
}
