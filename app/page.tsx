import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import ValueProposition from '@/components/landing/ValueProposition';
import Brands from '@/components/landing/Brands';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';

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
