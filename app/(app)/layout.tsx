import { getUserContext } from '@/lib/auth';
import { getFeatureFlags } from '@/lib/feature-flags';
import { AppShell } from '@/components/app-shell';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  const flags = await getFeatureFlags();

  return (
    <AppShell isLoggedIn={Boolean(ctx)} isAdmin={ctx?.profile?.role === 'admin'} flags={flags}>
      {children}
    </AppShell>
  );
}
