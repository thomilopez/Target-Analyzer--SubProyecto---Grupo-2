/* Inicialización de Particles.js con tu configuración */
particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 241,
      "density": {
        "enable": true,
        "value_area": 800
      }
    },
    "color": {
      "value": "#ffffff"
    },
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#000000"
      },
      "polygon": {
        "nb_sides": 5
      },
      "image": {
        "src": "img/github.svg",
        "width": 100,
        "height": 100
      }
    },
    "opacity": {
      "value": 0.55,
      "random": false,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 3,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#00ff41",
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 6,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "window",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "repulse"
      },
      "onclick": {
        "enable": true,
        "mode": "push"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 400,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 3.991569804572746,
        "duration": 2,
        "opacity": 0.439072678503002,
        "speed": 3
      },
      "repulse": {
        "distance": 87.81453570060042,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});

// Esperar a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    
    const btnScan = document.getElementById('btn-scan');
    const loadingContainer = document.getElementById('loading-container');
    const loadingProgress = document.getElementById('loading-progress');
    const gridPaneles = document.querySelector('.grid-paneles');
    
    // Seleccionamos el interior de cada panel para cambiarles el texto después
    const panelVista = document.querySelector('#panel-vista .contenido-panel');
    const panelTech = document.querySelector('#panel-tech .contenido-panel');
    const panelEnlaces = document.querySelector('#panel-enlaces .contenido-panel');
    const panelMetricas = document.querySelector('#panel-metricas .contenido-panel');

    btnScan.addEventListener('click', () => {
        // 1. Bloquear botón y mostrar barra
        btnScan.disabled = true;
        btnScan.style.opacity = '0.5';
        btnScan.textContent = "PROCESANDO...";
        
        loadingContainer.classList.remove('oculto');
        
        // Timeout muy corto para permitir que el display:block se aplique antes de la transición
        setTimeout(() => {
            loadingProgress.style.width = '100%';
            gridPaneles.classList.add('glitch-activo'); // Activamos el temblor
        }, 50);

        // 2. Esperar 4.5 segundos y mostrar resultados
        setTimeout(() => {
            // Apagar el glitch y ocultar barra
            gridPaneles.classList.remove('glitch-activo');
            loadingContainer.classList.add('oculto');
            
            // Resetear la barra para un futuro uso
            loadingProgress.style.width = '0%';
            
            // Restaurar el botón
            btnScan.disabled = false;
            btnScan.style.opacity = '1';
            btnScan.textContent = "INICIAR ESCANEO";

            // 3. Imprimir resultados en los paneles
            panelVista.innerHTML = `
                <span class="cursor-blink">_</span> [ÉXITO] Captura de entorno completada.<br>
                > Sujeto identificado positivamente.<br>
                > Feed de cámara de seguridad interceptado.
            `;
            
            panelTech.innerHTML = `
                <span class="cursor-blink">_</span> [ANÁLISIS DE HARDWARE]<br>
                > SO: Unknown UNIX-based<br>
                > Puertos Abiertos: 22(SSH), 443(HTTPS), 8080(PROXY)<br>
                > Nivel de encriptación: AES-256 (Vulnerado)
            `;
            
            panelEnlaces.innerHTML = `
                <span class="cursor-blink">_</span> Trazando nodos...<br>
                > Proxy 1: Moscú (192.168.x.x)<br>
                > Proxy 2: Berlín (10.0.x.x)<br>
                > Origen Real: Dillinger Grid - Sector 4.
            `;
            
            panelMetricas.innerHTML = `
                <span class="cursor-blink">_</span> [MÉTRICAS DE CONEXIÓN]<br>
                > Latencia: 14ms<br>
                > Paquetes interceptados: 1,024<br>
                > Estado de alerta del objetivo: IGNORANTE
            `;

        }, 4500); // 4500 milisegundos = 4.5 segundos
    });
});