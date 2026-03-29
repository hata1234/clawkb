import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import path from "path";
import { readFile } from "fs/promises";

/**
 * Load plugin i18n messages from CLAWKB_EXTERNAL_PLUGINS directories.
 * Each plugin can have a messages/ dir with {locale}.json files.
 * Plugin messages are deep-merged on top of core messages.
 */
async function loadPluginMessages(locale: string): Promise<Record<string, unknown>> {
  const env = process.env.CLAWKB_EXTERNAL_PLUGINS;
  if (!env) return {};

  const dirs = env.split(",").map((p) => p.trim()).filter(Boolean);
  let merged: Record<string, unknown> = {};

  for (const dir of dirs) {
    try {
      const raw = await readFile(path.join(dir, "messages", `${locale}.json`), "utf8");
      const pluginMessages = JSON.parse(raw);
      merged = { ...merged, ...pluginMessages };
    } catch {
      // Plugin has no messages for this locale — skip
    }
  }

  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  const coreMessages = (await import(`../../messages/${locale}.json`)).default;
  const pluginMessages = await loadPluginMessages(locale);

  return {
    locale,
    messages: { ...coreMessages, ...pluginMessages },
  };
});
