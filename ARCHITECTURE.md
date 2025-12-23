# Arquitectura del Proyecto Go Workout

## Visión General

Este proyecto implementa una **arquitectura limpia en capas** para una POC (Proof of Concept) de gestión de rutinas de entrenamiento. La separación en capas asegura bajo acoplamiento, alta cohesión y facilidad de testing.

## Capas de la Arquitectura

### 1. Domain Layer (`src/domain/`)

**Responsabilidad:** Definir las reglas de negocio y contratos del dominio.

**Archivos:**
- `routine.schema.ts`: Schemas de validación con Zod para todas las entidades y DTOs
- `ai.ts`: Interface `AiRoutineGenerator` que define el contrato para generadores de rutinas

**Características:**
- Sin dependencias externas
- Schemas type-safe con Zod
- Definición de tipos e interfaces del dominio
- Enums para valores categóricos (Goal, Level, BlockType)

**Dependencias:** Solo Zod para validación

### 2. Use Cases Layer (`src/use-cases/`)

**Responsabilidad:** Orquestar la lógica de negocio específica de cada caso de uso.

**Archivos:**
- `generateRoutine.usecase.ts`: Genera rutina con IA y opcionalmente la asigna
- `assignRoutine.usecase.ts`: Asigna rutina existente a estudiantes
- `logWorkout.usecase.ts`: Registra un entrenamiento completado

**Características:**
- Validación de inputs con schemas Zod
- Verificación de autorizaciones (trainer-student relation)
- Orquestación de múltiples repositories
- Regla de negocio: un alumno solo puede tener una rutina activa

**Dependencias:** Domain layer, Infrastructure repositories

### 3. Infrastructure Layer (`src/infrastructure/`)

**Responsabilidad:** Implementaciones concretas de acceso a datos y servicios externos.

#### 3.1 Database (`src/infrastructure/db/`)
- `prisma.ts`: Singleton de Prisma Client para conexión a PostgreSQL

#### 3.2 AI (`src/infrastructure/ai/`)
- `openaiRoutineGenerator.ts`: Implementación de `AiRoutineGenerator` con OpenAI
  - Usa GPT-4o-mini para generación
  - Fallback a rutina dummy si no hay API key
  - Validación de respuesta de IA con Zod

#### 3.3 Repositories (`src/infrastructure/repositories/`)
- `routineRepository.ts`: CRUD de templates y assignments
- `userRepository.ts`: Operaciones sobre usuarios y relaciones
- `workoutRepository.ts`: Logging y consulta de entrenamientos

**Características:**
- Patrón Repository para abstracción de persistencia
- Cada repository maneja una agregación de dominio
- Queries optimizadas con índices de Prisma

**Dependencias:** Prisma Client, Domain schemas

### 4. Application Layer (`app/`)

**Responsabilidad:** API HTTP y presentación (Next.js App Router).

#### 4.1 API Routes (`app/api/`)

**Endpoints:**
- `POST /api/routines/generate`: Genera y opcionalmente asigna rutina
- `POST /api/workouts/log`: Registra entrenamiento completado
- `GET /api/trainer/students`: Obtiene alumnos de un trainer
- `GET /api/student/routine`: Obtiene rutina activa y logs de un alumno
- `GET /api/users`: Lista todos los usuarios

**Características:**
- Validación de inputs
- Manejo de errores consistente
- Instanciación de use cases y dependencias
- Respuestas JSON con códigos HTTP semánticos

#### 4.2 Pages (`app/`)

**Pantallas:**
- `/`: Selector de usuario (home)
- `/trainer`: Panel de entrenador (generación y asignación)
- `/student`: Panel de alumno (visualización y logging)

**Características:**
- Client-side rendering con `'use client'`
- Fetch directo a APIs sin estado global
- UI responsiva con TailwindCSS
- Recarga de datos después de mutaciones

## Flujo de Datos

### Ejemplo: Generar Rutina

```
1. Usuario (Trainer) → Completa formulario en /trainer
2. Frontend → POST /api/routines/generate
3. API Route → Valida request
4. API Route → Instancia GenerateRoutineUseCase
5. Use Case → Valida input con Zod
6. Use Case → Llama AiRoutineGenerator.generateRoutine()
7. AI Generator → Llama OpenAI API (o fallback)
8. AI Generator → Valida respuesta con Zod
9. Use Case → Crea template via RoutineRepository
10. Use Case → Verifica autorización para cada estudiante
11. Use Case → Crea assignments via RoutineRepository
12. API Route → Devuelve resultado al frontend
13. Frontend → Muestra mensaje de éxito
```

