import Link from 'next/link';
import Reveal from './Reveal';
import { IconSun, IconWind, IconSnowflake, IconHeadset } from './icons';

const SERVICES = [
  {
    Icon: IconSun,
    title: 'Energía Solar',
    description: 'Diseño e instalación de sistemas fotovoltaicos a medida para hogares, empresas e industrias, maximizando el ahorro en tu cuenta eléctrica.',
  },
  {
    Icon: IconWind,
    title: 'Energía Eólica',
    description: 'Desarrollo de proyectos eólicos adaptados a distintas escalas, generando electricidad limpia y renovable.',
  },
  {
    Icon: IconSnowflake,
    title: 'Climatización Eficiente',
    description: 'Sistemas de climatización que reducen costos operativos sin sacrificar confort, seleccionados por su alto rendimiento energético.',
  },
  {
    Icon: IconHeadset,
    title: 'Consultoría y Soporte',
    description: 'Asesoría experta en diseño energético, más mantenimiento preventivo y correctivo para asegurar el rendimiento óptimo de tus sistemas.',
  },
];

export default function Solutions({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section id="soluciones" className={`${showHeader ? 'py-28' : 'pt-12 pb-28'} bg-gradient-to-b from-white to-[#dde3e9]/30`}>
      <div className="max-w-6xl mx-auto px-6">
        {showHeader && (
          <Reveal className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-[#389fe0] uppercase tracking-[0.2em] mb-4">Nuestros servicios</p>
            <h2 className="text-3xl md:text-[2.6rem] font-bold text-[#010101] tracking-tight leading-tight mb-5">
              Soluciones energéticas integrales
            </h2>
            <p className="text-gray-500 leading-relaxed">
              No solo instalamos paneles. Diseñamos, ejecutamos y acompañamos cada proyecto —
              desde sistemas fotovoltaicos y eólicos hasta climatización de alto rendimiento.
            </p>
          </Reveal>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={(i % 2) * 120}>
              <div className="group relative h-full flex gap-5 bg-white rounded-2xl p-7 ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] hover:shadow-[0_16px_48px_rgba(56,159,224,0.14)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Barra de acento que aparece al hover */}
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#389fe0] to-[#1d65c5] scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-300" />

                <div className="shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#389fe0] to-[#1d65c5] text-white flex items-center justify-center shadow-lg shadow-[#389fe0]/25">
                    <s.Icon className="w-7 h-7" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#010101] mb-2 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#010101] rounded-2xl px-8 py-7">
          <div className="text-center sm:text-left">
            <p className="text-white font-bold text-lg tracking-tight">¿No sabes qué solución necesitas?</p>
            <p className="text-white/50 text-sm mt-1">Simula tu sistema ideal en minutos, sin compromiso.</p>
          </div>
          <Link
            href="/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-[#389fe0]/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            Simula tu sistema ideal →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
