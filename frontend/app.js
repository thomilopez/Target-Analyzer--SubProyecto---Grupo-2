/* ══════════════════════════════════════════════════════════════
    CTU TARGET ANALYZER — app.js
    ──────────────────────────────────────────────────────────────
    DESCRIPCIÓN GENERAL:
    Maneja toda la lógica del front-end de la aplicación.
    El flujo principal es:
        1. Pop-up de bienvenida (3 s) → inicia audio de fondo
        2. Usuario ingresa URL y presiona "INICIAR ESCANEO"
        3. Validación de URL → error modal si es inválida
        4. Audio: fondo se pausa, suena interferencia de escaneo
        5. Barra de carga + efecto glitch durante 4.5 s
        6. Llamada al backend (modo demo activo)
        7. Resultados en paneles + íconos desaparecen
        8. Audio de fondo se reanuda

    INTEGRACIÓN CON BACKEND (pendiente):
    · Endpoint esperado: POST /api/scan
    · Body enviado: { target_url: string }
    · Respuesta esperada: objeto JSON con campos:
        vista, os, ports, encryption,
        proxy1, proxy2, origin,
        latency, packets, alert
    · Ver función callBackend() para descomentar el fetch real.

    INTEGRACIÓN CON ROBOT DE SCRAPING:
    · El robot es invocado por el backend; el front no lo llama
        directamente. Solo consume la respuesta que el backend
        devuelve una vez que el robot terminó su trabajo.

    ESTRUCTURA DEL ARCHIVO:
    A. Configuración de particles.js
    B. Lógica principal (DOMContentLoaded)
        B1. Referencias al DOM
        B2. Pop-up de bienvenida
        B3. Audio de fondo (sonido_fondo.mp3)
        B4. Audio de escaneo (nuevainterferencia_mp3.mp3)
        B5. Utilidad de fade de volumen
        B6. Modal de error
        B7. Validación de URL
        B8. Ocultamiento de íconos de panel
        B9. Renderizado de resultados
        B10. Llamada al backend
        B11. Evento principal del botón
══════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════
    A. CONFIGURACIÓN DE PARTICLES.JS
    Inicializa el fondo de partículas animadas.
    Parámetros clave:
    · number.value: cantidad de partículas (241)
    · line_linked.color: color de líneas (#00ff41 verde)
    · move.speed: velocidad de movimiento
    · interactivity.onhover.mode: "repulse" (huyen del cursor)
    · interactivity.onclick.mode: "push" (agregan partículas)
══════════════════════════════════════════ */
particlesJS("particles-js", {
  "particles": {
    "number":      { "value": 241, "density": { "enable": true, "value_area": 800 } },
    "color":       { "value": "#ffffff" },
    "shape":       { "type": "circle", "stroke": { "width": 0, "color": "#000000" } },
    "opacity":     { "value": 0.55, "random": false },
    "size":        { "value": 3, "random": true },
    "line_linked": { "enable": true, "distance": 150, "color": "#00ff41", "opacity": 0.4, "width": 1 },
    "move": {
      "enable": true, "speed": 6, "direction": "none",
      "random": false, "straight": false, "out_mode": "out", "bounce": false
    }
  },
  "interactivity": {
    "detect_on": "window",
    "events": {
      "onhover": { "enable": true, "mode": "repulse" },
      "onclick":  { "enable": true, "mode": "push" },
      "resize":   true
    },
    "modes": {
      "repulse": { "distance": 87.81, "duration": 0.4 },
      "push":    { "particles_nb": 4 }
    }
  },
  "retina_detect": true
});


