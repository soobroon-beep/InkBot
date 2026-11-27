# Reels virales (módulo de INKBOT)

Botón **«Reels Virales»** en el menú principal. Código en `reels.js`; la voz gratis está en `vendor/piper/`.

## Paso a paso
1. **Material:** sube los clips del tatuaje y la foto final (se ordenan solos). Opcional: escribe o dicta qué tatuaje es.
2. **Estilo:** «Automático» o uno de los 8 formatos. **Copiar un viral:** guarda el video que te gustó y súbelo; la app copia sus cortes, su ritmo y su audio.
3. **Música y voz:** audio en tendencia (lo pones al publicar), audio del viral, tu canción o música INKBOT. Voz narrando: automático / sí / no.
4. **Crear:** sale el MP4 1080×1920 con caption, hashtags, día para publicar y qué audio ponerle. «Compartir» lo manda directo a Instagram o TikTok.

## Edición
- **Lectura exacta de los clips:** cada cuadro se decodifica con WebCodecs (mp4box + VideoDecoder), respetando la rotación del celular. Nada se reproduce en tiempo real, así que no hay cuadros repetidos ni trabas. Si el celular no puede leer un formato, busca cada cuadro uno por uno (más lento, igual de exacto).
- **Montaje que deja correr el video:** una toma continua por clip, en tu orden; solo si un clip es muy largo para su tiempo se hace un salto hacia adelante con una disolvencia corta. Nunca se repite un tramo ni se congela la imagen.
- Respeta el orden en que subes los archivos: el primero abre, el último es el resultado (toma larga, sin cortes). 📍 marca clips de tu ciudad para un gancho local.
- Duración automática según el material (de ~10 s hasta 2 min) o eliges 15 s / 30 s / 1 min / 2 min. Cada reel cambia de ritmo, textos, colores y transiciones.
- Copiar un viral: mismos cortes exactos y mismo audio, sin efectos extra.
- Transiciones (zoom, barrido, glitch, destello, disolvencia), pulso al ritmo, movimiento de cámara, grano, luz dorada y brillo en el resultado, textos animados palabra por palabra con caja dorada en la palabra clave, whoosh en las transiciones.
- El video se reproduce a la velocidad que el celular aguante para que no se repitan cuadros (más fluido).
- Si minimizas la app, se pausa y sigue sola al volver; la pantalla se queda encendida; los últimos 8 reels se guardan en ⚙ Tus reels.

## Pedirle cambios y que aprenda
- Debajo de cada reel: «¿Qué le cambio?» (escrito, dictado o con botones rápidos). Lo rehace con tus mismos clips, sin volver a escribir todo.
- Cada cambio mueve poco a poco tus gustos (cortes, velocidad, transiciones, duración y reglas en tus palabras). Se ven y se borran en ⚙.
- Por defecto: pocos cortes y tomas largas cuando no hay canción; cortes al golpe (nunca muy seguidos) cuando sí hay.

## Gratis y sin ventanas
- **Textos:** IA abierta de Pollinations, sin cuentas (1 respuesta por minuto aprox.). Para que sea instantánea, pon una llave gratis de Gemini o Groq en el menú principal.
- **Voz natural gratis (hombre o mujer):** Supertonic 3 corre dentro del celular, sin llaves ni cuentas. El modelo (~140 MB, en `voz/st3/`, partido en piezas de 24 MB) se descarga la primera vez y queda guardado. Opcional: Gemini TTS con llave gratis, o ElevenLabs. Respaldo: Piper.
- **Dictado:** escucha sin cortarse hasta que vuelves a tocar 🎤 y luego limpia muletillas y repeticiones.

## Notas
- Funciona en Chrome. Deja la app abierta mientras crea el video.
- Las miniaturas son imágenes y al crear se abre un solo video a la vez (los celulares tienen pocos decodificadores). Si un clip no abre, se usa un cuadro fijo nítido de ese clip.
