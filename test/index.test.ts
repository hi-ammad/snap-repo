import { expect } from "@std/expect";
import { parseGitURI } from "../lib/utils/index.ts";

Deno.test("parseGitURI", async (t) => {
  const defaults = { repo: "org/repo", subdir: "/", ref: "main" };
  const tests = [
    { input: "org/repo", output: {} },
    { input: "org/repo#ref", output: { ref: "ref" } },
    { input: "org/repo#ref-123", output: { ref: "ref-123" } },
    { input: "org/repo#ref/ABC-123", output: { ref: "ref/ABC-123" } },
    { input: "org/repo#@org/tag@1.2.3", output: { ref: "@org/tag@1.2.3" } },
    { input: "org/repo/foo/bar", output: { subdir: "/foo/bar" } },
  ];

  for (const test of tests) {
    await t.step({
      name: test.input,
      fn: () =>
        expect(parseGitURI(test.input)).toMatchObject({
          ...defaults,
          ...test.output,
        }),
    });
  }
});
