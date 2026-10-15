# BeatFlow — comprobación de entrega final

Referencia: sesiones 1–4 de `MarcoARamirezS/aplicaciones-de-internet-ad-2026`.
El enlace fue confirmado en el mensaje GitHub del profesor en Teams, canal General,
del 10 de septiembre de 2026. La clase del 1 de octubre pide completar la Sesión 4.

## Código y servicios

- Comprobación `node scripts/verify.mjs`: correcta.
- Sintaxis JavaScript, imports locales e IDs de controles: correctos.
- Favoritos: agregar, quitar y detectar el estado guardado.
- Historial: último primero, máximo 20 y sin duplicados.
- Volumen: guardado, lectura y límites entre 0 y 1.
- Recuperación de JSON inválido: devuelve el estado vacío.
- Cola: avance y retroceso circular; cola vacía sin errores.
- Audius: tendencias HTTP 200 y stream HTTP 206 de tipo audio/mpeg.

## Pruebas en Safari

- Reproducción real y avance del contador.
- Play/Pause y reproducción de la última canción restaurada.
- Siguiente y anterior; anterior reinicia si han transcurrido más de 3 segundos.
- Seek por el control de progreso.
- Avance automático al terminar la canción.
- Búsqueda con resultados reales y favoritos desde resultados.
- Biblioteca con favoritos e historial.
- Recarga: conserva favorito, historial, volumen y última canción sin autoplay.
- Diseños revisados a 375, 768, 1024 y 1440 píxeles.

La demostración adjunta registra la aplicación publicada en Netlify.
Las canciones y sus portadas provienen de Audius y dependen de su disponibilidad.
