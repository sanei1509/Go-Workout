# API Documentation - Go Workout

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### 1. Generar Rutina con IA

Genera una nueva rutina usando IA (OpenAI) o fallback, la guarda como template y opcionalmente la asigna a estudiantes.

**Endpoint:** `POST /api/routines/generate`

**Request Body:**
```json
{
  "trainerId": "clxxxxx",
  "generateInput": {
    "goal": "HYPERTROPHY",
    "level": "INTERMEDIATE",
    "weeks": 4,
    "daysPerWeek": 4,
    "sessionMinutes": 60,
    "equipment": ["Barras", "Mancuernas", "Máquinas"],
    "injuries": ["Dolor de rodilla"],
    "preferences": "Enfoque en ejercicios compuestos"
  },
  "assignInput": {
    "studentIds": ["clyyyyy", "clzzzzz"]
  }
}
```

**Campos de generateInput:**

| Campo | Tipo | Requerido | Valores | Descripción |
|-------|------|-----------|---------|-------------|
| goal | string | Sí | STRENGTH, HYPERTROPHY, ENDURANCE, WEIGHT_LOSS, GENERAL_FITNESS, SPORT_SPECIFIC | Objetivo del entrenamiento |
| level | string | Sí | BEGINNER, INTERMEDIATE, ADVANCED | Nivel del atleta |
| weeks | number | Sí | 1-16 | Duración en semanas |
| daysPerWeek | number | Sí | 1-7 | Días de entrenamiento por semana |
| sessionMinutes | number | Sí | 1-180 | Duración de cada sesión en minutos |
| equipment | string[] | No | - | Equipamiento disponible |
| injuries | string[] | No | - | Lesiones o limitaciones |
| preferences | string | No | - | Preferencias adicionales |

**Response (201 Created):**
```json
{
  "template": {
    "id": "clxxxxx",
    "trainerId": "clxxxxx",
    "name": "Hipertrofia Intermedia 4 semanas",
    "routine": { /* objeto completo de rutina */ },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "routine": {
    "routineName": "Hipertrofia Intermedia 4 semanas",
    "goal": "HYPERTROPHY",
    "level": "INTERMEDIATE",
    "weeks": 4,
    "daysPerWeek": 4,
    "sessionMinutes": 60,
    "days": [
      {
        "dayName": "Día 1",
        "blocks": [
          {
            "blockName": "Warmup",
            "items": [
              {
                "exerciseName": "Movilidad dinámica",
                "sets": 1,
                "reps": "5-10 min",
                "restSeconds": 0
              }
            ]
          },
          {
            "blockName": "Strength",
            "items": [
              {
                "exerciseName": "Press de banca",
                "sets": 4,
                "reps": 8,
                "restSeconds": 120,
                "rpeTarget": 8,
                "tempo": "3-0-1-0",
                "notes": "Control en la bajada",
                "alternatives": ["Press inclinado", "Press con mancuernas"]
              }
            ]
          }
        ]
      }
    ]
  },
  "assignments": [
    {
      "id": "claaaa",
      "studentId": "clyyyyy",
      "trainerId": "clxxxxx",
      "version": 1,
      "isActive": true,
      "routine": { /* mismo objeto routine */ },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Errores:**
- `400 Bad Request`: Error de validación Zod
- `403 Forbidden`: Trainer no autorizado para asignar a ese student
- `500 Internal Server Error`: Error en generación de rutina

---

### 2. Registrar Entrenamiento Completado

Registra que un alumno completó un día de entrenamiento con feedback.

**Endpoint:** `POST /api/workouts/log`

**Request Body:**
```json
{
  "studentId": "clyyyyy",
  "workoutInput": {
    "assignmentId": "claaaa",
    "dayName": "Día 1",
    "rpe": 8,
    "soreness": 6,
    "comment": "Sentí buen pump en pecho, me costó el último set"
  }
}
```

**Campos de workoutInput:**

| Campo | Tipo | Requerido | Valores | Descripción |
|-------|------|-----------|---------|-------------|
| assignmentId | string | Sí | - | ID de la asignación de rutina |
| dayName | string | Sí | - | Nombre del día completado (ej: "Día 1") |
| rpe | number | No | 1-10 | Rate of Perceived Exertion |
| soreness | number | No | 1-10 | Nivel de dolor muscular |
| comment | string | No | - | Comentarios del alumno |

**Response (201 Created):**
```json
{
  "id": "clbbbb",
  "assignmentId": "claaaa",
  "dayName": "Día 1",
  "completedAt": "2024-01-15T18:30:00.000Z",
  "rpe": 8,
  "soreness": 6,
  "comment": "Sentí buen pump en pecho, me costó el último set"
}
```

**Errores:**
- `400 Bad Request`: Error de validación
- `403 Forbidden`: Assignment no pertenece al student
- `404 Not Found`: Assignment no existe
- `500 Internal Server Error`: Error de servidor

---

### 3. Obtener Alumnos de un Entrenador

Lista todos los alumnos asignados a un entrenador.

**Endpoint:** `GET /api/trainer/students?trainerId={id}`

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| trainerId | string | Sí | ID del entrenador |

**Response (200 OK):**
```json
[
  {
    "id": "clyyyyy",
    "email": "alumno1@workout.com",
    "name": "María González",
    "role": "STUDENT"
  },
  {
    "id": "clzzzzz",
    "email": "alumno2@workout.com",
    "name": "Juan Pérez",
    "role": "STUDENT"
  }
]
```

**Errores:**
- `400 Bad Request`: trainerId no proporcionado
- `500 Internal Server Error`: Error de servidor

---

### 4. Obtener Rutina Activa de un Alumno

Obtiene la rutina activa asignada a un alumno y su historial de entrenamientos.

**Endpoint:** `GET /api/student/routine?studentId={id}`

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| studentId | string | Sí | ID del alumno |

**Response (200 OK) - Con rutina:**
```json
{
  "assignment": {
    "id": "claaaa",
    "studentId": "clyyyyy",
    "trainerId": "clxxxxx",
    "version": 1,
    "isActive": true,
    "routine": {
      "routineName": "Hipertrofia Intermedia 4 semanas",
      "goal": "HYPERTROPHY",
      "level": "INTERMEDIATE",
      "weeks": 4,
      "daysPerWeek": 4,
      "sessionMinutes": 60,
      "days": [ /* array de días */ ]
    },
    "trainer": {
      "name": "Carlos Entrenador",
      "email": "trainer@workout.com"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "workoutLogs": [
    {
      "id": "clbbbb",
      "assignmentId": "claaaa",
      "dayName": "Día 1",
      "completedAt": "2024-01-15T18:30:00.000Z",
      "rpe": 8,
      "soreness": 6,
      "comment": "Buen entrenamiento"
    }
  ]
}
```

**Response (200 OK) - Sin rutina:**
```json
{
  "assignment": null,
  "workoutLogs": []
}
```

**Errores:**
- `400 Bad Request`: studentId no proporcionado
- `500 Internal Server Error`: Error de servidor

---

### 5. Listar Todos los Usuarios

Obtiene la lista completa de usuarios (para la pantalla de selección).

**Endpoint:** `GET /api/users`

**Response (200 OK):**
```json
[
  {
    "id": "clxxxxx",
    "email": "trainer@workout.com",
    "name": "Carlos Entrenador",
    "role": "TRAINER",
    "createdAt": "2024-01-15T09:00:00.000Z"
  },
  {
    "id": "clyyyyy",
    "email": "alumno1@workout.com",
    "name": "María González",
    "role": "STUDENT",
    "createdAt": "2024-01-15T09:01:00.000Z"
  }
]
```

**Errores:**
- `500 Internal Server Error`: Error de servidor

---

## Ejemplos con cURL

### Generar rutina y asignar a estudiantes

```bash
curl -X POST http://localhost:3000/api/routines/generate \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "clxxxxx",
    "generateInput": {
      "goal": "STRENGTH",
      "level": "INTERMEDIATE",
      "weeks": 4,
      "daysPerWeek": 3,
      "sessionMinutes": 60
    },
    "assignInput": {
      "studentIds": ["clyyyyy"]
    }
  }'
```

### Registrar entrenamiento

```bash
curl -X POST http://localhost:3000/api/workouts/log \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "clyyyyy",
    "workoutInput": {
      "assignmentId": "claaaa",
      "dayName": "Día 1",
      "rpe": 7,
      "soreness": 5,
      "comment": "Excelente sesión"
    }
  }'
