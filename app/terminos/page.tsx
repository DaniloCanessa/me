import LegalLayout from '@/components/landing/LegalLayout';

export const metadata = { title: 'Términos y Condiciones — Mercado Energy' };

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y Condiciones" lastUpdated="1 de enero de 2026">

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">1. Identificación del prestador</h2>
        <p className="text-gray-600">
          El presente sitio web, simulador solar y demás servicios digitales son operados por{' '}
          <strong>Biznexus Group SpA</strong>, razón social del servicio comercial <strong>Mercado Energy</strong>,
          RUT 77.958.683-9, con domicilio en Miguel León Prado 134, Santiago de Chile.
          Correo de contacto:{' '}
          <a href="mailto:contacto@mercadoenergy.cl" className="text-[#389fe0] hover:underline">contacto@mercadoenergy.cl</a>.
        </p>
        <p className="text-gray-600 mt-2">
          Estos términos se rigen por la <strong>Ley N° 19.496</strong> sobre Protección de los Derechos de los Consumidores,
          la <strong>Ley N° 19.799</strong> sobre Documentos Electrónicos y Firma Electrónica, y la{' '}
          <strong>Ley N° 21.719</strong> sobre Protección de Datos Personales, todas de la República de Chile.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">2. Objeto y alcance</h2>
        <p className="text-gray-600">
          Mercado Energy ofrece servicios de diseño, suministro e instalación de sistemas fotovoltaicos
          para uso residencial, comercial e industrial en Chile. El acceso y uso de este sitio web implica
          la aceptación de los presentes términos. Si no está de acuerdo, le solicitamos no utilizar nuestros
          servicios digitales.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">3. Carácter del simulador solar</h2>
        <p className="text-gray-600">
          El simulador solar disponible en este sitio entrega estimaciones de carácter orientativo basadas en
          datos históricos de radiación, tarifas eléctricas de referencia y el perfil de consumo ingresado
          por el usuario. <strong>Los resultados no constituyen una oferta contractual</strong> ni garantizan
          ahorros específicos. Los valores reales dependen de las condiciones propias de cada instalación,
          evaluadas en visita técnica. Mercado Energy no se hace responsable de decisiones tomadas
          exclusivamente en base a estas estimaciones.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Proceso de contratación</h2>
        <p className="text-gray-600 mb-2">
          La contratación de servicios sigue el siguiente proceso:
        </p>
        <ol className="list-decimal pl-5 text-gray-600 space-y-2">
          <li><strong>Solicitud:</strong> el cliente completa el simulador o formulario de contacto, lo que genera una solicitud de cotización sin valor contractual.</li>
          <li><strong>Visita técnica:</strong> un especialista realiza una visita gratuita al inmueble para evaluar condiciones reales de instalación.</li>
          <li><strong>Propuesta formal:</strong> Mercado Energy emite un presupuesto detallado por escrito, con validez de 30 días calendario.</li>
          <li><strong>Contrato:</strong> la relación contractual se perfecciona con la firma del contrato y el pago del abono inicial acordado.</li>
        </ol>
        <p className="text-gray-600 mt-2">
          Conforme al artículo 12 de la Ley N° 19.496, los contratos celebrados a distancia quedan perfeccionados
          en el momento en que el proveedor envía la confirmación escrita de la aceptación al consumidor.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Precios e impuestos</h2>
        <p className="text-gray-600">
          Todos los precios publicados o cotizados incluyen IVA (19%) salvo indicación expresa en contrario.
          Los precios de equipos están sujetos a variaciones del tipo de cambio y disponibilidad de stock.
          El precio definitivo es el establecido en el contrato firmado por ambas partes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Formas de pago</h2>
        <p className="text-gray-600">
          Aceptamos transferencia bancaria, Webpay Plus (tarjetas VISA y Mastercard) y otros medios
          indicados en la propuesta formal. El pago del saldo se realiza contra entrega y puesta en marcha
          del sistema, salvo pacto en contrario. Mercado Energy emitirá la documentación tributaria
          correspondiente según la normativa del SII.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Garantías legales y comerciales</h2>
        <p className="text-gray-600 mb-2">
          Sin perjuicio de los derechos irrenunciables del consumidor establecidos en el artículo 21 de la
          Ley N° 19.496 (garantía legal de 3 meses para bienes o servicios con defectos ocultos), ofrecemos:
        </p>
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          <li><strong>Mano de obra e instalación:</strong> 12 meses desde la puesta en marcha</li>
          <li><strong>Paneles solares:</strong> garantía de producto del fabricante (típicamente 10 años) y de rendimiento (típicamente 25 años)</li>
          <li><strong>Inversores:</strong> garantía del fabricante (típicamente 5–10 años según modelo)</li>
          <li><strong>Baterías:</strong> garantía del fabricante según modelo y ciclos de vida</li>
          <li><strong>Estructura metálica:</strong> 5 años contra defectos de fabricación</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Propiedad intelectual</h2>
        <p className="text-gray-600">
          Todos los contenidos de este sitio (textos, imágenes, logotipos, código fuente, diseño y simulador)
          son propiedad de Mercado Energy o de sus respectivos titulares y están protegidos por la
          Ley N° 17.336 sobre Propiedad Intelectual. Queda prohibida su reproducción, distribución o uso
          comercial sin autorización escrita previa.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Limitación de responsabilidad</h2>
        <p className="text-gray-600">
          Mercado Energy no será responsable por daños indirectos, lucro cesante ni perjuicios derivados
          del uso de la información del simulador. La responsabilidad máxima frente al cliente no excederá
          el monto efectivamente pagado por los servicios contratados, sin perjuicio de los derechos
          irrenunciables establecidos en la Ley N° 19.496.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">10. Tratamiento de datos personales</h2>
        <p className="text-gray-600">
          El uso de nuestros servicios implica el tratamiento de datos personales conforme a nuestra{' '}
          <a href="/privacidad" className="text-[#389fe0] hover:underline">Política de Privacidad</a>,
          la que forma parte integrante de estos términos. El tratamiento se realiza en conformidad con
          la Ley N° 21.719 sobre Protección de Datos Personales.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">11. Ley aplicable y jurisdicción</h2>
        <p className="text-gray-600">
          Los presentes términos se rigen por las leyes de la República de Chile. Sin perjuicio del derecho
          del consumidor a recurrir a SERNAC o a los Juzgados de Policía Local, cualquier controversia
          entre partes no sometida a dichas instancias se resolverá ante los Tribunales Ordinarios de
          Justicia de Santiago.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">12. Modificaciones</h2>
        <p className="text-gray-600">
          Mercado Energy puede modificar estos términos en cualquier momento. Los cambios serán publicados
          en este sitio con la nueva fecha de actualización y serán aplicables a las relaciones contractuales
          futuras. Las relaciones contractuales existentes se rigen por los términos vigentes al momento de
          su celebración.
        </p>
      </section>

    </LegalLayout>
  );
}
