import { exerciseGroups, exercises } from './catalog/exercises.js';
import { exercisePhotos } from './catalog/exercise-photos.js';

export class ExercisesRepository {
  list() {
    return {
      items: exercises.map(exercise => ({ ...exercise, photos: exercisePhotos[exercise.id] })),
      groups: exerciseGroups,
    };
  }

  findById(id: string) {
    const exercise = exercises.find(item => item.id === id);
    return exercise ? { ...exercise, photos: exercisePhotos[exercise.id] } : undefined;
  }
}
