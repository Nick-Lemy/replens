import { Injectable, NotFoundException } from '@nestjs/common';
import { ExercisesRepository } from './exercises.repository.js';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercises: ExercisesRepository) {}

  list() {
    return this.exercises.list();
  }

  get(id: string) {
    const exercise = this.exercises.findById(id);
    if (!exercise) throw new NotFoundException();
    return exercise;
  }
}