/* ══════════════════════════════════════════
   B. LÓGICA PRINCIPAL
   Todo el código que interactúa con el DOM
   se ejecuta dentro de DOMContentLoaded para
   garantizar que los elementos existen.
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

    /* ────────────────────────────────────────
       B1. REFERENCIAS AL DOM
       Se obtienen una sola vez y se reusan
       en todas las funciones.
    ──────────────────────────────────────── */
    const welcomePopup     = document.getElementById('welcome-popup');
    const bgAudio          = document.getElementById('bg-audio');          // sonido_fondo.mp3
    const scanAudio        = document.getElementById('scan-audio');        // nuevainterferencia_mp3.mp3
    const btnScan          = document.getElementById('btn-scan');
    const targetInput      = document.getElementById('target-url');
    const loadingContainer = document.getElementById('loading-container');
    const loadingProgress  = document.getElementById('loading-progress');
    const gridPaneles      = document.querySelector('.grid-paneles');
    const errorModal       = document.getElementById('error-modal');
    const errorMessage     = document.getElementById('error-message');
    const btnCloseError    = document.getElementById('btn-close-error');

    // Contenidos de cada panel (donde se imprimen los resultados)
    const panelVista    = document.querySelector('#panel-vista .contenido-panel');
    const panelTech     = document.querySelector('#panel-tech .contenido-panel');
    const panelEnlaces  = document.querySelector('#panel-enlaces .contenido-panel');
    const panelMetricas = document.querySelector('#panel-metricas .contenido-panel');

    // Íconos centrales de cada panel
    const iconVista    = document.getElementById('icon-vista');
    const iconTech     = document.getElementById('icon-tech');
    const iconEnlaces  = document.getElementById('icon-enlaces');
    const iconMetricas = document.getElementById('icon-metricas');


    // ── CONTROL DE VOLUMEN ──────────────────
const volumeSlider = document.getElementById('volume-slider');
const volumePct    = document.getElementById('volume-pct');

