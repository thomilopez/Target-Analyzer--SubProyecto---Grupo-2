# CTU Target Analyzer — Documentación Técnica

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Flujo de la aplicación](#3-flujo-de-la-aplicación)
4. [index.html](#4-indexhtml)
5. [style.css](#5-stylecss)
6. [app.js](#6-appjs)
7. [Assets](#7-assets)
8. [Sistema de audio](#8-sistema-de-audio)
9. [Integración con backend](#9-integración-con-backend)
10. [Integración con robot de scraping](#10-integración-con-robot-de-scraping)
11. [Responsive y límites de resolución](#11-responsive-y-límites-de-resolución)
12. [Variables CSS — referencia rápida](#12-variables-css--referencia-rápida)

---

## 1. Descripción general

**CTU Target Analyzer** es la interfaz front-end de un sistema de análisis de objetivos con estética de terminal hacker. Permite al usuario ingresar una URL objetivo, iniciar un escaneo y visualizar los resultados en cuatro paneles de información.

El front-end está preparado para integrarse con:
- Un **backend** que procesa las solicitudes de escaneo.
- Un **robot de scraping** invocado por el backend para recopilar información.

---

## 2. Estructura de archivos

```
/
├── index.html                  # Estructura HTML de la app
├── style.css                   # Estilos, variables y animaciones
├── app.js                      # Lógica JavaScript completa
├── favicon.png                 # Ícono de la pestaña del navegador
├── Logo.png                    # Logo principal (barra de misión + popup)
├── panelicon01.png             # Ícono Panel 1 — Vista (crosshair)
├── panelicon02.png             # Ícono Panel 2 — Tecnología (CPU/chip)
├── panelicon03.png             # Ícono Panel 3 — Mapa de enlaces (nodos)
├── panelicon04.png             # Ícono Panel 4 — Métricas (velocímetro)
├── sonido_fondo.mp3            # Música de fondo (loop continuo)
├── nuevainterferencia_mp3.mp3  # Sonido de escaneo (una sola vez)
└── DOCUMENTACION.md            # Este archivo
```

---

## 3. Flujo de la aplicación

```
CARGA DE PÁGINA
     │
     ▼
[Pop-up de bienvenida]  ──3 s──▶  [Slide-up y desaparece]
                                          │
                                          ▼
                                  [Audio de fondo inicia]
                                  (sonido_fondo.mp3, loop)
                                          │
                                          ▼
                               [Página principal visible]
                               · 4 paneles en espera
                               · Íconos placeholder visibles
                                          │
                        Usuario ingresa URL + presiona ESCANEO
                                          │
                              ┌───────────┴────────────┐
                         URL inválida              URL válida
                              │                        │
                              ▼                        ▼
                       [Modal de error]      [Barra de carga]
                                           [Glitch en paneles]
                                           [Audio: fondo pausa,
                                            interferencia suena]
                                                       │
                                                    4.5 s
                                                       │
                                                       ▼
                                             [callBackend(url)]
                                                       │
                                           ┌───────────┴──────────┐
                                        Éxito                  Error red
                                           │                        │
                                           ▼                        ▼
                                  [renderResults(data)]    [Modal de error]
                                  [Íconos desaparecen]
                                           │
                                           ▼
                                  [Audio de fondo reanuda]
                                  [UI restaurada]
```

---

## 4. index.html

### Secciones principales

| Elemento | ID / Clase | Descripción |
|---|---|---|
| Alerta resolución | `#resolution-warning` | Visible solo < 430×932 px (CSS puro) |
| Pop-up bienvenida | `#welcome-popup` | Dura 3 s, sale con slide-up |
| Modal error | `#error-modal` | URL inválida o fallo de red |
| Audio fondo | `#bg-audio` | `sonido_fondo.mp3`, loop |
| Audio escaneo | `#scan-audio` | `nuevainterferencia_mp3.mp3` |
| Canvas partículas | `#particles-js` | Gestionado por particles.js |
| Contenedor | `.bunker-container` | Flex column, 92 vh |
| Barra misión | `.barra-mision` | Logo + título centrado |
| Consola | `.consola-input` | Input URL + botón |
| Barra carga | `#loading-container` | Oculta por defecto |
| Grilla | `.grid-paneles` | CSS Grid 2×2 |
| Panel Vista | `#panel-vista` | Captura visual / identificación |
| Panel Tech | `#panel-tech` | Hardware, SO, puertos |
| Panel Enlaces | `#panel-enlaces` | Proxies y origen real |
| Panel Métricas | `#panel-metricas` | Latencia, paquetes, alerta |

### Tipografía

| Elemento | Fuente |
|---|---|
| Título "Target Analyzer" | Orbitron (Google Fonts) |
| Todo lo demás | Courier New (monospace local) |

---

## 5. style.css

### Sistema de variables CSS (`:root`)

```css
--fondo-absoluto   #0a0a0a     Fondo del body
--fondo-panel      #091315     Fondo de paneles y consola
--verde            #00ff41     Color de acento (bordes hover, cursores, texto alerta)
--blanco           #ffffff     Texto base y bordes en reposo
--sombra-verde     …           Sombra neón verde para glow
--borde-panel      3px solid … Grosor de borde de paneles
--font-mono        Courier New Fuente monoespaciada (uso general)
--font-titulo      Orbitron    Fuente del título principal (excepción)
--corte            13px        Tamaño del corte diagonal en esquinas
```

> **Regla de colores:** Solo existen `--verde` y `--blanco`. No hay colores duplicados.

### Técnica de bordes con `clip-path`

Los elementos usan `clip-path: polygon(...)` para crear esquinas cortadas diagonalmente. Como `clip-path` elimina visualmente el `border` del elemento, el borde real se dibuja en el pseudo-elemento `::before` con el mismo `clip-path`.

```
Elemento padre  → clip-path recorta la forma
::before        → border + box-shadow visibles
```

### Íconos de panel

```css
.panel-icon {
    width: 144px; height: 144px;   /* 144px = doble de 72px original */
    opacity: 0.22;                  /* Marca de agua sutil */
    transition: opacity 0.5s ease; /* Fade al recibir datos */
}
.panel-icon.oculto-icono { opacity: 0; } /* Estado con datos */
```

---

## 6. app.js

### Funciones principales

#### `startBgAudio()`
Inicia la reproducción de `sonido_fondo.mp3` al volumen 0.08 (8%). Si el navegador bloquea el autoplay, espera el primer click del usuario.

#### `playScanAudio(scanDurationMs, onEnd)`
Gestiona el ciclo de audio durante el escaneo:
1. Fade out del fondo en 0 ms → pause
2. Play de `nuevainterferencia_mp3.mp3` al 60%
3. Al cumplirse `scanDurationMs` ms: stop de interferencia
4. Resume del fondo con fade in en 800 ms
5. Llama `onEnd` si se provee

#### `fadeTo(audioEl, targetVol, duration, callback)`
Transición suave de volumen. Divide la transición en 30 pasos distribuidos en `duration` ms. Garantiza que el volumen final sea exactamente `targetVol`.

#### `isValidUrl(str)`
Valida una URL usando `new URL()`. Acepta únicamente `http://` y `https://`. Retorna `boolean`.

#### `hideIcons()`
Agrega `.oculto-icono` a los cuatro íconos de panel, disparando el fade out via CSS.

#### `renderResults(data)`
Popula el `innerHTML` de los cuatro paneles con los datos recibidos. Todos los campos tienen fallback a texto demo en caso de ser `undefined`.

#### `callBackend(url)`
Función `async` que simula o realiza la llamada al backend. Actualmente en **modo demo** con `setTimeout` de 4000 ms. El bloque de `fetch` real está comentado dentro.

### Constante de tiempo

```javascript
const SCAN_DURATION_MS = 4500;
```

Este valor controla la duración del escaneo y **debe coincidir** con la transición CSS de `.loading-progress` (`transition: width 4.5s ...`). Si se cambia en uno, cambiar en el otro.

---

## 7. Assets

| Archivo | Uso | Notas |
|---|---|---|
| `favicon.png` | Ícono pestaña browser | 32×32 px recomendado |
| `Logo.png` | Barra misión + popup | Fondo transparente |
| `panelicon01.png` | Panel Vista | Crosshair/mira roja |
| `panelicon02.png` | Panel Tecnología | CPU/chip magenta |
| `panelicon03.png` | Panel Mapa | Nodos conectados azul |
| `panelicon04.png` | Panel Métricas | Velocímetro amarillo |
| `sonido_fondo.mp3` | Audio de fondo | Loop continuo, volumen 0.08 |
| `nuevainterferencia_mp3.mp3` | Audio de escaneo | Una sola vez, volumen 0.6 |

---

## 8. Sistema de audio

```
Estado inicial:    bgAudio  [OFF]     scanAudio [OFF]
Después del popup: bgAudio  [PLAYING, vol 0.08]
Al escanear:       bgAudio  [fade → 0 → PAUSED]
                   scanAudio [PLAYING, vol 0.6]
Al terminar:       scanAudio [STOPPED]
                   bgAudio  [PLAYING, fade → 0.08]
```

**Gestión de políticas de autoplay:**
El browser puede bloquear `audio.play()` si no hubo interacción previa del usuario. El código lo maneja registrando un listener `{ once: true }` en el primer click para reintentar la reproducción.

---

## 9. Integración con backend

### Endpoint esperado

```
POST /api/scan
Content-Type: application/json

Body:
{
  "target_url": "https://objetivo.com"
}
```

### Respuesta esperada (JSON)

```json
{
  "vista":      "Descripción de captura visual",
  "os":         "Linux Ubuntu 22.04",
  "ports":      "22(SSH), 80(HTTP), 443(HTTPS)",
  "encryption": "TLS 1.3",
  "proxy1":     "Ciudad (IP)",
  "proxy2":     "Ciudad (IP)",
  "origin":     "Descripción del origen real",
  "latency":    "23ms",
  "packets":    "4,096",
  "alert":      "ALERTA ALTA"
}
```

### Para activar la integración real

En `app.js`, dentro de `callBackend()`:
1. Eliminar el bloque `/* --- MODO DEMO --- */`
2. Descomentar el bloque `/* --- INTEGRACIÓN REAL --- */`

```javascript
async function callBackend(url) {
    const response = await fetch('/api/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target_url: url })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}
```

---

## 10. Integración con robot de scraping

El robot **no es llamado directamente por el front-end**. El flujo es:

```
Front-end  ──POST /api/scan──▶  Backend
                                   │
                                   ▼
                              Invoca Robot
                                   │
                              Robot scraping
                                   │
                              Devuelve datos al Backend
                                   │
Back-end  ──JSON response──▶  Front-end
```

El front solo necesita que el backend devuelva el JSON con la estructura definida en la sección 9. El tiempo de procesamiento del robot está cubierto por la ventana de 4.5 s del escaneo + cualquier timeout adicional que implemente el backend.

---

## 11. Responsive y límites de resolución

| Breakpoint | Comportamiento |
|---|---|
| `> 768px` | Layout normal: grid 2×2 |
| `≤ 768px` | Grid en columna única (4×1) |
| `≤ 500px` | Tipografía reducida, íconos más pequeños |
| `< 430px Y < 932px` | Alerta de resolución mínima (bloquea la UI) |

> **Nota:** La alerta solo aparece cuando **ambas** condiciones se cumplen simultáneamente (operador `and`). Una pantalla de 400px de ancho pero con 1000px de alto NO la activa.

---

## 12. Variables CSS — referencia rápida

Para cambiar el esquema de colores, modificar únicamente estas dos líneas en `:root`:

```css
--verde:  #00ff41;   /* Cambiar por cualquier color de acento */
--blanco: #ffffff;   /* Cambiar por color de texto/bordes base */
```

Todos los demás usos de color en el CSS referencian estas variables, por lo que el cambio se propaga automáticamente a toda la interfaz.

