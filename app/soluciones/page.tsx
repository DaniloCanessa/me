import Navbar from '@/components/landing/Navbar';
import Solutions from '@/components/landing/Solutions';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Soluciones en energía solar, eólica y climatización',
  description:
    'Energía solar fotovoltaica, eólica, climatización eficiente y consultoría energética para hogares y empresas en todo Chile.',
  path: '/soluciones',
});

export default function SolucionesPage() {
  return (
    <main>
      <Navbar />

      {/* Page title */}
      <section className="bg-gradient-to-b from-[#dde3e9] to-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#010101] tracking-tight mb-4">
            Nuestras Soluciones
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            No solo instalamos paneles — diseñamos, ejecutamos y acompañamos cada proyecto:
            solar, eólico, de climatización y soporte.
          </p>
        </div>
      </section>

      {/* Solutions component */}
      <Solutions showHeader={false} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}