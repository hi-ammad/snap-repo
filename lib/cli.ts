import { relative } from "@std/path";
import { downloadTemplate } from "./snap.repo.ts";
import { startShell } from "./utils/index.ts";

// Load package information from the Deno configuration file
const pkg = { name: "@openjs/snap-repo" };
// Parse Deno CLI arguments
const args = Deno.args;

/**
 * Parses command-line arguments into an object.
 *
 * @returns An object containing the parsed arguments.
 */
function parseArgs() {
  // deno-lint-ignore no-explicit-any
  const parsedArgs: Record<string, any> = {};
  let positionalCount = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // If it starts with "--", it's an option
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      parsedArgs[key] = value || true;
    } else {
      // Otherwise, treat as a positional argument
      if (positionalCount === 0) {
        parsedArgs.template = arg; // First positional arg is the template
      } else if (positionalCount === 1) {
        parsedArgs.dir = arg; // Second positional arg is the directory
      }
      positionalCount++;
    }
  }

  return parsedArgs;
}

const parsedArgs = parseArgs();

// Show help if no template is provided
if (!parsedArgs.template) {
  console.log(`
    ${pkg.name} 

    Usage:
      ${pkg.name} <template> [dir] [options]

    Options:
      --auth=<token>          Custom Authorization token
      --cwd=<path>            Set the current working directory
      --force                 Clone to existing directory even if it exists
      --forceClean            Remove any existing directory/file before cloning
      --offline               Use cached version instead of downloading
      --preferOffline         Prefer cached version if available
      --shell                 Open a new shell in the cloned directory
      --verbose               Show verbose debugging info
  `);
  Deno.exit(1);
}

// Set the DEBUG environment variable if verbose mode is enabled
if (parsedArgs.verbose) {
  Deno.env.set("DEBUG", "true");
}

// Download the template based on the parsed arguments
const r = await downloadTemplate(parsedArgs.template, {
  dir: parsedArgs.dir,
  force: parsedArgs.force,
  forceClean: parsedArgs.forceClean,
  offline: parsedArgs.offline,
  preferOffline: parsedArgs.preferOffline,
  auth: parsedArgs.auth || Deno.env.get("SNAP_REPO_AUTH"),
  install: parsedArgs.install,
});

// Log success message with the cloned template information
const _from = r.name || r.url;
const _to = relative(Deno.cwd(), r.dir) || "./";
console.log(`✨ Successfully cloned \`${_from}\` to \`${_to}\`\n`);

// Optionally start a new shell in the cloned directory
if (parsedArgs.shell) {
  startShell(r.dir);
}
