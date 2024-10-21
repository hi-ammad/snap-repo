import type { TemplateInfo, TemplateProvider } from "./types/index.d.ts";
import { debug, sendFetch } from "./utils/index.ts";

const DEFAULT_REGISTRY =
  "https://raw.githubusercontent.com/snap-repo/main/templates";

/**
 * Creates a template provider that fetches template information from a specified registry.
 *
 * @param registryEndpoint - The URL of the registry from which to fetch template info.
 *                             Defaults to a GitHub raw content URL for snap-repo templates.
 * @param options - Optional settings for the provider.
 * @param options.auth - An optional authorization token for accessing the registry.
 * @returns A TemplateProvider function that takes a template name and returns its info.
 */
export const registryProvider = (
  registryEndpoint: string = DEFAULT_REGISTRY,
  options: { auth?: string } = {},
): TemplateProvider => {
  return <TemplateProvider> (async (input) => {
    const start = Date.now();
    const registryURL = `${registryEndpoint}/${input}.json`;

    const result = await sendFetch(registryURL, {
      headers: {
        authorization: options.auth ? `Bearer ${options.auth}` : undefined,
      },
    });

    if (result.status >= 400) {
      throw new Error(
        `Failed to download ${input} template info from ${registryURL}: ${result.status} ${result.statusText}`,
      );
    }

    const info = (await result.json()) as TemplateInfo;
    if (!info.tar || !info.name) {
      throw new Error(
        `Invalid template info from ${registryURL}. name or tar fields are missing!`,
      );
    }

    debug(
      `Fetched ${input} template info from ${registryURL} in ${
        Date.now() - start
      }ms`,
    );

    return info;
  });
};
