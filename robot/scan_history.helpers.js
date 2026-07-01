const fs = require('fs/promises');
const path = require('path');

const HISTORY_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(HISTORY_DIR, 'scan-history.json');
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

async function asegurarArchivoHistorial() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });

  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, '{}', 'utf8');
  }
}

function normalizarDominio(urlObjetivo) {
  const dominio = new URL(String(urlObjetivo).trim()).hostname.trim().toLowerCase();

  if (!dominio) {
    throw new Error('No se pudo obtener un dominio valido para el historial.');
  }

  return dominio;
}

function generarFechaKey(fecha = new Date()) {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear());
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');

  return `${dia}${mes}${anio}${horas}${minutos}${segundos}`;
}

function normalizarPaginado(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const pagina = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.floor(Number(page)) : DEFAULT_PAGE;
  const limiteSolicitado = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : DEFAULT_LIMIT;
  const limite = Math.min(limiteSolicitado, MAX_LIMIT);

  return { page: pagina, limit: limite };
}

function paginarItems(items, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const { page: pagina, limit: limite } = normalizarPaginado(page, limit);
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limite);
  const inicio = (pagina - 1) * limite;
  const fin = inicio + limite;

  return {
    items: items.slice(inicio, fin),
    page: pagina,
    limit: limite,
    total,
    totalPages,
  };
}

async function leerHistorial() {
  await asegurarArchivoHistorial();
  const contenido = await fs.readFile(HISTORY_FILE, 'utf8');
  const contenidoLimpio = contenido.trim();

  if (!contenidoLimpio) {
    return {};
  }

  try {
    const historial = JSON.parse(contenidoLimpio);

    if (historial === null || Array.isArray(historial)) {
      return {};
    }

    return historial;
  } catch {
    throw new Error('El archivo de historial JSON esta corrupto.');
  }
}

async function escribirHistorial(historial) {
  await asegurarArchivoHistorial();
  await fs.writeFile(HISTORY_FILE, `${JSON.stringify(historial, null, 2)}\n`, 'utf8');
}

async function guardarResultado(urlObjetivo, resultado) {
  const dominio = normalizarDominio(urlObjetivo);
  const fechaKey = generarFechaKey();
  const historial = await leerHistorial();

  if (historial?.[dominio] === null || Array.isArray(historial?.[dominio])) {
    historial[dominio] = {};
  }

  if (typeof historial?.[dominio] !== 'object') {
    historial[dominio] = {};
  }

  historial[dominio][fechaKey] = resultado;
  await escribirHistorial(historial);

  return {
    dominio,
    fechaKey,
  };
}

async function listarPaginasConHistorial({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) {
  const historial = await leerHistorial();
  const dominios = Object.keys(historial).sort((a, b) => a.localeCompare(b));

  return paginarItems(dominios, page, limit);
}

async function listarFechasPorPagina(dominio, { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) {
  const dominioNormalizado = normalizarDominio(`https://${String(dominio).trim()}`);
  const historial = await leerHistorial();
  const fechas = Object.keys(historial?.[dominioNormalizado] ?? {}).sort((a, b) => b.localeCompare(a));

  return paginarItems(fechas, page, limit);
}

async function obtenerResultadoPorPaginaYFecha(dominio, fechaKey) {
  const dominioNormalizado = normalizarDominio(`https://${String(dominio).trim()}`);
  const historial = await leerHistorial();

  return historial?.[dominioNormalizado]?.[fechaKey] ?? null;
}

module.exports = {
  guardarResultado,
  listarPaginasConHistorial,
  listarFechasPorPagina,
  obtenerResultadoPorPaginaYFecha,
};
