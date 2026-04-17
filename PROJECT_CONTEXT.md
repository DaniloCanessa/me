# Mercado Energy — Contexto del Proyecto

> Última actualización: Abril 2026  
> Repositorio: https://github.com/DaniloCanessa/me  
> Producción: https://me-fawn-eight.vercel.app

---

## Objetivo del proyecto

Plataforma web de simulación solar fotovoltaica para Chile. Permite a personas naturales y empresas estimar el ahorro, el kit recomendado y el retorno de inversión de un sistema solar, en base a sus boletas reales y región geográfica.

El flujo termina con una solicitud de contacto que deriva el lead a un especialista para visita técnica.

---

## Estado actual

**Fase 3 en progreso.**

El wizard de 7 pasos está completamente funcional. Se agregó lectura OCR de boletas (integrada al flujo), captura de leads por email, limitación de kit por empalme físico, e interpolación estacional de meses faltantes.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19.2.4 + Tailwind CSS v4 |
| Lenguaje | TypeScript (strict) |
| Hosting | Vercel (deploy automático desde GitHub) |
| Email | Resend (`app/api/leads/route.ts`) |
| OCR | Claude Haiku 4.5 (`app/api/parse-bill/route.ts`) |
| BD | Sin backend — todo client-side (Supabase pendiente) |

**Nota importante:** Tailwind v4 usa `@import "tailwindcss"` en lugar de directivas `@tailwind`. No mezclar con la sintaxis de v3.

---

## Arquitectura

```
mercado-energy/
├── app/
│   ├── layout.tsx                  # Metadata global, font Geist, lang="es"
│   ├── page.tsx                    # Landing page con hero y CTA a /simulator
│   ├── simulator/
│   │   └── page.tsx                # Contenedor del wizard (WizardState, navegación)
│   ├── lab/
│   │   └── bill-parser/page.tsx    # Laboratorio experimental de OCR (ruta /lab/bill-parser)
│   └── api/
│       ├── leads/route.ts          # POST: recibe lead, envía email via Resend
│       └── parse-bill/route.ts     # POST: recibe imagen/PDF, devuelve JSON via Claude Haiku
│
├── components/
│   ├── lab/
│   │   └── BillParser.tsx          # UI standalone del lab OCR
│   └── simulator/
│       ├── StepCustomerType.tsx    # Paso 1: persona natural / empresa
│       ├── StepContact.tsx         # Paso 2: datos de contacto (región obligatoria)
│       ├── StepSupply.tsx          # Paso 3: tipo propiedad, amperaje del empalme, solar existente
│       ├── StepBills.tsx           # Paso 4: ingreso de boletas + OCR + distribuidora/tarifa manual
│       ├── BillOCRUpload.tsx       # Sub-componente: upload, carga, revisión y confirmación de boleta
│       ├── StepBillReview.tsx      # Paso 5: revisión visual (gráfico 12 meses, interpolados en gris)
│       ├── StepFutureConsumption.tsx # Paso 6: AA, termo, auto eléctrico, baterías
│       └── StepResults.tsx         # Paso 7: resultados con escenarios, recomendaciones, CTA
│   └── ui/
│       └── ProgressBar.tsx         # Barra de progreso de 7 pasos
│
└── lib/
    ├── types.ts                    # Todas las interfaces TypeScript
    ├── constants.ts                # Parámetros configurables (kits, tarifas, defaults)
    ├── regions.ts                  # 16 regiones de Chile con producción mensual kWh/kWp
    ├── calculations.ts             # Motor de simulación (runSimulation, balances, kit capping)
    ├── consumption.ts              # Cálculos de consumo futuro (AA, termo, EV, batteryCount)
    └── format.ts                   # Formateo de valores (CLP, kWh, %, payback)
```

---

## Wizard — 7 pasos

### Paso 1 — Tipo de cliente (`StepCustomerType`)
- Selección: **Persona natural** (casa/departamento) o **Empresa** (oficina/colegio/otro)
- Avance automático al seleccionar

### Paso 2 — Contacto (`StepContact`)
- **Persona natural:** nombre, email, teléfono, dirección, ciudad, comuna, región
- **Empresa:** razón social, contacto, email, teléfono, dirección, ciudad, comuna, región
- Región **obligatoria** — determina la producción solar en la simulación
- Todos los campos marcados como `required` (name, email, phone, region)

### Paso 3 — Suministro (`StepSupply`)
- Tipo de propiedad (filtrado por categoría de cliente)
- **Amperaje del empalme** (obligatorio) — botones 10 / 15 / 20 / 25 / 32 / 40 / 50 / 63 A
  - Limita el tamaño máximo de la planta solar (`empalmeMaxKW = amperajeA × 220 / 1000`)
  - SVG ilustrativo de referencia para ubicar el número en el tablero eléctrico
