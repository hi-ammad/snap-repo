import { basename } from "@std/path";
import type { TemplateInfo, TemplateProvider } from "./types/index.d.ts";
import { debug, parseGitURI, sendFetch } from "./utils/index.ts";

/**
 * Template provider for HTTP(S) URLs.
 * It handles both JSON responses and direct URL fetching.
 */
export const http: TemplateProvider = async (input, options) => {
  if (input.endsWith(".json")) {
    return (await _httpJSON(input, options)) as TemplateInfo;
  }

  const url = new URL(input);
  let name: string = basename(url.pathname);

  try {
    const head = await sendFetch(url.href, {
      method: "HEAD",
      validateStatus: true,
      headers: {
        authorization: options.auth ? `Bearer ${options.auth}` : undefined,
      },
    });

    const _contentType = head.headers.get("content-type") || "";
    if (_contentType.includes("application/json")) {
      return (await _httpJSON(input, options)) as TemplateInfo;
    }

    const filename = head.headers
      .get("content-disposition")
      ?.match(/filename="?(.+)"?/)?.[1];

    if (filename) {
      name = filename.split(".")[0];
    }
  } catch (error) {
    debug(`Failed to fetch HEAD for ${url.href}:`, error);
  }

  return {
    name: `${name}-${url.href.slice(0, 8)}`,
    version: "",
    subdir: "",
    tar: url.href,
    defaultDir: name,
    headers: {
      Authorization: options.auth ? `Bearer ${options.auth}` : undefined,
    },
  };
};

/**
 * Template provider for JSON input sources.
 *
 * @param input - The JSON URL to fetch template info from.
 * @param options - Additional options for fetching.
 * @returns The parsed TemplateInfo object.
 * @throws Error if required fields are missing in the response.
 */
const _httpJSON: TemplateProvider = async (input, options) => {
  const result = await sendFetch(input, {
    validateStatus: true,
    headers: {
      authorization: options.auth ? `Bearer ${options.auth}` : undefined,
    },
  });
  const info = (await result.json()) as TemplateInfo;

  if (!info.tar || !info.name) {
    throw new Error(
      `Invalid template info from ${input}. name or tar fields are missing!`,
    );
  }
  return info;
};

/**
 * Template provider for GitHub repositories.
 *
 * @param input - The GitHub repository URI.
 * @param options - Additional options for fetching.
 * @returns The TemplateInfo object for the GitHub repository.
 */
export const github: TemplateProvider = (input, options) => {
  const parsed = parseGitURI(input);

  // Base URL for GitHub API
  const githubAPIURL =
    Deno.env.get("SNAP_REPO_GITHUB_URL") || "https://api.github.com";

  return {
    name: parsed.repo.replace("/", "-"),
    version: parsed.ref,
    subdir: parsed.subdir,
    headers: {
      Authorization: options.auth ? `Bearer ${options.auth}` : undefined,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    url: `${githubAPIURL.replace("api.github.com", "github.com")}/${parsed.repo}/tree/${parsed.ref}${parsed.subdir}`,
    tar: `${githubAPIURL}/repos/${parsed.repo}/tarball/${parsed.ref}`,
  };
};

/**
 * Template provider for GitLab repositories.
 *
 * @param input - The GitLab repository URI.
 * @param options - Additional options for fetching.
 * @returns The TemplateInfo object for the GitLab repository.
 */
export const gitlab: TemplateProvider = (input, options) => {
  const parsed = parseGitURI(input);
  const gitlab = Deno.env.get("SNAP_REPO_GITLAB_URL") || "https://gitlab.com";
  return {
    name: parsed.repo.replace("/", "-"),
    version: parsed.ref,
    subdir: parsed.subdir,
    headers: {
      authorization: options.auth ? `Bearer ${options.auth}` : undefined,
      "sec-fetch-mode": "same-origin",
    },
    url: `${gitlab}/${parsed.repo}/tree/${parsed.ref}${parsed.subdir}`,
    tar: `${gitlab}/${parsed.repo}/-/archive/${parsed.ref}.tar.gz`,
  };
};

/**
 * Template provider for Bitbucket repositories.
 *
 * @param input - The Bitbucket repository URI.
 * @param options - Additional options for fetching.
 * @returns The TemplateInfo object for the Bitbucket repository.
 */
export const bitbucket: TemplateProvider = (input, options) => {
  const parsed = parseGitURI(input);
  return {
    name: parsed.repo.replace("/", "-"),
    version: parsed.ref,
    subdir: parsed.subdir,
    headers: {
      authorization: options.auth ? `Bearer ${options.auth}` : undefined,
    },
    url: `https://bitbucket.com/${parsed.repo}/src/${parsed.ref}${parsed.subdir}`,
    tar: `https://bitbucket.org/${parsed.repo}/get/${parsed.ref}.tar.gz`,
  };
};

/**
 * Template provider for SourceHut repositories.
 *
 * @param input - The SourceHut repository URI.
 * @param options - Additional options for fetching.
 * @returns The TemplateInfo object for the SourceHut repository.
 */
export const sourcehut: TemplateProvider = (input, options) => {
  const parsed = parseGitURI(input);
  return {
    name: parsed.repo.replace("/", "-"),
    version: parsed.ref,
    subdir: parsed.subdir,
    headers: {
      authorization: options.auth ? `Bearer ${options.auth}` : undefined,
    },
    url: `https://git.sr.ht/~${parsed.repo}/tree/${parsed.ref}/item${parsed.subdir}`,
    tar: `https://git.sr.ht/~${parsed.repo}/archive/${parsed.ref}.tar.gz`,
  };
};

/**
 * A record of all available template providers.
 * This allows for easy access and management of different providers.
 */
export const providers: Record<string, TemplateProvider> = {
  http,
  https: http,
  github,
  gh: github,
  gitlab,
  bitbucket,
  sourcehut,
};
