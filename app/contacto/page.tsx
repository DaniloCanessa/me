import Navbar from '@/components/landing/Navbar';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';

export default function ContactoPage() {
  return (
    <main>
      <Navbar />

      {/* Page title */}
      <section className="bg-gradient-to-b from-[#dde3e9] to-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#010101] tracking-tight mb-4">
            Contacto
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Conversemos sobre tu proyecto solar — visita técnica gratuita y sin compromiso
          </p>
        </div>
      </section>

      {/* Contact form */}
      <ContactSection showEyebrow={false} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}