- Toggle: ¿Ya tiene paneles solares? (+ campo kWp si aplica)
- **Distribuidora y tarifa ya NO se piden aquí** — se extraen de la boleta en el paso 4

### Paso 4 — Boletas (`StepBills`)
- Tabla con los últimos 12 meses generados dinámicamente
- Por mes: consumo en **kWh** (requerido) + monto variable CLP (opcional)
- **OCR integrado:** botón "Subir boleta para autocompletar" usando `BillOCRUpload`
  - Soporta JPG, PNG, PDF
  - Claude Haiku extrae datos; el usuario revisa y confirma
  - Al confirmar, pre-rellena la tabla y propaga distribuidora/tarifa al wizard
  - Mock mode cuando no hay `ANTHROPIC_API_KEY`
- **Ingreso manual:** si no se usó OCR, aparecen campos opcionales de distribuidora y tarifa al ingresar el primer mes
- **Interpolación estacional:** meses sin dato se estiman promediando ±2 vecinos del calendario (cuando hay ≥2 meses reales). El promedio mensual incluye estos meses estimados → captura estacionalidad
- Resumen en vivo: meses ingresados y promedio mientras el usuario escribe
- Requiere al menos 1 mes para continuar

### Paso 5 — Revisión de boletas (`StepBillReview`)
- Estadísticas: promedio, máximo, mínimo, completitud (X/12)
- **Gráfico de barras CSS con los 12 meses:** meses reales en verde, meses interpolados en gris con leyenda
- Tabla detallada: mes, kWh, monto CLP, $/kWh calculado
- Avisos contextuales: precio promedio calculado, meses faltantes

### Paso 6 — Consumos futuros (`StepFutureConsumption`)
- **Aire acondicionado:** steppers por tamaño (9.000 / 12.000 / 18.000 BTU)
- **Termo eléctrico:** steppers de ocupantes → calcula capacidad y kWh/mes
- **Auto eléctrico:** cantidad de autos → estima +33% de consumo por auto
- **Baterías de respaldo:** stepper 0–3 unidades
- Resumen en vivo: consumo actual vs. proyectado

### Paso 7 — Resultados (`StepResults`)
- **Dos escenarios** cuando hay equipos adicionales (tabs): consumo actual vs. con nuevos equipos
- KPIs, kit recomendado (limitado por empalme), desglose financiero, tabla de balance mensual
- `includeBattery` derivado de `futureConsumption.batteryCount > 0`
- **Recomendación de tarifa:**
  - `unknown` → pedir que confirme tarifa en boleta
  - `BT1` con consumo proyectado alto → sugerir segundo empalme BT1
  - `BT4.x` / `AT` → recomendar batería para horas de punta
- **Banner de empalme:** si el kit fue limitado por el amperaje físico, se explica el motivo
- **Análisis EV:** recomendación día/noche/mixto calculada con el balance energético real
- Impacto ambiental: CO₂ evitado y equivalencia en árboles
- **CTA funcional:** "Quiero que me contacten" → POST a `/api/leads` → email via Resend al operador con copia al lead

---

## OCR de boletas — Estado actual

**Funcionando end-to-end.** El flujo es:

```
Usuario sube imagen/PDF
  → POST /api/parse-bill
    → Claude Haiku lee la boleta
    → Devuelve JSON: distribuidora, tarifa, amperaje, potencia, historial de períodos
  → BillOCRUpload muestra revisión editable
  → Usuario confirma
    → Se rellenan los meses en la tabla
    → distribuidora y tarifa se propagan al WizardState
```

**Reglas del prompt OCR:**
- Períodos que cruzan meses (ej: 17 jul → 18 ago) → se asigna al mes de **término** (agosto)
- Signos de energía inyectada → se conservan tal como aparecen en la boleta
- Montos en CLP sin puntos de miles (JSON válido)
- Incluye historial completo visible: tabla, gráficos de barras, columnas anteriores
- Confianza: `high` / `medium` / `low` (bajo → rechaza y pide otra boleta)

**Mock mode:** cuando `ANTHROPIC_API_KEY` no está configurada, el endpoint devuelve datos simulados con patrón estacional realista.

---

## Captura de leads

**Funcionando.** Al hacer clic en "Quiero que me contacten":
- `StepResults` hace POST a `/api/leads` con nombre, email, teléfono, región, kit recomendado y datos de simulación
- Resend envía email HTML al operador (`danilo.canessa@gmail.com`) con `replyTo` del lead
- `from: 'Mercado Energy <onboarding@resend.dev>'`
- Variables de entorno: `RESEND_API_KEY` y `LEAD_RECIPIENT_EMAIL` en `.env.local`

---

## Motor de simulación

### Modelo energético