```

### Obtener alumnos de un trainer

```bash
curl http://localhost:3000/api/trainer/students?trainerId=clxxxxx
```

### Obtener rutina de un alumno

```bash
curl http://localhost:3000/api/student/routine?studentId=clyyyyy
```

### Listar usuarios

```bash
curl http://localhost:3000/api/users
```

---

## Notas de Implementación

### Validación
Todos los endpoints validan inputs con Zod antes de procesarlos. Errores de validación devuelven:

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["weeks"],
      "message": "Expected number, received string"
    }
  ]
}
```

### Autorización
- **Trainer**: Solo puede asignar rutinas a estudiantes con relación `TrainerStudent` existente
- **Student**: Solo puede registrar entrenamientos de sus propias asignaciones
- **Sin autenticación real**: La POC confía en que el frontend envía el ID correcto

### Generación de Rutinas
- Con `OPENAI_API_KEY`: Usa GPT-4o-mini (5-15 segundos)
- Sin API key: Devuelve rutina de fallback instantáneamente
- La respuesta de OpenAI se valida con Zod para garantizar estructura correcta

### Rutinas Activas
- Un alumno solo puede tener una rutina `isActive: true`
- Al asignar nueva rutina, la anterior se desactiva automáticamente
- El campo `version` se auto-incrementa

### IDs
Todos los IDs son CUIDs generados por Prisma (`@default(cuid())`).

## Testing con Postman

Importar esta colección en Postman:

```json
{
  "info": {
    "name": "Go Workout API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "trainerId",
      "value": "REPLACE_WITH_ACTUAL_ID"
    },
    {
      "key": "studentId",
      "value": "REPLACE_WITH_ACTUAL_ID"
    }
  ]
}
```

Reemplaza los IDs después de ejecutar el seed.
