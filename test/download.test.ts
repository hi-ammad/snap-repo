import { expect } from "@std/expect";
import { existsSync } from "node:fs";
import { resolve } from "@std/path";
import { downloadTemplate } from "../lib/main.ts";

Deno.test({
  name: "downloadTemplate",
  fn: async (t) => {
    await t.step("clone hi-ammad/template", async () => {
      const destinationDirectory = resolve(import.meta.dirname!, ".tmp/cloned");
      const { dir } = await downloadTemplate("gh:hi-ammad/hi-ammad", {
        dir: destinationDirectory,
        preferOffline: true,
      });
      expect(existsSync(resolve(dir, "README.md")));
    });

    await t.step("do not clone to exisiting dir", async () => {
      const destinationDirectory = resolve(
        import.meta.dirname!,
        ".tmp/exisiting",
      );
      await Deno.mkdir(destinationDirectory).catch(() => {});
      await expect(
        downloadTemplate("gh:hi-ammad/hi-ammad", { dir: destinationDirectory }),
      ).rejects.toThrow("already exists");
    });

    await Deno.remove(resolve(import.meta.dirname!, ".tmp"), {
      recursive: true,
    });
  },
});
