'use client';

import { useState, useTransition } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { useToast } from '@/components/toast-provider';
import { setUserRole, setUserBlocked } from './actions';
import type { Profile, UserRole } from '@/lib/types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

// ETAPA 15 (ver PLATFORM_ADMIN.md) — troca de role só aparece pro
// super_admin (o servidor recusa de qualquer forma se alguém contornar o
// frontend, mas não faz sentido oferecer um controle que sempre vai falhar).
// Bloquear/desbloquear aparece pra qualquer admin, exceto no próprio
// usuário e no super_admin (o RPC também recusa esses dois casos).
export function UserRowActions({
  profile,
  isSuperAdmin,
  isSelf,
}: {
  profile: Profile;
  isSuperAdmin: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [blockReasonOpen, setBlockReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { show } = useToast();

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">Você</span>;
  }

  function handleRoleChange(newRole: string) {
    startTransition(async () => {
      const { error } = await setUserRole(profile.user_id, newRole as UserRole);
      if (error) {
        show({ variant: 'error', title: 'Não foi possível alterar a role', description: error });
        return;
      }
      show({ variant: 'success', title: `Role alterada para ${newRole}.` });
    });
  }

  function handleUnblock() {
    startTransition(async () => {
      const { error } = await setUserBlocked(profile.user_id, false);
      if (error) {
        show({ variant: 'error', title: 'Não foi possível desbloquear', description: error });
        return;
      }
      show({ variant: 'success', title: 'Usuário desbloqueado.' });
    });
  }

  function handleBlockConfirm() {
    startTransition(async () => {
      const { error } = await setUserBlocked(profile.user_id, true, reason);
      if (error) {
        show({ variant: 'error', title: 'Não foi possível bloquear', description: error });
        return;
      }
      show({ variant: 'success', title: 'Usuário bloqueado.' });
      setBlockReasonOpen(false);
      setReason('');
    });
  }

  // Mesmo critério pra bloquear E desbloquear (achado em revisão
  // adversarial: só o botão "Bloquear" checava isso — "Desbloquear"
  // aparecia mesmo quando o alvo era admin e quem via não era
  // super_admin, e o RPC admin_set_user_blocked recusa esse caso).
  const canManageBlockState = profile.role === 'user' || (profile.role === 'admin' && isSuperAdmin);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isSuperAdmin && (
        <Select
          className="h-8 w-36 text-xs"
          value={profile.role}
          disabled={pending}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}

      {profile.blocked_at ? (
        canManageBlockState && (
          <ConfirmSubmitButton
            size="sm"
            variant="outline"
            disabled={pending}
            confirmMessage={`Desbloquear ${profile.full_name || profile.email}?`}
            onClick={handleUnblock}
          >
            Desbloquear
          </ConfirmSubmitButton>
        )
      ) : canManageBlockState ? (
        blockReasonOpen ? (
          <div className="flex items-center gap-1.5">
            <Input
              className="h-8 w-40 text-xs"
              placeholder="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <Button size="sm" variant="destructive" disabled={pending} onClick={handleBlockConfirm}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setBlockReasonOpen(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setBlockReasonOpen(true)}>
            Bloquear
          </Button>
        )
      ) : null}
    </div>
  );
}
