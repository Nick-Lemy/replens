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
      "https://images.pexels.com/photos/6455960/pexels-photo-6455960.jpeg?auto=compress&cs=tinysrgb&w=960",
    ],
    sourceUrl: "https://www.pexels.com/photo/black-muscular-sportsman-exercising-with-heavy-dumbbells-6455960/",
    credit: "Julia Larson / Pexels",
    creditUrl: "https://www.pexels.com/photo/black-muscular-sportsman-exercising-with-heavy-dumbbells-6455960/",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
    variation: "Photo shows alternating curls. For live tracking, lift both arms together as described below.",
  },
  "hammer-curl": {
    images: [
      "https://images.pexels.com/photos/6455970/pexels-photo-6455970.jpeg?auto=compress&cs=tinysrgb&w=960",
    ],
    sourceUrl: "https://www.pexels.com/photo/strong-black-sportsman-exercising-with-dumbbells-6455970/",
    credit: "Julia Larson / Pexels",
    creditUrl: "https://www.pexels.com/photo/strong-black-sportsman-exercising-with-dumbbells-6455970/",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
    variation: "Side view of a neutral-grip hammer curl.",
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
      "https://images.pexels.com/photos/7371361/pexels-photo-7371361.jpeg?auto=compress&cs=tinysrgb&w=960",
    ],
    sourceUrl: "https://www.pexels.com/photo/a-man-doing-bench-press-7371361/",
    credit: "Zennis Se / Pexels",
    creditUrl: "https://www.pexels.com/photo/a-man-doing-bench-press-7371361/",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
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
      "https://images.pexels.com/photos/8846586/pexels-photo-8846586.jpeg?auto=compress&cs=tinysrgb&w=960",
    ],
    sourceUrl: "https://www.pexels.com/photo/a-woman-exercising-8846586/",
    credit: "MART PRODUCTION / Pexels",
    creditUrl: "https://www.pexels.com/photo/a-woman-exercising-8846586/",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
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
