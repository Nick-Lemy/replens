export const EXPERIMENTAL_RIR_VERSION = "synthetic-rir-speed-only-v1";
export const EXPERIMENTAL_RIR_FILENAME = "model.onnx";
export const EXPERIMENTAL_RIR_SHA256 =
  "7c734ec947b86df655635a9bca5058801fb7c63fedf9049eb3a82caf6bdbb627";
export const EXPERIMENTAL_RIR_FEATURE_ORDER = [
  "mean_up_speed_deg_s",
  "peak_up_speed_deg_s",
] as const;
export const EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION =
  "synthetic-pilot-angular-v1";
export const EXPERIMENTAL_RIR_NOTICE =
  "SYNTHETIC ONLY: software check, not research evidence or a deployable RIR model.";

export interface ExperimentalRirManifest {
  synthetic: true;
  deploymentApproved: false;
  version: typeof EXPERIMENTAL_RIR_VERSION;
  filename: typeof EXPERIMENTAL_RIR_FILENAME;
  sha256: typeof EXPERIMENTAL_RIR_SHA256;
  inputName: "features";
  inputDtype: "float32";
  inputShape: [null, 2];
  featureOrder: readonly string[];
  featureDefinitionVersion: typeof EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION;
  preprocessing: "StandardScaler included in ONNX; do not scale twice";
  output: "raw continuous RIR estimate; not rounded or clamped";
  notice: typeof EXPERIMENTAL_RIR_NOTICE;
  provenance: Record<string, unknown>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSupportedManifest(
  value: unknown,
): value is ExperimentalRirManifest {
  if (!isRecord(value) || !isRecord(value.provenance)) return false;
  const provenance = value.provenance;
  return (
    value.synthetic === true &&
    value.deploymentApproved === false &&
    value.version === EXPERIMENTAL_RIR_VERSION &&
    value.filename === EXPERIMENTAL_RIR_FILENAME &&
    value.sha256 === EXPERIMENTAL_RIR_SHA256 &&
    value.inputName === "features" &&
    value.inputDtype === "float32" &&
    Array.isArray(value.inputShape) &&
    value.inputShape.length === 2 &&
    value.inputShape[0] === null &&
    value.inputShape[1] === EXPERIMENTAL_RIR_FEATURE_ORDER.length &&
    Array.isArray(value.featureOrder) &&
    value.featureOrder.length === EXPERIMENTAL_RIR_FEATURE_ORDER.length &&
    value.featureOrder.every(
      (feature, index) => feature === EXPERIMENTAL_RIR_FEATURE_ORDER[index],
    ) &&
    value.featureDefinitionVersion ===
      EXPERIMENTAL_RIR_FEATURE_DEFINITION_VERSION &&
    value.preprocessing ===
      "StandardScaler included in ONNX; do not scale twice" &&
    value.output === "raw continuous RIR estimate; not rounded or clamped" &&
    value.notice === EXPERIMENTAL_RIR_NOTICE &&
    provenance.dataSource === "synthetic" &&
    provenance.sourceArtifact ===
      "training/artifacts/synthetic/20261021T155611102710Z/models/speed_only.onnx" &&
    provenance.sourceArtifactSha256 === EXPERIMENTAL_RIR_SHA256
  );
}
