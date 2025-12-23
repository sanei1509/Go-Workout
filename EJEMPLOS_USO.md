# Ejemplos de Uso - Go Workout POC

Este documento muestra ejemplos prácticos de cómo usar la aplicación tanto desde la UI como desde la API.

## Ejemplos desde la UI

### Ejemplo 1: Trainer genera y asigna rutina

**Escenario**: Carlos Entrenador quiere crear una rutina de hipertrofia para María González.

**Pasos:**

1. Ir a http://localhost:3000
2. Click en "Carlos Entrenador"
3. Completar formulario:
   - Objetivo: Hipertrofia
   - Nivel: Intermedio
   - Semanas: 4
   - Días/semana: 4
   - Duración sesión: 60 minutos
   - Equipamiento: "Barras, mancuernas, máquinas"
   - Lesiones: (vacío)
   - Preferencias: "Enfoque en ejercicios compuestos"
4. Seleccionar checkbox de "María González"
5. Click en "Generar Rutina"
6. Esperar respuesta (5-15 seg con OpenAI, instantáneo sin API key)
7. Ver mensaje de éxito

**Resultado**: Rutina generada, guardada como template y asignada a María.

---

### Ejemplo 2: Student visualiza y registra entrenamiento

**Escenario**: María González completa el Día 1 de su rutina.

**Pasos:**

1. Ir a http://localhost:3000
2. Click en "María González"
3. Ver rutina activa asignada por Carlos
4. Click en "Día 1 - Pecho y Tríceps" para expandir
5. Revisar ejercicios:
   - Warmup: Movilidad de hombros
   - Strength: Press de banca, Press inclinado
   - Accessories: Extensiones, Fondos
   - Cooldown: Estiramientos
6. Completar formulario de registro:
   - RPE: 8
   - Dolor muscular: 6
   - Comentarios: "Excelente sesión, sentí buen pump"
7. Click en "Marcar como completado"
8. Ver confirmación y contador actualizado

**Resultado**: Entrenamiento registrado en la base de datos.

---

### Ejemplo 3: Trainer asigna rutina a múltiples alumnos

**Pasos:**

1. Ir a panel de trainer
2. Configurar rutina:
   - Objetivo: Pérdida de peso
   - Nivel: Principiante
   - Semanas: 8
   - Días/semana: 3
   - Duración: 45 minutos
3. Seleccionar AMBOS alumnos (María y Juan)
4. Generar rutina
5. Confirmar que ambos reciben la misma rutina

**Resultado**: Misma rutina asignada a 2 alumnos.

---

## Ejemplos desde la API (cURL)

### Ejemplo 1: Generar rutina de fuerza

```bash
curl -X POST http://localhost:3000/api/routines/generate \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "TU_TRAINER_ID",
    "generateInput": {
      "goal": "STRENGTH",
      "level": "ADVANCED",
      "weeks": 6,
      "daysPerWeek": 4,
      "sessionMinutes": 75,
      "equipment": ["Barras olímpicas", "Rack de sentadillas", "Plataforma"],
      "preferences": "Powerlifting - Enfoque en los 3 grandes"
    },
    "assignInput": {
      "studentIds": ["TU_STUDENT_ID"]
    }
  }'
```

**Respuesta esperada:**
```json
{
  "template": { "id": "...", "name": "..." },
  "routine": {
    "routineName": "Powerlifting Avanzado 6 semanas",
    "days": [...]
  },
  "assignments": [{ "id": "...", "studentId": "..." }]
}
```

---

### Ejemplo 2: Rutina de resistencia cardiovascular

```bash
curl -X POST http://localhost:3000/api/routines/generate \
  -H "Content-Type: application/json" \
  -d '{
    "trainerId": "TU_TRAINER_ID",
    "generateInput": {
      "goal": "ENDURANCE",
      "level": "INTERMEDIATE",
      "weeks": 12,
      "daysPerWeek": 5,
      "sessionMinutes": 45,
      "equipment": ["Cinta de correr", "Bicicleta estática", "Remo"],
      "injuries": ["Dolor de rodilla leve"],
      "preferences": "Preparación para media maratón"
    }
  }'
```

**Nota**: Sin `assignInput`, solo crea el template sin asignar.

---

### Ejemplo 3: Registrar entrenamiento con feedback completo

```bash
curl -X POST http://localhost:3000/api/workouts/log \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TU_STUDENT_ID",
    "workoutInput": {
      "assignmentId": "TU_ASSIGNMENT_ID",
      "dayName": "Día 2 - Piernas",
      "rpe": 9,
      "soreness": 7,
      "comment": "Sentadillas muy pesadas hoy, llegué al fallo en la última serie. Necesito reducir peso la próxima vez."
    }
  }'
```

**Respuesta:**
```json
{
  "id": "clxxx",
  "assignmentId": "...",
  "dayName": "Día 2 - Piernas",
  "completedAt": "2024-01-15T19:30:00.000Z",
  "rpe": 9,
  "soreness": 7,
  "comment": "Sentadillas muy pesadas hoy..."
}
```

---

### Ejemplo 4: Obtener rutina activa de un alumno

```bash
curl http://localhost:3000/api/student/routine?studentId=TU_STUDENT_ID
```

**Respuesta:**
```json
{
  "assignment": {
    "id": "...",
    "routine": {
      "routineName": "Hipertrofia Intermedia",
      "days": [
        {
          "dayName": "Día 1",
          "blocks": [...]
        }
      ]
    },
    "trainer": {
      "name": "Carlos Entrenador",
      "email": "trainer@workout.com"
    }
  },
  "workoutLogs": [
    {
      "dayName": "Día 1",
      "completedAt": "2024-01-15T18:00:00.000Z",
      "rpe": 8
    }
  ]
}
```

