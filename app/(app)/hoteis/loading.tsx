import { SmartLoading } from '@/components/smart-loading';

export default function Loading() {
  return (
    <SmartLoading
      messages={[
        'Buscando hotéis…',
        'Comparando diária em dinheiro e em pontos…',
        'Calculando o valor do seu milheiro…',
        'Quase pronto…',
      ]}
    />
  );
}
