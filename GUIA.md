# Guía rápida de tu web

Web basada en el tema Serif de Zerostatic (MIT license), adaptada a tema oscuro rojo/morado, con dos secciones: "Portfolio" y "Analysis".

## Secciones de la web

- **About Me** (`index.md`) — la portada. Foto, texto de presentación, tu email/redes, y un adelanto de tus piezas destacadas (portfolio + analysis).
- **Portfolio** (`portfolio.md` + `_data/portfolio.yml`) — tus obras.
- **Analysis** (`analysis.md` + `_data/analysis.yml`) — análisis de obras ajenas que te gustan.

No hay páginas separadas de "Updates" ni de "Contacto": el email y las redes viven en la propia caja de la portada, en Portfolio y en Analysis. El botón "Contactar" abre tu cliente de correo directamente.

## Cómo añadir una obra a Portfolio o a Analysis

1. Abre `_data/portfolio.yml` (o `_data/analysis.yml`).
2. Copia uno de los bloques que empiezan por `- title:` y pégalo debajo, con sus mismos guiones/sangría.
3. Cambia `title`, `category` (o `work`/`author` en analysis), `image` (súbela primero a la carpeta `images`) y `excerpt`.
4. `link` es opcional: si lo dejas vacío (`""`), la tarjeta no será clicable; si pones una URL (propia o externa), la tarjeta enlazará ahí.
5. Pon `featured: true` si además quieres que esa pieza aparezca en la portada (About Me), en la columna correspondiente. Se muestran como máximo 3 piezas destacadas por columna (lo puedes cambiar en `_config.yml`, clave `home.limit_featured`).
6. Sube los cambios con GitHub Desktop y en 1-2 minutos está publicado.

## Tus redes sociales y contacto

- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io...). Estos iconos aparecen en **About Me**, **Portfolio** y **Analysis**.
- `_data/contact.yml` → tu email real. Se usa tanto en el botón "Contactar" como en la caja de la portada.
- El texto que acompaña a los iconos en la portada se edita en `connect_text`, dentro del `index.md`.

## Tu foto de perfil (About Me)

Sube tu foto a la carpeta `images` con el nombre exacto `tu-foto.jpg` (sustituyendo la que hay de ejemplo). La foto se recorta automáticamente en formato cuadrado (1:1), así que céntrate en que la cara/sujeto quede centrado en la imagen original.

## Páginas y datos que puedes editar

- `index.md` → texto de la portada ("Hola, soy Pau")
- `portfolio.md` / `_data/portfolio.yml` → tus obras
- `analysis.md` / `_data/analysis.yml` → tus análisis
- `_data/contact.yml` → tu email real
- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io)
- `_data/menus.yml` → si quieres cambiar los nombres o el orden del menú

## Logo y favicon

El icono del menú y el favicon (`images/logo/icon.png` y los `images/favicon-*.png`) están generados a partir del logo que diste, con los colores ajustados a los del sitio (rojo → morado) y sin blanco. Si quieres cambiarlos, sustituye esos archivos por otros del mismo nombre y tamaño.

## Colores y tipografía

Se controlan desde `assets/css/style.scss`, casi al principio del archivo (variables `$primary` = rojo, `$secondary` = morado, `$body-bg` = fondo). No hace falta tocar el resto del CSS.

## Importante

No actives ningún "plugin" adicional en `_config.yml` sin comprobar antes que GitHub Pages lo soporta — la mayoría de plugins de terceros no funcionan en el modo de publicación gratuito.
