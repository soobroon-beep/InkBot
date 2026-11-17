# Estudio de tatuajes (módulo de INKBOT)

Botón **«Estudio de Tatuajes»** en el menú principal. Es un módulo aparte dentro de `index.html`, entre las marcas `ESTUDIO:INICIO` y `ESTUDIO:FIN`. No toca las historias, el planificador, el banco ni la exportación de video.

## Dónde se guardan los datos (privacidad)
- **Datos de clientes:** en Firestore del proyecto `nova-hub-2a8a0`, en `estudio/{tu uid}/…`. Las reglas viven en el repo de Nova Hub y solo dejan que tu cuenta los lea. **En este repo público no se guarda ningún dato de clientes.**
- **Sin conexión:** todo se guarda en el celular (caché de Firestore + IndexedDB) y se sincroniza solo al volver la señal.
- **Fotos y PDFs:** en el celular y en una carpeta privada **«INKBOT Estudio»** de tu Google Drive. El permiso `drive.file` solo ve los archivos que crea la app.
- **Respaldo:** Ajustes → Exportar respaldo (ZIP con `estudio.json`, fotos y PDFs). También se puede restaurar.

## Para dejarlo funcionando (una sola vez)
1. Hacer merge del PR de reglas en **Nova Hub** (`estudio-reglas`). La Action las publica sola.
2. En Google Cloud del proyecto `nova-hub-2a8a0`, activar **Google Drive API**. Google Calendar API ya está activa por Nova Hub.
3. Si la pantalla de consentimiento de OAuth está en modo «Prueba», tu correo debe estar como usuario de prueba. Google mostrará un aviso de «app no verificada»: es normal para apps personales.
4. Abrir el Estudio, tocar **Entrar con Google** y aceptar Calendar y Drive.
5. En **Ajustes → Tarifa y cotizador**, poner tu tarifa por hora, tu mínimo y tu % de anticipo. Los valores que vienen son de ejemplo.

## Probarlo sin cuenta
`index.html?estudio=demo` abre el Estudio en **modo demo**: guarda solo en ese navegador y no toca Firebase ni Google.

## Notas
- El permiso de Google (Calendar/Drive) dura 1 hora por seguridad. Cuando vence, toca **Reconectar**: la ventana se cierra sola.
- Los avisos funcionan al abrir la app. Para avisos con la app cerrada hace falta un servidor de envío (como el de Nova Hub).
- La IA (la misma de INKBOT) solo redacta mensajes. Todo funciona igual con las plantillas si la IA falla.
