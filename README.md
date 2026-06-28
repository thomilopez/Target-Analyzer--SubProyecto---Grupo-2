# CTU Target Analyzer — Guía de Integración Frontend ↔ Backend

---

## 1. Resumen

El frontend ya está terminado y funciona en **modo demo** (respuesta simulada).
Para activar la integración real, el backend solo necesita implementar **un único endpoint** y respetar el contrato de datos descripto abajo. No hay nada más que tocar del lado del front.

---

## 2. Endpoint requerido

| Campo        | Valor                        |
|--------------|------------------------------|
| **Método**   | `POST`                       |
| **URL**      | `/api/scan`                  |
| **Headers**  | `Content-Type: application/json` |

### Body que envía el frontend

```json
{
  "target_url": "https://objetivo.com"
}
```

---

## 3. Respuesta esperada (JSON)

El backend debe devolver exactamente este objeto JSON con `Content-Type: application/json`.

```json
{
  "vista":      "Descripción de lo que se detectó visualmente",
  "os":         "Linux Ubuntu 22.04",
  "ports":      "22(SSH), 80(HTTP), 443(HTTPS)",
  "encryption": "TLS 1.3",
  "proxy1":     "Ciudad (IP)",
  "proxy2":     "Ciudad (IP)",
  "origin":     "Descripción del origen real de la conexión",
  "latency":    "23ms",
  "packets":    "4,096",
  "alert":      "ALERTA ALTA"
}
```

### Descripción de cada campo

| Campo        | Panel donde aparece | Descripción                                         |
|--------------|---------------------|-----------------------------------------------------|
| `vista`      | Panel 1 — VISTA     | Texto libre. Lo que el robot detectó visualmente del objetivo |
| `os`         | Panel 2 — TECNOLOGÍA | Sistema operativo detectado                        |
| `ports`      | Panel 2 — TECNOLOGÍA | Puertos abiertos (formato libre, ej: `22(SSH), 443(HTTPS)`) |
| `encryption` | Panel 2 — TECNOLOGÍA | Nivel/tipo de encriptación detectado               |
| `proxy1`     | Panel 3 — MAPA ENLACES | Primer nodo proxy en la cadena                  |
| `proxy2`     | Panel 3 — MAPA ENLACES | Segundo nodo proxy en la cadena                 |
| `origin`     | Panel 3 — MAPA ENLACES | Origen real de la conexión                      |
| `latency`    | Panel 4 — MÉTRICAS  | Latencia medida (ej: `"23ms"`)                     |
| `packets`    | Panel 4 — MÉTRICAS  | Paquetes interceptados (ej: `"4,096"`)             |
| `alert`      | Panel 4 — MÉTRICAS  | Nivel de alerta (ej: `"ALERTA ALTA"`, `"IGNORANTE"`) |

> **Nota:** Todos los campos son strings. Si algún campo llega `null`, `undefined` o ausente, el frontend muestra un valor de demo como fallback, sin romper la UI.

---

## 4. Manejo de errores HTTP

Si el backend necesita señalar un error, debe devolver un **HTTP status ≥ 400**.
El frontend lo captura automáticamente y muestra un modal de error con el código recibido.

```
HTTP 400 → el frontend muestra: "Error del servidor: HTTP 400"
HTTP 500 → el frontend muestra: "Error del servidor: HTTP 500"
```

No hace falta un body especial para los errores; el status code es suficiente.

---

## 5. CORS

Si el backend corre en un dominio o puerto distinto al del frontend, **debe permitir CORS** para el origen del frontend.

Ejemplo de header necesario:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 6. Timing — ventana de tiempo disponible

El frontend muestra una barra de carga de **4.5 segundos** antes de mostrar la respuesta.
La llamada al backend se hace al inicio de ese período, así que el backend tiene hasta **~4 segundos** para responder sin que el usuario note ninguna espera adicional.

Si el robot de scraping tarda más, el backend puede implementar un **timeout propio** y devolver los datos parciales disponibles; el frontend mostrará lo que llegue.

---

## 7. Cómo activar la integración en el frontend

Cuando el backend esté listo, en `app.js` buscar la función `callBackend()` y hacer este cambio:

**Eliminar** el bloque marcado como `MODO DEMO`:
```javascript
/* --- MODO DEMO (eliminar cuando el backend esté listo) --- */
return new Promise((resolve) => {
    setTimeout(() => { resolve({ ... }); }, 4000);
});
/* --------------------------------------------------------- */
```

**Descomentar** el bloque marcado como `INTEGRACIÓN REAL`:
```javascript
const response = await fetch('/api/scan', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ target_url: url })
});
if (!response.ok) {
    throw new Error(`Error del servidor: HTTP ${response.status}`);
}
return await response.json();
```

**Eso es todo.** No hay ningún otro cambio necesario en el frontend.

---

## 8. Flujo completo de referencia

```
Usuario ingresa URL → presiona ESCANEO
        │
        ▼
Frontend valida URL (formato http/https)
        │
        ├─ Inválida → Modal de error (no llega al backend)
        │
        └─ Válida
              │
              ▼
        POST /api/scan  { target_url: "..." }
              │
              ▼
        Backend recibe → invoca robot de scraping
              │
              ▼
        Robot devuelve datos al backend
              │
              ▼
        Backend responde JSON (dentro de ~4 s idealmente)
              │
              ▼
        Frontend renderiza resultados en los 4 paneles
```

---

## 9. Contacto / preguntas

Si algún campo del JSON no aplica para cierto objetivo (ej: no se detectaron proxies), enviar el campo igualmente con un string descriptivo:

```json
{ "proxy1": "No detectado", "proxy2": "No detectado" }
```

Esto es preferible a omitir el campo, aunque ambas opciones funcionan sin romper el frontend.