volumeSlider.addEventListener('input', () => {
    const val = parseFloat(volumeSlider.value);
    bgAudio.volume = val;
    volumePct.textContent = Math.round(val * 100) + '%';
});

    /* ────────────────────────────────────────
       B2. POP-UP DE BIENVENIDA
       Temporizador de 3000 ms → agrega clase
       .slide-up (animación CSS) → espera 700 ms
       (duración de la animación) → oculta el
       elemento y arranca el audio de fondo.
    ──────────────────────────────────────── */
    setTimeout(() => {
        welcomePopup.classList.add('slide-up');
        setTimeout(() => {
            welcomePopup.style.display = 'none';
            startBgAudio();
        }, 700); // 700 ms = duración de la animación slide-up en CSS
    }, 3000);   // 3000 ms = tiempo de visibilidad del popup


    /* ────────────────────────────────────────
       B3. AUDIO DE FONDO — sonido_fondo.mp3
       Volumen bajo (0.08) para no interferir
       con la experiencia de uso.
       El navegador puede bloquear el autoplay;
       en ese caso se activa al primer click.
    ──────────────────────────────────────── */
    bgAudio.volume = 0.08;

    function startBgAudio() {
        bgAudio.play().catch(() => {
            // Política de autoplay bloqueada: esperar interacción del usuario
            document.addEventListener('click', () => bgAudio.play(), { once: true });
        });
    }


    /* ────────────────────────────────────────
       B4. AUDIO DE ESCANEO — nuevainterferencia_mp3.mp3
       Al iniciar el escaneo:
         · fade out del fondo → pause
         · play de scanAudio (interferencia)
       Al finalizar el escaneo:
         · stop de scanAudio
         · resume del fondo con fade in
       El callback onEnd se llama cuando
       termina la secuencia de audio.
    ──────────────────────────────────────── */
    function playScanAudio(scanDurationMs, onEnd) {
        // 1. Fade out del audio de fondo (600 ms)
        fadeTo(bgAudio, 0, 0, () => {
            bgAudio.pause();

            // 2. Reproducir interferencia de escaneo
            scanAudio.currentTime = 0;
            scanAudio.volume = 0.6;
            scanAudio.play().catch(() => {
                // Si falla el audio de scan, igual continuar
            });

            // 3. Al terminar el escaneo, restaurar fondo
            setTimeout(() => {
                // Detener el audio de interferencia
                scanAudio.pause();
                scanAudio.currentTime = 0;

                // Reanudar fondo desde donde quedó, con fade in
                bgAudio.play().catch(() => {});
                fadeTo(bgAudio, 0.08, 800);

                if (onEnd) onEnd();
            }, scanDurationMs);
        });
    }


    /* ────────────────────────────────────────
       B5. UTILIDAD: FADE DE VOLUMEN
       Transición suave de volumen entre dos
       valores en un tiempo dado.
       Parámetros:
         audioEl   → elemento <audio> a modificar
         targetVol → volumen destino (0.0 – 1.0)
         duration  → duración en ms
         callback  → función a llamar al terminar
    ──────────────────────────────────────── */
    function fadeTo(audioEl, targetVol, duration, callback) {
        const steps    = 30;
        const interval = duration / steps;
        const startVol = audioEl.volume;
        const delta    = (targetVol - startVol) / steps;
        let   step     = 0;

        const timer = setInterval(() => {
            step++;
            // Clamp para no salir del rango [0, 1]
            audioEl.volume = Math.max(0, Math.min(1, startVol + delta * step));
            if (step >= steps) {
                clearInterval(timer);
                audioEl.volume = targetVol; // Asegurar valor exacto al final
                if (callback) callback();
            }
        }, interval);
    }


    /* ────────────────────────────────────────
       B6. MODAL DE ERROR
       showError(msg): muestra el modal con el
       mensaje recibido como parámetro.
       Se puede cerrar con el botón o clickeando
       fuera del recuadro (.error-box).
    ──────────────────────────────────────── */
    function showError(msg) {
        errorMessage.textContent = msg;
        errorModal.classList.remove('oculto');
    }

    // Cerrar con botón
    btnCloseError.addEventListener('click', () => {
        errorModal.classList.add('oculto');
    });

    // Cerrar haciendo click en el backdrop (fuera del recuadro)
    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) errorModal.classList.add('oculto');
    });


    /* ────────────────────────────────────────
       B7. VALIDACIÓN DE URL
       Usa el constructor URL() nativo del
       navegador para validar formato.
       Solo acepta http:// y https://.
       Retorna true si es válida, false si no.
    ──────────────────────────────────────── */
    function isValidUrl(str) {
        if (!str || str.trim() === '') return false;
        try {
            const url = new URL(str.trim());
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false; // URL() lanza TypeError si el formato es inválido
        }
    }


    /* ────────────────────────────────────────
       B8. OCULTAMIENTO DE ÍCONOS DE PANEL
       Cuando llegan datos del backend, los
       íconos centrales desaparecen con
       transición de opacidad (definida en CSS).
    ──────────────────────────────────────── */
    function hideIcons() {
        [iconVista, iconTech, iconEnlaces, iconMetricas].forEach(icon => {
            if (icon) icon.classList.add('oculto-icono');
        });
    }


    /* ────────────────────────────────────────
       B9. RENDERIZADO DE RESULTADOS
       Recibe el objeto data del backend y
       popula el innerHTML de cada panel.
       Usa valores de data con fallback a
       strings de demo en caso de campos faltantes.
       También llama hideIcons() para limpiar
       los íconos de placeholder.

       CONTRATO CON BACKEND — campos esperados:
       · data.vista       → texto de captura visual
       · data.os          → sistema operativo detectado
       · data.ports       → puertos abiertos
       · data.encryption  → nivel de encriptación
       · data.proxy1      → primer nodo proxy
       · data.proxy2      → segundo nodo proxy
       · data.origin      → origen real de la conexión
       · data.latency     → latencia en ms
       · data.packets     → paquetes interceptados
       · data.alert       → nivel de alerta del objetivo
    ──────────────────────────────────────── */
    function renderResults(data) {
        hideIcons();

 
        // ── PANEL 1: VISTA — CARRUSEL DE IMÁGENES ───────────────────
        // Si hay imágenes: carrusel con botones anterior/siguiente
        // y autoplay cada 4 s que se pausa al tocar los botones.
        // Si no hay imágenes: solo muestra el texto.
 
        const imagenes = (data.vistaImgs && data.vistaImgs.length > 0)
            ? data.vistaImgs
            : (data.vistaImg ? [data.vistaImg] : []);
 
        if (imagenes.length > 0) {
            panelVista.innerHTML = `
                <span style="color:var(--verde)">> [ENLACE ESTABLECIDO]</span><br>
                <span style="font-size:0.78rem;opacity:0.7">${data.vista || ''}</span>
                <div id="carrusel-wrap" style="position:relative;margin-top:8px;">
                    <img id="carrusel-img"
                         src="${imagenes[0]}"
                         alt="Vista del objetivo"
                         style="width:100%;max-height:120px;object-fit:cover;
                                border:1px solid rgba(0,255,65,0.3);
                                opacity:0.85;display:block;"
                         onerror="this.style.display='none'">
 
                    <!-- Contador -->
                    <span id="carrusel-counter"
                          style="position:absolute;top:4px;right:6px;
                                 font-family:var(--font-mono);font-size:0.7rem;
                                 color:var(--verde);background:rgba(0,0,0,0.6);
                                 padding:1px 5px;">
                        1 / ${imagenes.length}
                    </span>
 
                    <!-- Botones solo si hay más de 1 imagen -->
                    ${imagenes.length > 1 ? `
                    <div style="display:flex;justify-content:space-between;margin-top:6px;gap:6px;">
                        <button id="carrusel-prev"
                                style="flex:1;background:rgba(0,255,65,0.08);
                                       border:1px solid var(--verde);color:var(--verde);
                                       font-family:var(--font-mono);font-size:0.75rem;
                                       cursor:pointer;padding:3px 0;letter-spacing:1px;"
                                onmouseover="this.style.background='rgba(0,255,65,0.2)'"
                                onmouseout="this.style.background='rgba(0,255,65,0.08)'">
                            ◀ PREV
                        </button>
                        <button id="carrusel-next"
                                style="flex:1;background:rgba(0,255,65,0.08);
                                       border:1px solid var(--verde);color:var(--verde);
                                       font-family:var(--font-mono);font-size:0.75rem;
                                       cursor:pointer;padding:3px 0;letter-spacing:1px;"
                                onmouseover="this.style.background='rgba(0,255,65,0.2)'"
                                onmouseout="this.style.background='rgba(0,255,65,0.08)'">
                            NEXT ▶
                        </button>
                    </div>` : ''}
                </div>
            `;
 
            // Solo activar lógica de carrusel si hay más de 1 imagen
            if (imagenes.length > 1) {
                let indiceActual  = 0;
                let autoplayTimer = null;
                let pausado       = false;
 
                const imgEl      = document.getElementById('carrusel-img');
                const counterEl  = document.getElementById('carrusel-counter');
                const btnPrev    = document.getElementById('carrusel-prev');
                const btnNext    = document.getElementById('carrusel-next');
 
                // Cambia la imagen con fade suave
                function mostrarImagen(idx) {
                    indiceActual = (idx + imagenes.length) % imagenes.length;
                    imgEl.style.opacity = '0';
                    setTimeout(() => {
                        imgEl.src           = imagenes[indiceActual];
                        imgEl.style.opacity = '0.85';
                        counterEl.textContent = `${indiceActual + 1} / ${imagenes.length}`;
                    }, 180);
                }
 
                imgEl.style.transition = 'opacity 0.18s ease';
 
                // Autoplay cada 4 s
                function iniciarAutoplay() {
                    autoplayTimer = setInterval(() => {
                        if (!pausado) mostrarImagen(indiceActual + 1);
                    }, 4000);
                }
 
                function detenerAutoplay() {
                    clearInterval(autoplayTimer);
                }
 
                // Botones: pausan el autoplay 10 s y luego lo reanudan
                btnPrev.addEventListener('click', () => {
                    pausado = true;
                    mostrarImagen(indiceActual - 1);
                    detenerAutoplay();
                    setTimeout(() => {
                        pausado = false;
                        iniciarAutoplay();
                    }, 10000);
                });
 
                btnNext.addEventListener('click', () => {
                    pausado = true;
                    mostrarImagen(indiceActual + 1);
                    detenerAutoplay();
                    setTimeout(() => {
                        pausado = false;
                        iniciarAutoplay();
                    }, 10000);
                });
 
                iniciarAutoplay();
            }
 
        } else {
            // Sin imágenes: solo texto
            panelVista.innerHTML = `
                <span style="color:var(--verde)">> [ENLACE ESTABLECIDO]</span><br>
                ${data.vista || 'Sin datos de identificación.'}
            `;
        }
 
        // ── PANEL 2: TECNOLOGÍA ──────────────────────────────────────
        // Muestra servidor, stack tecnológico y estado de encriptación
        panelTech.innerHTML = `
            <span style="color:var(--verde)">> [ANÁLISIS DE INFRAESTRUCTURA]</span><br>
            <br>
            <span style="color:var(--verde)">// SERVIDOR</span><br>
            > ${data.os || 'No detectado'}<br>
            <br>
            <span style="color:var(--verde)">// STACK TECNOLÓGICO</span><br>
            > ${data.ports || 'No detectado'}<br>
            <br>
            <span style="color:var(--verde)">// ENCRIPTACIÓN</span><br>
            > ${data.encryption || 'Desconocida'}
        `;
 
        // ── PANEL 3: MAPA DE ENLACES ─────────────────────────────────
        // Muestra dominio, trackers y lista completa de URLs encontradas
        const linksHtml = (data.links && data.links.length > 0)
            ? data.links.map(link =>
                `> <a href="${link}" target="_blank"
                      style="color:rgba(255,255,255,0.7);text-decoration:none;
                             font-size:0.75rem;word-break:break-all;"
                      onmouseover="this.style.color='var(--verde)'"
                      onmouseout="this.style.color='rgba(255,255,255,0.7)'"
                  >${link}</a>`
              ).join('<br>')
            : '> Sin vectores de enlace detectados.';
 
        panelEnlaces.innerHTML = `
            <span style="color:var(--verde)">> [MAPA DE VECTORES]</span><br>
            <br>
            <span style="color:var(--verde)">// DOMINIO OBJETIVO</span><br>
            > ${data.proxy1 || 'No detectado'}<br>
            <br>
            <span style="color:var(--verde)">// VIGILANCIA DETECTADA</span><br>
            > ${data.origin || 'Sin trackers'}<br>
            <br>
            <span style="color:var(--verde)">// VECTORES DE ENLACE (${data.proxy2 || '0'})</span><br>
            ${linksHtml}
        `;
        panelEnlaces.classList.add('scroll-activo');
 
        // ── PANEL 4: MÉTRICAS ────────────────────────────────────────
        // Muestra latencia, conteos, peso del documento y palabras clave
        const topWordsHtml = (data.topWords && data.topWords.length > 0)
            ? data.topWords.map(w =>
                `<span style="color:var(--verde)">${w.word}</span>(${w.count})`
            ).join(' · ')
            : 'Sin datos';

        panelMetricas.innerHTML = `
            <span style="color:var(--verde)">> [MÉTRICAS DE CONEXIÓN]</span><br>
            <br>
            <span style="color:var(--verde)">// RENDIMIENTO</span><br>
            > Latencia: ${data.latency || 'N/D'}<br>
            > Peso documento: ${data.peso || 'N/D'}<br>
            <br>
            <span style="color:var(--verde)">// RECURSOS INTERCEPTADOS</span><br>
            > ${data.packets || 'N/D'}<br>
            <br>
            <span style="color:var(--verde)">// PALABRAS CLAVE</span><br>
            > ${topWordsHtml}<br>
            <br>
            <span style="color:var(--verde)">// ESTADO DE ALERTA</span><br>
            > <span style="color:${data.alert && data.alert.includes('ALERTA') ? '#ff4444' : 'var(--verde)'};font-weight:bold;">
                ${data.alert || 'DESCONOCIDO'}
            </span>
        `;
        panelMetricas.classList.add('scroll-activo');
    }



    /* ────────────────────────────────────────
       B10. LLAMADA AL BACKEND
       ════════════════════════════════════════
       ⚠ MODO DEMO ACTIVO
       Simula una respuesta del backend con un
       delay de 4000 ms. Reemplazar por el
       bloque de fetch real cuando el backend
       esté disponible.

       INTEGRACIÓN REAL (descomentar):
       · URL: POST /api/scan
       · Headers: Content-Type: application/json
       · Body: { target_url: string }
       · Respuesta: JSON con los campos de data
         descritos en renderResults().
       · Errores HTTP se lanzan como Error para
         ser capturados por el try/catch del evento.

       NOTA PARA EL EQUIPO DE BACKEND:
       El front espera exactamente los campos
       detallados en el comentario de renderResults().
       Campos faltantes muestran el valor demo
       como fallback, sin romper la UI.
    ──────────────────────────────────────── */
    async function callBackend(url) {

        /* --- MODO DEMO (eliminar cuando el backend esté listo) --- */
        // return new Promise((resolve) => {
        //     setTimeout(() => {
        //         resolve({
        //             vista:      'Feed de cámara de seguridad interceptado.',
        //             os:         'Unknown UNIX-based',
        //             ports:      '22(SSH), 443(HTTPS), 8080(PROXY)',
        //             encryption: 'AES-256 (Vulnerado)',
        //             proxy1:     'Moscú (192.168.x.x)',
        //             proxy2:     'Berlín (10.0.x.x)',
        //             origin:     'Dillinger Grid - Sector 4',
        //             latency:    '14ms',
        //             packets:    '1,024',
        //             alert:      'IGNORANTE'
        //         });
        //     }, 4000);
        // });
        /* --------------------------------------------------------- */


        const response = await fetch('/api/escanear', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url: url })
        });
        if (!response.ok) {
            throw new Error(`Error del servidor: HTTP ${response.status}`);
        }
        return await response.json();
        
    }


    /* ────────────────────────────────────────
       B11. EVENTO PRINCIPAL — BOTÓN DE ESCANEO
       Flujo completo al presionar "INICIAR ESCANEO":

       1. Validar URL → mostrar error si inválida
       2. Bloquear botón (disabled + opacity)
       3. Mostrar barra de carga
       4. Iniciar audio de scan (pausa fondo)
       5. Trigger de la barra de progreso + glitch
       6. await callBackend(url)
       7. renderResults(data) con la respuesta
       8. Restaurar UI (botón, barra, glitch)
          El audio se restaura automáticamente
          dentro de playScanAudio().

       El bloque finally garantiza que la UI
       se restaura aunque el backend falle.
    ──────────────────────────────────────── */

    const SCAN_DURATION_MS = 4500; // Debe coincidir con la transición CSS de .loading-progress

    btnScan.addEventListener('click', async () => {
        const url = targetInput.value.trim();

        // 1. Validación
        if (!isValidUrl(url)) {
            showError(
                url === ''
                    ? '> ERROR: No se ingresó ninguna URL.\n> Por favor introduzca una URL válida.\n> Ejemplo: https://ejemplo.com'
                    : `> ERROR: La URL ingresada no es válida.\n> Valor recibido: "${url}"\n> Formato esperado: https://dominio.com`
            );
            return;
        }

        // 2. Bloquear UI
        btnScan.disabled      = true;
        btnScan.style.opacity = '0.5';
        btnScan.textContent   = "PROCESANDO...";

        // 3. Mostrar barra de carga
        loadingContainer.classList.remove('oculto');

        // 4. Iniciar audio de escaneo (pausa el fondo, lo restaura al terminar)
        playScanAudio(SCAN_DURATION_MS);

        // 5. Pequeño delay para que el display:block se aplique antes de la transición
        setTimeout(() => {
            loadingProgress.style.width = '100%'; // Dispara la transición CSS de 4.5 s
            gridPaneles.classList.add('glitch-activo');
        }, 50);

        // 6 & 7. Llamada al backend y render de resultados
        try {
            const data = await callBackend(url);
            renderResults(data);
        } catch (err) {
            // Error de red o del servidor
            showError(
                `> ERROR DE RED: No se pudo conectar con el servidor.\n> Detalle técnico: ${err.message}`
            );
        } finally {
            // 8. Restaurar UI independientemente del resultado
            gridPaneles.classList.remove('glitch-activo');
            loadingContainer.classList.add('oculto');
            loadingProgress.style.width = '0%'; // Reset para próximo uso

            btnScan.disabled      = false;
            btnScan.style.opacity = '1';
            btnScan.textContent   = "INICIAR ESCANEO";
        }
    });

    // Permitir disparar el escaneo también con la tecla Enter
    targetInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnScan.click();
    });

}); // Fin DOMContentLoaded