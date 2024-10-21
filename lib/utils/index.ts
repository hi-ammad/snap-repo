import { existsSync } from "@std/fs";
import { relative, resolve } from "@std/path";
import { homedir } from "node:os";

import type { GitInfo } from "../types/index.d.ts";

/**
 * This Module exports util functions
 * @module
 **/

/**
 * Downloads a file from a given URL and saves it to the specified file path.
 * It checks for an existing ETag to avoid unnecessary downloads.
 *
 * @param url - The URL to download the file from.
 * @param filePath - The local path where the file should be saved.
 * @param options - Optional headers for the fetch request.
 */
export async function download(
  url: string,
  filePath: string,
  options: { headers?: Record<string, string | undefined> } = {},
) {
  const infoPath = filePath + ".json";
  let info: { etag?: string } = {};

  try {
    const data = await Deno.readTextFile(infoPath);
    info = JSON.parse(data);
  } catch {
    // Ignore error, file doesn't exist
  }

  const headResponse = await sendFetch(url, {
    method: "HEAD",
    headers: options.headers,
  }).catch(() => undefined);

  const etag = headResponse?.headers.get("etag");
  if (info.etag === etag && existsSync(filePath)) {
    // Already downloaded
    return;
  }
  if (typeof etag === "string") {
    info.etag = etag;
  }

  const response = await sendFetch(url, { headers: options.headers });
  if (response.status >= 400) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }

  // Write file in Deno 2.0
  const file = await Deno.open(filePath, { write: true, create: true });
  await response.body?.pipeTo(file.writable);
  file.close();

  await Deno.writeTextFile(infoPath, JSON.stringify(info));
}

const inputRegex =
  /^(?<repo>[\w.-]+\/[\w.-]+)(?<subdir>[^#]+)?(?<ref>#[\w./@-]+)?/;

/**
 * Parses a Git URI string into a GitInfo object.
 *
 * @param input - The Git URI string to parse.
 * @returns The parsed GitInfo object.
 */
export function parseGitURI(input: string): GitInfo {
  const m = input.match(inputRegex)?.groups || {};
  return <GitInfo>{
    repo: m.repo,
    subdir: m.subdir || "/",
    ref: m.ref ? m.ref.slice(1) : "main",
  };
}

/**
 * Logs debug information to the console if the DEBUG environment variable is set.
 *
 * @param args - The arguments to log.
 */
export function debug(...args: unknown[]) {
  if (Deno.env.get("DEBUG")) {
    console.debug("[snap-repo]", ...args);
  }
}

// Interface for fetch options
interface InternalFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string | undefined>;
  agent?: unknown; // Deno doesn't use agents like Node.js
  validateStatus?: boolean;
}

/**
 * A wrapper function for the fetch API, allowing for custom options and error handling.
 *
 * @param url - The URL to fetch.
 * @param options - Options for the fetch request.
 * @returns The response from the fetch request.
 * @throws Error if the fetch request fails.
 */
export async function sendFetch(
  url: string,
  options: InternalFetchOptions = {},
) {
  if (options.headers?.["sec-fetch-mode"]) {
    // deno-lint-ignore no-explicit-any
    options.mode = options.headers["sec-fetch-mode"] as any;
  }

  const res = await fetch(url, {
    ...options,
    headers: normalizeHeaders(options.headers),
  }).catch((error: Error) => {
    throw new Error(`Failed to download ${url}: ${error.message}`, {
      cause: error,
    });
  });

  if (options.validateStatus && res.status >= 400) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return res;
}

/**
 * Returns the cache directory path based on the XDG_CACHE_HOME environment variable
 * or falls back to the user's home directory.
 *
 * @returns The path to the cache directory.
 */
export function cacheDirectory() {
  return Deno.env.get("XDG_CACHE_HOME")
    ? resolve(Deno.env.get("XDG_CACHE_HOME")!, "giget")
    : resolve(homedir(), ".cache/giget");
}

/**
 * Normalizes headers by converting them to lowercase and filtering out undefined values.
 *
 * @param headers - The headers to normalize.
 * @returns A normalized headers object.
 */
export function normalizeHeaders(
  headers: Record<string, string | undefined> = {},
) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) {
      continue;
    }
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

// -- Experimental --

/**
 * Returns the current shell being used.
 *
 * @returns The path to the current shell.
 */
export function currentShell() {
  if (Deno.env.get("SHELL")) {
    return Deno.env.get("SHELL");
  }
  if (Deno.build.os === "windows") {
    return "cmd.exe";
  }
  return "/bin/bash";
}

/**
 * Starts a new shell process in the specified working directory.
 *
 * @param cwd - The directory in which to open the shell.
 */
export function startShell(cwd: string) {
  cwd = resolve(cwd);
  const shell = currentShell();
  console.info(
    `(experimental) Opening shell in ${relative(Deno.cwd(), cwd)}...`,
  );

  const command = new Deno.Command(shell!, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = command.spawn();
  process.status.then(() => console.log("Shell closed"));
}
