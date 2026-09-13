# Handoff: sistema de dos temas + separación entrenador / alumno

App móvil para entrenadores particulares y sus alumnos (gimnasio, running, crossfit). Este paquete cubre
tres cambios de diseño sobre la app existente:

1. **Reparto semántico del color** — de cuatro acentos decorativos a tres roles.
2. **Dos temas** (oscuro y claro) sobre un único set de tokens, siguiendo `prefers-color-scheme`.
3. **Diferenciación entrenador / alumno** por densidad y superficie, no por identidad visual.

## Sobre los archivos de este bundle

`Opciones App Entrenador.dc.html` es una **referencia de diseño hecha en HTML**: un prototipo que muestra
la apariencia y el comportamiento buscados, **no código de producción para copiar**. La tarea es
**recrear estos diseños en el entorno del codebase real** (React Native / Expo / Flutter / SwiftUI —
lo que ya use el proyecto), con sus patrones y librerías establecidos. Si el proyecto todavía no tiene
un entorno definido, elegir el más apropiado e implementar ahí.

El archivo se abre en cualquier navegador. Está organizado en cuatro turnos apilados, el más nuevo arriba:

| Turno | Contenido |
|---|---|
| 4 | **Lo que hay que implementar**: alumno y entrenador sobre tokens, con switch de tema en vivo |
| 3 | Entrenador: lista completa de alumnos y constructor de rutinas (tema claro) |
| 2 | Comparación de temas y roles + pantalla de running al sol |
| 1 | Tres jerarquías exploradas para el Home del alumno (contexto histórico) |

## Fidelidad

**Alta (hifi).** Colores, tipografía, tamaños y espaciados son finales y están tomados del prototipo.
Recrear pixel-perfect usando los componentes existentes del codebase.

---

## Design tokens

Nueve roles, dos valores cada uno. **Ningún componente debe conocer un color: solo su rol.**

| Rol | Oscuro | Claro | Uso |
|---|---|---|---|
| `bg` | `#090f12` | `#F3F1EC` | Fondo de pantalla |
| `surface` | `#141d21` | `#FBFAF8` | Tarjetas, barras, campos |
| `surface2` | `#10181c` | `#F0EEE9` | Chips de valor dentro de tarjetas |
| `line` | `rgba(255,255,255,.06)` | `rgba(9,15,18,.09)` | Separadores de fila |
| `line2` | `rgba(255,255,255,.10)` | `rgba(9,15,18,.14)` | Bordes de contenedor |
| `text` | `#E8EDEF` | `#0b1114` | Texto primario |
| `mute` | `rgba(232,237,239,.45)` | `rgba(9,15,18,.45)` | Texto secundario |
| `faint` | `rgba(232,237,239,.30)` | `rgba(9,15,18,.32)` | Eyebrows, chevrons, iconos apagados |
| `action` | `#00D1FF` | `#0b1114` | Botón primario, tab activo, hoy |
| `actionFg` | `#04161c` | `#F3F1EC` | Texto sobre `action` |
| `done` | `#4ade80` | `#2C8C4E` | Series/sesiones completadas, PR |
| `attention` | `#FEB127` | `#B8791A` | Requiere acción del entrenador |
| `attentionBg` | `rgba(254,177,39,.09)` | `#FDF6E8` | Fondo de fila de alerta |
| `attentionLine` | `rgba(254,177,39,.30)` | `rgba(184,121,26,.35)` | Borde de alerta |
| `attentionText` | `#FEB127` | `#8A5A11` | Texto de motivo de alerta |
| `barTrack` | `rgba(255,255,255,.09)` | `rgba(9,15,18,.09)` | Riel de barra de adherencia |
| `heroLine` | `rgba(0,209,255,.22)` | `rgba(9,15,18,.16)` | Borde de la tarjeta de sesión |
| `heroBg` | `linear-gradient(180deg,#0f1c21,#0b1216)` | `#FBFAF8` | Fondo de la tarjeta de sesión |

### Reglas de color (no negociables)

- **`action` no es cyan en claro.** `#00D1FF` sobre `#F3F1EC` no alcanza contraste de texto ni de
  botón; en claro la acción es el carbón `#0b1114`. El cyan solo existe en oscuro.
- **Tres roles, no cuatro colores.** `action` = lo que se puede tocar. `done` = lo que ya pasó.
  `attention` = lo que frena al entrenador. El violeta del diseño anterior se elimina.
- **`attention` es exclusivo del lado entrenador** y de la fila "nota de tu entrenador" en el alumno.
  Nunca decora.

### Tipografía

**Space Grotesk** (Google Fonts, pesos 400/500/600/700) para todo. Se conserva del diseño actual:
dígitos anchos, legible a distancia de banco de gimnasio.

