import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Política de Privacidad — Mercado Energy' };

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="1 de enero de 2026">

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Marco legal aplicable</h2>
        <p className="text-gray-600">
          La presente política se rige por la <strong>Ley N° 21.719 sobre Protección de Datos Personales</strong> (publicada el 13 de diciembre de 2023),
          que reemplaza y moderniza la Ley N° 19.628, introduciendo un marco de protección de datos acorde a estándares internacionales.
          También aplican la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores y la Ley N° 19.799 sobre Documentos Electrónicos.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Responsable del tratamiento</h2>
        <p className="text-gray-600">
          <strong>Biznexus Group SpA</strong> — razón social del servicio comercial <strong>Mercado Energy</strong><br />
          RUT: 77.958.683-9<br />
          Domicilio: Miguel León Prado 134, Santiago, Chile<br />
          Email de contacto para privacidad:{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Datos personales que tratamos</h2>
        <p className="text-gray-600 mb-3">Tratamos únicamente los datos necesarios para cada finalidad (principio de minimización):</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-[#dde3e9]/50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Categoría</th>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Datos específicos</th>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Finalidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-600">Identificación</td>
                <td className="px-4 py-2 text-gray-600">Nombre, RUT (si aplica), razón social</td>
                <td className="px-4 py-2 text-gray-600">Cotización y contratación</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Contacto</td>
                <td className="px-4 py-2 text-gray-600">Email, teléfono, dirección</td>
                <td className="px-4 py-2 text-gray-600">Comunicación y seguimiento</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Consumo eléctrico</td>
                <td className="px-4 py-2 text-gray-600">kWh/mes, tarifa, distribuidora, boletas</td>
                <td className="px-4 py-2 text-gray-600">Simulación y diseño del sistema</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Técnicos</td>
                <td className="px-4 py-2 text-gray-600">IP, dispositivo, navegador</td>
                <td className="px-4 py-2 text-gray-600">Seguridad y mejora del sitio</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs mt-2">No tratamos datos sensibles en los términos del artículo 16 de la Ley N° 21.719.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Bases legales del tratamiento</h2>
        <p className="text-gray-600 mb-2">
          Conforme al artículo 13 de la Ley N° 21.719, el tratamiento se funda en las siguientes bases:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-2">
          <li><strong>Consentimiento (art. 13 a):</strong> cuando el titular acepta expresamente el tratamiento al completar el formulario del simulador o de contacto. El consentimiento puede retirarse en cualquier momento sin efecto retroactivo.</li>
          <li><strong>Ejecución de contrato (art. 13 b):</strong> cuando el tratamiento es necesario para la prestación del servicio contratado (instalación, garantía, soporte técnico).</li>
          <li><strong>Interés legítimo (art. 13 f):</strong> para el envío de comunicaciones comerciales a clientes actuales sobre productos y servicios similares, con opción de oposición en todo momento.</li>
          <li><strong>Obligación legal (art. 13 c):</strong> para el cumplimiento de obligaciones tributarias, contables y regulatorias.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Finalidades del tratamiento</h2>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Responder solicitudes de cotización, contacto y soporte</li>
          <li>Elaborar simulaciones de ahorro y dimensionamiento de sistemas</li>
          <li>Gestionar contratos de suministro e instalación</li>
          <li>Enviar comunicaciones comerciales (con consentimiento o interés legítimo)</li>
          <li>Cumplir obligaciones legales, contables y fiscales</li>
          <li>Mejorar la experiencia del sitio y prevenir fraudes</li>
        </ul>
        <p className="text-gray-600 mt-2">
          Los datos no serán utilizados para ninguna finalidad incompatible con las aquí declaradas, conforme al principio de limitación de finalidad (art. 3 letra d) de la Ley N° 21.719).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Comunicación y transferencia de datos</h2>
        <p className="text-gray-600 mb-2">
          Mercado Energy no vende datos personales. Podemos comunicar datos a:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li><strong>Proveedores tecnológicos</strong> (servicios de email, base de datos en la nube, analytics) que actúan como encargados del tratamiento bajo contratos que garantizan el cumplimiento de la Ley N° 21.719.</li>
          <li><strong>Autoridades públicas</strong> cuando así lo exija la ley o una orden judicial.</li>
        </ul>
        <p className="text-gray-600 mt-2">
          En caso de transferencias internacionales de datos, garantizamos que el país de destino ofrece un nivel adecuado de protección o implementamos las salvaguardas contractuales apropiadas, conforme al Título V de la Ley N° 21.719.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Plazo de conservación</h2>
        <p className="text-gray-600">
          Los datos se conservan durante el tiempo necesario para la finalidad para la que fueron recopilados:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1 mt-2">
          <li><strong>Leads y cotizaciones sin contrato:</strong> 2 años desde el último contacto</li>
          <li><strong>Contratos ejecutados:</strong> 5 años desde el término de la relación contractual (plazo de prescripción civil)</li>
          <li><strong>Datos contables y tributarios:</strong> 6 años según normativa del SII</li>
          <li><strong>Datos de navegación:</strong> 12 meses</li>
        </ul>
        <p className="text-gray-600 mt-2">Transcurridos estos plazos, los datos serán eliminados o anonimizados de forma irreversible.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Derechos del titular</h2>
        <p className="text-gray-600 mb-3">
          Conforme al Título III de la Ley N° 21.719, usted tiene los siguientes derechos, que puede ejercer de forma gratuita:
        </p>
        <div className="space-y-3">
          {[
            { right: 'Acceso (art. 22)', desc: 'Conocer qué datos personales tratamos, su origen, finalidad y destinatarios.' },
            { right: 'Rectificación (art. 23)', desc: 'Corregir datos inexactos, desactualizados o incompletos.' },
            { right: 'Supresión / Derecho al olvido (art. 24)', desc: 'Solicitar la eliminación de sus datos cuando ya no sean necesarios para la finalidad original o cuando retire su consentimiento.' },
            { right: 'Oposición (art. 26)', desc: 'Oponerse al tratamiento, en especial para fines de marketing directo o basado en interés legítimo.' },
            { right: 'Portabilidad (art. 25)', desc: 'Recibir sus datos en formato estructurado, de uso común y lectura mecánica, y transmitirlos a otro responsable.' },
            { right: 'Limitación del tratamiento (art. 27)', desc: 'Solicitar la restricción del tratamiento mientras se verifica una impugnación sobre exactitud o licitud.' },
            { right: 'No ser sujeto de decisiones automatizadas (art. 28)', desc: 'No ser objeto de decisiones basadas únicamente en tratamiento automatizado que produzcan efectos jurídicos significativos.' },
          ].map((item) => (
            <div key={item.right} className="flex gap-3 p-3 bg-[#f4f8fb] rounded-xl">
              <span className="text-[#389fe0] font-semibold text-xs mt-0.5 shrink-0 w-52">{item.right}</span>
              <span className="text-gray-600 text-xs">{item.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 mt-4">
          Para ejercer sus derechos, envíe una solicitud a{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a>{' '}
          indicando su nombre completo, RUT y descripción del derecho que desea ejercer. Responderemos dentro de los <strong>15 días hábiles</strong> siguientes a la recepción de la solicitud, conforme al artículo 30 de la Ley N° 21.719.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Reclamos ante la Agencia</h2>
        <p className="text-gray-600">
          Si considera que el tratamiento de sus datos personales infringe la Ley N° 21.719, tiene derecho a presentar
          un reclamo ante la <strong>Agencia de Protección de Datos Personales</strong>, organismo público creado por
          dicha ley para velar por el cumplimiento de la normativa de protección de datos en Chile.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">10. Seguridad de los datos</h2>
        <p className="text-gray-600">
          Implementamos medidas técnicas y organizativas proporcionales al riesgo, conforme al artículo 14 de la Ley N° 21.719:
          cifrado en tránsito (HTTPS/TLS) y en reposo, control de accesos, registros de auditoría y procedimientos
          de respuesta ante brechas de seguridad. En caso de una brecha que afecte sus derechos, notificaremos
          a la Agencia de Protección de Datos y a los titulares afectados dentro de los plazos legales.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">11. Cookies y tecnologías similares</h2>
        <p className="text-gray-600">
          Utilizamos cookies estrictamente necesarias para el funcionamiento del sitio. Para cookies analíticas
          o de seguimiento, solicitamos consentimiento previo. Puede gestionar sus preferencias en la configuración
          de su navegador. El rechazo de cookies no esenciales no afecta el uso del simulador ni de los formularios.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">12. Actualización de esta política</h2>
        <p className="text-gray-600">
          Esta política puede ser actualizada para reflejar cambios normativos o en nuestras prácticas de tratamiento.
          Publicaremos la nueva versión en este sitio con indicación de la fecha de última modificación.
          Para cambios sustanciales, notificaremos a los titulares cuyos datos se traten, cuando sea razonablemente posible.
        </p>
      </section>

    </LegalLayout>
  );
}
