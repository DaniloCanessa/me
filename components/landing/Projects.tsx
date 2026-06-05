import Image from 'next/image';
import Reveal from './Reveal';

const PROJECTS = [
  {
    image: '/images/poroma-img.jpg',
    location: 'Poroma, Tarapacá',
    title: 'Sistema híbrido para zona rural sin red eléctrica',
    description: '3 inversores Victron 15 kVA, 32 baterías (160 kWh), 32 paneles 645 W y respaldo con generador JCB 90 kVA. Desarrollado para el Gobierno de Chile y la Municipalidad de Huara junto a ERNC Chile.',
    tags: ['Gobierno', 'Off-grid', 'Baterías'],
  },
  {
    image: '/images/casa-carlos-alvarado.jpg',
    location: 'Las Condes, Región Metropolitana',
    title: 'Solución integral residencial premium',
    description: '10 kW con 16 paneles, cargador de auto eléctrico y termo eléctrico de 330 litros. Una solución energética completa para el hogar.',
    tags: ['Residencial', 'Cargador EV', 'Termo eléctrico'],
  },
  {
    image: '/images/panaderia-san-bernardo.jpg',
    location: 'San Bernardo, Región Metropolitana',
    title: 'Sistema fotovoltaico trifásico para panadería',
    description: 'Instalación de 10 kW trifásico para cubrir el consumo energético de una panadería comercial, reduciendo costos operativos.',
    tags: ['Comercial', 'Trifásico'],
  },
  {
    image: '/images/proyecto-coscaya.jpg',
    location: 'Coscaya, Huara — Tarapacá',
    title: 'Sistema híbrido + baterías + alumbrado',
    description: '70 kWh en baterías, habilitación eléctrica en 19 viviendas, distribución eléctrica y alumbrado público.',
    tags: ['Residencial', 'Baterías', 'Alumbrado'],
  },
  {
    image: '/images/proyecto-caleta-los-bronces.jpg',
    location: 'Caleta Los Bronces, Atacama',
    title: 'Cámaras de refrigeración solar móviles',
    description: '2 salas modulares de refrigeración de 7 kWp cada una para comunidades pesqueras artesanales.',
    tags: ['Industrial', 'Refrigeración'],
  },
  {
    image: '/images/proyecto-talca.jpg',
    location: 'Universidad de Talca, Maule',
    title: 'Sistema fotovoltaico universitario',
    description: '5 instalaciones de 12,8 kWp en campus universitario, generación distribuida de energía limpia.',
    tags: ['Comercial', 'Educación'],
  },
  {
    image: '/images/proyecto-rio-ibanez.jpg',
    location: 'Río Ibáñez, Aysén',
    title: 'Energía solar para estancias remotas',
    description: '27 kWp para 75 estancias en zona aislada, reemplazando generadores diésel.',
    tags: ['Rural', 'Off-grid'],
  },
  {
    image: '/images/proyecto-lonquimay.jpg',
    location: 'Lonquimay, Araucanía',
    title: 'Solución fotovoltaica rural',
    description: 'Sistema fotovoltaico para comunidades rurales en la cordillera de la Araucanía.',
    tags: ['Rural', 'Residencial'],
  },
  {
    image: '/images/proyecto-quellon.jpg',
    location: 'Puerto Carmen, Quellón — Los Lagos',
    title: 'Sistema solar en zona austral',
    description: 'Instalación fotovoltaica en la isla de Chiloé, adaptada a las condiciones climáticas del sur.',
    tags: ['Residencial', 'Sur'],
  },
];

export default function Projects({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section id="proyectos" className={`${showHeader ? 'py-28' : 'pt-12 pb-28'} bg-gradient-to-b from-[#dde3e9]/40 to-white`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
          <Reveal>
            {showHeader && (
              <>
                <p className="text-xs font-semibold text-[#389fe0] uppercase tracking-[0.2em] mb-4">Trayectoria</p>
                <h2 className="text-3xl md:text-[2.6rem] font-bold text-[#010101] tracking-tight leading-tight">
                  Proyectos ejecutados<br />en todo Chile
                </h2>
              </>
            )}
            <p className={`text-gray-500 leading-relaxed ${showHeader ? 'mt-5' : 'text-lg'}`}>
              Desde Arica hasta Magallanes, hemos instalado sistemas solares en hogares, empresas,
              universidades, comunidades rurales y organismos públicos.
            </p>
          </Reveal>
          <Reveal delay={120} className="rounded-2xl overflow-hidden border border-[#b0cedd]/40 shadow-[0_12px_40px_rgba(16,40,80,0.08)]">
            <Image
              src="/images/pais-con-proyectos.png"
              alt="Proyectos Mercado Energy en Chile"
              width={500}
              height={600}
              className="w-full h-auto object-contain bg-white p-4"
            />
          </Reveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 100}>
              <div className="group h-full bg-white rounded-2xl overflow-hidden ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] hover:shadow-[0_16px_48px_rgba(16,40,80,0.14)] hover:-translate-y-1 transition-all duration-300">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                    {p.tags.map((tag) => (
                      <span key={tag} className="bg-[#389fe0]/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-[#389fe0] font-medium mb-1">{p.location}</p>
                  <h3 className="text-sm font-bold text-[#010101] mb-2 tracking-tight">{p.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
