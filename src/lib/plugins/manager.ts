import "server-only";

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToMinio, getMinioClient } from "@/lib/minio";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import { autoTagEntry } from "@/lib/auto-tag";
import { DEFAULT_PLUGIN_SETTINGS, getAllSettings, getSetting, setSetting } from "@/lib/settings";
import type { AppPrincipal } from "@/lib/auth";
import type {
  PluginApiRoute,
  PluginBranding,
  PluginContentTagDef,
  PluginContext,
  PluginDashboardWidget,
  PluginEntryCardElement,
  PluginEntryRenderBlock,
  PluginManifest,
  PluginServerModule,
  PluginSettingsPanel,
  PluginSidebarItem,
  PluginStatusDef,
  ResolvedContentTag,
} from "./types";

const PLUGINS_DIR = path.join(process.cwd(), "plugins");

export interface PluginRecord {
  manifest: PluginManifest;
  dir: string;
  enabled: boolean;
}

async function ensurePluginsDir() {
  await fs.mkdir(PLUGINS_DIR, { recursive: true });
}

function isEnabled(manifest: PluginManifest, states: Record<string, { enabled: boolean }> | undefined) {
  const saved = states?.[manifest.id]?.enabled;
  return saved ?? true;
}

async function readManifest(dir: string) {
  const raw = await fs.readFile(path.join(dir, "manifest.json"), "utf8");
  return JSON.parse(raw) as PluginManifest;
}

async function loadServerModule(dir: string): Promise<PluginServerModule | null> {
  const file = path.join(dir, "server.mjs");
  try {
    await fs.access(file);
  } catch (err) {
    console.error("[plugins]", err);
    return null;
  }

  // Dynamic import with cache-busting to pick up file changes
  const mod = (await import(/* webpackIgnore: true */ pathToFileURL(file).href)) as PluginServerModule;
  return mod as PluginServerModule;
}

export async function listPlugins(): Promise<PluginRecord[]> {
  await ensurePluginsDir();
  const pluginSettings = await getSetting("plugins", DEFAULT_PLUGIN_SETTINGS);
  const dirs = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  const plugins = await Promise.all(
    dirs
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const dir = path.join(PLUGINS_DIR, entry.name);
        try {
          const manifest = await readManifest(dir);
          return {
            manifest,
            dir,
            enabled: isEnabled(manifest, pluginSettings.states),
          } satisfies PluginRecord;
        } catch (err) {
          console.error("[plugins]", err);
          return null;
        }
      }),
  );

  return plugins
    .filter((plugin): plugin is PluginRecord => plugin !== null)
    .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}

export async function setPluginEnabled(pluginId: string, enabled: boolean) {
  const current = await getSetting("plugins", DEFAULT_PLUGIN_SETTINGS);
  await setSetting("plugins", {
    ...current,
    states: {
      ...current.states,
      [pluginId]: { enabled },
    },
  });
}

export async function installPlugin(input: { id: string; name: string; description?: string; hooks?: string[] }) {
  await ensurePluginsDir();
  const id = input.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");
  if (!id) {
    throw new Error("Invalid plugin id");
  }

  const dir = path.join(PLUGINS_DIR, id);
  await fs.mkdir(dir, { recursive: false });

  const manifest: PluginManifest = {
    id,
    name: input.name.trim() || id,
    version: "0.1.0",
    description: input.description?.trim(),
    hooks: (input.hooks || []) as PluginManifest["hooks"],
    permissions: [],
  };

  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(
    path.join(dir, "server.mjs"),
    `export const entry = {};\nexport const sidebar = {};\nexport const settings = {};\nexport const api = { routes: [] };\n`,
  );

  return manifest;
}

export async function removePlugin(pluginId: string) {
  const plugins = await listPlugins();
  const plugin = plugins.find((item) => item.manifest.id === pluginId);
  if (!plugin) {
    throw new Error("Plugin not found");
  }
  if (plugin.manifest.builtIn) {
    throw new Error("Built-in plugins cannot be removed");
  }
  await fs.rm(plugin.dir, { recursive: true, force: true });
}

function createPluginContext(principal: AppPrincipal | null): PluginContext {
  return {
    principal,
    prisma,
    storage: { uploadToMinio, getMinioClient },
    embedding: { generateAndStoreEmbedding },
    settings: { getSetting, setSetting, getAllSettings },
    helpers: { autoTagEntry },
  };
}

async function getEnabledPlugins() {
  const plugins = await listPlugins();
  return plugins.filter((plugin) => plugin.enabled);
}

export async function runEntryBeforeCreateHooks(input: Record<string, unknown>, principal: AppPrincipal | null) {
  let next = input;
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const updated = await mod?.entry?.beforeCreate?.({ input: next, context: createPluginContext(principal) });
    if (updated) next = updated;
  }
  return next;
}

