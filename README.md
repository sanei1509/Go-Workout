# Go-Workout Mobile

Aplicación móvil para gestión de rutinas de entrenamiento entre entrenadores y alumnos, con planes personalizables, bloques de ejercicios y modo de entrenamiento en tiempo real.

## Stack Tecnológico

- **React Native** + **Expo** (SDK 52)
- **Expo Router** (navegación file-based)
- **TypeScript**
- **NativeWind** (TailwindCSS para React Native)
- **Supabase** (Auth + PostgreSQL + RLS)
- **Zod** (validación de schemas)

## Estructura del Proyecto

```
go-workout-mobile/
├── app/                          # Expo Router (navegación)
│   ├── _layout.tsx               # Layout raíz + AuthProvider
│   ├── index.tsx                 # Redirect según auth
│   ├── login.tsx                 # Pantalla de login
│   ├── registro.tsx              # Pantalla de registro
│   ├── onboarding.tsx            # Selección de rol
│   └── (app)/                    # Rutas protegidas
│       ├── trainer/              # Panel entrenador
│       │   ├── index.tsx         # Home trainer
│       │   ├── invitations.tsx   # Invitaciones enviadas
│       │   └── create-invitation.tsx
│       └── student/              # Panel alumno
│           ├── index.tsx         # Home alumno
│           ├── invitations.tsx   # Invitaciones recibidas
│           ├── invitation/[id].tsx
│           ├── plan/             # Gestión de planes
│           │   ├── create.tsx
│           │   └── [id].tsx
│           ├── routine/          # Gestión de rutinas
│           │   ├── create.tsx
│           │   └── [id].tsx
│           └── workout/          # Modo entrenamiento
│               └── [routineId].tsx
├── lib/
│   ├── supabase.ts               # Cliente Supabase
│   └── services/                 # Servicios de datos
│       ├── profileService.ts
│       ├── invitationService.ts
│       ├── trainerService.ts
│       ├── planService.ts
│       ├── routineService.ts
│       └── workoutService.ts
├── contexts/
│   ├── AuthContext.tsx           # Autenticación
│   └── TrainingContext.tsx       # Contexto de entrenamiento
├── supabase/
│   └── migrations/               # Migraciones SQL
└── components/                   # Componentes reutilizables
```

## Modelo de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios con rol (trainer/student) |
| `invitations` | Invitaciones de entrenador a alumno |
| `student_forms` | Formularios de inscripción personalizables |
| `plans` | Planes de entrenamiento |
| `routines` | Rutinas dentro de un plan (días) |
| `routine_blocks` | Bloques de ejercicios (warmup, main, etc.) |
| `block_exercises` | Ejercicios individuales |
| `workout_sessions` | Sesiones de entrenamiento |
| `exercise_logs` | Registro de ejercicios completados |

### Tipos Enumerados

```sql
-- Tipos de bloque
block_type: 'warmup' | 'main' | 'accessory' | 'cardio' | 'mobility'

-- Tipos de ejercicio
exercise_type: 'reps' | 'time' | 'distance'
```

## Funcionalidades

### 🔐 Autenticación
- Login/Registro con email y contraseña
- Selección de rol (Trainer/Alumno) en onboarding
- Sesión persistente con Supabase Auth

### 👨‍🏫 Panel Entrenador
- Dashboard con lista de alumnos
- Crear invitaciones con formulario configurable
- Ver estado de invitaciones (pendiente/aceptada/rechazada)

### 🏋️ Panel Alumno
- Selector de contexto (plan personal / entrenador)
- Ver y responder invitaciones de entrenadores
- **Gestión de Planes**:
  - Crear plan (nombre, disciplina, frecuencia semanal)
  - Ver detalle con lista de rutinas
  - Eliminar plan
- **Gestión de Rutinas**:
  - Crear rutina (nombre, día 1-7, notas)
  - Agregar bloques por tipo (5 tipos con colores)
  - Agregar/editar/eliminar ejercicios
  - Configurar: series, reps/tiempo/distancia, descanso
- **Modo Entrenamiento**:
  - Interfaz dark mode para enfoque
  - Navegación entre ejercicios
  - Indicadores visuales de series completadas
  - Timer de descanso con vibración
  - Contador de tiempo total
  - Guardado de sesión e historial

## Instalación

### 1. Clonar y configurar

```bash
git clone https://github.com/sanei1509/Go-Workout.git
cd Go-Workout
git checkout go-workout-mobile
cd go-workout-mobile
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Configurar base de datos

Ejecutar las migraciones en orden en Supabase Dashboard → SQL Editor:

```
supabase/migrations/001_create_invitations.sql
supabase/migrations/002_add_invitation_details.sql
supabase/migrations/003_add_email_to_profiles.sql
supabase/migrations/004_add_student_forms.sql
supabase/migrations/005_create_plans.sql
supabase/migrations/006_create_routines.sql
supabase/migrations/007_create_workout_logs.sql
```

### 5. Ejecutar

```bash
# Desarrollo
npx expo start

# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

## Scripts Disponibles

```bash
npx expo start         # Iniciar servidor de desarrollo
npx expo run:ios       # Ejecutar en iOS
npx expo run:android   # Ejecutar en Android
npm run lint           # Ejecutar linter
npx tsc --noEmit       # Verificar tipos TypeScript
```

## Seguridad

- **Row Level Security (RLS)** en todas las tablas
- Los usuarios solo acceden a sus propios datos
- Políticas anidadas para relaciones (plans → routines → blocks → exercises)
- Tokens almacenados con expo-secure-store

## Disciplinas Disponibles

- Musculación
- CrossFit
- Running
- Natación
- Yoga
- Pilates
- Calistenia
- Funcional
- HIIT
- Otro

## Bloques de Ejercicios

| Tipo | Color | Icono | Descripción |
|------|-------|-------|-------------|
| Warmup | Naranja | 🔥 | Calentamiento |
| Main | Azul | 🏋️ | Ejercicios principales |
| Accessory | Violeta | 💪 | Accesorios |
| Cardio | Rojo | ❤️ | Cardiovascular |
| Mobility | Verde | 🧘 | Movilidad/Estiramientos |

## Próximos Pasos

- [ ] Generación de rutinas con IA
- [ ] Historial de entrenamientos con estadísticas
- [ ] Gráficos de progreso
- [ ] Asignación de rutinas trainer → alumno
- [ ] Notificaciones push
- [ ] Sincronización offline
- [ ] Exportar/compartir rutinas

## Licencia

MIT
