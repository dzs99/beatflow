# BeatFlow v1.0.0

Entrega final de Aplicaciones de Internet — AD2026.

- Aplicación: https://beatflow-dzs99.netlify.app/
- Repositorio: https://github.com/dzs99/beatflow
- Video: guardado únicamente en la computadora, no se publica.
- Referencia del profesor: https://github.com/MarcoARamirezS/aplicaciones-de-internet-ad-2026/tree/master/projects/betflow/docs

## Funcionalidad de las cuatro sesiones

Interfaz adaptable, tendencias y búsqueda con Audius, reproducción real, Play/Pause,
progreso, desplazamiento en la canción, volumen, cola circular, anterior/siguiente
y avance al terminar. Favoritos desde Inicio, Buscar y el reproductor; biblioteca
con favoritos e historial de hasta 20 canciones sin duplicados. El volumen y la
última canción se conservan al recargar, sin reproducción automática.

Los datos se guardan en este navegador con LocalStorage. No se requiere backend.
La configuración usa únicamente la API Key de Audius apta para frontend; no utiliza Bearer Token.

## Ejecutar localmente

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Abrir http://127.0.0.1:4173/. La app usa módulos JavaScript y debe servirse por HTTP.

## Verificar

```sh
node scripts/verify.mjs
```

La comprobación cubre sintaxis, imports, IDs de controles, favoritos, límite y
deduplicación del historial, preferencias, recuperación de JSON inválido y cola circular.
Las pruebas de navegador y la demostración usan canciones reales de Audius.

## Archivos principales

- `index.html`, `css/`: interfaz y estilos de la clase.
- `js/api/audius.api.js`: tendencias, búsqueda y URL de streaming.
- `js/services/`: audio, cola y persistencia.
- `js/ui/`: Inicio, búsqueda, biblioteca, estados y reproductor.
- `js/app.js`: conexión de controles y estado de la aplicación.
- `evidencias/`: código de las sesiones y comprobaciones de la entrega.

## Evidencias de las clases

- [Código de la sesión 2](evidencias/BeatFlow%20-%20Sesion%202.md).
- [Código de la sesión 3](evidencias/BeatFlow%20-%20Sesion%203.md).
- Video de funcionalidad: archivo local, excluido de la publicación.
- [Comprobación de la entrega final](evidencias/VALIDACION.md).

Netlify publica la carpeta raíz; no hay paso de compilación.
