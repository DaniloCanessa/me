import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Términos y Condiciones — Mercado Energy' };

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y Condiciones" lastUpdated="1 de enero de 2026">
      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Identificación del prestador</h2>
        <p className="text-gray-600">
          El presente sitio web y simulador solar son operados por <strong>Biznexus Group SpA</strong>, RUT 77.958.683-9,
          con domicilio en Miguel León Prado 134, Santiago de Chile, en adelante "Mercado Energy".
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Objeto</h2>
        <p className="text-gray-600">
          Mercado Energy ofrece servicios de diseño, suministro e instalación de sistemas fotovoltaicos para
          uso residencial, comercial e industrial en Chile. El simulador solar disponible en este sitio tiene
          carácter meramente orientativo y no constituye una oferta contractual.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Uso del simulador</h2>
        <p className="text-gray-600">
          Los resultados entregados por el simulador son estimaciones basadas en datos históricos de radiación solar,
          tarifas eléctricas de referencia y perfiles de consumo ingresados por el usuario. Los valores reales pueden
          variar según las condiciones específicas de cada instalación. Mercado Energy no se hace responsable de
          decisiones tomadas exclusivamente en base a estas estimaciones.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Presupuestos y contratos</h2>
        <p className="text-gray-600">
          Todo presupuesto definitivo debe ser emitido por escrito por un representante autorizado de Mercado Energy,
          previo a una visita técnica al inmueble. Los precios pueden variar según condiciones de instalación,
          equipamiento seleccionado y vigencia del presupuesto (30 días calendario desde su emisión).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Garantías</h2>
        <p className="text-gray-600">
          Los sistemas instalados cuentan con las garantías del fabricante de cada componente (paneles, inversores,
          baterías y estructuras). La garantía de instalación y mano de obra es de <strong>12 meses</strong> desde
          la fecha de puesta en marcha. Mercado Energy actúa como intermediario para gestionar garantías de fabricante
          cuando corresponda.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Propiedad intelectual</h2>
        <p className="text-gray-600">
          Todos los contenidos de este sitio (textos, imágenes, logotipos, código fuente y diseño) son propiedad
          de Mercado Energy o de sus respectivos titulares. Queda prohibida su reproducción total o parcial sin
          autorización escrita.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Limitación de responsabilidad</h2>
        <p className="text-gray-600">
          Mercado Energy no será responsable por daños indirectos, lucro cesante ni perjuicios derivados del uso
          de la información publicada en este sitio. La responsabilidad máxima frente al cliente no excederá el
          monto pagado por los servicios contratados.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Ley aplicable y jurisdicción</h2>
        <p className="text-gray-600">
          Los presentes términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá
          a la jurisdicción de los tribunales ordinarios de justicia de la ciudad de Santiago.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Modificaciones</h2>
        <p className="text-gray-600">
          Mercado Energy se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán
          publicados en este sitio con indicación de la fecha de actualización.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">10. Contacto</h2>
        <p className="text-gray-600">
          Para consultas relacionadas con estos términos, puede contactarnos en{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">
            contacto@mercadoenergy.cl
          </a>{' '}
          o en Miguel León Prado 134, Santiago.
        </p>
      </section>
    </LegalLayout>
  );
}
