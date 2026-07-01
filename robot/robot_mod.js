const puppeteer = require('puppeteer');
const Logger = require('../utils/logger');
const _logger = new Logger("Robot");

const { guardarResultado } = require('./scan_history.helpers');
const { createTargetHelpers } = require('./robot_mod.helpers');

async function ejecutarExtraccion(urlObjetivo) {
  let navegador;

  try {
    navegador = await puppeteer.launch({ 
      headless: 'shell' ,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'  // Oculta automatización
      ]
    });
    const pagina = await navegador.newPage();
    await pagina.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await pagina.setViewport({ width: 1920, height: 1080 });

    _logger.info(`Escaneo de ${urlObjetivo} iniciado`);
    const tiempoInicio = Date.now();
    const respuestaRed = await pagina.goto(urlObjetivo, { waitUntil: 'networkidle2' });
    const codigoHtml = await pagina.content();
    const tiempoRespuestaMs = Date.now() - tiempoInicio;
    _logger.info(`Tiempo de respuesta del acceso a la url: ${tiempoRespuestaMs.toString()}ms`);
    const certSslVigente = respuestaRed.securityDetails() !== null;
    const pesoDocumentoKb = (Buffer.byteLength(codigoHtml, 'utf8') / 1024).toFixed(2);
    const headers = respuestaRed.headers();

    const helpers = createTargetHelpers(codigoHtml, urlObjetivo, { headers });
    const paneles = helpers.extractAllPanels({ mediaLimit: 20, linkLimit: 50, topWordsLimit: 10 });
    const tituloPagina = paneles.imageCarousel.coreHeadline || 'Sin titulo';
    const descripcionPagina = helpers.$('meta[name="description"]').attr('content') || 'Sin descripcion';

    const resultado = {
      estado: 'EXITO',
      mensaje: '[ENLACE ESTABLECIDO]: Robot operativo y analisis completado.',
      objetivo: urlObjetivo,
      identidad: {
        titulo: tituloPagina,
        descripcion: descripcionPagina,
      },
      tecnologias: paneles.technologies,
      metricas: {
        tiempoRespuestaMs,
        pesoDocumentoKb,
        certSslVigente,
        ...paneles.stats,
      },
      paneles,
    };

    const tiempoRespuestaEscaneoMs = Date.now() - tiempoInicio;
    _logger.info(`Tiempo de escaneo: ${tiempoRespuestaEscaneoMs.toString()}ms`);

    await guardarResultado(urlObjetivo, resultado);

    return resultado;
  } catch (error) {

    const message = error.message || 'Falla en la intercepcion de datos. Objetivo inalcanzable.'
    _logger.error(message);
    throw new Error(message);

  } finally {
    //Cierre del navegador se debe hacer siempre, se pasa a bloque finally
    if (navegador) {
      await navegador.close();
    }
  }
}

module.exports = ejecutarExtraccion;
