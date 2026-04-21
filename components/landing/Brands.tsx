const BRANDS = [
  'Jinko Solar', 'SMA', 'Huawei', 'BYD', 'Enphase', 'Fronius', 'Canadian Solar', 'Victron Energy',
];

export default function Brands() {
  return (
    <section className="py-16 bg-white border-y border-[#dde3e9]">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-10">
          Trabajamos con las mejores marcas del mercado
        </p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="text-sm font-bold text-[#b0cedd] hover:text-[#1d65c5] transition-colors tracking-wide uppercase cursor-default"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
