import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await prisma.workoutLog.deleteMany();
  await prisma.routineAssignment.deleteMany();
  await prisma.routineTemplate.deleteMany();
  await prisma.trainerStudent.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating trainer...');
  const trainer = await prisma.user.create({
    data: {
      email: 'trainer@workout.com',
      name: 'Carlos Entrenador',
      role: 'TRAINER',
    },
  });

  console.log('Creating students...');
  const student1 = await prisma.user.create({
    data: {
      email: 'alumno1@workout.com',
      name: 'María González',
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'alumno2@workout.com',
      name: 'Juan Pérez',
      role: 'STUDENT',
    },
  });

  console.log('Creating trainer-student relationships...');
  await prisma.trainerStudent.create({
    data: {
      trainerId: trainer.id,
      studentId: student1.id,
    },
  });

  await prisma.trainerStudent.create({
    data: {
      trainerId: trainer.id,
      studentId: student2.id,
    },
  });

  console.log('Creating sample routine template...');
  const sampleRoutine = {
    routineName: 'Rutina de Fuerza Básica',
    goal: 'STRENGTH',
    level: 'INTERMEDIATE',
    weeks: 4,
    daysPerWeek: 3,
    sessionMinutes: 60,
    days: [
      {
        dayName: 'Día 1 - Pecho y Tríceps',
        blocks: [
          {
            blockName: 'Warmup',
            items: [
              {
                exerciseName: 'Movilidad de hombros',
                sets: 1,
                reps: '5-10 min',
                restSeconds: 0,
              },
            ],
          },
          {
            blockName: 'Strength',
            items: [
              {
                exerciseName: 'Press de banca',
                sets: 4,
                reps: 6,
                restSeconds: 180,
                rpeTarget: 8,
                alternatives: ['Press con mancuernas', 'Press inclinado'],
              },
              {
                exerciseName: 'Press inclinado con mancuernas',
                sets: 3,
                reps: 8,
                restSeconds: 120,
                rpeTarget: 7,
              },
            ],
          },
          {
            blockName: 'Accessories',
            items: [
              {
                exerciseName: 'Extensiones de tríceps',
                sets: 3,
                reps: 12,
                restSeconds: 60,
              },
              {
                exerciseName: 'Fondos en paralelas',
                sets: 3,
                reps: 10,
                restSeconds: 90,
              },
            ],
          },
          {
            blockName: 'Cooldown',
            items: [
              {
                exerciseName: 'Estiramientos estáticos',
                sets: 1,
                reps: '5 min',
                restSeconds: 0,
              },
            ],
          },
        ],
      },
      {
        dayName: 'Día 2 - Piernas',
        blocks: [
          {
            blockName: 'Warmup',
            items: [
              {
                exerciseName: 'Movilidad de cadera',
                sets: 1,
                reps: '5-10 min',
                restSeconds: 0,
              },
            ],
          },
          {
            blockName: 'Strength',
            items: [
              {
                exerciseName: 'Sentadilla trasera',
                sets: 4,
                reps: 6,
                restSeconds: 180,
                rpeTarget: 8,
                tempo: '3-0-1-0',
                alternatives: ['Sentadilla frontal', 'Prensa de piernas'],
              },
              {
                exerciseName: 'Peso muerto rumano',
                sets: 3,
                reps: 8,
                restSeconds: 120,
                rpeTarget: 7,
              },
            ],
          },
          {
            blockName: 'Accessories',
            items: [
              {
                exerciseName: 'Extensiones de cuádriceps',
                sets: 3,
                reps: 12,
                restSeconds: 60,
              },
              {
                exerciseName: 'Curl femoral',
                sets: 3,
                reps: 12,
                restSeconds: 60,
              },
            ],
          },
          {
            blockName: 'Cooldown',
            items: [
              {
                exerciseName: 'Estiramientos de piernas',
                sets: 1,
                reps: '5 min',
                restSeconds: 0,
              },
            ],
          },
        ],
      },
      {
        dayName: 'Día 3 - Espalda y Bíceps',
        blocks: [
          {
            blockName: 'Warmup',
            items: [
              {
                exerciseName: 'Movilidad de columna',
                sets: 1,
                reps: '5-10 min',
                restSeconds: 0,
              },
            ],
          },
          {
            blockName: 'Strength',
            items: [
              {
                exerciseName: 'Dominadas',
                sets: 4,
                reps: 8,
                restSeconds: 120,
                rpeTarget: 8,
                alternatives: ['Jalones en polea', 'Dominadas asistidas'],
              },
              {
                exerciseName: 'Remo con barra',
                sets: 4,
                reps: 6,
                restSeconds: 120,
                rpeTarget: 7,
              },
            ],
          },
          {
            blockName: 'Accessories',
            items: [
              {
                exerciseName: 'Curl de bíceps con barra',
                sets: 3,
                reps: 10,
                restSeconds: 60,
              },
              {
                exerciseName: 'Curl martillo',
                sets: 3,
                reps: 12,
                restSeconds: 60,
              },
            ],
          },
          {
            blockName: 'Cooldown',
            items: [
              {
                exerciseName: 'Estiramientos de espalda',
                sets: 1,
                reps: '5 min',
                restSeconds: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  await prisma.routineTemplate.create({
    data: {
      trainerId: trainer.id,
      name: sampleRoutine.routineName,
      routine: sampleRoutine as any,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\nCreated users:');
  console.log('- Trainer:', trainer.email);
  console.log('- Student 1:', student1.email);
  console.log('- Student 2:', student2.email);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
