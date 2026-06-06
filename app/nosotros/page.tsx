import Navbar from '@/components/landing/Navbar';
import AboutUs from '@/components/landing/AboutUs';
import Footer from '@/components/landing/Footer';
import Reveal from '@/components/landing/Reveal';
import { IconTarget, IconBadgeCheck } from '@/components/landing/icons';

const PURPOSE = [
  {
    Icon: IconTarget,
    label: 'Misión',
    text: 'Entregar soluciones energéticas integrales que promuevan la eficiencia y sostenibilidad, mediante la instalación de sistemas fotovoltaicos, proyectos eólicos y la comercialización de productos de climatización de alto rendimiento. Buscamos ser un aliado confiable, adaptándonos a cada proyecto y contribuyendo a un futuro energéticamente más limpio.',
  },
  {
    Icon: IconBadgeCheck,
    label: 'Visión',
    text: 'Ser la empresa referente en soluciones energéticas eficientes en Chile, reconocida por la calidad de sus proyectos, su capacidad de innovación y el impacto positivo que genera en personas, organizaciones y medio ambiente.',
  },
];

export default function NosotrosPage() {
  return (
    <main>
      <Navbar />

      {/* Page title */}
      <section className="bg-gradient-to-b from-[#dde3e9] to-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#010101] tracking-tight mb-4">
            Nosotros
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Conoce el equipo detrás de Mercado Energy
          </p>
        </div>
      </section>

      {/* About Us component */}
      <AboutUs />

      {/* Misión y Visión */}
      <section className="py-24 bg-gradient-to-b from-white to-[#dde3e9]/30">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-[#389fe0] uppercase tracking-[0.2em] mb-4">Nuestro propósito</p>
            <h2 className="text-3xl md:text-[2.6rem] font-bold text-[#010101] tracking-tight leading-tight">
              Lo que nos mueve
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {PURPOSE.map((p, i) => (
              <Reveal key={p.label} delay={i * 120}>
                <div className="h-full bg-white rounded-2xl p-8 ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] hover:shadow-[0_16px_48px_rgba(56,159,224,0.12)] transition-shadow duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#389fe0] to-[#1d65c5] text-white flex items-center justify-center shadow-lg shadow-[#389fe0]/25 mb-6">
                    <p.Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[#010101] mb-3 tracking-tight">{p.label}</h3>
                  <p className="text-gray-500 leading-relaxed">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}