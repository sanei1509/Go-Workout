import type { TrainingProfile } from '@/lib/services/trainingProfileService';
import { PLAN_TEMPLATES, getTemplateById } from './templates';
import type { PlanTemplate } from './types';

export function filterTemplatesForProfile(
  profile: Pick<TrainingProfile, 'training_location' | 'primary_goal' | 'experience_level'>,
  dayCount: number
): PlanTemplate[] {
  return PLAN_TEMPLATES.filter(t => {
    if (dayCount < t.minDays || dayCount > t.maxDays) return false;
    const locOk = t.locations.includes(profile.training_location)
      || profile.training_location === 'both';
    const goalOk = t.goals.includes(profile.primary_goal);
    const expOk = t.experience.includes(profile.experience_level);
    return locOk && (goalOk || profile.primary_goal === 'general_fitness') && expOk;
  });
}

export function suggestTemplateId(
  profile: Pick<TrainingProfile, 'training_location' | 'primary_goal' | 'experience_level'>,
  dayCount: number
): string {
  const matches = filterTemplatesForProfile(profile, dayCount);
  if (matches.length > 0) return matches[0].id;

  if (profile.training_location === 'home') return 'home_start_3';
  if (profile.primary_goal === 'hypertrophy' && dayCount >= 4) return 'hypertrophy_4';
  if (profile.primary_goal === 'mobility') return 'mobility_conditioning_3';
  return 'full_body_strength_3';
}

export function suggestTemplate(
  profile: Pick<TrainingProfile, 'training_location' | 'primary_goal' | 'experience_level'>,
  dayCount: number
): PlanTemplate {
  const id = suggestTemplateId(profile, dayCount);
  return getTemplateById(id) ?? PLAN_TEMPLATES[0];
}