| Rol | Tamaño / peso / interlínea | Tracking |
|---|---|---|
| Hero de sesión | 38 / 700 / 1.05 | `-0.03em` |
| Título de pantalla | 25 / 700 / 1.1 | `-0.025em` |
| Saludo | 20 / 600 / 1.2 | `-0.01em` |
| Número de métrica | 21–22 / 700 / 1 | `0` |
| Nombre de fila | 14–14.5 / 500–600 / 1.2 | `0` |
| Cuerpo | 13–13.5 / 400 / 1.45 | `0` |
| Meta / subtítulo de fila | 11.5 / 400 / 1.2 | `0` |
| Eyebrow y caption | 9.5–10 / 600 / 1, monoespaciada | `0.14–0.16em`, MAYÚSCULAS |

Las eyebrows y captions usan pila monoespaciada (`ui-monospace, Menlo, monospace`), no Space Grotesk.

### Escala de espaciado y forma

- Margen lateral de pantalla: **20 px** (entrenador) / **22 px** (alumno).
- Espaciado vertical entre secciones: **20 / 22 / 26 px**.
- Radios: **44** marco de teléfono · **22** tarjeta hero · **12** contenedor · **11** tarjeta de bloque ·
  **14** CTA · **9** botón de fila · **8** chip · **7** icono de tab.
- Altura de controles: **56** CTA principal · **54** CTA en hero · **46** input/pill · **44** mínimo táctil ·
  **34** botón de fila · **32/30** chip. Nada por debajo de 44 px es un objetivo táctil primario.
- Barra de tabs: **80 px** de alto, `padding-top: 12px`, borde superior `line`.

---

## Pantallas

### 1. Alumno — “Hoy” (turno 4a)

**Propósito:** el alumno abre la app ~4 minutos y hace **una** cosa: seguir con la sesión.

**Layout:** columna única, `flex-direction: column`.

1. **Status bar** — 52 px, texto 12/500 en `mute`.
2. **Header** — `padding: 14px 22px 0`, fila `space-between`.
   - Izquierda: eyebrow `MARTES 25 AGO`; debajo, saludo `Hola, Martina`.
   - Derecha: avatar del entrenador, 38 px, círculo, `surface` + borde `heroLine`, inicial en `action`.
     Badge de no leídos: 9 px, `attention`, borde 2 px del color `bg`, arriba a la derecha.
3. **Tarjeta de sesión (hero)** — `margin: 20px 22px 0`, radio 22, fondo `heroBg`, borde `heroLine`,
   `padding: 22px`. Es el único elemento con peso visual en la pantalla.
   - Estado: punto 6 px + `EN CURSO · 14 MIN` en `done`.
   - Título: `Día A` / `Empujón` en dos líneas, 38/700.
   - Meta en fila con `gap: 18px`: `8 ejercicios` · `3 bloques` · `~55 min`.
   - **Barra de progreso segmentada**: 8 segmentos `flex:1`, alto 3, radio 2, `gap: 4px`.
     Completados en `done`, el actual en `action`, pendientes en `barTrack`.
   - Línea siguiente: `Siguiente: Press de banca · serie 3 de 4`, 11.5/400 en `mute`.
   - CTA: 54 px, radio 14, fondo `action`, texto `actionFg` 15/600, flecha `→` a 17 px.
4. **Semana** — eyebrow `SEMANA`; fila de 7 columnas de 40 px, `space-between`.
   Círculo 30 px + caption debajo (`gap: 8px`).
   - Hoy: relleno `action`, letra `actionFg`, caption `HOY` en `action` 600.
   - Completado: fondo `done` al 14 %, borde `done` al 40 %, letra `done`.
   - Planificado: borde `line2`, letra `mute`.
   - Vacío: borde `line`, letra `faint`.
   - Resumen: `2 de 5 sesiones · 73 min`, números en 15/600 `text`, resto 12.5/400 `mute`.
5. **Lista silenciosa** — filas de 15 px de padding vertical separadas por `line`.
   Punto de estado 6 px (`attention` para nota del entrenador, `done` para PR) + título 13.5/500 +
   subtítulo 11.5/400 `mute` con elipsis + chevron `›` en `faint`.
6. **Tab bar** — **3 tabs**: `HOY` · `PROGRESO` · `PERFIL`. Icono 22 px (radio 7; círculo en Perfil),
   activo relleno `action` con label `action`; inactivo borde 1.5 px `faint`.

**Cambios respecto al diseño actual:** desaparece el banner de “entrenamiento activo” duplicado
(la tarjeta hero ya lo dice), desaparece el FAB, y los 4 tabs bajan a 3.

### 2. Entrenador — “Tu día” (turno 4b)

**Propósito:** el entrenador abre la app ~40 minutos y compara 18 personas. Densidad de consola.

1. **Status bar** — igual.
2. **Header** — `padding: 12px 20px 16px`, borde inferior `line2`.
   Eyebrow `MARTES 25 AGOSTO`; título `18 alumnos` 25/700; avatar propio 36 px relleno `action`.
3. **Tira de métricas** — un contenedor, radio 12, borde `line2`, fondo `surface`, tres celdas
   `flex:1` divididas por borde derecho `line2`, `padding: 13px 14px` cada una.
   Número 21/700 `text` con sufijo 11/500 `mute`; caption monoespaciada 9.5 en `mute` a 7 px.
   Valores: `11/18` HOY · `86%` ADHEREN. · `$412k` MES.
