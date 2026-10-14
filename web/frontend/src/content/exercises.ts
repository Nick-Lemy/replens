export const exerciseGroups = [
  "All",
  "Arms",
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Core",
] as const;
export type ExerciseGroup = (typeof exerciseGroups)[number];

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
}

export const exercises: Exercise[] = [
  {
    id: "two-arm-dumbbell-curl",
    name: "Biceps curls",
    group: "Arms",
    equipment: "Dumbbells",
    focus: "Biceps",
    steps: [
      [
        "Set your stance",
        "Stand steadily with a dumbbell in each hand. Let your arms hang by your sides, with your palms facing forward.",
      ],
      [
        "Lift together",
        "Bend both elbows at the same time. Keep your upper arms near your sides and your wrists straight.",
      ],
      [
        "Lower under control",
        "Bring both dumbbells back down smoothly. Keep your torso still throughout the movement.",
      ],
    ],
    tips: [
      "Avoid swinging your body to lift the weights.",
      "Use a load you can control through the movement.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/44/seated-biceps-curl/",
    referenceLabel: "Related curl technique — ACE (seated variation)",
    cameraPreview: true,
  },
  {
    id: "hammer-curl",
    name: "Hammer curls",
    group: "Arms",
    equipment: "Dumbbells",
    focus: "Biceps and forearms",
    steps: [
      [
        "Hold a neutral grip",
        "Stand with the dumbbells beside your thighs and your palms facing inward.",
      ],
      [
        "Bend your elbows",
        "Raise the weights toward your shoulders without moving your upper arms forward.",
      ],
      [
        "Return slowly",
        "Lower the dumbbells while keeping your palms facing inward.",
      ],
    ],
    tips: [
      "Keep your wrists aligned with your forearms.",
      "Keep your shoulders relaxed rather than shrugging.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/10/hammer-curl/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "seated-biceps-curl",
    name: "Seated biceps curls",
    group: "Arms",
    equipment: "Dumbbells and backed bench",
    focus: "Biceps",
    steps: [
      [
        "Sit with support",
        "Sit against the backrest with your feet planted. Hold the dumbbells beside you, palms facing forward.",
      ],
      [
        "Curl together",
        "Lift both weights by bending your elbows, keeping your upper arms beside your torso.",
      ],
      [
        "Lower smoothly",
        "Return the weights to your sides without losing contact with the backrest.",
      ],
    ],
    tips: [
      "Avoid arching your back to help the lift.",
      "Keep your wrists straight.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/44/seated-biceps-curl/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "dumbbell-bench-press",
    name: "Dumbbell bench press",
    group: "Chest",
    equipment: "Dumbbells and flat bench",
    focus: "Chest, shoulders and triceps",
    steps: [
      [
        "Set up on the bench",
        "Lie on the bench with your feet supported. Position the dumbbells above your chest with a secure grip.",
      ],
      [
        "Lower together",
        "Bring the weights down slowly toward your chest, keeping your wrists stable.",
      ],
      [
        "Press upward",
        "Push both dumbbells up with control while keeping your body supported on the bench.",
      ],
    ],
    tips: [
      "Use a competent spotter for handoff and assistance when needed.",
      "Do not bounce the weights or force an uncomfortable range.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "barbell-bench-press",
    name: "Barbell bench press",
    group: "Chest",
    equipment: "Barbell, rack and flat bench",
    focus: "Chest, shoulders and triceps",
    steps: [
      [
        "Prepare the rack",
        "Set the rack and safeties appropriately. Lie on the bench, plant your feet and grip the bar securely.",
      ],
      [
        "Lower with control",
        "Unrack with a spotter when needed. Bring the bar toward your chest without bouncing.",
      ],
      [
        "Press and rerack",
        "Press upward while keeping your body supported. Rerack the bar securely at the end.",
      ],
    ],
    tips: [
      "Use a competent spotter and properly set safety supports.",
      "Learn the setup with a coach before attempting unfamiliar loads.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/5/chest-press/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "barbell-row",
    name: "Bent-over barbell row",
    group: "Back",
    equipment: "Barbell",
    focus: "Back and arms",
    steps: [
      [
        "Set your position",
        "Hold the bar with an overhand grip. Hinge at the hips with a slight knee bend and keep your back neutral.",
      ],
      [
        "Pull toward your torso",
        "Bring the bar toward your abdomen while keeping your torso steady.",
      ],
      [
        "Lower steadily",
        "Extend your arms to lower the bar without changing your back position.",
      ],
    ],
    tips: [
      "Avoid jerking the bar upward.",
      "Choose a load that lets you hold the hinge position.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "seated-shoulder-press",
    name: "Seated shoulder press",
    group: "Shoulders",
    equipment: "Dumbbells and backed bench",
    focus: "Shoulders and triceps",
    steps: [
      [
        "Sit with support",
        "Sit against a backrest with your feet planted. Hold the dumbbells around shoulder height.",
      ],
      [
        "Press overhead",
        "Move both weights upward together without arching your lower back.",
      ],
      [
        "Return to shoulder height",
        "Lower the weights smoothly into a comfortable starting position.",
      ],
    ],
    tips: [
      "Keep your wrists stable over your forearms.",
      "Avoid using your back to push the weights higher.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "lateral-raise",
    name: "Lateral raises",
    group: "Shoulders",
    equipment: "Dumbbells",
    focus: "Shoulders",
    steps: [
      [
        "Stand steadily",
        "Hold a light dumbbell beside each thigh with a small bend in your elbows.",
      ],
      [
        "Raise to the sides",
        "Lift your arms outward with control to about shoulder height.",
      ],
      [
        "Lower slowly",
        "Return the weights toward your thighs without swinging them.",
      ],
    ],
    tips: [
      "Keep your torso steady and your wrists neutral.",
      "Avoid shrugging or lifting above a comfortable range.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight squats",
    group: "Legs",
    equipment: "No equipment",
    focus: "Thighs, glutes and core",
    steps: [
      [
        "Find a steady stance",
        "Stand with your feet a little wider than hip width and your toes slightly turned out.",
      ],
      [
        "Sit down and back",
        "Bend your hips and knees together. Keep your feet planted and lower only as far as you can control.",
      ],
      [
        "Stand back up",
        "Push through your feet to return to standing without losing balance.",
      ],
    ],
    tips: [
      "Keep your knees moving in line with your feet.",
      "Reduce the depth if your heels rise or your back rounds.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "goblet-squat",
    name: "Goblet squats",
    group: "Legs",
    equipment: "Dumbbell",
    focus: "Thighs and glutes",
    steps: [
      [
        "Hold the weight close",
        "Stand steadily and hold one dumbbell vertically in front of your chest.",
      ],
      [
        "Lower into a squat",
        "Bend your hips and knees while keeping your chest lifted and the weight near your body.",
      ],
      ["Return to standing", "Press through your feet and stand up smoothly."],
    ],
    tips: [
      "Keep the weight close instead of reaching it forward.",
      "Use a depth you can control without losing balance.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "forward-lunge",
    name: "Forward lunges",
    group: "Legs",
    equipment: "No equipment",
    focus: "Thighs and glutes",
    steps: [
      [
        "Start with balance",
        "Stand tall and steady. Step forward onto one foot with control.",
      ],
      [
        "Lower your hips",
        "Bend both knees and lower to a comfortable depth, keeping your front foot firmly planted.",
      ],
      [
        "Push back to the start",
        "Use your front leg to return to standing, then repeat on the other side.",
      ],
    ],
    tips: [
      "Avoid letting your knee collapse inward.",
      "Practise balance before adding weight.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/94/forward-lunge/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "glute-bridge",
    name: "Glute bridges",
    group: "Legs",
    equipment: "Mat",
    focus: "Glutes and core",
    steps: [
      [
        "Lie on your back",
        "Bend your knees and place your feet on the floor, about hip width apart.",
      ],
      [
        "Lift your hips",
        "Press through your feet and raise your hips while keeping your trunk controlled.",
      ],
      ["Lower gently", "Return your hips to the mat without dropping them."],
    ],
    tips: [
      "Avoid overextending your lower back at the top.",
      "Keep the movement controlled rather than pushing for extra height.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/66/glute-bridge/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "bird-dog",
    name: "Bird dogs",
    group: "Core",
    equipment: "Mat",
    focus: "Core, back and glutes",
    steps: [
      [
        "Start on hands and knees",
        "Place your hands under your shoulders and your knees under your hips.",
      ],
      [
        "Reach opposite limbs",
        "Extend one arm forward and the opposite leg backward while keeping your torso steady.",
      ],
      [
        "Return and switch",
        "Bring both limbs back down slowly, then change sides.",
      ],
    ],
    tips: [
      "Keep your hips level rather than rotating.",
      "Only reach as far as you can without arching your back.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
  {
    id: "push-up",
    name: "Push-ups",
    group: "Chest",
    equipment: "No equipment",
    focus: "Chest, shoulders, triceps and core",
    steps: [
      [
        "Set your position",
        "Place your hands slightly wider than your shoulders. Support your body on your hands and toes.",
      ],
      [
        "Lower together",
        "Bend your elbows to bring your chest toward the floor, keeping your body aligned.",
      ],
      [
        "Push back up",
        "Press through your hands to return to the starting position without letting your hips sag.",
      ],
    ],
    tips: [
      "Use an easier variation if you cannot control the movement.",
      "Keep your neck aligned with your spine.",
    ],
    referenceUrl:
      "https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/",
    referenceLabel: "Technique reference — ACE",
    cameraPreview: false,
  },
];
