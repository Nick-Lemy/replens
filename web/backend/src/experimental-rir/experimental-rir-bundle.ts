export const EXPERIMENTAL_RIR_FILENAME = "model.onnx";
export const EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION =
  "synthetic-pilot-angular-v1";
export const EXPERIMENTAL_RIR_NOTICE =
  "SYNTHETIC ONLY: software check, not research evidence or a deployable RIR model.";

export const EXPERIMENTAL_RIR_BUNDLES = {
  "speed-only": {
    version: "synthetic-rir-speed-only-v1",
    sha256:
      "7c734ec947b86df655635a9bca5058801fb7c63fedf9049eb3a82caf6bdbb627",
    featureOrder: ["mean_up_speed_deg_s", "peak_up_speed_deg_s"],
    inputShape: 2,
    sourceArtifact:
      "training/artifacts/synthetic/20261021T155611102710Z/models/speed_only.onnx",
  },
  "speed-movement": {
    version: "synthetic-rir-speed-movement-v1",
    sha256:
      "54c30a7a9ccb76ab7b03f5f4ab51b554a59d8f7571ff6156f2e298bd35689c2c",
    featureOrder: [
      "mean_up_speed_deg_s",
      "peak_up_speed_deg_s",
      "movement_instability",
    ],
    inputShape: 3,
    sourceArtifact:
      "training/artifacts/synthetic/20261021T155611102710Z/models/speed_movement.onnx",
  },
} as const;

export type ExperimentalRirModel = keyof typeof EXPERIMENTAL_RIR_BUNDLES;

export interface ExperimentalRirManifest {
  synthetic: true;
  deploymentApproved: false;
  version: string;
  filename: typeof EXPERIMENTAL_RIR_FILENAME;
  sha256: string;
  inputName: "features";
  inputDtype: "float32";
  inputShape: [null, number];
  featureOrder: readonly string[];
  featureDefinitionVersion: typeof EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION;
  preprocessing: "StandardScaler included in ONNX; do not scale twice";
  output: "raw continuous RIR estimate; not rounded or clamped";
  notice: typeof EXPERIMENTAL_RIR_NOTICE;
  provenance: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSupportedManifest(
  value: unknown,
  model: ExperimentalRirModel,
): value is ExperimentalRirManifest {
  if (!isRecord(value) || !isRecord(value.provenance)) return false;
  const contract = EXPERIMENTAL_RIR_BUNDLES[model];
  const provenance = value.provenance;
  return (
    value.synthetic === true &&
    value.deploymentApproved === false &&
    value.version === contract.version &&
    value.filename === EXPERIMENTAL_RIR_FILENAME &&
    value.sha256 === contract.sha256 &&
    value.inputName === "features" &&
    value.inputDtype === "float32" &&
    Array.isArray(value.inputShape) &&
    value.inputShape.length === 2 &&
    value.inputShape[0] === null &&
    value.inputShape[1] === contract.inputShape &&
    Array.isArray(value.featureOrder) &&
    value.featureOrder.length === contract.featureOrder.length &&
    value.featureOrder.every(
      (feature, index) => feature === contract.featureOrder[index],
    ) &&
    value.featureDefinitionVersion ===
      EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION &&
    value.preprocessing ===
      "StandardScaler included in ONNX; do not scale twice" &&
    value.output === "raw continuous RIR estimate; not rounded or clamped" &&
    value.notice === EXPERIMENTAL_RIR_NOTICE &&
    provenance.dataSource === "synthetic" &&
    provenance.sourceArtifact === contract.sourceArtifact &&
    provenance.sourceArtifactSha256 === contract.sha256
  );
}
