// Генерация всех возможных комбинаций параметров квиза для контроля покрытия

export type PracticeType = 'short' | 'physical' | 'breathing' | 'meditation';
export type MeditationApproach = 'self' | 'guided';
export type MeditationObject = 'breath' | 'thought' | 'body' | 'none';
export type PracticeGoal =
  | 'energize' | 'relax' | 'stretch' | 'focus' // короткие
  | 'legs' | 'whole_body' | 'shoulders' | 'core' | 'digestive' | 'back_pain' | 'hormonal' // телесные
  | 'stress_relief' | 'sleep' | 'energy' | 'breathing_depth' | 'complex' // дыхательные
  | 'body' | 'thinking' | 'relationships'; // медитации

export interface QuizCombination {
  practiceType: PracticeType;
  duration?: { min: number; max: number };
  goal?: PracticeGoal;
  approach?: MeditationApproach;
  object?: MeditationObject;
}

export function generateAllQuizCombinations(): QuizCombination[] {
  const goals: Record<PracticeType, PracticeGoal[]> = {
    short: ['energize', 'relax', 'stretch', 'focus'],
    physical: ['legs', 'whole_body', 'shoulders', 'core', 'digestive', 'back_pain', 'hormonal'],
    breathing: ['stress_relief', 'sleep', 'energy', 'breathing_depth', 'complex'],
    meditation: ['body', 'thinking', 'relationships'],
  };
  const durations: Record<PracticeType, { min: number; max: number }[]> = {
    short: [{ min: 180, max: 420 }], // 3-7 мин
    physical: [
      { min: 600, max: 1200 }, // 10-20 мин
      { min: 1200, max: 2400 }, // 20-40 мин
      { min: 2400, max: 3600 }, // 40-60 мин
    ],
    breathing: [
      { min: 300, max: 600 }, // 5-10 мин
      { min: 600, max: 1200 }, // 10-20 мин
    ],
    meditation: [], // особый случай
  };
  const approaches: MeditationApproach[] = ['self', 'guided'];
  const objects: MeditationObject[] = ['breath', 'thought', 'body', 'none'];

  const result: QuizCombination[] = [];

  // Short
  for (const goal of goals.short) {
    result.push({ practiceType: 'short', goal, duration: durations.short[0] });
  }

  // Physical
  for (const duration of durations.physical) {
    for (const goal of goals.physical) {
      result.push({ practiceType: 'physical', duration, goal });
    }
  }

  // Breathing
  for (const duration of durations.breathing) {
    for (const goal of goals.breathing) {
      result.push({ practiceType: 'breathing', duration, goal });
    }
  }

  // Meditation: guided
  for (const approach of approaches) {
    if (approach === 'guided') {
      for (const goal of goals.meditation) {
        result.push({ practiceType: 'meditation', approach, goal });
      }
    } else {
      // Meditation: self — все объекты и длительности
      for (const object of objects) {
        for (const duration of [300, 600, 900, 1200, 1800]) { // 5, 10, 15, 20, 30 мин
          result.push({
            practiceType: 'meditation',
            approach: 'self',
            object,
            duration: { min: duration, max: duration },
          });
        }
      }
    }
  }

  return result;
} 