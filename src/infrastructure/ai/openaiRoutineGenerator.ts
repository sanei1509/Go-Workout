import OpenAI from 'openai';
import { AiRoutineGenerator } from '@/src/domain/ai';
import { GenerateRoutineInput, Routine, RoutineSchema } from '@/src/domain/routine.schema';

export class OpenAiRoutineGenerator implements AiRoutineGenerator {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateRoutine(input: GenerateRoutineInput): Promise<Routine> {
    if (!this.client) {
      return this.getFallbackRoutine(input);
    }

    try {
      const prompt = this.buildPrompt(input);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fitness trainer AI. Generate workout routines in valid JSON format following the exact schema provided.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedJson = JSON.parse(content);
      const routine = RoutineSchema.parse(parsedJson);

      return routine;
    } catch (error) {
      console.error('Error generating routine with OpenAI:', error);
      return this.getFallbackRoutine(input);
    }
  }

  private buildPrompt(input: GenerateRoutineInput): string {
    return `Generate a ${input.weeks}-week workout routine with the following specifications:

Goal: ${input.goal}
Experience Level: ${input.level}
Days per Week: ${input.daysPerWeek}
Session Duration: ${input.sessionMinutes} minutes
${input.equipment ? `Available Equipment: ${input.equipment.join(', ')}` : 'Equipment: Full gym access'}
${input.injuries ? `Injuries/Limitations: ${input.injuries.join(', ')}` : ''}
${input.preferences ? `Preferences: ${input.preferences}` : ''}

Return a JSON object with this EXACT structure:
{
  "routineName": "string",
  "goal": "${input.goal}",
  "level": "${input.level}",
  "weeks": ${input.weeks},
  "daysPerWeek": ${input.daysPerWeek},
  "sessionMinutes": ${input.sessionMinutes},
  "days": [
    {
      "dayName": "Day 1",
      "blocks": [
        {
          "blockName": "Warmup" | "Strength" | "Accessories" | "Cardio" | "Mobility" | "Cooldown",
          "items": [
            {
              "exerciseName": "string",
              "sets": number,
              "reps": number | "string",
              "restSeconds": number,
              "rpeTarget": number (1-10, optional),
              "tempo": "string (optional)",
              "notes": "string (optional)",
              "alternatives": ["string"] (optional)
            }
          ]
        }
      ]
    }
  ]
}

Make the routine progressive, effective, and safe. Include proper warmup and cooldown. Ensure exercises match the goal and equipment available.`;
  }

  private getFallbackRoutine(input: GenerateRoutineInput): Routine {
    const routineName = `${input.goal} - ${input.level} (${input.daysPerWeek}x/week)`;

    const days = Array.from({ length: input.daysPerWeek }, (_, i) => ({
      dayName: `Day ${i + 1}`,
      blocks: [
        {
          blockName: 'Warmup' as const,
          items: [
            {
              exerciseName: 'Dynamic Stretching',
              sets: 1,
              reps: '5-10 min',
              restSeconds: 0,
            },
          ],
        },
        {
          blockName: 'Strength' as const,
          items: [
            {
              exerciseName: 'Squat',
              sets: 3,
              reps: 8,
              restSeconds: 90,
              rpeTarget: 7,
              alternatives: ['Goblet Squat', 'Leg Press'],
            },
            {
              exerciseName: 'Bench Press',
              sets: 3,
              reps: 8,
              restSeconds: 90,
              rpeTarget: 7,
              alternatives: ['Dumbbell Press', 'Push-ups'],
            },
          ],
        },
        {
          blockName: 'Accessories' as const,
          items: [
            {
              exerciseName: 'Lateral Raises',
              sets: 3,
              reps: 12,
              restSeconds: 60,
            },
            {
              exerciseName: 'Bicep Curls',
              sets: 3,
              reps: 12,
              restSeconds: 60,
            },
          ],
        },
        {
          blockName: 'Cooldown' as const,
          items: [
            {
              exerciseName: 'Static Stretching',
              sets: 1,
              reps: '5-10 min',
              restSeconds: 0,
            },
          ],
        },
      ],
    }));

    return {
      routineName,
      goal: input.goal,
      level: input.level,
      weeks: input.weeks,
      daysPerWeek: input.daysPerWeek,
      sessionMinutes: input.sessionMinutes,
      days,
    };
  }
}
