const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PUERTO = 3001;
 
const ejecutarExtraccion = require('./robot/robot_mod.js');
 
app.use(express.static(path.join(__dirname, 'frontend')));
 
console.log('Desarrollo Backend grupo 4' + '\n');
 
app.use(cors());
app.use(express.json());
 
// Crear log.txt
const logFile = path.join(__dirname, 'log.txt');
fs.appendFileSync(
    logFile,
    `\n\n=== SERVIDOR INICIADO: ${new Date().toLocaleString()} ===\n`
);
 
// Función para escribir en log
function log(mensaje) {
    console.log(mensaje);
    fs.appendFileSync(logFile, mensaje + '\n');
}
 
let tiempos = {};
 
 
app.post('/api/escanear', async (req, res) => {
 
    const id = Date.now();
    tiempos[id] = {};
 
    try {
 
        tiempos[id].t1 = Date.now();
        log(`[T1] Frontend → Backend: ${tiempos[id].t1}`);
 
        const urlRecibida = req.body.url;
 
        if (!urlRecibida) {
            return res.status(400).json({ estado: 'ERROR', mensaje: 'No se recibio una URL.' });
        }
 
        log(`[URL RECIBIDA] ${urlRecibida}`);
 
        tiempos[id].t2 = Date.now();
        log(`[T2] Backend → Robot: ${tiempos[id].t2}`);
 
        const resultado = await ejecutarExtraccion(urlRecibida);
 
        console.log("===== RESULTADO ROBOT =====");
        console.log(JSON.stringify(resultado, null, 2));
 
        tiempos[id].t3 = Date.now();
        log(`[T3] Robot → Backend: ${tiempos[id].t3}`);
 
        // ── Servidor detectado (Nginx, Apache, CloudFront, etc.) ──
        const servidorDetectado = (resultado.tecnologias?.byCategory?.core_server_node || [])
            .map(t => t.name)
            .join(', ') || 'No detectado';
 
        // ── Stack tecnológico completo ──
        const tecnologiasDetectadas = (resultado.tecnologias?.detected || [])
            .map(t => `${t.name} [${t.category}]`)
            .join(', ') || 'No detectadas';
 
        // ── Trackers de vigilancia ──
        const trackersDetectados = (resultado.tecnologias?.byCategory?.data_surveillance_trackers || [])
            .map(t => t.name)
            .join(', ') || 'Ninguno';
 
        // ── Conteos de recursos del documento ──
        const counts = resultado.metricas?.counts || {};
        const paquetes = [
            `${counts.links    || 0} links`,
            `${counts.images   || 0} imgs`,
            `${counts.scripts  || 0} scripts`,
            `${counts.forms    || 0} forms`,
            `${counts.videos   || 0} videos`,
            `${counts.headings || 0} headings`,
            `${counts.sections || 0} sections`
        ].join(' · ');
 
        // ── Nivel de alerta basado en SSL y trackers ──
        const tieneSSL      = resultado.metricas?.certSslVigente;
        const tieneTrackers = (resultado.tecnologias?.byCategory?.data_surveillance_trackers || []).length > 0;
        let nivelAlerta;
        if (!tieneSSL) {
            nivelAlerta = 'ALERTA ALTA — Sin certificado SSL';
        } else if (tieneTrackers) {
            nivelAlerta = 'ALERTA MEDIA — Trackers de vigilancia detectados';
        } else {
            nivelAlerta = 'OBJETIVO LIMPIO — Sin amenazas detectadas';
        }
 
        // ── Links encontrados (array completo para listar en el front) ──
        const links = (resultado.paneles?.linkCarousel?.items || []);
 
        // ── Top palabras clave ──
        const topWords = resultado.metricas?.topWords || [];
 
        const respuestaFrontend = {
 
            // Panel 1 — VISTA
            vista:     `${resultado.identidad?.titulo || 'Sin titulo'} | ${resultado.identidad?.descripcion || 'Sin descripcion'}`,
            vistaImg:  resultado.paneles?.imageCarousel?.activeAssetSrc || null,
            vistaImgs: (resultado.paneles?.imageCarousel?.items || []).map(i => i.url),
 
            // Panel 2 — TECNOLOGÍA
            os:         servidorDetectado,
            ports:      tecnologiasDetectadas,
            encryption: tieneSSL ? 'TLS/HTTPS activo' : 'Sin certificado SSL',
 
            // Panel 3 — MAPA DE ENLACES
            proxy1: resultado.paneles?.imageCarousel?.targetDomain || resultado.objetivo,
            proxy2: `${resultado.paneles?.linkCarousel?.vectorCount || 0}`,
            origin: `Trackers: ${trackersDetectados}`,
            links:  links,
 
            // Panel 4 — MÉTRICAS
            latency:  `${resultado.metricas?.tiempoRespuestaMs || 0} ms`,
            packets:  paquetes,
            peso:     `${resultado.metricas?.pesoDocumentoKb || 'N/D'} KB`,
            alert:    nivelAlerta,
            topWords: topWords
 
        };
 
        tiempos[id].t4 = Date.now();
        log(`[T4] Respuesta enviada al Frontend`);
        log(`TIEMPO TOTAL: ${tiempos[id].t4 - tiempos[id].t1} ms`);
        log("------------------------------------------------------------");
 
        return res.json(respuestaFrontend);
 
    } catch (err) {
 
        log(`[ERROR ROBOT] ${err.message}`);
 
        return res.status(500).json({
            estado: 'ERROR',
            mensaje: err.message
        });
 
    }
 
});
 
 
app.listen(PUERTO, () => {
    log(`[BUNKER CENTRAL] Escuchando en puerto ${PUERTO}`);
});