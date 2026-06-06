import NetBillingClient from './NetBillingClient';
import WhatsAppButton from '@/components/landing/WhatsAppButton';

export const metadata = { title: 'Net Billing en Chile — Mercado Energy' };

export default function NetBillingPage() {
  return (
    <>
      <NetBillingClient />
      <WhatsAppButton />
    </>
  );
}
