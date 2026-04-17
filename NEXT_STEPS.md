# Mercado Energy — Próximos pasos

> Última actualización: Abril 2026

---

## Resumen ejecutivo

El wizard de 7 pasos está completo y funcional. OCR de boletas, captura de leads y simulación end-to-end operan correctamente. La siguiente etapa es consolidar el producto: persistir datos, mejorar la conversión y preparar el canal de ventas.

---

## Tareas pendientes por prioridad

### 🔴 Alta prioridad

#### 1. Prueba de extremo a extremo en producción
**Qué:** Recorrer el wizard completo en Vercel con una boleta real, verificando OCR, interpolación estacional, resultados y envío de lead por email.  
**Por qué:** Hay cambios recientes que aún no se han probado en producción (interpolación, baterías, distribuidora desde OCR). Un bug en producción frena la captación de leads reales.  
**Cómo:**
- Confirmar que `ANTHROPIC_API_KEY` y `RESEND_API_KEY` están configuradas en Vercel
- Subir una boleta real, verificar que el JSON extraído es correcto
- Completar el wizard y confirmar que llega el email al operador

---

#### 2. Persistencia con Supabase
**Qué:** Guardar cada simulación completada y cada lead en una base de datos.  
**Por qué:** Hoy los leads llegan solo por email. Si el email falla, o si el operador quiere filtrar/buscar leads, no hay respaldo.  
**Cómo:**
1. Crear proyecto en Supabase
2. Tabla `leads`: `id`, `created_at`, `name`, `email`, `phone`, `region`, `kit_kwp`, `payback_years`, `wizard_state` (JSON)
3. En `/api/leads/route.ts`: insertar en Supabase además de enviar el email
4. Panel simple en `/admin` (protegido con contraseña) para listar leads

---

### 🟡 Media prioridad

#### 3. Envío de resultados por email al lead
**Qué:** Cuando el usuario solicita contacto, recibe también un email con el resumen de su simulación.  
**Por qué:** Mejora la experiencia y deja al lead con un documento de referencia mientras espera la llamada.  
**Cómo:**
- En `/api/leads/route.ts`, enviar segundo email al `lead.email` (ya existe como `replyTo`)
- Incluir: kit recomendado, kWp, payback, ahorro anual estimado, región

---

#### 4. Precio de kWh dinámico por distribuidora
**Qué:** Tabla de precios referenciales por distribuidora y tarifa en lugar del $220 fijo.  
**Por qué:** El precio por kWh varía entre $180 (CGE rural) y $260 (Enel urbano). Usar un valor fijo subestima o sobreestima el ahorro según la zona.  
**Cómo:**
- Agregar tabla en `lib/constants.ts` o archivo separado `lib/tariffs.ts`
- En `buildBaseInput` (StepResults): buscar precio por `distribuidora + tarifa` antes de usar el referencial
- Fuente: tarifas publicadas por CNE cada 6 meses

---

#### 5. Exportar PDF del resultado
**Qué:** Botón "Descargar informe" que genera un PDF con el kit, KPIs y balance mensual.  
**Por qué:** El instalador necesita un documento para mostrar al cliente en terreno. Hoy el usuario solo puede hacer una captura de pantalla.  
**Cómo:**
- Librería `@react-pdf/renderer` o `jsPDF` + `html2canvas`
- Contenido mínimo: nombre, región, kit recomendado, payback, tabla mensual, logo Mercado Energy

---

#### 6. Mejora de la landing page
**Qué:** Página de inicio más convincente antes del CTA al simulador.  
**Por qué:** Hoy la landing es básica. Un visitante sin contexto no entiende bien qué va a encontrar ni por qué confiar.  
**Cómo:**
- Sección "¿Cómo funciona?" (3 pasos: sube tu boleta → simulamos → te contactamos)
- Sección de beneficios con números reales (ejemplo: "Ahorra hasta $120.000/mes")
- Testimonios o casos de uso (aunque sean ficticios al inicio)
- FAQ con las dudas más comunes sobre solar en Chile

---

### 🟢 Baja prioridad / futuro

#### 7. Precio de kWh con UF
**Qué:** Ajustar la proyección de ahorro a 25 años con inflación UF.  
**Por qué:** El payback calculado asume precio de kWh constante. En Chile el precio sube ~3-5% anual, lo que acorta el payback real.  
**Cómo:** Parámetro `annualPriceIncreasePercent` en `lib/constants.ts`, aplicado en el cálculo de ROI a 25 años.

---

#### 8. Comparador de tarifas en resultados
**Qué:** Mostrar qué tarifa le conviene más al cliente según su perfil de demanda.  
**Por qué:** Clientes con BT2/BT3 mal dimensionados pagan de más. Una recomendación de cambio de tarifa puede ser tan valiosa como la solar.  
**Cómo:** Lógica en `StepResults` que compara costo mensual bajo cada tarifa disponible.

---

#### 9. Modelo horario para BT4.x/AT con batería
**Qué:** Incorporar precios diferenciados por bloque horario (punta/día/noche) en el cálculo de ahorro con batería.  
**Por qué:** Para clientes en tarifa BT4.x, el ahorro real de la batería depende de cuánto consumen en horas de punta. El modelo actual no lo captura.  
**Cómo:** Nuevo campo en `SimulatorInput` para precios por bloque; extender `calcMonthlyBalance` para aplicarlos.

---

#### 10. Panel de actualización de precios de kits
**Qué:** Interfaz simple (o archivo de configuración) para que el operador actualice precios sin tocar código.  
**Por qué:** Los precios de los kits cambian con el dólar y los precios de los paneles. Hoy requiere un deploy para actualizarlos.  
**Cómo:** Tabla en Supabase `kit_prices` con los valores actuales; `lib/constants.ts` los lee en runtime vía API route.

---

## Orden de implementación sugerido

```
Semana 1
  ├── [1] Prueba e2e en producción — sin código nuevo, solo validación
  └── [2] Supabase — tabla leads + inserción en /api/leads

Semana 2
  ├── [3] Email al lead — pequeño cambio en /api/leads
  └── [4] Precio kWh dinámico — impacta directamente la calidad de la simulación

Semana 3
  ├── [5] Exportar PDF — mejora la conversión del lead
  └── [6] Landing page — mejora la entrada al funnel

Futuro (sin fecha)
  ├── [7] Precio con UF
  ├── [8] Comparador de tarifas
  ├── [9] Modelo horario BT4.x
  └── [10] Panel de precios de kits
```

---

## Criterio de "listo para escalar"

Antes de hacer marketing activo, deben estar completadas las tareas 1–4:
- Los leads quedan guardados aunque falle el email
- Los precios de kWh son realistas por distribuidora
- El lead recibe su simulación por email

Con eso, el funnel es confiable de extremo a extremo.
