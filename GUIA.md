# Guía rápida de tu web

Web basada en el tema Serif de Zerostatic (MIT license), adaptada a tema oscuro rojo/morado, con un hub "Updates", una sección "Portfolio" y una sección "Analysis".

## Secciones de la web

- **About Me** (`index.md`) — la portada. Foto, texto de presentación, tu email y tus redes sociales.
- **Portfolio** (`portfolio.md` + `_data/portfolio.yml`) — tus obras destacadas.
- **Analysis** (`analysis.md` + `_data/analysis.yml`) — análisis de obras ajenas que te gustan.
- **Updates** (`_updates/`) — el blog/hub cronológico de todos tus proyectos.
- **Contacto** (`contact.md`) — tu email y tus redes.

## Cómo añadir una obra a Portfolio o a Analysis

1. Abre `_data/portfolio.yml` (o `_data/analysis.yml`).
2. Copia uno de los bloques que empiezan por `- title:` y pégalo debajo, con sus mismos guiones/sangría.
3. Cambia `title`, `category` (o `work`/`author` en analysis), `image` (súbela primero a la carpeta `images`) y `excerpt`.
4. `link` es opcional: si lo dejas vacío (`""`), la tarjeta no será clicable; si pones una URL (propia o externa), la tarjeta enlazará ahí.
5. Sube los cambios con GitHub Desktop y en 1-2 minutos está publicado.

## Tus redes sociales y contacto

- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io...). Estos iconos aparecen ahora en **About Me**, **Portfolio**, **Analysis** y **Contacto**.
- El texto que acompaña a los iconos en About Me/Portfolio/Analysis se edita en el `connect_text` de cada página (`index.md`, `portfolio.md`, `analysis.md`).

## Cómo añadir un nuevo update

1. Ve a la carpeta `_updates`.
2. Crea un archivo nuevo. El nombre debe empezar por la fecha: `AAAA-MM-DD-nombre-proyecto.md`
3. Copia el contenido de uno de los 2 archivos de ejemplo que ya existen ahí (uno con vídeo, otro sin vídeo).
4. Cambia estas líneas de arriba (entre `---`):
   - `title`: el título de la pieza
   - `date`: la fecha (debe coincidir con la del nombre del archivo)
   - `category`: la disciplina — "Videojuego", "Escritura", "Modelado 3D" o "Análisis"
   - `image`: la miniatura (súbela primero a la carpeta `images`)
   - `video`: (opcional) el link de "insertar/embed" de YouTube o Vimeo — no el link normal, ver más abajo
   - `excerpt`: resumen de 1-2 frases
5. Escribe el texto debajo, en Markdown.
6. Sube los cambios con GitHub Desktop (ver más abajo) y en 1-2 minutos está publicado.

### Cómo conseguir el link de "embed" del vídeo
- **YouTube:** abre el vídeo → botón Compartir → Insertar → copia solo lo que hay dentro de `src="..."`. Tiene esta forma: `https://www.youtube.com/embed/XXXXXXXXXXX`
- **Vimeo:** botón Compartir → Insertar → igual, copia solo la URL de dentro de `src="..."`. Tiene esta forma: `https://player.vimeo.com/video/XXXXXXXXX`

## Tu foto de perfil (home)

Sube tu foto a la carpeta `images` con el nombre exacto `tu-foto.jpg` (sustituyendo la que hay de ejemplo). Formato retrato, recomendable que la imagen ya venga recortada más o menos en proporción 4:5.

## Páginas y datos que puedes editar

- `index.md` → texto de la portada ("Hola, soy Pau")
- `portfolio.md` / `_data/portfolio.yml` → tus obras
- `analysis.md` / `_data/analysis.yml` → tus análisis
- `contact.md` → texto de la página de contacto
- `_data/contact.yml` → tu email real
- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io)
- `_data/menus.yml` → si quieres cambiar los nombres o el orden del menú

## Logo y favicon

El icono del menú y el favicon (`images/logo/icon.png` y los `images/favicon-*.png`) se generaron a partir del logo que diste, con los colores ajustados a los del sitio (rojo → morado). Si quieres cambiarlo, sustituye esos archivos por otros del mismo nombre y tamaño.

## Colores y tipografía

Se controlan desde `assets/css/style.scss`, casi al principio del archivo (variables `$primary` = rojo, `$secondary` = morado, `$body-bg` = fondo). No hace falta tocar el resto del CSS.

## Importante

No actives ningún "plugin" adicional en `_config.yml` sin comprobar antes que GitHub Pages lo soporta — la mayoría de plugins de terceros no funcionan en el modo de publicación gratuito.
