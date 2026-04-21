import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Política de Devoluciones — Mercado Energy' };

export default function DevolucionesPage() {
  return (
    <LegalLayout title="Política de Devoluciones" lastUpdated="1 de enero de 2026">
      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Alcance</h2>
        <p className="text-gray-600">
          La presente política aplica a todos los contratos de suministro e instalación de sistemas
          fotovoltaicos, baterías y equipos asociados celebrados con <strong>Biznexus Group SpA</strong> (Mercado Energy),
          RUT 77.958.683-9, y se rige por la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores de Chile.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Derecho de retracto</h2>
        <p className="text-gray-600">
          Para contratos celebrados a distancia o fuera del establecimiento comercial, el cliente tiene
          derecho a retractarse dentro de los <strong>10 días hábiles</strong> siguientes a la firma del contrato
          o al pago del pie inicial, siempre que no se hayan iniciado los trabajos de instalación con
          el consentimiento expreso del cliente.
        </p>
        <p className="text-gray-600 mt-2">
          Para ejercer el retracto, el cliente debe notificarlo por escrito a{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">
            contacto@mercadoenergy.cl
          </a>{' '}
          dentro del plazo indicado.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Devolución de equipos no instalados</h2>
        <p className="text-gray-600 mb-2">
          Se aceptará la devolución de equipos no instalados bajo las siguientes condiciones:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>El equipo debe estar en su embalaje original, sin uso y sin daños</li>
          <li>La solicitud debe realizarse dentro de los <strong>10 días hábiles</strong> desde la recepción</li>
          <li>Debe adjuntarse la boleta o factura de compra</li>
          <li>Los gastos de transporte para la devolución son de cargo del cliente, salvo que el equipo presente defectos de fábrica</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Equipos instalados</h2>
        <p className="text-gray-600">
          Una vez instalado el sistema, no procede la devolución del equipo por cambio de opinión, dado
          que se trata de bienes que han sido incorporados al inmueble. En caso de defectos de instalación
          o funcionamiento, aplica la garantía descrita en el punto 5.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Garantía post-instalación</h2>
        <p className="text-gray-600 mb-2">Mercado Energy ofrece las siguientes garantías:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li><strong>Mano de obra e instalación:</strong> 12 meses desde la puesta en marcha</li>
          <li><strong>Paneles solares:</strong> garantía del fabricante (habitualmente 10 años de producto y 25 años de rendimiento)</li>
          <li><strong>Inversores:</strong> garantía del fabricante (habitualmente 5 a 10 años)</li>
          <li><strong>Baterías:</strong> garantía del fabricante según modelo</li>
          <li><strong>Estructura metálica:</strong> 5 años contra defectos de fabricación</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Procedimiento de reclamo</h2>
        <p className="text-gray-600 mb-2">Para hacer efectiva una garantía o solicitar una devolución:</p>
        <ol className="list-decimal pl-5 text-gray-600 space-y-1">
          <li>Contacte a nuestro equipo en <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a> describiendo el problema</li>
          <li>Adjunte fotografías del equipo o instalación y su número de contrato</li>
          <li>Un técnico evaluará el caso dentro de <strong>5 días hábiles</strong></li>
          <li>Si procede, se coordinará la visita técnica o el retiro del equipo sin costo adicional</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Reembolsos</h2>
        <p className="text-gray-600">
          Los reembolsos aprobados se realizarán mediante transferencia bancaria en un plazo máximo de
          <strong> 15 días hábiles</strong> desde la aprobación de la devolución. El monto reembolsado
          corresponderá al precio pagado, descontando los costos de servicios ya prestados (visita técnica,
          ingeniería, gestión de permisos) según corresponda.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Exclusiones</h2>
        <p className="text-gray-600 mb-2">No aplica garantía ni devolución en los siguientes casos:</p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li>Daños causados por mal uso, modificaciones no autorizadas o desastres naturales</li>
          <li>Deterioro normal por uso y exposición a condiciones climáticas</li>
          <li>Equipos intervenidos por personal no autorizado por Mercado Energy</li>
          <li>Incumplimiento de las instrucciones de uso y mantenimiento</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Contacto</h2>
        <p className="text-gray-600">
          Para cualquier consulta sobre devoluciones o garantías:{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">
            contacto@mercadoenergy.cl
          </a>{' '}
          · Miguel León Prado 134, Santiago · También puede contactarnos a través del formulario en{' '}
          <a href="/#contacto-form" className="text-[#389fe0] hover:underline">nuestra página principal</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