export async function runEntryAfterCreateHooks(
  entry: Record<string, unknown>,
  originalInput: Record<string, unknown>,
  principal: AppPrincipal | null,
) {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.afterCreate?.({ entry, originalInput, context: createPluginContext(principal) });
  }
}

export async function runEntryBeforeUpdateHooks(
  input: Record<string, unknown>,
  existingEntry: Record<string, unknown>,
  principal: AppPrincipal | null,
) {
  let next = input;
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const updated = await mod?.entry?.beforeUpdate?.({
      input: next,
      existingEntry,
      context: createPluginContext(principal),
    });
    if (updated) next = updated;
  }
  return next;
}

export async function runEntryAfterUpdateHooks(
  entry: Record<string, unknown>,
  existingEntry: Record<string, unknown>,
  principal: AppPrincipal | null,
) {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.afterUpdate?.({ entry, existingEntry, context: createPluginContext(principal) });
  }
}

export async function runEntryBeforeDeleteHooks(entry: Record<string, unknown>, principal: AppPrincipal | null) {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.beforeDelete?.({ entry, context: createPluginContext(principal) });
  }
}

export async function getEntryRenderBlocks(
  entry: Record<string, unknown>,
  principal: AppPrincipal | null,
): Promise<PluginEntryRenderBlock[]> {
  const blocks: PluginEntryRenderBlock[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.entry?.render?.({ entry, context: createPluginContext(principal) });
    if (result?.length) blocks.push(...result);
  }
  return blocks;
}

export async function runEntrySerializeHooks(
  entry: Record<string, unknown>,
  principal: AppPrincipal | null,
): Promise<Record<string, unknown>> {
  let result = { ...entry };
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const extra = await mod?.entry?.serialize?.({ entry: result, principal, context: createPluginContext(principal) });
    if (extra) result = { ...result, ...extra };
  }
  return result;
}

export async function getEntryCardElements(
  entry: Record<string, unknown>,
  principal: AppPrincipal | null,
): Promise<PluginEntryCardElement[]> {
  const elements: PluginEntryCardElement[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.entryCard?.render?.({ entry, context: createPluginContext(principal) });
    if (result?.length) elements.push(...result);
  }
  return elements;
}

export async function runEntryAfterQueryHooks(
  entries: Record<string, unknown>[],
  principal: AppPrincipal | null,
): Promise<Record<string, unknown>[]> {
  let result = entries;
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const updated = await mod?.entry?.afterQuery?.({
      entries: result,
      principal,
      context: createPluginContext(principal),
    });
    if (updated) result = updated;
  }
  return result;
}

export async function getSidebarItems(principal: AppPrincipal | null): Promise<PluginSidebarItem[]> {
  const items: PluginSidebarItem[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.sidebar?.register?.({ context: createPluginContext(principal) });
    if (result?.length) items.push(...result);
  }
  return items;
}

export async function getSettingsPanels(principal: AppPrincipal | null): Promise<PluginSettingsPanel[]> {
  const items: PluginSettingsPanel[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.settings?.register?.({ context: createPluginContext(principal) });
    if (result?.length) items.push(...result);
  }
  return items;
}

/**
 * Run beforeStatusChange hooks. Returns false if any plugin blocks the transition.
 */
export async function runEntryBeforeStatusChangeHooks(
  entry: Record<string, unknown>,
  fromStatus: string,
  toStatus: string,
  principal: AppPrincipal | null,
  reason?: string,
): Promise<boolean> {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.entry?.beforeStatusChange?.({
      entry,
      fromStatus,
      toStatus,
      reason,
      context: createPluginContext(principal),
    });
    if (result === false) return false;
  }
  return true;
}

/**
 * Run afterStatusChange hooks (fire-and-forget).
 */
export async function runEntryAfterStatusChangeHooks(
  entry: Record<string, unknown>,
  fromStatus: string,
  toStatus: string,
  principal: AppPrincipal | null,
  reason?: string,
): Promise<void> {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.afterStatusChange?.({
      entry,
      fromStatus,
      toStatus,
      reason,
      context: createPluginContext(principal),
    });
  }
}

/**
 * Run beforeQuery hooks. Plugins can push additional conditions into andConditions array.
 * Used by @clawkb/cloud to inject workspace_id filtering.
 */
export async function runEntryBeforeQueryHooks(
  where: Record<string, unknown>,
  andConditions: Record<string, unknown>[],
  principal: AppPrincipal | null,
): Promise<void> {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.beforeQuery?.({
      where,
      andConditions,
      principal,
      context: createPluginContext(principal),
    });
  }
}

/**
 * Collect dashboard widgets from all enabled plugins.
 */
