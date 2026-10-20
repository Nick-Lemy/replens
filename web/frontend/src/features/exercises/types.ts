export type ExerciseGroup = "All" | "Arms" | "Chest" | "Back" | "Shoulders" | "Legs" | "Core";

export interface ExercisePhotoSet {
  images: string[];
  sourceUrl: string;
  credit: string;
  creditUrl: string;
  license: string;
  licenseUrl: string;
  variation?: string;
}

export interface Exercise {
  id: string;
  name: string;
  group: Exclude<ExerciseGroup, "All">;
  equipment: string;
  focus: string;
  steps: [string, string][];
  tips: string[];
  referenceUrl: string;
  referenceLabel: string;
  cameraPreview: boolean;
  photos: ExercisePhotoSet;
}

export interface ExerciseCatalog {
  items: Exercise[];
  groups: ExerciseGroup[];
}
