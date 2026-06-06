import Image from 'next/image';
import Link from 'next/link';
import { getSocialConfig } from '@/lib/db/config';
import { IconInstagram, IconFacebook, IconYouTube, IconTikTok } from './icons';

export default async function Footer() {
  // URLs configurables en /admin/config (categoría Redes sociales); vacía = oculta
  const social = await getSocialConfig();
  const socialLinks = [
    { name: 'Instagram', href: social.instagram, Icon: IconInstagram },
    { name: 'Facebook',  href: social.facebook,  Icon: IconFacebook },
    { name: 'YouTube',   href: social.youtube,   Icon: IconYouTube },
    { name: 'TikTok',    href: social.tiktok,    Icon: IconTikTok },
  ].filter((s) => s.href);

  return (
    <footer id="contacto" className="bg-[#010101] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">

          {/* Logo + descripción */}
          <div className="md:col-span-2">
            <Image src="/images/me-blanco.png" alt="Mercado Energy" width={395} height={406} className="h-36 w-auto mb-4" />
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              Soluciones energéticas fotovoltaicas para hogares y empresas en Chile.
            </p>
            <div className="mt-6 space-y-2 text-sm text-white/50">
              <p>📧 <a href="mailto:contacto@mercadoenergy.cl" className="hover:text-[#389fe0] transition-colors">contacto@mercadoenergy.cl</a></p>
              <p>📍 Miguel León Prado 134, Santiago</p>
            </div>

            {/* Redes sociales */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-6">
                {socialLinks.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-[#389fe0] hover:border-[#389fe0]/40 transition-colors flex items-center justify-center"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navegación */}
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Navegación</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/simulator" className="hover:text-[#389fe0] transition-colors">Simulador solar</Link></li>
              <li><Link href="/net-billing" className="hover:text-[#389fe0] transition-colors">¿Qué es Net Billing?</Link></li>
              <li><a href="#soluciones" className="hover:text-[#389fe0] transition-colors">Soluciones</a></li>
              <li><a href="#proyectos" className="hover:text-[#389fe0] transition-colors">Proyectos</a></li>
              <li><a href="#nosotros" className="hover:text-[#389fe0] transition-colors">Quiénes somos</a></li>
              <li><a href="#contacto-form" className="hover:text-[#389fe0] transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/terminos" className="hover:text-[#389fe0] transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-[#389fe0] transition-colors">Política de privacidad</Link></li>
              <li><Link href="/devoluciones" className="hover:text-[#389fe0] transition-colors">Política de devoluciones</Link></li>
            </ul>

            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-8 mb-4">Pagos</p>
            <div className="flex gap-2 flex-wrap">
              {['Transferencia', 'Webpay', 'VISA', 'Mastercard'].map((m) => (
                <span key={m} className="text-[10px] font-medium border border-white/10 text-white/40 px-2 py-0.5 rounded">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="rounded-xl overflow-hidden mb-10 border border-white/10">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.9!2d-70.6489!3d-33.4569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMiguel+Le%C3%B3n+Prado+134%2C+Santiago!5e0!3m2!1ses!2scl!4v1"
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación Mercado Energy"
          />
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <p>© 2026 Mercado Energy · Todos los derechos reservados</p>
          <p>Hecho en Chile 🇨🇱</p>
        </div>
      </div>
    </footer>
  );
}