### Ejemplo: Registrar Entrenamiento

```
1. Usuario (Student) → Completa formulario de log
2. Frontend → POST /api/workouts/log
3. API Route → Valida request
4. API Route → Instancia LogWorkoutUseCase
5. Use Case → Valida input con Zod
6. Use Case → Verifica que assignment pertenece al student
7. Use Case → Crea log via WorkoutRepository
8. API Route → Devuelve log creado
9. Frontend → Recarga datos y muestra éxito
```

## Modelo de Datos (Prisma)

### Entidades Principales

```
User (Trainer/Student)
  ├── TrainerStudent (relación M:N)
  ├── RoutineTemplate (creadas por Trainer)
  └── RoutineAssignment (asignadas a Student)
       └── WorkoutLog (completados por Student)
```

### Reglas de Integridad

- `User.role`: ENUM (TRAINER | STUDENT)
- `TrainerStudent`: Clave compuesta (trainerId, studentId)
- `RoutineAssignment.isActive`: Solo una rutina activa por student
- `RoutineAssignment.version`: Auto-incrementa al asignar nueva rutina
- Cascada de eliminaciones: Si se borra un User, se borran sus relaciones

## Principios de Diseño

### 1. Dependency Inversion
- Capas superiores dependen de abstracciones (interfaces)
- Domain no depende de Infrastructure
- Use Cases reciben repositories vía constructor (DI manual)

### 2. Single Responsibility
- Cada use case hace una cosa
- Cada repository maneja una agregación
- Validación separada de lógica de negocio

### 3. Open/Closed
- Fácil agregar nuevos AI generators implementando la interfaz
- Fácil agregar nuevos use cases sin modificar existentes

### 4. Fail Fast
- Validación en los bordes del sistema (API routes)
- Validación en use cases antes de ejecutar lógica
- Errores explícitos y descriptivos

### 5. Type Safety
- TypeScript strict mode
- Zod para runtime validation
- Prisma para type-safe database access
- No uso de `any` (excepto Prisma Json fields)

## Decisiones de Arquitectura

### ¿Por qué no usar un DI container?
Para una POC, la instanciación manual en API routes es suficiente y más explícita.

### ¿Por qué JSON en Prisma en lugar de tablas normalizadas?
La estructura de rutinas es compleja y variable. JSON permite flexibilidad sin sobre-normalización.

### ¿Por qué no usar React Query o SWR?
Para una POC, fetch + useState es suficiente. Agrega complejidad innecesaria.

### ¿Por qué fallback en AI Generator?
Permite desarrollo sin API key de OpenAI. Demuestra el patrón de diseño resiliente.

### ¿Por qué validar dos veces (API + Use Case)?
- API: Validación de formato HTTP
- Use Case: Validación de reglas de negocio
- Permite reusar use cases desde otros entry points

## Testing (Fuera de Scope de POC)

### Estrategia Recomendada

**Unit Tests:**
- Use cases con repositories mockeados
- Schemas Zod

**Integration Tests:**
- API routes con database de prueba
- Flujos completos end-to-end

**Herramientas:**
- Jest / Vitest para unit tests
- Playwright para E2E tests
- Prisma test client para integration tests

## Escalabilidad Futura

### Optimizaciones Posibles

1. **Caching:**
   - Redis para rutinas activas
   - React Query en frontend

2. **Paginación:**
   - Cursor-based para logs
   - Offset-based para listas de usuarios

3. **Background Jobs:**
   - Queue para generación de rutinas (Bull/BullMQ)
   - Webhooks para notificaciones

4. **Multitenancy:**
   - Agregar `organizationId` a User
   - Row-level security en Prisma

5. **Real-time:**
   - WebSockets para notificaciones
   - Server-Sent Events para progreso de generación

## Conclusión

Esta arquitectura prioriza:
- **Simplicidad** sobre sobre-ingeniería
- **Claridad** sobre abstracciones complejas
- **Funcionalidad** sobre perfección técnica

Es una base sólida para escalar a producción agregando las capas que faltan (auth, testing, monitoring, etc.).