```
Producción solar mensual = kit.sizekWp × región.monthlyProductionKWhPerKWp[mes]

Consumo diurno  = consumoTotal × 0.70  (parametrizable)
Consumo nocturno = consumoTotal × 0.30

Si producción ≥ consumo diurno:
  autoconsumo = consumo diurno
  excedente   = producción - consumo diurno
  batería carga = min(excedente, capacidad_diaria_batería)
  inyección   = excedente - carga_batería
  red nocturna = consumo nocturno - descarga_batería

Si producción < consumo diurno:
  autoconsumo = producción
  sin excedentes, sin inyección, sin carga de batería
  red = (consumo diurno - producción) + consumo nocturno
```

### Límite por empalme

```
empalmeMaxKW = amperajeA × 220 / 1000
```

El kit seleccionado no puede superar este límite. Si ningún kit cabe, se usa el menor disponible con advertencia.

### Precio del kWh

Prioridad:
1. Promedio calculado desde `variableAmountCLP / consumptionKWh` de las boletas ingresadas
2. Precio de referencia: **220 CLP/kWh** (actualizable en `lib/constants.ts`)

### Net billing (inyección)

Valor de inyección = **50%** del precio de compra (conservador, norma actual CNE).

### Cobertura

`coveragePercent = (autoconsumo + descarga_batería) / consumo_total × 100`

Se usa `batteryDischargeKWh` (no `batteryChargeKWh`) para evitar sobreestimar.

---

## Catálogo de kits residenciales

| ID | kWp | Paneles | Área | Sin batería | Con batería | Cap. batería |
|---|---|---|---|---|---|---|
| kit-2kwp | 2 | 4 | 10 m² | $2.400.000 | $4.400.000 | 5 kWh |
| kit-3kwp | 3 | 6 | 15 m² | $3.600.000 | $5.600.000 | 5 kWh |
| kit-5kwp | 5 | 10 | 25 m² | $6.000.000 | $9.000.000 | 10 kWh |
| kit-8kwp | 8 | 15 | 38 m² | $9.600.000 | $12.600.000 | 10 kWh |
| kit-10kwp | 10 | 18 | 45 m² | $12.000.000 | $16.000.000 | 15 kWh |

**Panel estándar:** 550 Wp, 2,5 m²  
**Empresas:** dimensionamiento continuo (no catálogo), objetivo 90% de cobertura, $1.000.000/kWp

---

## Regiones de Chile

16 regiones con producción solar mensual (kWh/kWp) calibrada para incluir eficiencia del sistema:

| Zona | Regiones | Producción anual (kWh/kWp) |
|---|---|---|
| Norte | Arica, Tarapacá, Antofagasta, Atacama, Coquimbo | 1.750 – 2.090 |
| Central | Valparaíso, RM, O'Higgins, Maule, Ñuble, Biobío | 1.343 – 1.576 |
| Sur | Araucanía, Los Ríos, Los Lagos | 1.050 – 1.210 |
| Austral | Aysén, Magallanes | 745 – 890 |

---

## Parámetros clave (todos en `lib/constants.ts`)

```typescript
CHILE_BT1.referenceKWhPriceCLP     = 220        // CLP/kWh referencial
CHILE_BT1.fixedChargeCLP           = 1_200      // cargo fijo mensual
SOLAR_DEFAULTS.injectionValueFactor = 0.50      // net billing 50%
SOLAR_DEFAULTS.dayConsumptionRatio  = 0.70      // 70% consumo diurno
SOLAR_DEFAULTS.nightConsumptionRatio = 0.30     // 30% consumo nocturno
SOLAR_DEFAULTS.systemLifeYears      = 25        // vida útil sistema
SOLAR_DEFAULTS.batteryDailyCycleEfficiency = 0.80
SOLAR_DEFAULTS.defaultBatteryCapacityKWh   = 5  // kWh si el kit no especifica
SOLAR_DEFAULTS.evConsumptionIncreasePerCar = 0.33 // +33% por auto eléctrico
SOLAR_DEFAULTS.minAlternativeCoveragePercent = 65 // mínimo para mostrar kit alternativo
SOLAR_DEFAULTS.businessCoverageTarget = 0.90    // cobertura objetivo empresas
BUSINESS_DEFAULTS.costPerKWpCLP = 1_000_000    // precio empresa por kWp
```

---

## Consumos futuros estimados

| Equipo | Estimación |
|---|---|
| AA 9.000 BTU | 70 kWh/mes/equipo |
| AA 12.000 BTU | 95 kWh/mes/equipo |
| AA 18.000 BTU | 140 kWh/mes/equipo |
| Termo 80 L (1-2 personas) | 88 kWh/mes |
| Termo 150 L (3-4 personas) | 165 kWh/mes |
| Termo 200 L (5+ personas) | 220 kWh/mes |
| Auto eléctrico | +33% del consumo actual por auto |

