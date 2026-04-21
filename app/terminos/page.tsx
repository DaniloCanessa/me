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
        <h2 className="text-lg font-bold text-[#010101] mb-2">4. Condiciones de uso del simulador solar</h2>
        <p className="text-gray-600 mb-4">
          El simulador solar de Mercado Energy es una herramienta de orientación. El usuario debe conocer
          las siguientes limitaciones antes de interpretar sus resultados:
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Radiación solar y producción estimada</p>
            <p className="text-xs text-gray-600">
              El simulador utiliza valores promedio históricos de radiación solar (kWh/m²/día) por región,
              obtenidos de bases de datos de referencia. Estos promedios no reflejan variaciones año a año,
              condiciones climáticas atípicas, ni la irradiación específica del inmueble según su orientación,
              inclinación real del techo o sombreado por edificios, árboles u otras obstrucciones.
              La producción real puede ser hasta un ±20% diferente del estimado.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Precio de la energía eléctrica</p>
            <p className="text-xs text-gray-600">
              Los cálculos de ahorro se basan en tarifas eléctricas de referencia vigentes al momento de la
              simulación. El precio del kWh varía según la distribuidora, tarifa contratada, cargo de potencia,
              impuestos y ajustes regulatorios semestrales de la CNE. Mercado Energy no garantiza que la tarifa
              utilizada en la simulación corresponda exactamente a la que el usuario paga o pagará en el futuro.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Dimensionamiento del sistema</p>
            <p className="text-xs text-gray-600">
              El tamaño del kit (kWp) sugerido por el simulador se calcula en base al consumo promedio mensual
              ingresado y a factores de diseño estándar. El dimensionamiento definitivo requiere una ingeniería
              de detalle que considere la capacidad real del empalme eléctrico, la superficie disponible,
              la orientación e inclinación del techo y los requerimientos técnicos de la distribuidora local.
              El kit real instalado puede diferir en capacidad o tecnología del sugerido por el simulador.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Ahorros y período de retorno proyectados</p>
            <p className="text-xs text-gray-600">
              Los ahorros estimados asumen un perfil de consumo constante equivalente al promedio ingresado,
              sin considerar variaciones estacionales del consumo del usuario, cambios de hábitos, incorporación
              de nuevos equipos (vehículos eléctricos, climatización, etc.) ni alzas o bajas futuras de tarifas.
              El período de retorno (payback) es una proyección basada en los supuestos anteriores y no
              constituye una garantía de rentabilidad.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Lectura de boletas por inteligencia artificial</p>
            <p className="text-xs text-gray-600">
              El simulador permite cargar boletas eléctricas (PDF, imagen o Excel) para extraer automáticamente
              datos de consumo mediante un sistema de inteligencia artificial. Este proceso puede contener
              errores de lectura derivados de la calidad de la imagen, formatos no estándar o variaciones entre
              distribuidoras. El usuario es responsable de verificar que los datos extraídos sean correctos
              antes de continuar con la simulación. Los datos de boletas son procesados de forma confidencial
              y no se almacenan más allá del tiempo necesario para la sesión, conforme a la{' '}
              <a href="/privacidad" className="text-[#389fe0] hover:underline">Política de Privacidad</a>.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8fb] rounded-xl border border-[#b0cedd]/30">
            <p className="text-sm font-semibold text-[#010101] mb-1">Variables no consideradas por el simulador</p>
            <p className="text-xs text-gray-600">
              El simulador no evalúa: estado estructural del techo, permisos municipales o de la distribuidora,
              restricciones de zonas patrimoniales o condominios, disponibilidad de red para inyección
              (net metering), costos de adecuación del empalme ni financiamiento. Estos factores pueden
              afectar la viabilidad, costo final y plazos del proyecto.
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800">
            <strong>Aviso importante:</strong> Los resultados del simulador son estimativos y de carácter
            exclusivamente orientativo. No reemplazan una visita técnica ni una propuesta formal de ingeniería.
            Mercado Energy no asume responsabilidad por decisiones de inversión tomadas exclusivamente en base
            a los resultados del simulador, sin haber recibido una propuesta técnica definitiva.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">5. Proceso de contratación</h2>
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
        <h2 className="text-lg font-bold text-[#010101] mb-2">6. Precios e impuestos</h2>
        <p className="text-gray-600">
          Todos los precios publicados o cotizados incluyen IVA (19%) salvo indicación expresa en contrario.
          Los precios de equipos están sujetos a variaciones del tipo de cambio y disponibilidad de stock.
          El precio definitivo es el establecido en el contrato firmado por ambas partes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">7. Formas de pago</h2>
        <p className="text-gray-600">
          Aceptamos transferencia bancaria, Webpay Plus (tarjetas VISA y Mastercard) y otros medios
          indicados en la propuesta formal. El pago del saldo se realiza contra entrega y puesta en marcha
          del sistema, salvo pacto en contrario. Mercado Energy emitirá la documentación tributaria
          correspondiente según la normativa del SII.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">8. Garantías legales y comerciales</h2>
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
        <h2 className="text-lg font-bold text-[#010101] mb-2">9. Propiedad intelectual</h2>
        <p className="text-gray-600">
          Todos los contenidos de este sitio (textos, imágenes, logotipos, código fuente, diseño y simulador)
          son propiedad de Mercado Energy o de sus respectivos titulares y están protegidos por la
          Ley N° 17.336 sobre Propiedad Intelectual. Queda prohibida su reproducción, distribución o uso
          comercial sin autorización escrita previa.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">10. Limitación de responsabilidad</h2>
        <p className="text-gray-600">
          Mercado Energy no será responsable por daños indirectos, lucro cesante ni perjuicios derivados
          del uso de la información del simulador. La responsabilidad máxima frente al cliente no excederá
          el monto efectivamente pagado por los servicios contratados, sin perjuicio de los derechos
          irrenunciables establecidos en la Ley N° 19.496.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">11. Tratamiento de datos personales</h2>
        <p className="text-gray-600">
          El uso de nuestros servicios implica el tratamiento de datos personales conforme a nuestra{' '}
          <a href="/privacidad" className="text-[#389fe0] hover:underline">Política de Privacidad</a>,
          la que forma parte integrante de estos términos. El tratamiento se realiza en conformidad con
          la Ley N° 21.719 sobre Protección de Datos Personales.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">12. Ley aplicable y jurisdicción</h2>
        <p className="text-gray-600">
          Los presentes términos se rigen por las leyes de la República de Chile. Sin perjuicio del derecho
          del consumidor a recurrir a SERNAC o a los Juzgados de Policía Local, cualquier controversia
          entre partes no sometida a dichas instancias se resolverá ante los Tribunales Ordinarios de
          Justicia de Santiago.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#010101] mb-2">13. Modificaciones</h2>
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
