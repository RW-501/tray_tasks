import { iso } from './recurrence.js';
export const todayISO = () => iso(new Date());
export function seedData(date=todayISO()){
  return {
    tasks: [], events: [], goals: [], habits: [], notes: [], shopping: [], workouts: [], projects: [], savings: []
  };
}
