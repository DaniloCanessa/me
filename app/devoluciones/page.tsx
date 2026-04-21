import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Política de Devoluciones — Mercado Energy' };

export default function DevolucionesPage() {
  return (
    <LegalLayout title="Política de Devoluciones" lastUpdated="1 de enero de 2026">

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Marco legal aplicable</h2>
        <p className="text-gray-600">
          La presente política se rige por la <strong>Ley N° 19.496 sobre Protección de los Derechos de los Consumidores</strong>
          y sus modificaciones, en particular las introducidas por la{' '}
          <strong>Ley N° 21.398</strong> (2021) que fortalece los derechos de los consumidores, y la{' '}
          <strong>Ley N° 21.521</strong> (2023) sobre comercio electrónico. También aplica la{' '}
          <strong>Ley N° 21.719</strong> (2023) en todo lo referido al tratamiento de datos personales
          en el proceso de devolución.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Derecho de retracto</h2>
        <p className="text-gray-600 mb-2">
          Conforme al artículo 3 bis de la Ley N° 19.496, en contratos celebrados por medios electrónicos
          o fuera del establecimiento comercial, el consumidor tiene derecho a retractarse dentro de los{' '}
          <strong>10 días hábiles</strong> siguientes a:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-3">
          <li>La fecha de firma del contrato, o</li>
          <li>La fecha de recepción del bien, si es posterior a la firma</li>
        </ul>
        <p className="text-gray-600 mb-2">
          El derecho a retracto <strong>no aplica</strong> en los siguientes casos contemplados por el artículo 3 bis:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Cuando los trabajos de instalación ya se han iniciado con consentimiento expreso del consumidor</li>
          <li>Cuando el bien ha sido confeccionado o personalizado según especificaciones del consumidor</li>
          <li>Cuando se trata de bienes que por su naturaleza no puedan ser devueltos o puedan deteriorarse rápidamente</li>
        </ul>
        <p className="text-gray-600 mt-3">
          Para ejercer el retracto, el consumidor debe notificarlo por escrito a{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a>{' '}
          dentro del plazo legal. Mercado Energy reembolsará los montos pagados dentro de los{' '}
          <strong>10 días hábiles</strong> siguientes a la recepción de la notificación, conforme al artículo 3 bis inciso 4°.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Garantía legal del consumidor</h2>
        <p className="text-gray-600 mb-2">
          Conforme al artículo 21 de la Ley N° 19.496, ante defectos o vicios ocultos, el consumidor tiene
          derecho a elegir entre:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-3">
          <li><strong>Reparación gratuita:</strong> corrección del defecto sin costo para el consumidor</li>
          <li><strong>Reposición:</strong> cambio del bien por otro de igual especie y calidad</li>
          <li><strong>Devolución:</strong> reembolso del precio pagado</li>
        </ul>
        <p className="text-gray-600">
          El plazo de garantía legal es de <strong>3 meses</strong> desde la recepción del bien o la
          prestación del servicio, sin perjuicio de las garantías comerciales adicionales otorgadas por
          Mercado Energy y los fabricantes, que en todos los casos superan este mínimo legal.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Garantías comerciales</h2>
        <p className="text-gray-600 mb-2">
          Adicionalmente a la garantía legal, Mercado Energy ofrece:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-[#dde3e9]/50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Componente</th>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Garantía comercial</th>
                <th className="text-left px-4 py-2 text-gray-700 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-600">Mano de obra e instalación</td>
                <td className="px-4 py-2 text-gray-600">12 meses desde puesta en marcha</td>
                <td className="px-4 py-2 text-gray-600">Mercado Energy</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Paneles solares</td>
                <td className="px-4 py-2 text-gray-600">10 años producto / 25 años rendimiento</td>
                <td className="px-4 py-2 text-gray-600">Fabricante</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Inversores</td>
                <td className="px-4 py-2 text-gray-600">5–10 años (según modelo)</td>
                <td className="px-4 py-2 text-gray-600">Fabricante</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Baterías</td>
                <td className="px-4 py-2 text-gray-600">Según modelo y ciclos</td>
                <td className="px-4 py-2 text-gray-600">Fabricante</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Estructura metálica</td>
                <td className="px-4 py-2 text-gray-600">5 años contra defectos de fabricación</td>
                <td className="px-4 py-2 text-gray-600">Mercado Energy</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Las garantías de fabricante son gestionadas por Mercado Energy como intermediario ante el fabricante
          correspondiente, sin costo de tramitación para el consumidor.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Devolución de equipos no instalados</h2>
        <p className="text-gray-600 mb-2">Aceptamos la devolución de equipos no instalados bajo estas condiciones:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Equipo en embalaje original, sin uso ni daños físicos</li>
          <li>Solicitud dentro de los <strong>10 días hábiles</strong> desde la recepción</li>
          <li>Presentación de boleta o factura</li>
          <li>El costo de transporte de retorno es de cargo del cliente, salvo que el defecto sea imputable a Mercado Energy</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Procedimiento de reclamo</h2>
        <ol className="list-decimal pl-5 text-gray-600 space-y-2">
          <li>
            <strong>Contacto inicial:</strong> envíe un correo a{' '}
            <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a>{' '}
            con su nombre, número de contrato, descripción del problema y fotografías si aplica.
          </li>
          <li>
            <strong>Acuse de recibo:</strong> Mercado Energy acusará recibo dentro de las <strong>48 horas hábiles</strong> siguientes.
          </li>
          <li>
            <strong>Evaluación técnica:</strong> un técnico evaluará el caso dentro de los <strong>5 días hábiles</strong> siguientes al reclamo.
          </li>
          <li>
            <strong>Resolución:</strong> en caso de que proceda la garantía, coordinaremos la visita técnica o el retiro del equipo sin costo para el consumidor, dentro de los <strong>15 días hábiles</strong>.
          </li>
          <li>
            <strong>Reembolso:</strong> si corresponde devolución de dinero, se realizará por transferencia bancaria dentro de los <strong>10 días hábiles</strong> desde la aprobación.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Exclusiones de garantía</h2>
        <p className="text-gray-600 mb-2">No cubre garantía ni devolución en los siguientes casos:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Daños por mal uso, negligencia o modificaciones no autorizadas por Mercado Energy</li>
          <li>Deterioro normal derivado del uso y exposición a condiciones climáticas (fotodegradación esperada dentro de los rangos normales del fabricante)</li>
          <li>Equipos intervenidos por terceros no autorizados que anulen la garantía del fabricante</li>
          <li>Daños causados por fenómenos naturales no cubiertos por los seguros del proyecto (rayos, inundaciones, terremotos sobre intensidad asegurable)</li>
          <li>Incumplimiento de las instrucciones de uso, mantenimiento o limpieza entregadas en la puesta en marcha</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. SERNAC y vías de reclamación</h2>
        <p className="text-gray-600">
          Si no está satisfecho con la respuesta de Mercado Energy, tiene derecho a recurrir al{' '}
          <strong>Servicio Nacional del Consumidor (SERNAC)</strong> en{' '}
          <a href="https://www.sernac.cl" target="_blank" rel="noopener noreferrer" className="text-[#389fe0] hover:underline">
            www.sernac.cl
          </a>{' '}
          o al <strong>Juzgado de Policía Local</strong> de su domicilio, conforme a los artículos 50 y
          siguientes de la Ley N° 19.496.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Tratamiento de datos en el proceso de devolución</h2>
        <p className="text-gray-600">
          Los datos personales recopilados durante el proceso de reclamo o devolución (nombre, RUT, correo,
          banco para reembolso) se tratarán conforme a la{' '}
          <a href="/privacidad" className="text-[#389fe0] hover:underline">Política de Privacidad</a>{' '}
          de Mercado Energy y la Ley N° 21.719, utilizándose únicamente para gestionar la solicitud y
          cumplir las obligaciones legales derivadas de ella.
        </p>
      </section>

    </LegalLayout>
  );
}
