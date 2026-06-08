import Navbar from '@/components/landing/Navbar';
import Projects from '@/components/landing/Projects';
import Footer from '@/components/landing/Footer';
import WhatsAppButton from '@/components/landing/WhatsAppButton';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Proyectos de energía solar en Chile',
  description:
    'Más de 200 proyectos fotovoltaicos instalados en +25 localidades de Chile: hogares, empresas, colegios y comunidades rurales.',
  path: '/proyectos',
});

export default function ProyectosPage() {
  return (
    <main>
      <Navbar />

      {/* Page title */}
      <section className="bg-gradient-to-b from-[#dde3e9] to-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#010101] tracking-tight mb-4">
            Nuestros Proyectos
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Más de 200 proyectos ejecutados en más de 25 localidades de Chile
          </p>
        </div>
      </section>

      {/* Projects component */}
      <Projects showHeader={false} />

      <Footer />
      <WhatsAppButton />
    </main>
  );
}