// Public facts supplied by the project owner. Screenshots captured from live sites.
export const cases = [
  {
    slug: 'remediacion-malware-wordpress', name: 'Remediación de malware en WordPress', category: 'Investigación y seguridad', type: 'Intervención técnica',
    headline: 'Investigar el compromiso. Recuperar el sitio.',
    summary: 'Análisis de un WordPress comprometido, eliminación del código malicioso identificado y medidas de hardening.',
    image: 'caso-wordpress-seguridad', width: 1440, height: 960,
    imageAlt: 'Ilustración de una web WordPress protegida por un escudo, con fragmentos maliciosos que se disuelven.',
    imageCaption: 'Ilustración conceptual generada con IA para este caso; no muestra el entorno intervenido.',
    need: 'Intervenir un entorno WordPress comprometido y preservar su contenido legítimo durante la recuperación.',
    work: ['Investigación de indicadores de compromiso, webshells y código inyectado.', 'Backups de archivos y base de datos antes de intervenir.', 'Eliminación del código malicioso identificado.', 'Reemplazo del core de WordPress por una instalación verificada.', 'Aplicación de medidas de hardening como parte de la recuperación.'],
    delivery: 'Una intervención que combinó investigación, preservación del contenido, limpieza y refuerzo de la instalación.',
    technologies: ['WordPress', 'Análisis de malware', 'Hardening'],
    note: 'La identidad y los archivos del sitio no se incluyen en este caso. La intervención describe el trabajo realizado; no implica una garantía de ausencia de vulnerabilidades futuras.'
  },
  {
    slug: 'travel-days', name: 'Travel Days', category: 'Turismo y viajes de egresados', type: 'Sitio en producción',
    headline: 'Una nueva forma de presentar cada viaje.',
    summary: 'Un sitio a medida que reúne destinos, viajes de egresados y consultas por WhatsApp.',
    image: 'caso-travel-days', width: 1440, height: 1000, url: 'https://traveldays.tur.ar',
    need: 'Modernizar la presencia digital de la agencia, presentar mejor sus destinos y viajes de egresados, transmitir confianza y facilitar consultas comerciales.',
    work: ['Diseño y desarrollo de un sitio institucional personalizado y responsive.', 'Catálogo interactivo de destinos nacionales e internacionales.', 'Secciones de viajes escolares y egresados.', 'Testimonios audiovisuales y presentación de la empresa.', 'Accesos a WhatsApp para iniciar consultas.'],
    delivery: 'Una plataforma que reúne la identidad de Travel Days y su oferta de viajes, con recorridos claros hacia la consulta comercial.',
    technologies: ['Next.js', 'TypeScript', 'Cloudflare']
  },
  {
    slug: 'comunidad-cristiana-villa-sarmiento', name: 'Comunidad Cristiana Villa Sarmiento', category: 'Comunidad e identidad institucional', type: 'Sitio publicado',
    headline: 'La comunidad, también cerca en la web.',
    summary: 'Un sitio institucional propio para presentar la comunidad y acercar su información a nuevas personas.',
    image: 'caso-comunidad-cristiana-villa-sarmiento', width: 1440, height: 1000, url: 'https://comunidadcristianavillasarmiento.com',
    need: 'Contar con una presencia digital propia que represente la identidad de la comunidad y permita comunicar información institucional de manera accesible.',
    work: ['Diseño y desarrollo de un sitio institucional personalizado.', 'Presentación de la comunidad y su identidad.', 'Organización de la información institucional.', 'Adaptación de la experiencia a dispositivos móviles.'],
    delivery: 'Un espacio digital propio para conocer la comunidad y acceder a su información desde distintos dispositivos.',
    technologies: ['Diseño web', 'Desarrollo institucional', 'Diseño responsive']
  },
  {
    slug: 'mas-servicios', name: 'Más Servicios', category: 'Servicios y autogestión', type: 'Proyecto comercial',
    headline: 'Una web que el equipo puede actualizar.',
    summary: 'Servicios, sucursales y vías de contacto en un sitio WordPress autogestionable.',
    imageFile: 'imagen-54a347e5.webp', width: 1536, height: 1024,
    need: 'Tener una web profesional para un centro integral de servicios de Córdoba que el propio equipo pudiera actualizar sin depender de un programador.',
    work: ['Diseño y desarrollo de un sitio WordPress autogestionable.', 'Presentación de servicios y sucursales.', 'Mapas, preguntas frecuentes, formularios y acceso a WhatsApp.', 'Capacitación para gestionar el contenido del sitio.'],
    delivery: 'Un sitio institucional con contenido administrable y herramientas para facilitar el contacto con cada sucursal.',
    technologies: ['WordPress', 'Diseño web', 'Capacitación']
  },
  {
    slug: 'portfolio-de-misael-ledesma', name: 'Portfolio de Misael Ledesma', category: 'Presentación profesional', type: 'Proyecto personal',
    headline: 'Perfil, proyectos y contacto en un solo lugar.',
    summary: 'Un portfolio personal para presentar el trabajo de Misael como desarrollador web full-stack.',
    imageFile: 'portfolio-misael-ledesma.webp', width: 1672, height: 941, url: 'https://misaelr5.vercel.app/',
    need: 'Presentar el perfil profesional y reunir proyectos y vías de contacto en un solo sitio.',
    work: ['Diseño y desarrollo de un sitio web personal.', 'Presentación del perfil profesional.', 'Selección de proyectos y enlaces de contacto.'],
    delivery: 'Una presentación personal que reúne el perfil, los proyectos y las formas de contacto.',
    technologies: ['Diseño web', 'Desarrollo web']
  }
];
