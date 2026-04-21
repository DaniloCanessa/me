import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import ValueProposition from '@/components/landing/ValueProposition';
import SimulatorCTA from '@/components/landing/SimulatorCTA';
import AboutUs from '@/components/landing/AboutUs';
import Solutions from '@/components/landing/Solutions';
import Brands from '@/components/landing/Brands';
import Projects from '@/components/landing/Projects';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <HowItWorks />
      <ValueProposition />
      <SimulatorCTA />
      <AboutUs />
      <Solutions />
      <Brands />
      <Projects />
      <FinalCTA />
      <Footer />
    </main>
  );
}
