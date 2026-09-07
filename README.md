# Alternativa Médica Integral A.M.I.

Aplicación de gestión clínica y sitio web público de **Clínica A.M.I.**, ubicada
en Cobán, Alta Verapaz, Guatemala.

Repositorio: <https://github.com/sociotekAU/APP_ClinicaAMI>

## Objetivo

El proyecto reunirá dos productos conectados a una misma API y base de datos:

1. **Página web pública:** presenta servicios, profesionales, galería,
   promociones, anuncios, horarios, ubicación y datos de contacto.
2. **Panel administrativo y clínico:** administra el contenido público y los
   procesos internos de la clínica según los permisos de cada usuario.

## Alcance funcional

### Página web

- Información y contacto de la clínica.
- Servicios y especialidades.
- Directorio de profesionales.
- Galería multimedia.
- Promociones y anuncios con vigencia.

### Administración y operación clínica

- Autenticación, usuarios, roles y permisos por módulo.
- Especialidades, médicos y consultorios.
- Pacientes, citas y agenda.
- Consultas, notas de evolución y signos vitales.
- Medicamentos, recetas y detalle de prescripción.
- Servicios, terapias y procedimientos realizados.
- Catálogo, órdenes y resultados de laboratorio.
- Facturación y caja.
- Proveedores, insumos y movimientos de inventario.
- Archivos de estudios auxiliares.
- Consentimientos informados.
- Administración del contenido de la página web.

## Seguridad

La información clínica es privada. Los permisos deben validarse en el backend,
no solamente en la interfaz. Recepción no debe acceder a notas clínicas o
psicológicas. Los registros clínicos, contables y de inventario no se eliminan
físicamente; se desactivan, anulan o compensan según corresponda.

Nunca deben incluirse en Git:

- Contraseñas de producción o archivos `.env`.
- Datos reales de pacientes usados como pruebas.
- Archivos médicos subidos por pacientes o profesionales.
- Respaldos o volcados de la base de datos.

## Base de datos

El diseño utiliza PostgreSQL 16. Las migraciones ya están integradas en
`database/migrations/` y el seed se encuentra en `database/seed.sql`.

Orden de ejecución preparado:

1. `001_especialidades_medicos.sql`
2. `002_modulos_clinicos.sql`
3. `003_seguridad_facturacion_inventario.sql`
4. `004_ajustes_y_modulos_publicos.sql`
5. `seed.sql`

En una base y volumen nuevos, Docker ejecuta las migraciones y el seed en ese
orden mediante `/docker-entrypoint-initdb.d`. PostgreSQL no vuelve a ejecutar
estos archivos cuando el volumen ya contiene una base inicializada.

### PostgreSQL local con Docker

1. Copiar `.env.example` como `.env` y definir una contraseña local.
2. Iniciar la base:

   ```bash
   docker compose up -d
   ```

3. Comprobar el servicio:

   ```bash
   docker compose ps
   ```

4. Ejecutar la prueba de humo reversible:

   ```bash
   docker compose exec -T postgres psql \
     -U ami_admin -d clinica_ami \
     -f /database-tests/smoke.sql
   ```

La instancia local preparada usa el puerto `5432`. Los valores concretos de
usuario, base y contraseña se mantienen en `.env`, archivo excluido de Git.

## Estructura prevista

```text
APP_ClinicaAMI/
├── apps/
│   ├── web/                 # Página pública
│   └── admin/               # Panel administrativo y clínico
├── packages/
│   ├── api/                 # Reglas y endpoints compartidos
│   ├── database/            # Acceso a PostgreSQL
│   ├── ui/                  # Componentes visuales compartidos
│   └── config/              # Configuración común
├── database/
│   ├── migrations/          # Migraciones SQL versionadas
│   └── seed.sql             # Datos iniciales y de demostración
├── docker-compose.yml       # PostgreSQL local y carga inicial
└── README.md
```

La estructura es una propuesta inicial y podrá ajustarse cuando se confirme el
framework del frontend, backend y ORM.

## Identidad visual

- `#003b79` — principal.
- `#6d6d6d` — secundario.
- `#e6ae7f` — acento.
- `#ffffff` — fondo y contraste.
- `#967551` — acento complementario.

El logotipo principal disponible es `MEDIA/LOGgb.png` dentro del directorio
general del proyecto.

## Estado actual

- Contexto institucional consolidado.
- PostgreSQL 16 desplegado localmente mediante Docker y marcado como saludable.
- Modelo aplicado: 30 tablas, cinco triggers y datos iniciales.
- Seed validado con profesionales, usuarios y datos de demostración.
- Prueba de humo disponible en `database/tests/smoke.sql`.
- Desarrollo de la aplicación todavía no iniciado.
- Framework y estrategia final de despliegue en Dockploy pendientes de definir.

## Despliegue futuro en Dockploy

El repositorio deberá incluir posteriormente:

- `Dockerfile` para cada aplicación o servicio.
- Archivo de variables de ejemplo sin secretos (`.env.example`).
- Configuración de conexión a PostgreSQL mediante variables de entorno.
- Comprobaciones de salud para web, admin y API.
- Migraciones ejecutadas de forma explícita y segura antes de iniciar la app.
- Volumen o almacenamiento externo privado para estudios clínicos.
- Respaldos automáticos de PostgreSQL.

No se debe ejecutar el seed de demostración automáticamente sobre una base de
datos que ya contenga información de producción.
