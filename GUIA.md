# Guía rápida de tu web

Web basada en el tema Serif de Zerostatic (MIT license), adaptada a tema oscuro rojo/morado, con tres secciones ("Portfolio", "Journal" y "My Talented Friends") y **dos idiomas: español (por defecto) e inglés**.

## Cómo funciona el idioma

- El español vive en la raíz del sitio: `/`, `/portfolio/`, `/journal/`, `/friends/`.
- El inglés vive bajo `/en/`: `/en/`, `/en/portfolio/`, `/en/journal/`, `/en/friends/`.
- Arriba a la derecha del menú hay un botón **ES/EN** que cambia de idioma en cualquier momento. Si la página en la que estás tiene una traducción concreta enlazada (ver `translation_url` más abajo), te lleva directamente a ella; si no, te lleva a la portada del otro idioma.
- Todo el texto de la interfaz (botones, "Email:", cabeceras de "Portfolio destacado", etc.) se traduce automáticamente según en qué idioma estés — se controla desde `_data/i18n.yml`, no hace falta tocarlo salvo que quieras cambiar alguna frase fija.

## Escribir contenido en los dos idiomas

Cada pieza de Portfolio y cada entrada de Journal es un archivo en español y, si quieres traducirla, **otro archivo aparte en inglés**. Son dos escrituras independientes, no una traducción automática.

- Español → carpetas `_portfolio/` y `_journal/`
- Inglés → carpetas `_portfolio_en/` y `_journal_en/`

Para enlazar una pieza con su traducción, añade en la cabecera de cada una el campo `translation_url` apuntando a la URL de la otra:

```yaml
# en _portfolio/mi-proyecto.md
translation_url: "/en/portfolio/my-project/"
```
```yaml
# en _portfolio_en/my-project.md
translation_url: "/portfolio/mi-proyecto/"
```

Esto hace que el botón ES/EN, cuando alguien esté leyendo esa pieza en concreto, lleve exactamente a su traducción (y no solo a la portada del otro idioma). Es opcional: si una pieza no tiene traducción, simplemente no le pongas `translation_url` y el botón de idioma llevará a la portada general del otro idioma.

## Cómo añadir una pieza a Portfolio

1. Ve a `_portfolio` (español) o `_portfolio_en` (inglés).
2. Copia el archivo de ejemplo (`ejemplo-nombre-del-proyecto.md` o `example-project-name.md`) y ponle un nombre nuevo (minúsculas, sin espacios ni tildes, p. ej. `mi-juego-de-plataformas.md`).
3. Edita las líneas de arriba (entre `---`): `title`, `category`, `date`, `image` (súbela primero a `images`), `summary`, `featured` (`true` si quieres que también aparezca destacada en la portada) y, si la traduces, `translation_url`.
4. Escribe el contenido completo debajo, en Markdown.
5. Sube los cambios con GitHub Desktop.

## Cómo añadir una entrada a Journal

Igual que en Portfolio, pero en `_journal` / `_journal_en`. Si el artículo analiza una obra ajena, rellena también `work` y `author`; si es una entrada de diario sobre tu propia experiencia, déjalos comentados o bórralos.

En ambos casos (Portfolio y Journal), el campo `link` es opcional: solo rellénalo si quieres que la tarjeta lleve a una URL externa (por ejemplo itch.io) en vez de a la página que se genera automáticamente.

## Cómo añadir un amigo/a a "My Talented Friends"

1. Abre `_data/friends.yml`.
2. Copia el bloque que empieza por `- name:` y pégalo debajo.
3. Rellena `name`, `image` y `link` (compartidos en los dos idiomas), `description` (en español) y `description_en` (en inglés; si lo dejas vacío, se usa la de español también en la web en inglés).
4. Sube los cambios con GitHub Desktop.

No hace falta duplicar el archivo de amigos por idioma: es el mismo `_data/friends.yml` para las dos versiones de la web.

## Piezas destacadas en la portada (About Me)

Cualquier pieza de Portfolio o Journal con `featured: true` en su cabecera aparece automáticamente en la portada de su idioma correspondiente. Se muestran como máximo 3 por columna (lo puedes cambiar en `_config.yml`, clave `home.limit_featured`).

## Tus redes sociales y contacto

- `_data/social.json` → tus enlaces reales (Email, Discord, ArtStation, LinkedIn, itch.io...). Estos iconos aparecen en ambos idiomas, en About Me, Portfolio y Journal.
- `_data/contact.yml` → tu email real. Se usa tanto en el botón de contacto como en la caja de la portada.
- El texto que acompaña a los iconos en la portada se edita en `connect_text`, dentro de `index.md` (español) o `en/index.md` (inglés).

## Tu foto de perfil (About Me)

