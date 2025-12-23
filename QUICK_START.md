# Quick Start Guide - Go Workout POC

## Pasos Rápidos para Ejecutar el Proyecto

### 1. Requisitos Previos

- Node.js 18+ instalado
- PostgreSQL instalado y corriendo
- (Opcional) API Key de OpenAI

### 2. Instalación

```bash
# Instalar dependencias
npm install
```

### 3. Configurar Base de Datos

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env y configurar tu DATABASE_URL
# Ejemplo para PostgreSQL local:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/go_workout?schema=public"
```

Si usas Docker para PostgreSQL:

```bash
docker run --name go-workout-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=go_workout \
  -p 5432:5432 \
  -d postgres:15
```

Luego usa:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/go_workout?schema=public"
```

### 4. Migrar y Poblar Base de Datos

```bash
# Sincronizar schema de Prisma con la base de datos
npm run db:push

# Poblar con datos de ejemplo
npm run db:seed
```

### 5. (Opcional) Configurar OpenAI

Si quieres usar generación real de rutinas con IA:

```bash
# Agregar a .env
OPENAI_API_KEY="sk-tu-api-key-aqui"
```

Si no configuras esto, la app usará rutinas de fallback (funciona igual).

### 6. Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 7. Probar la Aplicación

#### Como Entrenador:
1. En la pantalla principal, selecciona "Carlos Entrenador"
2. Verás 2 alumnos (María González y Juan Pérez)
3. Completa el formulario de generación de rutina:
   - Objetivo: Hipertrofia
   - Nivel: Intermedio
   - Semanas: 4
   - Días/semana: 4
   - Duración: 60 minutos
4. Selecciona uno o ambos alumnos
5. Click en "Generar Rutina"
6. Espera unos segundos (si usas OpenAI) o instantáneo (fallback)
7. Verás mensaje de éxito

#### Como Alumno:
1. Volver al inicio y seleccionar "María González"
2. Verás la rutina asignada por el entrenador
3. Expandir un día (ej: "Día 1")
4. Ver todos los ejercicios organizados por bloques
5. Registrar el entrenamiento:
   - RPE: 7
   - Dolor muscular: 5
   - Comentario: "Buen entrenamiento"
6. Click en "Marcar como completado"
7. El contador de completados se actualiza

## Estructura de Usuarios de Prueba

Después del seed tendrás:

**Entrenador:**
- Email: `trainer@workout.com`
- Nombre: Carlos Entrenador

**Alumnos:**
- Email: `alumno1@workout.com`, Nombre: María González
- Email: `alumno2@workout.com`, Nombre: Juan Pérez

Ambos alumnos están asignados al entrenador Carlos.

## Comandos Útiles

```bash
# Ver base de datos visualmente
npm run db:studio

# Compilar proyecto
npm run build

# Ejecutar versión de producción
npm run start

# Linter
npm run lint
```

## Solución de Problemas

### Error: "Can't reach database server"

Verifica que PostgreSQL esté corriendo:
```bash
# macOS con Homebrew
brew services list

# Linux
sudo systemctl status postgresql

# Docker
docker ps
```

### Error: "Table does not exist"

Ejecuta las migraciones:
```bash
npm run db:push
```

### Error: "No users found"

Ejecuta el seed:
```bash
npm run db:seed
```

### La generación de rutinas tarda mucho

Es normal con OpenAI (5-15 segundos). Si quieres respuesta instantánea, quita la API key.

### Error: "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

## Próximos Pasos

1. Lee el `README.md` para entender la arquitectura
2. Lee `ARCHITECTURE.md` para detalles técnicos
3. Explora el código en `src/` siguiendo las capas
4. Prueba los diferentes endpoints de API con Postman/Insomnia
5. Modifica los schemas de Zod en `src/domain/routine.schema.ts`

## Contacto y Feedback

Este es un proyecto POC educativo. Siéntete libre de:
- Modificar el código
- Agregar features
- Refactorizar
- Usar como base para tu proyecto

La arquitectura está diseñada para ser extendible y mantenible.
