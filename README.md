# KCAL/GYM

App de comidas + gym, offline, sin cuentas. HTML/CSS/JS puro (sin build,
sin dependencias) — pensada para desplegar tal cual en Vercel.

## Estructura

```
index.html      shell de la app
style.css       todos los estilos (tokens de color, tipografía Archivo)
data.js         contenido fijo: programa de gym + presupuesto de comidas
store.js        persistencia en localStorage (ideas, pesos, sesión activa)
app.js          router + pantallas + interacciones
assets/         pon aquí tu foto de fondo, ver abajo
```

## Poner tu foto de fondo

La pantalla de inicio (antes de entrar en Comidas o Gym) usa una foto a
pantalla completa. Para añadirla:

1. Guarda tu imagen como `hero.jpg` (formato JPG).
2. Colócala en la carpeta `assets/`, sustituyendo el archivo de ejemplo.
3. Recarga la app — se detecta sola, no hay que tocar código.

Si no hay ninguna foto en `assets/hero.jpg`, se ve un degradado oliva de
aviso con el texto "Foto de fondo" para que sepas dónde va.

La pantalla "Reparto del día" (dentro de Comidas) y el resto de pantallas
usan fondo oliva liso, sin foto — eso no cambia.

## Probar en local

No hace falta instalar nada. Cualquier servidor estático vale, por ejemplo:

```bash
npx serve .
# o
python3 -m http.server 8080
```

Y abre la URL que te indique en el navegador.

## Desplegar en Vercel

Opción más simple (sin terminal):
1. Ve a vercel.com/new → "Deploy" → arrastra esta carpeta, o conéctala
   desde un repositorio de GitHub.
2. Framework preset: **Other** (es HTML estático, no hace falta build).
3. Deploy.

Con la CLI de Vercel:
```bash
npm i -g vercel
cd kcalgym
vercel --prod
```

## Datos y almacenamiento

Todo vive en `localStorage` del navegador (clave `kcalgym_state_v1`):
ideas de comida que añadas o edites, pesos registrados por ejercicio,
y la sesión de gym en curso. No hay servidor ni cuenta: si cambias de
navegador o borras datos del sitio, se pierde el historial.

## Qué es editable desde la app y qué no

- **Comidas**: las ideas (nombre, kcal, proteína, ingredientes, nota de
  ajuste) se pueden añadir, editar y borrar desde la propia app.
- **Gym**: el programa (ejercicios, series×reps, RIR) es fijo — viene del
  PDF de entrenamiento. Lo que registras cada sesión son los pesos; el
  histórico y el "último peso" se calculan solos a partir de eso.
- **Titular de la Home**: toca el texto grande de la portada para
  cambiarlo (por ejemplo, tu objetivo de la semana).