Sube tu foto a la carpeta `images` con el nombre exacto `tu-foto.jpg` (sustituyendo la que hay de ejemplo). Se usa igual en las dos versiones del idioma. La foto se recorta automáticamente en formato cuadrado (1:1), así que céntrate en que la cara/sujeto quede centrado en la imagen original.

## Páginas y datos que puedes editar

- `index.md` / `en/index.md` → texto de la portada
- `portfolio.md` / `en/portfolio.md` → texto de cabecera de la sección Portfolio
- `journal.md` / `en/journal.md` → texto de cabecera de la sección Journal
- `friends.md` / `en/friends.md` → texto de cabecera de "My Talented Friends"
- `_portfolio/` / `_portfolio_en/` → tus obras (una página por archivo)
- `_journal/` / `_journal_en/` → tus artículos (una página por archivo)
- `_data/friends.yml` → tus amigos destacados (compartido, con descripción en los dos idiomas)
- `_data/contact.yml` → tu email real
- `_data/social.json` → tus enlaces reales
- `_data/menus.yml` → nombres/orden del menú (hay una lista `main` en español y `main_en` en inglés)
- `_data/i18n.yml` → los textos fijos de la interfaz en cada idioma (botones, etiquetas...)

## Logo y favicon

El icono del menú y el favicon (`images/logo/icon.png`, `images/favicon-*.png` y `favicon.ico`) están generados a partir del logo que diste: rojo sólido de marca, sin blanco ni negro (las líneas del dibujo son transparentes, se ve el color de fondo a través de ellas). Si no ves el icono nuevo en la pestaña del navegador, es caché: prueba a cerrar y abrir la pestaña, o Ctrl/Cmd + Shift + R para forzar la recarga.

## Colores y tipografía

Se controlan desde `assets/css/style.scss`, casi al principio del archivo (variables `$primary` = rojo, `$secondary` = morado, `$body-bg` = fondo). No hace falta tocar el resto del CSS.

## Dominio propio (paustoryteller.com)

El sitio ya está configurado para usar `paustoryteller.com` en vez de la URL `.github.io`: hay un archivo `CNAME` en la raíz del repositorio con el dominio, y `_config.yml` tiene la `url` actualizada. Para que funcione de verdad, además de subir estos archivos tienes que:

1. En GitHub: repositorio → **Settings → Pages** → en "Custom domain" escribe `paustoryteller.com` y guarda.
2. En Hostinger: en la gestión DNS de `paustoryteller.com`, añade estos registros (sustituyendo cualquier registro A por defecto que ya exista para `@`):
   - 4 registros **A**, nombre `@`, apuntando cada uno a: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME**, nombre `www`, apuntando a `TU-USUARIO-DE-GITHUB.github.io`
3. Espera entre 15 minutos y unas horas a que se propague el DNS.
4. Vuelve a GitHub → Settings → Pages y activa **"Enforce HTTPS"** en cuanto aparezca disponible (el certificado SSL se genera solo).

Importante: si tu repositorio en GitHub no se llama `TU-USUARIO.github.io` sino algo distinto (p. ej. `paustoryteller-web`), la web solo funcionará igualmente porque el archivo `CNAME` y la configuración de Settings → Pages ya hacen ese enlace — no hace falta renombrar nada.

## Fondo dinámico, scroll y hover

El fondo es un campo continuo de puntos estilo halftone (rojo/morado) dibujado en un `<canvas>`, que cubre toda la pantalla con un patrón de bandas diagonales y un par de "manchas de tinta" más densas en las esquinas — inspirado directamente en las referencias que compartiste. Es interactivo de dos formas: el cursor actúa como una linterna que ilumina los puntos a su alrededor al pasar por encima, y al hacer click (o tocar en móvil) se genera una onda que se expande desde ese punto y se desvanece. No aparece en las páginas de pieza de Portfolio/Journal, para que la lectura quede limpia. También hay una animación de aparición al hacer scroll en las secciones principales (con un poco de rebote), y las tarjetas se inclinan levemente al pasar el cursor. Todo esto respeta la preferencia de "reducir movimiento" del sistema operativo del visitante (accesibilidad) — si la tienen activada, el fondo se queda estático y no hay animaciones.

Los archivos relevantes si algún día quieres tocarlos: `_includes/bg-canvas.html` (el elemento canvas), `assets/js/bg-canvas.js` (todo el dibujado e interactividad — el patrón, el brillo del cursor y las ondas de click), `_sass/components/_bg-shapes.scss` (solo el posicionamiento), `assets/js/effects.js` (animación de aparición al hacer scroll).

## Importante

No actives ningún "plugin" adicional en `_config.yml` sin comprobar antes que GitHub Pages lo soporta — la mayoría de plugins de terceros no funcionan en el modo de publicación gratuito. Todo lo de este sitio (colecciones, permalinks, dos idiomas) funciona sin ningún plugin extra.
