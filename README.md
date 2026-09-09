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
5. `005_indices_listados_crud.sql`
6. `006_indices_administracion_erp.sql`
7. `007_pacientes_agenda_expediente.sql`
8. `008_recetas_procedimientos_laboratorio.sql`
9. `009_auditoria_trazabilidad.sql`
10. `010_especialidades_expediente_psicologico.sql`
11. `seed.sql`

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

## Estructura actual

```text
APP_ClinicaAMI/
├── apps/
│   ├── admin/               # Panel administrativo y clínico
│   └── api/                 # API REST con NestJS y Fastify
├── packages/
│   ├── contracts/           # Contratos compartidos del API
│   ├── database/            # Acceso a PostgreSQL
│   └── ui/                  # Componentes visuales compartidos
├── database/
│   ├── migrations/          # Migraciones SQL versionadas
│   └── seed.sql             # Datos iniciales y de demostración
├── docker-compose.yml       # PostgreSQL local y carga inicial
├── Dockerfile               # Imágenes de producción para admin y API
└── README.md
```

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
- Modelo aplicado: 31 tablas, reglas de integridad y datos iniciales.
- Seed validado con profesionales, usuarios y datos de demostración.
- Prueba de humo disponible en `database/tests/smoke.sql`.
- Monorepo configurado con pnpm y Turborepo.
- Panel administrativo construido con Next.js y API con NestJS/Fastify.
- Acceso, renovación de sesión y cambio de contraseña conectados a PostgreSQL.
- Menú ERP, dashboard y autorización por módulo conectados a `tb_permisos_rol`.
- Infraestructura CRUD reutilizable con listados paginados, filtros, modales y errores tipados.
- CRUD administrativo de usuarios, profesionales, especialidades y servicios.
- CRUD de pacientes, agenda de citas y consultorios con paginación del servidor.
- Expedientes general y psicológico separados, con notas, diagnóstico CIE-10 e historial de signos vitales.
- Alcance por profesional vinculado para médicos y psicólogos en agenda y expedientes.
- Recetas inmutables con anulación justificada, procedimientos y laboratorio con finalización protegida.
- Bitácora append-only de creaciones, modificaciones y cambios sensibles, con snapshots saneados antes/después.
- Visor de auditoría exclusivo para administradores, con filtros, paginación y detalle en modal.
- Prueba de aislamiento disponible en `database/tests/authorization.sql`.
- Dockerfile multi-stage preparado para construir el panel y el API por separado.

## Imágenes Docker de la aplicación

El `Dockerfile` raíz tiene dos destinos independientes y ejecuta los procesos
como el usuario no privilegiado `node`.

Construir el API:

```bash
docker build --target api-runner -t clinica-ami-api .
```

Construir el panel indicando la URL pública del API que utilizará el navegador:

```bash
docker build \
  --target admin-runner \
  --build-arg NEXT_PUBLIC_API_URL=https://api.ejemplo.com/api/v1 \
  -t clinica-ami-admin .
```

Ejecutar localmente las imágenes construidas:

```bash
docker run --rm \
  --network app-clinica-ami_default \
  --env-file .env \
  -e DATABASE_URL= \
  -e POSTGRES_HOST=postgres \
  -e NODE_ENV=development \
  -p 4000:4000 \
  clinica-ami-api
docker run --rm -p 3000:3000 clinica-ami-admin
```

El valor `NODE_ENV=development` de este ejemplo permite probar las cookies por
HTTP local. Dockploy debe ejecutar el API en modo producción detrás de HTTPS.

El contenedor del API requiere `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` y `ADMIN_ORIGINS`. Los
secretos JWT deben ser distintos y tener al menos 32 caracteres. El panel no
recibe secretos; `NEXT_PUBLIC_API_URL` se incorpora durante su compilación.

### Configuración en Dockploy

Se deben crear dos servicios desde el mismo repositorio y `Dockerfile`:

- API: destino de build `api-runner`, puerto `4000` y variables privadas del
  entorno.
- Administración: destino de build `admin-runner`, puerto `3000` y argumento
  de build `NEXT_PUBLIC_API_URL` apuntando al dominio HTTPS del API.

Ambas imágenes incluyen una comprobación de salud. PostgreSQL, las migraciones,
el almacenamiento clínico privado y los respaldos se administran como servicios
separados.

No se debe ejecutar el seed de demostración automáticamente sobre una base de
datos que ya contenga información de producción.