---

## Decisiones de diseño clave

### Tarifa `'unknown'`
Se guarda sin resolver en `SupplyData.tarifa`. Solo se resuelve a `'BT1'` dentro del motor de cálculo (`buildBaseInput` en `StepResults`). Esto permite mostrar avisos diferenciados en resultados.

### Distribuidora y tarifa — captura diferida al paso 4
Se eliminaron del paso 3 para simplificar el ingreso. Se capturan automáticamente si el usuario sube una boleta (OCR), o manualmente en el paso 4 si el ingreso es manual. Si vienen de OCR, se propagan al `WizardState` mediante `onUpdateSupply`.

### Amperaje del empalme — obligatorio en paso 3
El amperaje físico del tablero es el tope real de la planta. Se captura en el paso 3 con botones (no campo libre) y una imagen SVG de referencia. El valor de la boleta (potencia contratada) es solo informativo.

### Interpolación estacional
Cuando el usuario ingresa menos de 12 meses, los meses faltantes se estiman promediando los ±2 vecinos de calendario (circular). Esto captura la estacionalidad del consumo (Chile tiene inviernos fríos con mayor consumo en zona central/sur). El promedio mensual de la simulación incluye los meses interpolados. Requiere ≥2 meses reales.

### Baterías
`batteryCount` vive en `FutureConsumption` (paso 6), no en `SupplyData`. `includeBattery` en `SimulatorInput` se deriva de `batteryCount > 0` en el paso 7.

### EV: análisis de carga en resultados
El `EVCharger` en `WizardState` tiene valores provisorios. `StepResults` recalcula con `calcEVCharger()` usando el balance energético real.

### Cobertura usa `batteryDischargeKWh`
Evita sobreestimar la cobertura contabilizando solo la energía que la batería realmente entrega al hogar.

### Protección de entregables
`select-none` + `onCopy preventDefault` en `StepBillReview` y `StepResults`.

---

## Pendientes y próximos pasos

### Alta prioridad

- [ ] **Supabase — persistencia de simulaciones y leads**
  - Guardar cada simulación completada con su `WizardState` completo
  - Panel de administración para ver leads recibidos
  - Alternativa simple: tabla `leads` con JSON del resultado
  
- [ ] **Prueba de extremo a extremo en producción**
  - Recorrer el wizard completo con una boleta real
  - Verificar que OCR → interpolación → resultados funciona en Vercel (con `ANTHROPIC_API_KEY` configurada)

### Media prioridad

- [ ] **Precio de kWh dinámico por distribuidora/tarifa**
  - Hoy usa $220 fijo cuando no hay monto en la boleta
  - Tabla de precios referenciales por distribuidora y tarifa (actualizable)

- [ ] **Envío de resultados por email al lead**
  - Al capturar el lead, enviar también al cliente un resumen con el kit recomendado y KPIs

- [ ] **Exportar PDF**
  - Informe descargable del resultado de la simulación para compartir con instaladores

- [ ] **Mejora de la landing page**
  - Testimonios, casos de uso, beneficios clave antes del CTA al simulador

### Baja prioridad / futuro

- [ ] **Múltiples tarifas en resultados** — comparar qué tarifa conviene más según perfil de demanda
- [ ] **Modelo horario para BT4.x/AT** — integrar precios por bloque horario con batería
- [ ] **Actualización de precios de kits** — panel para actualizar sin tocar código
- [ ] **Ajuste de consumo AA por zona climática** — norte vs. sur tienen perfiles distintos

---

## Flujo de datos resumido

```
StepCustomerType      → customerCategory
StepContact           → contact { regionId, email, ... }
StepSupply            → supply { amperajeA, propertyType, hasExistingSolar }
StepBills             → consumptionProfile { bills[], averageMonthlyKWh, ... }
                         (bills incluye meses reales + interpolados)
                      → supply.distribuidora + supply.tarifa (vía onUpdateSupply)
StepBillReview        → (solo visualización)
StepFutureConsumption → futureConsumption { airConditioners, waterHeater, evCharger, batteryCount }
StepResults           → runSimulation(baseInput) + runSimulation(futureInput)
                      → calcEVCharger() con balance real
                      → includeBattery = batteryCount > 0
                      → POST /api/leads si el usuario pide contacto
```

---

## Comandos útiles

```bash
# Desarrollo local
npm run dev          # http://localhost:3000

# Verificar tipos
npx tsc --noEmit

# Deploy
git push origin main  # Vercel despliega automáticamente

# Variables de entorno necesarias (.env.local)
RESEND_API_KEY=...
LEAD_RECIPIENT_EMAIL=danilo.canessa@gmail.com
ANTHROPIC_API_KEY=...   # Si no está, OCR funciona en mock mode
```
