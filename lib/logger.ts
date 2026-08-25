// Logger estruturado — uma linha JSON por evento em stdout/stderr, capturada
// automaticamente pelos Runtime Logs da Vercel (nenhum serviço novo, nenhum
// custo novo). Ver OBSERVABILITY.md para a arquitetura completa e a
// diferença entre isto e `audit_logs` (lib/audit-log.ts): logger é
// observabilidade operacional (efêmera, buscável no dashboard da Vercel);
// audit_logs é o registro de negócio permanente e consultável via SQL de
// quem mudou o quê.

export type LogCategory = 'auth' | 'payment' | 'integration' | 'cron' | 'audit' | 'system' | 'http';
type LogLevel = 'info' | 'warn' | 'error' | 'critical';
export type LogFields = Record<string, unknown>;

function emit(level: LogLevel, category: LogCategory, message: string, fields?: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...fields,
  };

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'critical') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(category: LogCategory, message: string, fields?: LogFields): void {
    emit('info', category, message, fields);
  },
  warn(category: LogCategory, message: string, fields?: LogFields): void {
    emit('warn', category, message, fields);
  },
  error(category: LogCategory, message: string, fields?: LogFields): void {
    emit('error', category, message, fields);
  },
  // Mesmo que error(), mas também dispara e-mail pro Igor via notifyOps()
  // (lib/alerts/notify-ops.ts). Reservado para o que exige atenção humana
  // rápida: falha de pagamento, falha sistêmica de autenticação, erro não
  // tratado em rota crítica. Nunca lança — uma falha ao notificar não pode
  // derrubar quem chamou.
  async critical(category: LogCategory, message: string, fields?: LogFields): Promise<void> {
    emit('critical', category, message, fields);
    try {
      const { notifyOps } = await import('@/lib/alerts/notify-ops');
      await notifyOps({ category, message, fields });
    } catch (err) {
      console.error(`[logger] notifyOps falhou: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};
