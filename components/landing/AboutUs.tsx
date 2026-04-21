import Image from 'next/image';

export default function AboutUs() {
  return (
    <section id="nosotros" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <Image
                src="/images/equipo-de-trabajo.jpg"
                alt="Equipo Mercado Energy"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden md:block">
              <div className="rounded-2xl overflow-hidden w-48 h-36 border-4 border-white shadow-xl">
                <Image
                  src="/images/equipo-de-trabajo-2.jpg"
                  alt="Equipo en terreno"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Quiénes somos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#010101] mb-6 leading-tight">
              Especialistas en energía renovable para Chile
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              En Mercado Energy, unimos nuestra vasta experiencia, innovación constante y un firme compromiso
              con la sostenibilidad para brindarte soluciones energéticas que generan un verdadero impacto.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              Con proyectos ejecutados en diversas regiones de Chile, adoptamos un enfoque personalizado que,
              junto a nuestra dedicación a la excelencia, nos posiciona como el socio ideal para proyectos
              de cualquier escala.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { value: '+200', label: 'Proyectos' },
                { value: '16', label: 'Regiones' },
                { value: '100%', label: 'Compromiso' },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 bg-[#b0cedd]/10 rounded-xl">
                  <div className="text-2xl font-bold text-[#1d65c5]">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