---

## Ejemplos de Casos de Uso Avanzados

### Caso 1: Rutina para persona con lesión de hombro

**Configuración:**
```json
{
  "goal": "HYPERTROPHY",
  "level": "INTERMEDIATE",
  "weeks": 4,
  "daysPerWeek": 4,
  "sessionMinutes": 60,
  "injuries": ["Dolor de hombro derecho", "Evitar press sobre cabeza"],
  "preferences": "Enfoque en ejercicios unilaterales para equilibrar fuerza"
}
```

**Resultado esperado**: Rutina sin ejercicios de press vertical, con más ejercicios de tracción y trabajo unilateral.

---

### Caso 2: Rutina minimalista (solo peso corporal)

**Configuración:**
```json
{
  "goal": "GENERAL_FITNESS",
  "level": "BEGINNER",
  "weeks": 4,
  "daysPerWeek": 3,
  "sessionMinutes": 30,
  "equipment": ["Ninguno - solo peso corporal"],
  "preferences": "Entrenamientos en casa, sin equipamiento"
}
```

**Resultado esperado**: Flexiones, sentadillas, planks, burpees, etc.

---

### Caso 3: Rutina deportista específico (fútbol)

**Configuración:**
```json
{
  "goal": "SPORT_SPECIFIC",
  "level": "ADVANCED",
  "weeks": 8,
  "daysPerWeek": 3,
  "sessionMinutes": 60,
  "equipment": ["Gimnasio completo", "Pista de atletismo"],
  "preferences": "Pretemporada de fútbol - enfoque en potencia explosiva, sprints y agilidad"
}
```

**Resultado esperado**: Pliométricos, sprints, sentadillas con salto, etc.

---

## Ejemplos de Flujos Completos

### Flujo 1: Onboarding de nuevo alumno

**Escenario**: Juan Pérez es nuevo, el trainer le asigna su primera rutina.

1. Trainer va a `/trainer?userId={trainerId}`
2. Ve a Juan en la lista de alumnos
3. Genera rutina personalizada:
   - Goal: GENERAL_FITNESS
   - Level: BEGINNER
   - 3x/semana, 45 minutos
4. Selecciona a Juan
5. Genera y asigna
6. Juan va a `/student?userId={juanId}`
7. Ve su rutina asignada por primera vez
8. Completa Día 1 con feedback

---

### Flujo 2: Progresión - Nueva rutina después de 4 semanas

**Escenario**: María completa su rutina de 4 semanas, necesita una nueva.

1. Trainer revisa progreso de María (no implementado en POC, pero el historial existe)
2. Genera nueva rutina más avanzada:
   - Mismo goal (HYPERTROPHY)
   - Incrementa nivel: INTERMEDIATE → ADVANCED
   - Más días: 4 → 5
   - Más duración: 60 → 75 minutos
3. Asigna a María
4. María ve nueva rutina activa (la anterior se desactiva automáticamente)
5. María empieza nuevo ciclo

---

### Flujo 3: Misma rutina para grupo

**Escenario**: Trainer quiere asignar la misma rutina grupal a todos sus alumnos.

1. Trainer genera rutina óptima para grupo:
   - Goal: GENERAL_FITNESS
   - Level: INTERMEDIATE (promedio del grupo)
   - 4x/semana
2. Selecciona TODOS los alumnos
3. Genera y asigna
4. Todos los alumnos ven la misma rutina
5. Cada alumno registra su progreso individualmente

---

## Tips de Uso

### Para Trainers

1. **Sé específico en preferencias**: Mientras más contexto des, mejor será la rutina generada
2. **Usa el campo de equipamiento**: Si un alumno entrena en casa, especifica qué tiene
3. **Lesiones son importantes**: OpenAI adaptará los ejercicios para evitar agravar lesiones
4. **Prueba sin API key**: El fallback es funcional para demos rápidas

### Para Students

1. **RPE es honesto**: Usa la escala 1-10 consistentemente para que el trainer pueda ajustar
2. **Dolor muscular vs dolor de lesión**: Soreness es dolor muscular normal, no lesión
3. **Comentarios valiosos**: Feedback como "muy difícil" o "muy fácil" ayuda al trainer
4. **Revisa alternativas**: Si un ejercicio no te gusta, usa las alternativas sugeridas

---

## Debugging

### Obtener IDs de usuarios después del seed

```bash
# Ejecutar Prisma Studio
npm run db:studio

# Navegar a tabla "User"
# Copiar IDs de trainer y students
```

O con SQL directo:

```bash
# Si tienes psql instalado
psql $DATABASE_URL -c "SELECT id, email, role FROM \"User\";"
```

### Ver todos los logs de un alumno

```bash
curl http://localhost:3000/api/student/routine?studentId=TU_ID | jq '.workoutLogs'
```

### Ver estructura completa de una rutina generada

```bash
curl -X POST http://localhost:3000/api/routines/generate \
  -H "Content-Type: application/json" \
  -d '{"trainerId":"ID","generateInput":{...}}' | jq '.routine'
```

---

## Próximos Experimentos

1. Generar rutina para embarazada (nivel principiante, lesiones: evitar abdominales)
2. Rutina de rehabilitación post-cirugía (nivel principiante, muchas limitaciones)
3. Rutina de atleta élite (nivel avanzado, 6x/semana, equipamiento completo)
4. Rutina de oficinista sedentario (principiante, 2x/semana, 30 min)

Cada uno de estos casos generará rutinas completamente diferentes adaptadas al contexto.
