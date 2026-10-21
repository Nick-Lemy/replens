import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPERIMENTAL_RIR_BUNDLES,
  EXPERIMENTAL_RIR_FILENAME,
  type ExperimentalRirModel,
  type ExperimentalRirManifest,
  isSupportedManifest,
} from "./experimental-rir-bundle.js";

@Injectable()
export class ExperimentalRirService {
  private readonly bundleRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../assets/experimental-rir",
  );

  config(model?: string) {
    const selectedModel = model ?? "speed-only";
    if (!Object.hasOwn(EXPERIMENTAL_RIR_BUNDLES, selectedModel)) {
      throw new BadRequestException({
        code: "INVALID_EXPERIMENTAL_RIR_MODEL",
        message: "The requested experimental RIR model is not supported.",
      });
    }
    const { manifest } = this.loadBundle(selectedModel as ExperimentalRirModel);
    return {
      synthetic: manifest.synthetic,
      deploymentApproved: manifest.deploymentApproved,
      version: manifest.version,
      modelUrl: `/api/experimental-rir/assets/${manifest.version}/${manifest.filename}`,
      sha256: manifest.sha256,
      inputName: manifest.inputName,
      featureOrder: [...manifest.featureOrder],
      featureDefinitionVersion: manifest.featureDefinitionVersion,
      notice: manifest.notice,
    };
  }

  asset(version: string, filename: string): Buffer {
    const model = Object.entries(EXPERIMENTAL_RIR_BUNDLES).find(
      ([, contract]) => contract.version === version,
    )?.[0] as ExperimentalRirModel | undefined;
    if (!model || filename !== EXPERIMENTAL_RIR_FILENAME) {
      throw new NotFoundException();
    }
    return this.loadBundle(model).model;
  }

  private loadBundle(
    model: ExperimentalRirModel,
  ): { manifest: ExperimentalRirManifest; model: Buffer } {
    try {
      const contract = EXPERIMENTAL_RIR_BUNDLES[model];
      const versionDirectory = join(this.bundleRoot, contract.version);
      const parsed: unknown = JSON.parse(
        readFileSync(join(versionDirectory, "manifest.json"), "utf8"),
      );
      if (!isSupportedManifest(parsed, model)) {
        throw new Error("Manifest contract does not match this bundle version");
      }
      const manifest = parsed;

      const modelBytes = readFileSync(
        join(versionDirectory, EXPERIMENTAL_RIR_FILENAME),
      );
      const actualHash = createHash("sha256").update(modelBytes).digest("hex");
      if (actualHash !== manifest.sha256) {
        throw new Error("Model hash does not match the manifest");
      }
      return { manifest, model: modelBytes };
    } catch {
      throw new ServiceUnavailableException({
        code: "EXPERIMENTAL_RIR_UNAVAILABLE",
        message: "The synthetic RIR demo bundle is unavailable or invalid.",
      });
    }
  }
}
