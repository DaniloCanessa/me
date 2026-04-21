import Image from 'next/image';

const PROJECTS = [
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

export default function Projects() {
  return (
    <section id="proyectos" className="py-24 bg-[#dde3e9]/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start mb-16">
          <div>
            <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Trayectoria</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#010101] leading-tight">
              Proyectos ejecutados<br />en todo Chile
            </h2>
            <p className="text-gray-500 mt-4 leading-relaxed">
              Desde Arica hasta Magallanes, hemos instalado sistemas solares en hogares, empresas,
              universidades, comunidades rurales y organismos públicos.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#b0cedd]/40 shadow-sm">
            <Image
              src="/images/pais-con-proyectos.png"
              alt="Proyectos Mercado Energy en Chile"
              width={500}
              height={600}
              className="w-full h-auto object-contain bg-white p-4"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((p) => (
            <div
              key={p.title}
              className="group bg-white rounded-2xl overflow-hidden border border-[#b0cedd]/30 hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                  {p.tags.map((tag) => (
                    <span key={tag} className="bg-[#389fe0]/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-[#389fe0] font-medium mb-1">{p.location}</p>
                <h3 className="text-sm font-bold text-[#010101] mb-2">{p.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
