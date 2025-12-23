# Estructura del Proyecto Go Workout

```
go-workout/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── routines/
│   │   │   └── generate/
│   │   │       └── route.ts          # POST - Generar rutina con IA
│   │   ├── student/
│   │   │   └── routine/
│   │   │       └── route.ts          # GET - Obtener rutina activa
│   │   ├── trainer/
│   │   │   └── students/
│   │   │       └── route.ts          # GET - Obtener alumnos
│   │   ├── users/
│   │   │   └── route.ts              # GET - Listar usuarios
│   │   └── workouts/
│   │       └── log/
│   │           └── route.ts          # POST - Registrar entrenamiento
│   ├── student/
│   │   └── page.tsx                  # Pantalla de alumno
│   ├── trainer/
│   │   └── page.tsx                  # Pantalla de entrenador
│   ├── globals.css                   # Estilos globales (Tailwind)
│   ├── layout.tsx                    # Layout raíz
│   └── page.tsx                      # Pantalla principal (selector)
│
├── src/                              # Código fuente (Clean Architecture)
│   ├── domain/                       # Capa de dominio
│   │   ├── ai.ts                     # Interface AiRoutineGenerator
│   │   └── routine.schema.ts         # Schemas Zod + tipos
│   │
│   ├── infrastructure/               # Implementaciones concretas
│   │   ├── ai/
│   │   │   └── openaiRoutineGenerator.ts  # Implementación con OpenAI
│   │   ├── db/
│   │   │   └── prisma.ts             # Cliente Prisma singleton
│   │   └── repositories/
│   │       ├── routineRepository.ts  # CRUD rutinas y assignments
│   │       ├── userRepository.ts     # CRUD usuarios y relaciones
│   │       └── workoutRepository.ts  # CRUD workout logs
│   │
│   └── use-cases/                    # Lógica de negocio
│       ├── assignRoutine.usecase.ts  # Asignar rutina existente
│       ├── generateRoutine.usecase.ts # Generar con IA y asignar
│       └── logWorkout.usecase.ts     # Registrar entrenamiento
│
├── prisma/                           # Configuración de Prisma
│   ├── schema.prisma                 # Esquema de base de datos
│   └── seed.ts                       # Datos de ejemplo
│
├── .env.example                      # Ejemplo de variables de entorno
├── .eslintrc.json                    # Configuración ESLint
├── .gitignore                        # Archivos ignorados por Git
├── next.config.ts                    # Configuración Next.js
├── package.json                      # Dependencias del proyecto
├── postcss.config.mjs                # Configuración PostCSS
├── tailwind.config.ts                # Configuración TailwindCSS
├── tsconfig.json                     # Configuración TypeScript
│
├── README.md                         # Documentación principal
├── QUICK_START.md                    # Guía rápida de inicio
├── ARCHITECTURE.md                   # Documentación de arquitectura
├── API_DOCUMENTATION.md              # Documentación de API
└── PROJECT_STRUCTURE.md              # Este archivo
```

## Descripción de Directorios

### `/app` - Application Layer (Next.js)

**Responsabilidad:** Manejo de HTTP requests/responses y renderizado de UI.

- **`api/`**: API Routes de Next.js 15 (App Router)
- **`student/`**: Pantalla del panel de alumno
- **`trainer/`**: Pantalla del panel de entrenador
- **`page.tsx`**: Pantalla principal para selección de usuario
- **`layout.tsx`**: Layout compartido (metadata, estilos globales)

### `/src/domain` - Domain Layer

**Responsabilidad:** Definir las reglas de negocio y entidades del dominio.

- **`routine.schema.ts`**: Todos los schemas Zod (Routine, Day, Block, Exercise, etc.)
- **`ai.ts`**: Interface del generador de rutinas con IA

**Características:**
- Sin dependencias de infraestructura
- Schemas type-safe con Zod
- Export de tipos TypeScript

### `/src/use-cases` - Application Layer

**Responsabilidad:** Orquestar la lógica de negocio para cada caso de uso.

- **`generateRoutine.usecase.ts`**: Genera rutina con IA + asigna
- **`assignRoutine.usecase.ts`**: Asigna rutina existente a alumnos
- **`logWorkout.usecase.ts`**: Registra día completado por alumno

