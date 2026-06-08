import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import ValueProposition from '@/components/landing/ValueProposition';
import Brands from '@/components/landing/Brands';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Paneles solares y energía fotovoltaica en Chile',
  description:
    'Diseñamos e instalamos sistemas solares fotovoltaicos a medida para hogares y empresas en Chile. Simula tu ahorro y conoce tu retorno de inversión.',
  path: '/',
});

export default function Home() {
  return (
    <main>
      <HeroSection />
      <HowItWorks />
      <ValueProposition />
      <Brands />
      <ContactSection />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
