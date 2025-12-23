# Go Workout - POC

Aplicación web para gestión de rutinas de entrenamiento entre entrenadores (Trainers) y alumnos (Students) con generación de rutinas asistida por IA.

## Stack Tecnológico

- **Next.js 15** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Prisma ORM**
- **PostgreSQL**
- **Zod** (validación de schemas)
- **OpenAI** (generación de rutinas con IA)

## Arquitectura

El proyecto sigue una arquitectura limpia en capas:

```
src/
  domain/           # Schemas Zod e interfaces de dominio
  use-cases/        # Lógica de negocio
  infrastructure/   # Implementaciones concretas (DB, AI, Repositories)
app/
  api/              # API Routes de Next.js
  trainer/          # Pantalla de entrenador
  student/          # Pantalla de alumno
```

## Modelo de Datos

- **User**: Usuarios del sistema (TRAINER o STUDENT)
- **TrainerStudent**: Relación entre entrenador y alumno
- **RoutineTemplate**: Plantillas de rutinas creadas por entrenadores
- **RoutineAssignment**: Rutinas asignadas a alumnos (solo una activa por alumno)
- **WorkoutLog**: Registro de entrenamientos completados por alumnos

## Instalación y Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/go_workout?schema=public"
OPENAI_API_KEY="sk-..."  # Opcional - sin esto usará rutinas de fallback
```

### 3. Crear y migrar la base de datos

```bash
npm run db:push
```

### 4. Poblar la base de datos con datos de ejemplo

```bash
npm run db:seed
```

Esto creará:
- 1 entrenador: `trainer@workout.com`
- 2 alumnos: `alumno1@workout.com`, `alumno2@workout.com`
- Relaciones entre el entrenador y los alumnos
- 1 plantilla de rutina de ejemplo

### 5. Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Uso de la Aplicación

### Pantalla Principal (`/`)

Selecciona un usuario (entrenador o alumno) para ingresar a su panel.

### Panel de Entrenador (`/trainer`)

**Funcionalidades:**

1. **Generar rutina con IA**
   - Especificar objetivo (fuerza, hipertrofia, etc.)
   - Nivel (principiante, intermedio, avanzado)
   - Duración (semanas, días/semana, minutos/sesión)
   - Equipamiento disponible
   - Lesiones/limitaciones
   - Preferencias adicionales

2. **Asignar rutinas a alumnos**
   - Seleccionar uno o más alumnos
   - La rutina generada se asigna automáticamente
   - Al asignar una nueva rutina, la anterior se desactiva

### Panel de Alumno (`/student`)

**Funcionalidades:**

1. **Ver rutina activa**
   - Visualizar todos los días de entrenamiento
   - Ver bloques (Warmup, Strength, Accessories, etc.)
   - Detalles de cada ejercicio (sets, reps, RPE, tempo, alternativas)

2. **Registrar entrenamientos completados**
   - Marcar días como completados
   - Agregar RPE (Rate of Perceived Exertion)
   - Registrar nivel de dolor muscular
   - Comentarios opcionales

3. **Ver historial de completados**
   - Cuántas veces se completó cada día
   - Última fecha de completado

## Endpoints de API

### POST `/api/routines/generate`

Genera una rutina con IA y opcionalmente la asigna a estudiantes.

**Request:**
```json
{
  "trainerId": "string",
  "generateInput": {
    "goal": "HYPERTROPHY",
    "level": "INTERMEDIATE",
    "weeks": 4,
    "daysPerWeek": 4,
    "sessionMinutes": 60,
    "equipment": ["Barras", "Mancuernas"],
    "injuries": [],
    "preferences": "Enfoque en ejercicios compuestos"
  },
  "assignInput": {
    "studentIds": ["student-id-1", "student-id-2"]
  }
}
```

### POST `/api/workouts/log`

Registra un entrenamiento completado.

**Request:**
```json
{
  "studentId": "string",
  "workoutInput": {
    "assignmentId": "string",
    "dayName": "Día 1",
    "rpe": 8,
    "soreness": 5,
    "comment": "Buen entrenamiento"
  }
}
```

### GET `/api/trainer/students?trainerId=xxx`

Obtiene los alumnos de un entrenador.

### GET `/api/student/routine?studentId=xxx`

Obtiene la rutina activa de un alumno y su historial de entrenamientos.

### GET `/api/users`

Obtiene todos los usuarios (para la pantalla de selección).

## Reglas de Negocio

1. **Un alumno solo puede tener UNA rutina activa** - Al asignar una nueva rutina, la anterior se desactiva automáticamente
2. **Validación estricta con Zod** - Todos los inputs y outputs se validan antes de persistir
3. **Autorización por relación** - Un entrenador solo puede asignar rutinas a SUS alumnos
4. **Desacoplamiento de IA** - Si no hay `OPENAI_API_KEY`, se usa un generador de rutinas de fallback
5. **Tipado estricto** - No se usa `any` en TypeScript (excepto donde Prisma Json lo requiere)

## Scripts Disponibles

```bash
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar para producción
npm run start        # Ejecutar versión de producción
npm run lint         # Ejecutar linter
npm run db:push      # Sincronizar schema de Prisma con DB
npm run db:migrate   # Crear migración de Prisma
npm run db:seed      # Poblar DB con datos de ejemplo
npm run db:studio    # Abrir Prisma Studio (UI para DB)
```

## Notas Técnicas

### Generación de Rutinas con IA

- Usa el modelo `gpt-4o-mini` de OpenAI
- Si no hay API key, devuelve una rutina de ejemplo válida
- La respuesta de la IA se valida con Zod antes de persistir
- El prompt está optimizado para generar rutinas estructuradas y seguras

### Prisma Client

- Se genera automáticamente en `node_modules/@prisma/client`
- Se usa un singleton para evitar múltiples instancias en desarrollo
- Los tipos se infieren automáticamente de los modelos

### Validación

- Todos los schemas están definidos en `src/domain/routine.schema.ts`
- Los use cases validan inputs antes de ejecutar lógica de negocio
- Los API routes capturan errores de validación Zod y devuelven 400

### Estado de la Aplicación

- No se usa estado global (Redux, Zustand, etc.)
- Cada pantalla hace fetch directo a las APIs
- Los datos se recargan después de mutaciones exitosas

## Próximos Pasos (Fuera del Scope de POC)

- Autenticación real (NextAuth, Clerk, etc.)
- Paginación en listas
- Tests unitarios e integración
- Edición de rutinas
- Progresión automática (incremento de pesos)
- Gráficos de progreso
- Notificaciones
- PWA para uso móvil
- Caching con React Query
- CI/CD

## Licencia

MIT