**Características:**
- Validación de inputs con Zod
- Verificación de autorizaciones
- Coordinación de múltiples repositories

### `/src/infrastructure` - Infrastructure Layer

**Responsabilidad:** Implementaciones concretas de acceso a datos y servicios externos.

#### `/ai`
- **`openaiRoutineGenerator.ts`**: Implementa `AiRoutineGenerator` con OpenAI API
  - Usa GPT-4o-mini
  - Fallback a rutina dummy si no hay API key
  - Valida respuesta con Zod

#### `/db`
- **`prisma.ts`**: Singleton de Prisma Client (evita múltiples instancias)

#### `/repositories`
- **`routineRepository.ts`**: Templates y assignments de rutinas
- **`userRepository.ts`**: Usuarios y relaciones trainer-student
- **`workoutRepository.ts`**: Logs de entrenamientos

### `/prisma` - Database Configuration

- **`schema.prisma`**: Definición del modelo de datos
  - Enums: Role (TRAINER/STUDENT)
  - Models: User, TrainerStudent, RoutineTemplate, RoutineAssignment, WorkoutLog
- **`seed.ts`**: Script para poblar DB con datos de ejemplo

## Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias y scripts npm |
| `tsconfig.json` | Configuración TypeScript (strict mode) |
| `next.config.ts` | Configuración Next.js |
| `tailwind.config.ts` | Configuración TailwindCSS |
| `postcss.config.mjs` | Procesador CSS |
| `.eslintrc.json` | Reglas de linting |
| `.env.example` | Template de variables de entorno |
| `.gitignore` | Archivos excluidos de Git |

## Archivos de Documentación

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Documentación principal del proyecto |
| `QUICK_START.md` | Guía rápida para ejecutar el proyecto |
| `ARCHITECTURE.md` | Explicación detallada de la arquitectura |
| `API_DOCUMENTATION.md` | Referencia completa de endpoints |
| `PROJECT_STRUCTURE.md` | Este archivo |

## Flujo de Dependencias

```
app/api/routes → use-cases → repositories → prisma
                          ↘ ai-generator → openai
                          ↘ domain/schemas (validation)
```

**Regla de dependencias:**
- `domain` no depende de nadie
- `use-cases` depende de `domain` e `infrastructure`
- `infrastructure` depende de `domain`
- `app` depende de todo

## Convenciones de Nombres

### Archivos
- **Routes**: `route.ts` (Next.js App Router)
- **Pages**: `page.tsx` (Next.js App Router)
- **Use Cases**: `*.usecase.ts`
- **Repositories**: `*Repository.ts`
- **Schemas**: `*.schema.ts`
- **Config**: `*.config.ts` o `*.config.mjs`

### Código
- **Interfaces**: PascalCase (ej: `AiRoutineGenerator`)
- **Classes**: PascalCase (ej: `OpenAiRoutineGenerator`)
- **Functions**: camelCase (ej: `generateRoutine`)
- **Types**: PascalCase (ej: `Routine`, `Day`)
- **Constants**: UPPER_SNAKE_CASE o camelCase según contexto

## Tamaño del Proyecto

```bash
# Líneas de código (aproximado)
TypeScript:     ~2,500 líneas
Prisma Schema:    ~90 líneas
Config files:    ~100 líneas
Documentation: ~1,500 líneas
Total:         ~4,200 líneas
```

## Scripts de Desarrollo

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Build para producción
npm run start        # Ejecutar build de producción
npm run lint         # Linter
npm run db:push      # Sync Prisma schema → DB
npm run db:migrate   # Crear migración
npm run db:seed      # Poblar DB
npm run db:studio    # UI visual de DB
```

## Próximos Pasos para Extender

Si querés agregar funcionalidades:

1. **Nuevo endpoint**: Crear `app/api/[feature]/route.ts`
2. **Nuevo use case**: Crear `src/use-cases/[feature].usecase.ts`
3. **Nuevo repository**: Crear `src/infrastructure/repositories/[feature]Repository.ts`
4. **Nuevo modelo**: Agregar a `prisma/schema.prisma` → `npm run db:push`
5. **Nuevo schema**: Agregar a `src/domain/[feature].schema.ts`

## Recursos Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Zod Docs](https://zod.dev)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
