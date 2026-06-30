const cheerio = require('cheerio');

const LISTA_PALABRAS_VACIAS = [
  'a', 'al', 'algo', 'and', 'are', 'as', 'at', 'be', 'by', 'con', 'de', 'del', 'el', 'en',
  'es', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'la', 'las', 'lo', 'los', 'mas', 'mi',
  'my', 'no', 'of', 'on', 'or', 'para', 'por', 'que', 'se', 'si', 'sin', 'su', 'sus', 'te',
  'that', 'the', 'this', 'to', 'tu', 'un', 'una', 'uno', 'was', 'we', 'with', 'you', 'your'
];

function limpiarTexto(valor) {
  return valor ? valor.replace(/\s+/g, ' ').trim() : null;
}

function obtenerDominio(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function hayCoincidencia(textoBase, opciones) {
  return opciones.some((opcion) => (textoBase || '').includes(opcion));
}

function detectar(nombre, categoria, seniales) {
  const senialesEncontradas = [];

  seniales.forEach((senial) => {
    const etiqueta = senial[0];
    const presente = senial[1];

    if (presente) {
      senialesEncontradas.push(etiqueta);
    }
  });

  return {
    name: nombre,
    category: categoria,
    detected: senialesEncontradas.length > 0,
    confidence: Math.min(1, Number((senialesEncontradas.length / Math.max(seniales.length, 1)).toFixed(2))),
    signals: senialesEncontradas
  };
}

function agruparPorCategoria(items) {
  return items.reduce((acumulador, item) => {
    if (!acumulador[item.category]) {
      acumulador[item.category] = [];
    }

    acumulador[item.category].push(item);
    return acumulador;
  }, {});
}

function normalizarHeaders(headers = {}) {
  return Object.entries(headers).reduce((acumulador, [clave, valor]) => {
    acumulador[clave.toLowerCase()] = String(valor || '').toLowerCase();
    return acumulador;
  }, {});
}

function extraerTextoVisible($) {
  const copia = $.root().clone();
  copia.find('script, style, noscript, svg').remove();
  return limpiarTexto(copia.text()) || '';
}

function aUrlAbsoluta(href, baseUrl) {
  if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
    return null;
  }

  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function agregarMedia(media, vistos, tipo, url, selector) {
  if (url && !vistos.has(url)) {
    vistos.add(url);
    media.push({ type: tipo, url, selector });
  }
}

// Busca imagenes normales dentro del HTML.
function extraerImagenes($, baseUrl, media, vistos) {
  $('img[src]').each((_, elemento) => {
    agregarMedia(media, vistos, 'image', aUrlAbsoluta($(elemento).attr('src'), baseUrl), 'img[src]');
  });
}

// Junta videos directos y videos dentro de source.
function extraerVideos($, baseUrl, media, vistos) {
  $('video[src]').each((_, elemento) => {
    agregarMedia(media, vistos, 'video', aUrlAbsoluta($(elemento).attr('src'), baseUrl), 'video[src]');
  });

  $('video source[src]').each((_, elemento) => {
    agregarMedia(media, vistos, 'video', aUrlAbsoluta($(elemento).attr('src'), baseUrl), 'video source[src]');
  });
}

// Junta audios directos y audios dentro de source.
function extraerAudios($, baseUrl, media, vistos) {
  $('audio[src]').each((_, elemento) => {
    agregarMedia(media, vistos, 'audio', aUrlAbsoluta($(elemento).attr('src'), baseUrl), 'audio[src]');
  });

  $('audio source[src]').each((_, elemento) => {
    agregarMedia(media, vistos, 'audio', aUrlAbsoluta($(elemento).attr('src'), baseUrl), 'audio source[src]');
  });
}

// Revisa estilos inline por si hay imagenes de fondo.
function extraerFondos($, baseUrl, media, vistos) {
  $('[style]').each((_, elemento) => {
    const estilo = $(elemento).attr('style');

    if (!estilo || !estilo.includes('background-image')) {
      return;
    }

    const coincidencias = estilo.match(/url\(["']?([^"')]+)["']?\)/g);
    if (!coincidencias) {
      return;
    }

    coincidencias.forEach((coincidencia) => {
      const urlEncontrada = coincidencia.match(/url\(["']?([^"')]+)["']?\)/);
      agregarMedia(media, vistos, 'background-image', aUrlAbsoluta(urlEncontrada && urlEncontrada[1], baseUrl), '[style]');
    });
  });
}

function extraerOpenGraph($, baseUrl, media, vistos) {
  $('meta[property="og:image"]').each((_, elemento) => {
    agregarMedia(media, vistos, 'og:image', aUrlAbsoluta($(elemento).attr('content'), baseUrl), 'meta[property="og:image"]');
  });

  $('meta[property="og:video"]').each((_, elemento) => {
    agregarMedia(media, vistos, 'og:video', aUrlAbsoluta($(elemento).attr('content'), baseUrl), 'meta[property="og:video"]');
  });
}

function extraerIconos($, baseUrl, media, vistos) {
  $('link[rel="icon"]').each((_, elemento) => {
    agregarMedia(media, vistos, 'favicon', aUrlAbsoluta($(elemento).attr('href'), baseUrl), 'link[rel="icon"]');
  });

  $('link[rel="apple-touch-icon"]').each((_, elemento) => {
    agregarMedia(media, vistos, 'apple-touch-icon', aUrlAbsoluta($(elemento).attr('href'), baseUrl), 'link[rel="apple-touch-icon"]');
  });
}

function extractMedia($, baseUrl) {
  const media = [];
  const vistos = new Set();

  extraerImagenes($, baseUrl, media, vistos);
  extraerVideos($, baseUrl, media, vistos);
  extraerAudios($, baseUrl, media, vistos);
  extraerFondos($, baseUrl, media, vistos);
  extraerOpenGraph($, baseUrl, media, vistos);
  extraerIconos($, baseUrl, media, vistos);

  return media;
}

function extractLinks($, baseUrl) {
  const links = [];
  const vistos = new Set();

  $('a[href]').each((_, elemento) => {
    const urlAbsoluta = aUrlAbsoluta($(elemento).attr('href'), baseUrl);

    if (urlAbsoluta && !vistos.has(urlAbsoluta)) {
      vistos.add(urlAbsoluta);
      links.push(urlAbsoluta);
    }
  });

  return links;
}

function extraerCarruselImagenes($, baseUrl, limite = 20) {
  const media = extractMedia($, baseUrl);
  const mediaActiva = media.filter((item) => item.type === 'image' || item.type === 'og:image');

  return {
    targetDomain: obtenerDominio(baseUrl),
    activeAssetSrc: mediaActiva[0] ? mediaActiva[0].url : null,
    coreHeadline: limpiarTexto($('title').first().text()) || limpiarTexto($('h1').first().text()) || 'Sin titulo',
    total: mediaActiva.length,
    items: mediaActiva.slice(0, limite)
  };
}

function extraerCarruselLinks($, baseUrl, limite = 50) {
  const links = extractLinks($, baseUrl);

  return {
    vectorCount: links.length,
    items: links.slice(0, limite)
  };
}

function detectarServidores(htmlEnMinuscula, headers) {
  return [
    detectar('CloudFront', 'core_server_node', [
      ['server header includes cloudfront', hayCoincidencia(headers.server, ['cloudfront'])],
      ['cdn url includes cloudfront', hayCoincidencia(htmlEnMinuscula, ['cloudfront.net'])]
    ]),
    detectar('Nginx', 'core_server_node', [
      ['server header includes nginx', hayCoincidencia(headers.server, ['nginx'])]
    ]),
    detectar('Apache', 'core_server_node', [
      ['server header includes apache', hayCoincidencia(headers.server, ['apache'])]
    ])
  ];
}

function detectarFrameworks(htmlEnMinuscula, fuentesScripts) {
  return [
    detectar('React', 'frontend_framework', [
      ['script source includes react', hayCoincidencia(fuentesScripts, ['react'])],
      ['react root marker', hayCoincidencia(htmlEnMinuscula, ['data-reactroot', '__react'])]
    ]),
    detectar('Angular', 'frontend_framework', [
      ['angular script source', hayCoincidencia(fuentesScripts, ['angular'])],
      ['angular template marker', hayCoincidencia(htmlEnMinuscula, ['ng-version', 'ng-app', '_ngcontent'])]
    ]),
    detectar('Vue', 'frontend_framework', [
      ['vue script source', hayCoincidencia(fuentesScripts, ['vue'])],
      ['vue app marker', hayCoincidencia(htmlEnMinuscula, ['data-v-app', '__vue__'])]
    ])
  ];
}

function detectarCms(htmlEnMinuscula, generator) {
  return [
    detectar('WordPress', 'cms', [
      ['wp paths', hayCoincidencia(htmlEnMinuscula, ['wp-content', 'wp-includes', 'wp-json'])],
      ['generator meta', hayCoincidencia(generator, ['wordpress'])]
    ])
  ];
}

function detectarLibrerias(htmlEnMinuscula, fuentesScripts, fuentesEstilos) {
  return [
    detectar('Bootstrap', 'ui_framework', [
      ['bootstrap stylesheet', hayCoincidencia(fuentesEstilos, ['bootstrap'])],
      ['bootstrap script', hayCoincidencia(fuentesScripts, ['bootstrap'])]
    ]),
    detectar('jQuery', 'javascript_library', [
      ['jquery script source', hayCoincidencia(fuentesScripts, ['jquery'])],
      ['jquery global usage', hayCoincidencia(htmlEnMinuscula, ['jquery', '$('])]
    ])
  ];
}

function detectarTrackers(htmlEnMinuscula) {
  return [
    detectar('Google Analytics', 'data_surveillance_trackers', [
      ['gtag script', hayCoincidencia(htmlEnMinuscula, ['googletagmanager.com/gtag/js', 'google-analytics.com/analytics.js'])],
      ['analytics usage', hayCoincidencia(htmlEnMinuscula, ['gtag(', 'ga(', 'google_tag_manager'])]
    ]),
    detectar('Google Tag Manager', 'data_surveillance_trackers', [
      ['gtm script', hayCoincidencia(htmlEnMinuscula, ['googletagmanager.com/gtm.js', 'gtm.js'])],
      ['gtm noscript', hayCoincidencia(htmlEnMinuscula, ['googletagmanager.com/ns.html'])]
    ]),
    detectar('Meta Pixel', 'data_surveillance_trackers', [
      ['facebook pixel script', hayCoincidencia(htmlEnMinuscula, ['connect.facebook.net'])],
      ['fbq call', hayCoincidencia(htmlEnMinuscula, ['fbq('])]
    ]),
    detectar('Hotjar', 'data_surveillance_trackers', [
      ['hotjar usage', hayCoincidencia(htmlEnMinuscula, ['hotjar', 'hj('])]
    ])
  ];
}

function detectarMetadatos($) {
  return [
    detectar('Open Graph Protocol', 'network_infrastructure', [
      ['og meta tags', $('meta[property^="og:"]').length > 0]
    ])
  ];
}

function extraerTecnologias($, html, headers) {
  const htmlEnMinuscula = (html || '').toLowerCase();
  const fuentesScripts = $('script[src]').map((_, elemento) => ($(elemento).attr('src') || '').toLowerCase()).get().join(' ');
  const fuentesEstilos = $("link[rel~='stylesheet']").map((_, elemento) => ($(elemento).attr('href') || '').toLowerCase()).get().join(' ');
  const generator = ($('meta[name="generator"]').attr('content') || '').toLowerCase();

  const detecciones = [
    ...detectarServidores(htmlEnMinuscula, headers),
    ...detectarFrameworks(htmlEnMinuscula, fuentesScripts),
    ...detectarCms(htmlEnMinuscula, generator),
    ...detectarLibrerias(htmlEnMinuscula, fuentesScripts, fuentesEstilos),
    ...detectarTrackers(htmlEnMinuscula),
    ...detectarMetadatos($)
  ];

  const detectadas = detecciones.filter((item) => item.detected);

  return {
    detected: detectadas,
    byCategory: agruparPorCategoria(detectadas),
    all: detecciones
  };
}

function extraerEstadisticas($, opciones = {}) {
  const limitePalabras = opciones.topWordsLimit || 10;
  const stopwords = new Set([...(opciones.stopwords || []), ...LISTA_PALABRAS_VACIAS]);
  const texto = extraerTextoVisible($);
  const palabras = texto.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
  const frecuencias = new Map();

  palabras.forEach((palabra) => {
    if (palabra.length < 3 || stopwords.has(palabra)) {
      return;
    }

    frecuencias.set(palabra, (frecuencias.get(palabra) || 0) + 1);
  });

  const topWords = [...frecuencias.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limitePalabras)
    .map(([word, count]) => ({ word, count }));

  return {
    counts: {
      images: $('img').length,
      scripts: $('script').length,
      sections: $('section').length,
      paragraphs: $('p').length,
      inputs: $('input, textarea, select').length,
      articles: $('article').length,
      forms: $('form').length,
      links: $('a[href]').length,
      headings: $('h1, h2, h3, h4, h5, h6').length,
      videos: $('video').length,
      audios: $('audio').length
    },
    topWords
  };
}

function extraerPaneles($, html, baseUrl, headers, config = {}) {
  return {
    imageCarousel: extraerCarruselImagenes($, baseUrl, config.mediaLimit || 20),
    linkCarousel: extraerCarruselLinks($, baseUrl, config.linkLimit || 50),
    technologies: extraerTecnologias($, html, headers),
    stats: extraerEstadisticas($, {
      topWordsLimit: config.topWordsLimit || 10,
      stopwords: config.stopwords || []
    })
  };
}

function createTargetHelpers(html, baseUrl, options = {}) {
  const $ = cheerio.load(html || '');
  const headers = normalizarHeaders(options.headers);

  return {
    $,
    baseUrl,
    toAbsoluteUrl: (href) => aUrlAbsoluta(href, baseUrl),
    extractMedia: () => extractMedia($, baseUrl),
    extractLinks: () => extractLinks($, baseUrl),
    extractImageCarouselData: (limit = 20) => extraerCarruselImagenes($, baseUrl, limit),
    extractLinkCarouselData: (limit = 50) => extraerCarruselLinks($, baseUrl, limit),
    extractTechnologies: () => extraerTecnologias($, html, headers),
    extractStats: (statsOptions = {}) => extraerEstadisticas($, statsOptions),
    extractAllPanels: (config = {}) => extraerPaneles($, html, baseUrl, headers, config)
  };
}

function extractTargetPanels(html, baseUrl, options = {}) {
  return createTargetHelpers(html, baseUrl, options).extractAllPanels(options);
}

module.exports = {
  createTargetHelpers,
  extractTargetPanels
};