4. **Sección “REQUIEREN ACCIÓN”** — encabezado de sección: label monoespaciado + línea `line2`
   que ocupa el resto + contador en `attention`.
   Filas de alerta: radio 12, fondo `attentionBg`, borde `attentionLine`, `padding: 13px 14px`,
   `gap: 9px` entre filas. Nombre 14/600 `text`; motivo 11.5/400 `attentionText`;
   botón 34 px relleno `action` con verbo único (`Escribir`, `Cobrar`, `Asignar`).
5. **Sección “TODOS”** — encabezado igual, con `Adherencia ↓` a la derecha (indica el orden activo).
   Filas: nombre 14/500 + meta 11/400 `mute` · barra 74×5 radio 3 sobre `barTrack`
   (relleno `done` si ≥ 60 %, `attention` si < 60 %) · porcentaje 12/600 alineado a la derecha en 34 px.
6. **Tab bar** — **4 tabs**: `DÍA` · `ALUMNOS` · `PLANES` · `NEGOCIO`.

### 3. Entrenador — Alumnos (turno 3a)

Cartera completa como tabla, no como tarjetas. Buscador 42 px (`surface`, borde `line2`, radio 11),
chips de filtro por disciplina con conteo, y encabezado de columna con la ordenación activa en `text`
y el resto en `mute`. Las filas que requieren acción se tiñen a ancho completo con `attentionBg`
(sangrado negativo de 20 px para llegar a los bordes de pantalla).

### 4. Entrenador — Constructor de rutinas (turno 3b)

Header con `‹ Planes` y `Guardar`, título del plan y meta (`Asignado a 6 alumnos · editado hoy`).
Selector de días A/B/C como cuatro cajas de 44 px (la última, `+`, con borde punteado).
Cada bloque es un encabezado de sección (`BLOQUE A · PRINCIPAL` + descanso a la derecha) seguido de
una tarjeta `surface` con filas de ejercicio: manija `⠿` en `faint` (`cursor: grab`), nombre 14/600,
y chips de valor editables (`4×8`, `80 kg`) de 28 px sobre `surface2` con borde `line2`.
Cierra con fila punteada `+ Añadir ejercicio o bloque` y un pie fijo con avatares apilados
(`margin-left: -9px`, borde 2 px del color `surface`) y el CTA `Publicar semana`.

### 5. Alumno — Running al sol (turno 2c)

Caso que justifica el tema claro: pantalla de series a mediodía. Negro sobre blanco puro,
un solo número enorme (`4:02` a 108/700, tracking `-0.055em`), progreso por bloques sólidos,
tres métricas en una tira con borde superior de 2 px, y dos botones de 66 px al pie.
Cero cromo, cero gradientes: legibilidad directa bajo sol.

---

## Comportamiento e interacciones

### Tema

- **Por defecto: `auto`** → sigue `prefers-color-scheme` del sistema y **reacciona en vivo** al cambio
  (en el prototipo, `matchMedia('(prefers-color-scheme: dark)')` con listener de `change`;
  en RN, `Appearance.addChangeListener` / `useColorScheme`).
- El usuario puede forzar `claro` u `oscuro` desde Perfil. Persistir la preferencia; `auto` es el valor
  inicial, no un tercer tema.
- No hay transición animada de tema: cambio inmediato.

### Navegación y estado

| Pantalla | Estado necesario | Disparadores |
|---|---|---|
| Alumno Hoy | sesión activa (id, ejercicio actual, serie actual), semana (7 días con estado), notificaciones no leídas | continuar → modo entrenamiento; toque en día → detalle del día |
| Semana como riel (turno 1b) | `selectedDay` (0–6) | toque en chip de día → cambian título, meta, bloques y el CTA; el CTA solo es `action` si el día es hoy, si no queda como botón secundario (`transparent` + borde `line2`) |
| Entrenador Día | lista de alertas, roster ordenado, orden activo | botón de alerta → chat / cobro / asignación; toque en fila → perfil del alumno |
| Constructor | plan, día activo, bloques, ejercicios, asignados | arrastrar para reordenar; chip de valor → editor inline; `Publicar semana` → asigna a todos los alumnos del plan |

### Estados a definir (no cubiertos por el prototipo)

- Vacío: entrenador sin alumnos; alumno sin plan asignado.
- Carga: skeletons de fila (usar `surface` con pulso de opacidad, no spinners centrados).
- Error: fallo al publicar semana, fallo de cobro.
- Sin conexión durante una sesión (el registro de series debe ser local-first y sincronizar después).

---

## Assets

Ninguno. Los avatares son iniciales sobre color, los iconos de tab son placeholders geométricos
(cuadrado de radio 7 / círculo) — **sustituir por el set de iconos del codebase**, manteniendo
tamaño 22 px y los colores `action` / `faint`. Las flechas y chevrons son caracteres (`→ › ‹ ⠿ ⌕`);
reemplazar por iconos reales del set.

## Archivos

- `Opciones App Entrenador.dc.html` — prototipo completo, cuatro turnos. Abrir en navegador;
  el switch del turno 4 permite comparar ambos temas lado a lado.
