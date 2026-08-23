# Guía rápida de tu web

Web basada en el tema Serif de Zerostatic (MIT license), adaptada a tema oscuro rojo/morado, con un hub "Updates".

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
- `contact.md` → texto de la página de contacto
- `_data/contact.yml` → tu email real
- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io)
- `_data/menus.yml` → si quieres cambiar los nombres del menú

## Colores y tipografía

Se controlan desde `assets/css/style.scss`, casi al principio del archivo (variables `$primary` = rojo, `$secondary` = morado, `$body-bg` = fondo). No hace falta tocar el resto del CSS.

## Importante

No actives ningún "plugin" adicional en `_config.yml` sin comprobar antes que GitHub Pages lo soporta — la mayoría de plugins de terceros no funcionan en el modo de publicación gratuito.
