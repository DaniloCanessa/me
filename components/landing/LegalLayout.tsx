import Link from 'next/link';
import Image from 'next/image';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      <nav className="bg-[#010101] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/images/logotipo.png" alt="Mercado Energy" width={160} height={48} className="h-10 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl border border-[#b0cedd]/30 p-8 md:p-12">
          <p className="text-xs text-[#389fe0] font-semibold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#010101] mb-3">{title}</h1>
          <p className="text-sm text-gray-400 mb-10 pb-10 border-b border-gray-100">
            Última actualización: {lastUpdated}
          </p>

          <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
            {children}
          </div>
        </div>
      </div>

      <footer className="bg-[#010101] text-white/40 text-xs text-center py-6">
        © 2026 Mercado Energy · Biznexus Group SPA · RUT 77.958.683-9
      </footer>
    </div>
  );
}
