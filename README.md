[![JSR](https://jsr.io/badges/@openjs/snap-repo)](https://jsr.io/@openjs/snap-repo)

# @openjs/snap-repo

> Download templates and git repositories with pleasure!

## Features

✨ Support popular git providers (GitHub, GitLab, Bitbucket, Sourcehut) out of
the box.

✨ Built-in and custom [template registry](#template-registry).

✨ Fast cloning using tarball gzip without depending on local `git` and `tar`.

✨ Works online and offline with disk cache support.

✨ Custom template provider support with programmatic usage.

✨ Support extracting with a sub dir.

✨ Authorization support to download private templates

## Install (CLI)

```bash
deno install -g --reload jsr:@openjs/snap-repo/cli --name snap-repo
```

## Usage (CLI)

```bash
snap-repo <template> [<dir>] [...options]
```

### Arguments

- **template**: Template name or a URI describing provider, repository, sub dir,
  and branch/ref. (See [Examples](#examples))
- **dir**: A relative or absolute path where to extract the template.

### Options

- `--force`: Clone to existing directory even if exists.
- `--offline`: Do not attempt to download and use the cached version.
- `--prefer-offline`: Use cache if exists otherwise try to download.
- `--force-clean`: ⚠️ Remove any existing directory or file recursively before
  cloning.
- `--shell`: ⚠️ Open a new shell with the current working directory in cloned
  dir. (Experimental).
- `--registry`: URL to a custom registry. (Can be overridden with
  `SNAP_REPO_REGISTRY` environment variable).
- `--no-registry`: Disable registry lookup and functionality.
- `--verbose`: Show verbose debugging info.
- `--cwd`: Set the current working directory to resolve dirs relative to it.
- `--auth`: Custom Authorization token to use for downloading template. (Can be
  overridden with `SNAP_REPO_AUTH` environment variable).

### Examples

```sh
# Clone mojo example directory
snap-repo  gh:hi-ammad/mojo/example

# Clone to myProject directory
snap-repo gh:hi-ammad/mojo myProject

# Clone next branch
snap-repo gh:hi-ammad/mojo#dev

# Clone /test directory from main branch
snap-repo giget@latest gh:hi-ammad/template/test

# Clone from gitlab
snap-repo gitlab:hi-ammad/template

# Clone from bitbucket
snap-repo bitbucket:hi-ammad/template

# Clone from sourcehut
snap-repo sourcehut:hi-ammad/template

# Clone from https URL (tarball)
snap-repo https://api.github.com/hi-ammad/template/tarball/main

# Clone from https URL (JSON)
snap-repo https://raw.githubusercontent.com/hi-ammad/templates/xxx.json
```

## Template Registry

snap-repo has a built-in HTTP registry system for resolving templates. This way
you can support template name shortcuts and meta-data. The default registry is
served from [hi-ammad/template](./templates/).

If you want to add your template to the built-in registry, just drop a PR to add
it to the [./templates](./templates) directory. Slugs are added on a first-come
first-served basis but this might change in the future.

### Custom Registry

A custom registry should provide an endpoint with the dynamic path
`/:template.json` that returns a JSON response with keys the same as
[custom providers](#custom-providers).

- `name`: (required) Name of the template.
- `tar` (required) Link to the tar download link.
- `defaultDir`: (optional) Default cloning directory.
- `url`: (optional) Webpage of the template.
- `subdir`: (optional) Directory inside the tar file.
- `headers`: (optional) Custom headers to send while downloading template.

Because of the simplicity, you can even use a GitHub repository as a template
registry but also you can build something more powerful by bringing your own
API.

## Usage (Programmatic)

Install package:

```sh
# Using npm
npx jsr add @openjs/snap-repo

# Using deno
deno add jsr:@openjs/snap-repo

# Using yarn
yarn dlx jsr add @openjs/snap-repo

# Using pnpm
pnpm dlx jsr add @openjs/snap-repo

# Using bun
bunx jsr add @openjs/snap-repo
```

Import:

```js
// ESM
import { downloadTemplate } from "@openjs/snap-repo";

// CommonJS
const { downloadTemplate } = require("@openjs/snap-repo");
```

### `downloadTemplate(source, options?)`

**Example:**

```js
const { source, dir } = await downloadTemplate("github:hi-ammad/template");
```

**Options:**

- `source`: (string) Input source in format of
  `[provider]:repo[/subpath][#ref]`.
- `options`: (object) Options are usually inferred from the input string. You
  can customize them.
  - `dir`: (string) Destination directory to clone to. If not provided,
    `user-name` will be used relative to the current directory.
  - `provider`: (string) Either `github`, `gitlab`, `bitbucket` or `sourcehut`.
    The default is `github`.
  - `force`: (boolean) Extract to the existing dir even if already exists.
  - `forceClean`: (boolean) ⚠️ Clean up any existing directory or file before
    cloning.
  - `offline`: (boolean) Do not attempt to download and use the cached version.
  - `preferOffline`: (boolean) Use cache if exists otherwise try to download.
  - `providers`: (object) A map from provider name to custom providers. Can be
    used to override built-ins too.
  - `registry`: (string or false) Set to `false` to disable registry. Set to a
    URL string (without trailing slash) for custom registry. (Can be overridden
    with `SNAP_REPO_REGISTRY` environment variable).
  - `cwd`: (string) Current working directory to resolve dirs relative to it.
  - `auth`: (string) Custom Authorization token to use for downloading template.
    (Can be overridden with `SNAP_REPO_AUTH` environment variable).

**Return value:**

The return value is a promise that resolves to the resolved template.

- `dir`: (string) Path to extracted dir.
- `source`: (string) Normalized version of the input source without provider.
- [other provider template keys]
  - `url`: (string) URL of the repository that can be opened in the browser.
    Useful for logging.

## Custom Providers

Using the programmatic method, you can make your custom template providers.

```ts
import type { TemplateProvider } from "@openjs/snap-repo";

const rainbow: TemplateProvider = async (input, { auth }) => {
  return {
    name: "rainbow",
    version: input,
    headers: { authorization: auth },
    url: `https://rainbow.template/?variant=${input}`,
    tar: `https://rainbow.template/dl/rainbow.${input}.tar.gz`,
  };
};

const { source, dir } = await downloadTemplate("rainbow:one", {
  providers: { rainbow },
});
```

### Custom Registry Providers

You can define additional [custom registry](#custom-registry) providers using
`registryProvider` utility and register to `providers`.

```ts
import { registryProvider } from "@openjs/snap-repo";

const themes = registryProvider(
  "https://raw.githubusercontent.com/hi-ammad/templates/main/test",
);

const { source, dir } = await downloadTemplate("themes:test", {
  providers: { themes },
});
```

## Providing token for private repositories

For private repositories and sources, you might need a token. In order to
provide it, using CLI, you can use `--auth`, using programmatic API using `auth`
option and in both modes also it is possible to use `SNAP_REPO_AUTH` environment
variable to set it. The value will be set in `Authorization: Bearer ...` header
by default.

**Note:** For github private repository access with Fine-grained access tokens,
you need to give **Contents** and **Metadata** repository permissions.

## License

Published under [MIT License](./LICENSE).

## Special Thanks @voidZero - Ecosystem ❤️

<!-- Badges -->
