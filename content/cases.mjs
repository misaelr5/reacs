// Public facts supplied by the project owner. Screenshots captured from live sites.
const projectCases = [
  {
    slug: 'remediacion-malware-wordpress', name: 'Remediación de malware en WordPress', category: 'Investigación y seguridad', type: 'Cliente confidencial',
    tags: ['Ciberseguridad', 'Limpieza de malware', 'Hardening'],
    headline: 'Investigar el compromiso. Recuperar el sitio.',
    summary: 'Análisis de un WordPress comprometido, eliminación del código malicioso identificado y medidas de hardening.',
    image: 'mockup-seguridad', width: 1440, height: 810,
    imageAlt: 'Mockup ilustrativo de un entorno de análisis de seguridad WordPress en una laptop.',
    imageCaption: 'Mockup ilustrativo. Los indicadores mostrados no son resultados del sitio intervenido.',
    need: 'Intervenir un entorno WordPress comprometido y preservar su contenido legítimo durante la recuperación.',
    work: ['Investigación de indicadores de compromiso, webshells y código inyectado.', 'Backups de archivos y base de datos antes de intervenir.', 'Eliminación del código malicioso identificado.', 'Reemplazo del core de WordPress por una instalación verificada.', 'Aplicación de medidas de hardening como parte de la recuperación.'],
    delivery: 'Una intervención que combinó investigación, preservación del contenido, limpieza y refuerzo de la instalación.',
    technologies: ['WordPress', 'Análisis de malware', 'Hardening'],
    note: 'La identidad y los archivos del sitio no se incluyen en este caso. La intervención describe el trabajo realizado; no implica una garantía de ausencia de vulnerabilidades futuras.'
  },
  {
    slug: 'travel-days', name: 'Travel Days', category: 'Turismo y viajes de egresados', type: 'Cliente',
    tags: ['Desarrollo web', 'Catálogo de destinos', 'Consultas por WhatsApp'],
    headline: 'Una nueva forma de presentar cada viaje.',
    summary: 'Un sitio a medida que reúne destinos, viajes de egresados y consultas por WhatsApp.',
    image: 'mockup-travel-days', width: 1440, height: 810, url: 'https://traveldays.tur.ar',
    imageAlt: 'Mockup del sitio de Travel Days en una laptop de una oficina de viajes.',
    imageCaption: 'Presentación visual del proyecto Travel Days.',
    need: 'Modernizar la presencia digital de la agencia, presentar mejor sus destinos y viajes de egresados, transmitir confianza y facilitar consultas comerciales.',
    work: ['Diseño y desarrollo de un sitio institucional personalizado y responsive.', 'Catálogo interactivo de destinos nacionales e internacionales.', 'Secciones de viajes escolares y egresados.', 'Testimonios audiovisuales y presentación de la empresa.', 'Accesos a WhatsApp para iniciar consultas.'],
    delivery: 'Una plataforma que reúne la identidad de Travel Days y su oferta de viajes, con recorridos claros hacia la consulta comercial.',
    technologies: ['Next.js', 'TypeScript', 'Cloudflare']
  },
  {
    slug: 'comunidad-cristiana-villa-sarmiento', name: 'Comunidad Cristiana', category: 'Comunidad e identidad institucional', type: 'Cliente',
    tags: ['Sitio institucional', 'Diseño responsive'],
    headline: 'La comunidad, también cerca en la web.',
    summary: 'Un sitio institucional propio para presentar la comunidad y acercar su información a nuevas personas.',
    image: 'mockup-comunidad-cristiana', width: 1440, height: 810, url: 'https://comunidadcristianavillasarmiento.com',
    imageAlt: 'Mockup del sitio de Comunidad Cristiana en escritorio, laptop y teléfono.',
    imageCaption: 'Presentación del proyecto en distintos dispositivos.',
    need: 'Contar con una presencia digital propia que represente la identidad de la comunidad y permita comunicar información institucional de manera accesible.',
    work: ['Diseño y desarrollo de un sitio institucional personalizado.', 'Presentación de la comunidad y su identidad.', 'Organización de la información institucional.', 'Adaptación de la experiencia a dispositivos móviles.'],
    delivery: 'Un espacio digital propio para conocer la comunidad y acceder a su información desde distintos dispositivos.',
    technologies: ['Diseño web', 'Desarrollo institucional', 'Diseño responsive']
  },
  {
    slug: 'mas-servicios', name: 'Más Servicios', category: 'Servicios y autogestión', type: 'Cliente',
    headline: 'Una web que el equipo puede actualizar.',
    summary: 'Servicios, sucursales y vías de contacto en un sitio WordPress autogestionable.',
    image: 'mockup-mas-servicios', width: 1440, height: 810,
    imageAlt: 'Mockup del sitio de Más Servicios en una laptop, con pantalla frontal e iluminación de estudio.',
    imageCaption: 'Mockup de presentación del sitio de Más Servicios.',
    need: 'Tener una web profesional para un centro integral de servicios de Córdoba que el propio equipo pudiera actualizar sin depender de un programador.',
    work: ['Diseño y desarrollo de un sitio WordPress autogestionable.', 'Presentación de servicios y sucursales.', 'Mapas, preguntas frecuentes, formularios y acceso a WhatsApp.', 'Capacitación para gestionar el contenido del sitio.'],
    delivery: 'Un sitio institucional con contenido administrable y herramientas para facilitar el contacto con cada sucursal.',
    technologies: ['WordPress', 'Diseño web', 'Capacitación']
  },
  {
    slug: 'portfolio-de-misael-ledesma', name: 'Portfolio de Misael Ledesma', category: 'Presentación profesional', type: 'Proyecto propio',
    headline: 'Perfil, proyectos y contacto en un solo lugar.',
    summary: 'Un portfolio personal para presentar el trabajo de Misael como desarrollador web full-stack.',
    imageFile: 'portfolio-misael-ledesma.webp', width: 1672, height: 941, url: 'https://misaelr5.vercel.app/',
    need: 'Presentar el perfil profesional y reunir proyectos y vías de contacto en un solo sitio.',
    work: ['Diseño y desarrollo de un sitio web personal.', 'Presentación del perfil profesional.', 'Selección de proyectos y enlaces de contacto.'],
    delivery: 'Una presentación personal que reúne el perfil, los proyectos y las formas de contacto.',
    technologies: ['Diseño web', 'Desarrollo web']
  }
];

