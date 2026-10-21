import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPERIMENTAL_RIR_FILENAME,
  EXPERIMENTAL_RIR_VERSION,
  type ExperimentalRirManifest,
  isSupportedManifest,
} from "./experimental-rir-bundle.js";

@Injectable()
export class ExperimentalRirService {
  private readonly bundleRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../assets/experimental-rir",
  );

  config() {
    const { manifest } = this.loadBundle();
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
    if (
      version !== EXPERIMENTAL_RIR_VERSION ||
      filename !== EXPERIMENTAL_RIR_FILENAME
    ) {
      throw new NotFoundException();
    }
    return this.loadBundle().model;
  }

  private loadBundle(): { manifest: ExperimentalRirManifest; model: Buffer } {
    try {
      const versionDirectory = join(this.bundleRoot, EXPERIMENTAL_RIR_VERSION);
      const parsed: unknown = JSON.parse(
        readFileSync(join(versionDirectory, "manifest.json"), "utf8"),
      );
      if (!isSupportedManifest(parsed)) {
        throw new Error("Manifest contract does not match this bundle version");
      }
      const manifest = parsed;

      const model = readFileSync(join(versionDirectory, EXPERIMENTAL_RIR_FILENAME));
      const actualHash = createHash("sha256").update(model).digest("hex");
      if (actualHash !== manifest.sha256) {
        throw new Error("Model hash does not match the manifest");
      }
      return { manifest, model };
    } catch {
      throw new ServiceUnavailableException({
        code: "EXPERIMENTAL_RIR_UNAVAILABLE",
        message: "The synthetic RIR demo bundle is unavailable or invalid.",
      });
    }
  }
}
