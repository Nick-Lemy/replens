export interface ExercisePhotoSet {
  images: string[];
  sourceUrl: string;
  credit: string;
  creditUrl: string;
  license: string;
  licenseUrl: string;
  variation?: string;
}

export const exercisePhotos: Record<string, ExercisePhotoSet> = {
  "two-arm-dumbbell-curl": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dumbbell_Bicep_Curl",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "hammer-curl": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Hammer_Curls",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "seated-biceps-curl": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Curl/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Curl/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Seated_Dumbbell_Curl",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
    variation: "Photos show a seated curl with wrist rotation.",
  },
  "dumbbell-bench-press": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dumbbell_Bench_Press",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "barbell-bench-press": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Barbell_Bench_Press_-_Medium_Grip",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "barbell-row": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Bent_Over_Barbell_Row",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "seated-shoulder-press": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Seated_Dumbbell_Press",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "lateral-raise": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Side_Lateral_Raise",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "bodyweight-squat": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Bodyweight_Squat",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "goblet-squat": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Goblet_Squat",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
    variation: "Photos demonstrate the kettlebell variation.",
  },
  "forward-lunge": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Walking_Lunge/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Walking_Lunge/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Bodyweight_Walking_Lunge",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
    variation:
      "Photos show the forward-lunge position in a walking-lunge variation.",
  },
  "glute-bridge": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butt_Lift_Bridge/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Butt_Lift_Bridge",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "push-up": {
    images: [
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/1.jpg",
    ],
    sourceUrl:
      "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Pushups",
    credit: "Free Exercise DB",
    creditUrl: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense",
    licenseUrl:
      "https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md",
  },
  "bird-dog": {
    images: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Bird_dog_exercise.jpg?width=640",
    ],
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bird_dog_exercise.jpg",
    credit: "PTPioneer",
    creditUrl: "https://www.ptpioneer.com/",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
};