const crm = {
  slug: 'crm-reac-studio', name: 'REAC LEADS', category: 'CRM de prospección y gestión comercial', type: 'Proyecto propio',
  tags: ['Sistema a medida', 'CRM', 'Cobros y seguimientos'],
  headline: 'Clientes, cobros y prospección en un mismo sistema.',
  summary: 'CRM personalizado para la gestión comercial de Reac Studio.',
  need: 'Reunir la gestión de clientes, los cobros y la prospección de Reac Studio.',
  work: ['Prospectos y oportunidades con búsqueda, filtros, prioridades y estados.', 'Agenda de seguimientos, vencimientos e historial comercial.', 'Registro de cobros e importación y exportación de movimientos.', 'Plantillas de mensajes y apertura de WhatsApp para el contacto comercial.', 'Dashboard y backups JSON/CSV con control de duplicados.'],
  delivery: 'Una aplicación local que centraliza prospectos, clientes, seguimientos y cobros para el trabajo comercial de Reac Studio.',
  technologies: ['React 18', 'JavaScript', 'Vite 5', 'CSS', 'GSAP', 'localStorage'],
  image: 'mockup-reac-leads', width: 1440, height: 810,
  imageAlt: 'Mockup de REAC LEADS en una laptop, con dashboard, seguimientos y cartera comercial.',
  imageCaption: 'Mockup de presentación con datos de ejemplo.',
  note: 'Aplicación local de uso interno, con almacenamiento en el navegador y backups JSON/CSV. El repositorio es privado.'
};
export const cases = [projectCases[0], crm, projectCases[1], projectCases[4], projectCases[2], projectCases[3]];
