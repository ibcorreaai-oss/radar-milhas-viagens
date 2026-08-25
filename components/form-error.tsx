import { TriangleAlert } from 'lucide-react';

// Banner de erro de formulário — usado pelas telas de criar/editar do admin
// (erro chega via query param `erro`, não via throw: um throw numa Server
// Action cai no error boundary genérico app/error.tsx, que perde a
// mensagem específica do que deu errado. Ver DATA_QUALITY.md).
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="mb-5 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