export async function getDashboardWidgets(principal: AppPrincipal | null): Promise<PluginDashboardWidget[]> {
  const widgets: PluginDashboardWidget[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.dashboard?.register?.({ context: createPluginContext(principal) });
    if (result?.length) widgets.push(...result);
  }
  return widgets.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/**
 * Collect branding overrides from all enabled plugins (last plugin wins per field).
 */
export async function getBranding(principal: AppPrincipal | null): Promise<PluginBranding> {
  const merged: PluginBranding = {};
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.branding?.register?.({ context: createPluginContext(principal) });
    if (result) Object.assign(merged, result);
  }
  return merged;
}

/**
 * Collect all custom status definitions from enabled plugins.
 */
export async function getStatusDefinitions(principal: AppPrincipal | null): Promise<PluginStatusDef[]> {
  const defs: PluginStatusDef[] = [
    // Built-in defaults (KB defaults)
    { key: "new", label: "New", color: "#facc15" },
    { key: "interested", label: "Interested", color: "#60a5fa" },
    { key: "in_progress", label: "In Progress", color: "#c084fc" },
    { key: "done", label: "Done", color: "#4ade80" },
    { key: "dismissed", label: "Dismissed", color: "#71717a" },
    { key: "archived", label: "Archived", color: "#9ca3af" },
  ];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.status?.register?.({ context: createPluginContext(principal) });
    if (result?.length) defs.push(...result);
  }
  return defs;
}

/** Collect all content tag definitions from enabled plugins */
async function collectContentTagDefs(principal: AppPrincipal | null): Promise<PluginContentTagDef[]> {
  const defs: PluginContentTagDef[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.content?.tags?.({ context: createPluginContext(principal) });
    if (result?.length) defs.push(...result);
  }
  return defs;
}

const CONTENT_TAG_RE = /\{\{(\w+):([^}]+)\}\}/g;

/** Resolve all {{tag:value}} placeholders in content using plugin tag resolvers */
export async function resolveContentTags(
  content: string | null | undefined,
  entry: Record<string, unknown>,
  principal: AppPrincipal | null,
): Promise<ResolvedContentTag[]> {
  if (!content) return [];

  const matches = [...content.matchAll(CONTENT_TAG_RE)];
  if (matches.length === 0) return [];

  const defs = await collectContentTagDefs(principal);
  if (defs.length === 0) return [];

  // Build tag → def map
  const defMap = new Map<string, PluginContentTagDef>();
  for (const def of defs) {
    defMap.set(def.tag, def);
  }

  const resolved: ResolvedContentTag[] = [];
  const ctx = createPluginContext(principal);

  for (const match of matches) {
    const [placeholder, tag, value] = match;
    const def = defMap.get(tag);
    if (!def) continue;

    try {
      const props = await def.resolve({ value: value.trim(), entry, context: ctx });
      if (props) {
        resolved.push({
          placeholder,
          tag,
          value: value.trim(),
          component: def.component,
          props,
        });
      }
    } catch (err) {
      console.error(`[ContentTag] Failed to resolve {{${tag}:${value}}}:`, err);
    }
  }

  return resolved;
}

function matchRoute(routePath: string, pathname: string): string[] | null {
  // Normalize: strip leading slash from route path
  const rp = routePath.replace(/^\//, "");
  const routeSegments = rp.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (routeSegments.length !== pathSegments.length) return null;
  const params: string[] = [];
  for (let i = 0; i < routeSegments.length; i++) {
    if (routeSegments[i].startsWith(":")) {
      params.push(pathSegments[i]);
    } else if (routeSegments[i] !== pathSegments[i]) {
      return null;
    }
  }
  return params;
}

export async function executePluginApi(
  pluginId: string,
  pathParts: string[],
  request: Request,
  principal: AppPrincipal | null,
) {
  const plugins = await getEnabledPlugins();
  const plugin = plugins.find((item) => item.manifest.id === pluginId);
  if (!plugin) {
    return NextResponse.json({ error: "Plugin not found or disabled" }, { status: 404 });
  }

  const mod = await loadServerModule(plugin.dir);
  const routes = (mod?.api?.routes || []) as PluginApiRoute[];
  const pathname = pathParts.join("/");

  let matchedRoute: PluginApiRoute | undefined;
  let matchedParams: string[] = [];
  for (const route of routes) {
    if (route.method.toUpperCase() !== request.method.toUpperCase()) continue;
    const params = matchRoute(route.path, pathname);
    if (params !== null) {
      matchedRoute = route;
      matchedParams = params;
      break;
    }
  }

  if (!matchedRoute) {
    return NextResponse.json({ error: "Plugin route not found" }, { status: 404 });
  }

  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.json().catch(() => null);
  const response = await matchedRoute.handler({
    request,
    params: matchedParams,
    body,
    context: createPluginContext(principal),
  });

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response.body, { status: response.status || 200 });
}
