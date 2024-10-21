/**
 * This module contains functions to download templates.
 * @module
 */

import { ensureDir, exists } from "@std/fs";
import { dirname, resolve } from "@std/path";
import {
  cacheDirectory,
  debug,
  download,
  normalizeHeaders,
} from "./utils/index.ts";
import { providers } from "./providers.ts";
import { registryProvider } from "./registry.ts";
import { extract } from "npm:tar@7.4.3";
import type { TemplateInfo, TemplateProvider } from "./types/index.d.ts";

/**
 * Options for downloading a template.
 */
export interface DownloadTemplateOptions {
  provider?: string; // The provider to use for downloading the template.
  force?: boolean; // Whether to overwrite existing files.
  forceClean?: boolean; // Whether to remove existing files before downloading.
  offline?: boolean; // Use cached version instead of downloading.
  preferOffline?: boolean; // Prefer cached version if available.
  providers?: Record<string, TemplateProvider>; // Custom providers for downloading.
  dir?: string; // Directory where the template will be extracted.
  registry?: false | string; // Registry URL for fetching template info.
  cwd?: string; // Current working directory for extraction.
  auth?: string; // Authorization token for accessing templates.
  install?: boolean; // Flag to indicate if installation should be triggered after download.
  silent?: boolean; // Suppress output messages.
}

/**
 * Result of the template download process.
 */
export type DownloadTemplateResult = Omit<TemplateInfo, "dir" | "source"> & {
  dir: string; // Directory where the template was extracted.
  source: string; // Source of the template.
};

const sourceProtoRe = /^([\w-.]+):/;

/**
 * Downloads a template from the specified provider and extracts it to the given directory.
 *
 * @param input - The name or identifier of the template to download.
 * @param options - Options to customize the download behavior.
 * @returns A promise that resolves to an object containing the template information and the directory where it was extracted.
 * @throws Error if the template cannot be downloaded or extracted.
 */
export async function downloadTemplate(
  input: string,
  options: DownloadTemplateOptions = {},
): Promise<DownloadTemplateResult> {
  options = {
    registry: Deno.env.get("SNAP_REPO_REGISTRY"),
    auth: Deno.env.get("SNAP_REPO_AUTH"),
    ...options,
  };

  const registry = options.registry === false
    ? undefined
    : registryProvider(options.registry, { auth: options.auth });

  let providerName: string = options.provider ||
    (registry ? "registry" : "github");

  let source: string = input;
  const sourceProvierMatch = input.match(sourceProtoRe);
  if (sourceProvierMatch) {
    providerName = sourceProvierMatch[1];
    source = input.slice(sourceProvierMatch[0].length);
    if (providerName === "http" || providerName === "https") {
      source = input;
    }
  }

  const provider = options.providers?.[providerName] ||
    providers[providerName] || registry;
  if (!provider) {
    throw new Error(`Unsupported provider: ${providerName}`);
  }

  const template = await Promise.resolve()
    .then(() => provider(source, { auth: options.auth }))
    .catch((error) => {
      throw new Error(
        `Failed to download template from ${providerName}: ${error.message}`,
      );
    });

  if (!template) {
    throw new Error(`Failed to resolve template from ${providerName}`);
  }

  // Sanitize name and defaultDir
  template.name = (template.name || "template").replace(/[^\da-z-]/gi, "-");
  template.defaultDir = (template.defaultDir || template.name).replace(
    /[^\da-z-]/gi,
    "-",
  );

  // Download template source
  const temporaryDirectory = resolve(
    cacheDirectory(),
    providerName,
    template.name,
  );
  const tarPath = resolve(
    temporaryDirectory,
    (template.version || template.name) + ".tar.gz",
  );

  if (options.preferOffline && (await exists(tarPath))) {
    options.offline = true;
  }
  if (!options.offline) {
    await ensureDir(dirname(tarPath));
    const s = Date.now();
    await download(template.tar, tarPath, {
      headers: {
        Authorization: options.auth ? `Bearer ${options.auth}` : undefined,
        ...normalizeHeaders(template.headers),
      },
    }).catch(async (error) => {
      if (!(await exists(tarPath))) {
        throw error;
      }
      // Accept network errors if we have a cached version
      debug("Download error. Using cached version:", error);
      options.offline = true;
    });
    debug(`Downloaded ${template.tar} to ${tarPath} in ${Date.now() - s}ms`);
  }

  if (!(await exists(tarPath))) {
    throw new Error(
      `Tarball not found: ${tarPath} (offline: ${options.offline})`,
    );
  }

  // Extract template
  const cwd = resolve(options.cwd || ".");
  const extractPath = resolve(cwd, options.dir || template.defaultDir);
  if (options.forceClean) {
    await Deno.remove(extractPath, { recursive: true });
  }
  if (
    !options.force &&
    (await exists(extractPath))
    // &&
    // (await Deno.readDirSync(extractPath)).file > 0
  ) {
    throw new Error(`Destination ${extractPath} already exists.`);
  }
  await ensureDir(extractPath);

  const s = Date.now();
  const subdir = template.subdir?.replace(/^\//, "") || "";
  await extract({
    file: tarPath,
    cwd: extractPath,
    onentry(entry) {
      entry.path = entry.path.split("/").splice(1).join("/");
      if (subdir) {
        if (entry.path.startsWith(subdir + "/")) {
          // Rewrite path
          entry.path = entry.path.slice(subdir.length);
        } else {
          // Skip
          entry.path = "";
        }
      }
    },
  });
  debug(`Extracted to ${extractPath} in ${Date.now() - s}ms`);

  return {
    ...template,
    source,
    dir: extractPath,
  };
}
