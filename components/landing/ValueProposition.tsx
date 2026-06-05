import Reveal from './Reveal';
import {
  IconBarChart,
  IconScale,
  IconBattery,
  IconMapPin,
  IconHandshake,
  IconBadgeCheck,
} from './icons';

const VALUES = [
  {
    Icon: IconBarChart,
    title: 'Análisis con tus boletas reales',
    description: 'Calculamos con tu consumo histórico real, no con promedios genéricos. El simulador lee tu boleta automáticamente.',
  },
  {
    Icon: IconScale,
    title: 'Conocemos la regulación chilena',
    description: 'Aplicamos el DFL 4 y la normativa de net billing vigente. Sabes exactamente qué puedes inyectar y qué recibes a cambio.',
  },
  {
    Icon: IconBattery,
    title: 'Solución energética completa',
    description: 'No solo paneles. Diseñamos sistemas con baterías, gestión de demanda y climatización según tus necesidades.',
  },
  {
    Icon: IconMapPin,
    title: 'Presencia en todo Chile',
    description: 'Con proyectos ejecutados desde Arica hasta Magallanes, calibramos la producción solar real de tu región.',
  },
  {
    Icon: IconHandshake,
    title: 'Enfoque personalizado',
    description: 'Cada proyecto es único. Trabajamos contigo desde la simulación hasta la puesta en marcha y el soporte post-venta.',
  },
  {
    Icon: IconBadgeCheck,
    title: 'Equipos certificados',
    description: 'Trabajamos con las marcas líderes del mercado. Garantía de 25 años en producción y soporte técnico permanente.',
  },
];

export default function ValueProposition() {
  return (
    <section className="py-28 bg-gradient-to-b from-white to-[#dde3e9]/40">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <p className="text-xs font-semibold text-[#389fe0] uppercase tracking-[0.2em] mb-4">Por qué elegirnos</p>
          <h2 className="text-3xl md:text-[2.6rem] font-bold text-[#010101] tracking-tight leading-tight">
            ¿Por qué Mercado Energy?
          </h2>
          <p className="text-gray-500 mt-5 max-w-xl mx-auto leading-relaxed">
            Unimos experiencia, innovación y compromiso con la sostenibilidad para darte soluciones que generan impacto real.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={(i % 3) * 100}>
              <div className="group h-full bg-white rounded-2xl p-7 ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] hover:shadow-[0_12px_40px_rgba(56,159,224,0.12)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#389fe0]/10 text-[#1d65c5] flex items-center justify-center mb-5 group-hover:bg-[#389fe0] group-hover:text-white transition-colors duration-300">
                  <v.Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#010101] mb-2 tracking-tight">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
