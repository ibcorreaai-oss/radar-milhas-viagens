'use client';

import { Button, type ButtonProps } from '@/components/ui/button';

export interface ConfirmSubmitButtonProps extends Omit<ButtonProps, 'type'> {
  /** Mensagem do confirm() nativo — seja específico sobre o que some e se é reversível. */
  confirmMessage: string;
}

// Botão de submit para ações destrutivas (excluir, remover, cancelar).
// Sem isso, um form action={deleteX.bind(null, id)} some o registro no
// primeiro clique, sem confirmação nem trilha — ver
// DISASTER_RECOVERY.md §4 (recuperação após exclusão acidental de dados).
// confirm() nativo é de propósito: zero dependência nova, funciona em
// qualquer navegador, bloqueia o submit do form até o usuário decidir.
export function ConfirmSubmitButton({ confirmMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
