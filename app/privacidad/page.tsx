import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Política de Privacidad — Mercado Energy' };

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="1 de enero de 2026">
      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Responsable del tratamiento</h2>
        <p className="text-gray-600">
          <strong>Biznexus Group SpA</strong> (Mercado Energy), RUT 77.958.683-9, con domicilio en Miguel León Prado 134,
          Santiago, es responsable del tratamiento de los datos personales recopilados a través de este sitio,
          en conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada de Chile.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Datos que recopilamos</h2>
        <p className="text-gray-600 mb-2">Recopilamos los siguientes datos personales:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Nombre completo o razón social</li>
          <li>Correo electrónico y número de teléfono</li>
          <li>Región, ciudad y comuna</li>
          <li>Datos de consumo eléctrico (kWh/mes) y tarifa</li>
          <li>Información de boletas eléctricas (cuando se cargan voluntariamente)</li>
          <li>Datos técnicos de navegación (IP, navegador, dispositivo)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Finalidad del tratamiento</h2>
        <p className="text-gray-600 mb-2">Los datos recopilados se utilizan para:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Procesar y responder solicitudes de cotización o contacto</li>
          <li>Generar simulaciones de ahorro personalizadas</li>
          <li>Enviar comunicaciones comerciales relacionadas con energía solar (con consentimiento)</li>
          <li>Mejorar nuestros servicios y la experiencia en el sitio</li>
          <li>Cumplir obligaciones legales y contables</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Base legal del tratamiento</h2>
        <p className="text-gray-600">
          El tratamiento se basa en el consentimiento otorgado por el usuario al completar formularios en este
          sitio, en la ejecución de la relación precontractual o contractual, y en el cumplimiento de obligaciones
          legales aplicables.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Compartición de datos</h2>
        <p className="text-gray-600">
          Mercado Energy no vende ni cede datos personales a terceros. Podremos compartir datos con proveedores
          de servicios tecnológicos (plataformas de email, CRM, analytics) que actúan como encargados del
          tratamiento bajo acuerdos de confidencialidad. Todos los proveedores operan con estándares de
          seguridad adecuados.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Conservación de datos</h2>
        <p className="text-gray-600">
          Los datos se conservan mientras sea necesario para la finalidad para la que fueron recopilados o
          mientras exista una relación comercial activa. Una vez finalizada, se eliminarán en un plazo máximo
          de 5 años, salvo obligación legal de conservación.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Derechos del titular</h2>
        <p className="text-gray-600 mb-2">
          En conformidad con la Ley N° 19.628, usted tiene derecho a:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li><strong>Acceso:</strong> conocer qué datos tenemos sobre usted</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o desactualizados</li>
          <li><strong>Cancelación:</strong> solicitar la eliminación de sus datos</li>
          <li><strong>Oposición:</strong> oponerse al tratamiento para fines de marketing</li>
        </ul>
        <p className="text-gray-600 mt-2">
          Para ejercer estos derechos, escriba a{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">
            contacto@mercadoenergy.cl
          </a>{' '}
          indicando su nombre y la solicitud específica.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Seguridad</h2>
        <p className="text-gray-600">
          Implementamos medidas técnicas y organizativas para proteger sus datos frente a accesos no
          autorizados, pérdida o alteración. El sitio opera bajo protocolo HTTPS y los datos se almacenan
          en servidores con cifrado en reposo.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Cookies</h2>
        <p className="text-gray-600">
          Este sitio puede utilizar cookies técnicas necesarias para el funcionamiento y cookies analíticas
          para medir el uso del sitio. No utilizamos cookies de publicidad de terceros. Puede configurar
          su navegador para rechazar cookies, aunque esto puede afectar algunas funcionalidades.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">10. Contacto</h2>
        <p className="text-gray-600">
          Para consultas sobre privacidad:{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">
            contacto@mercadoenergy.cl
          </a>{' '}
          · Miguel León Prado 134, Santiago de Chile.
        </p>
      </section>
    </LegalLayout>
  );
}
