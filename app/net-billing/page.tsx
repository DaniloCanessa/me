import NetBillingClient from './NetBillingClient';
import WhatsAppButton from '@/components/landing/WhatsAppButton';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Net Billing en Chile',
  description:
    'Qué es el Net Billing (Ley 21.118): inyecta tu energía solar sobrante a la red y recibe un crédito en tu boleta. Te lo explicamos.',
  path: '/net-billing',
});

export default function NetBillingPage() {
  return (
    <>
      <NetBillingClient />
      <WhatsAppButton />
    </>
  );
}
