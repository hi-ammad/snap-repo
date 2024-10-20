/**
 * Represents information about a Git repository.
 */
export interface GitInfo {
  /**
   * The provider of the Git repository.
   * Can be one of "github", "gitlab", "bitbucket", or "sourcehut".
   */
  provider: "github" | "gitlab" | "bitbucket" | "sourcehut";

  /**
   * The name of the repository.
   */
  repo: string;

  /**
   * The subdirectory within the repository, if applicable.
   */
  subdir: string;

  /**
   * The reference (branch, tag, commit SHA) to check out.
   */
  ref: string;
}

/**
 * Represents information about a template.
 */
export interface TemplateInfo {
  /**
   * The name of the template.
   */
  name: string;

  /**
   * The URL to the tarball of the template.
   */
  tar: string;

  /**
   * The version of the template (optional).
   */
  version?: string;

  /**
   * The subdirectory within the template, if applicable (optional).
   */
  subdir?: string;

  /**
   * A URL related to the template (optional).
   */
  url?: string;

  /**
   * The default directory name for the template (optional).
   */
  defaultDir?: string;

  /**
   * Custom headers to include when fetching the template (optional).
   */
  headers?: Record<string, string | undefined>;

  /**
   * A reserved property that should not be used.
   * @deprecated Use of 'source' is not allowed.
   */
  source?: never;

  /**
   * A reserved property that should not be used.
   * @deprecated Use of 'dir' is not allowed.
   */
  dir?: never;

  /**
   * Allows additional properties to be added to the template info.
   */
  [key: string]: any;
}

/**
 * A function type representing a template provider.
 *
 * @param input - The input string for the provider.
 * @param options - Options for the provider.
 * @param options.auth - An optional authentication string.
 * @returns The template information or a promise that resolves to it,
 *          or null if the template could not be provided.
 */
export type TemplateProvider = (
  input: string,
  options: { auth?: string },
) => TemplateInfo | Promise<TemplateInfo> | null;
