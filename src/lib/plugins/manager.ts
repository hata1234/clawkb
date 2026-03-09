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
  PluginContext,
  PluginEntryCardElement,
  PluginEntryRenderBlock,
  PluginManifest,
  PluginServerModule,
  PluginSettingsPanel,
  PluginSidebarItem,
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
  } catch {
    return null;
  }

  // Dynamic import with cache-busting to pick up file changes
  const mod = await import(/* webpackIgnore: true */ pathToFileURL(file).href) as PluginServerModule;
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
        } catch {
          return null;
        }
      })
  );

  return plugins.filter((plugin): plugin is PluginRecord => plugin !== null).sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
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

export async function installPlugin(input: {
  id: string;
  name: string;
  description?: string;
  hooks?: string[];
}) {
  await ensurePluginsDir();
  const id = input.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
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
    `export const entry = {};\nexport const sidebar = {};\nexport const settings = {};\nexport const api = { routes: [] };\n`
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

export async function runEntryAfterCreateHooks(entry: Record<string, unknown>, originalInput: Record<string, unknown>, principal: AppPrincipal | null) {
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    await mod?.entry?.afterCreate?.({ entry, originalInput, context: createPluginContext(principal) });
  }
}

export async function runEntryBeforeUpdateHooks(input: Record<string, unknown>, existingEntry: Record<string, unknown>, principal: AppPrincipal | null) {
  let next = input;
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const updated = await mod?.entry?.beforeUpdate?.({ input: next, existingEntry, context: createPluginContext(principal) });
    if (updated) next = updated;
  }
  return next;
}

export async function runEntryAfterUpdateHooks(entry: Record<string, unknown>, existingEntry: Record<string, unknown>, principal: AppPrincipal | null) {
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

export async function getEntryRenderBlocks(entry: Record<string, unknown>, principal: AppPrincipal | null): Promise<PluginEntryRenderBlock[]> {
  const blocks: PluginEntryRenderBlock[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.entry?.render?.({ entry, context: createPluginContext(principal) });
    if (result?.length) blocks.push(...result);
  }
  return blocks;
}

export async function runEntrySerializeHooks(entry: Record<string, unknown>, principal: AppPrincipal | null): Promise<Record<string, unknown>> {
  let result = { ...entry };
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const extra = await mod?.entry?.serialize?.({ entry: result, principal, context: createPluginContext(principal) });
    if (extra) result = { ...result, ...extra };
  }
  return result;
}

export async function getEntryCardElements(entry: Record<string, unknown>, principal: AppPrincipal | null): Promise<PluginEntryCardElement[]> {
  const elements: PluginEntryCardElement[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const result = await mod?.entryCard?.render?.({ entry, context: createPluginContext(principal) });
    if (result?.length) elements.push(...result);
  }
  return elements;
}

export async function runEntryAfterQueryHooks(entries: Record<string, unknown>[], principal: AppPrincipal | null): Promise<Record<string, unknown>[]> {
  let result = entries;
  for (const plugin of await getEnabledPlugins()) {
    const mod = await loadServerModule(plugin.dir);
    const updated = await mod?.entry?.afterQuery?.({ entries: result, principal, context: createPluginContext(principal) });
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

export async function executePluginApi(pluginId: string, pathParts: string[], request: Request, principal: AppPrincipal | null) {
  const plugins = await getEnabledPlugins();
  const plugin = plugins.find((item) => item.manifest.id === pluginId);
  if (!plugin) {
    return NextResponse.json({ error: "Plugin not found or disabled" }, { status: 404 });
  }

  const mod = await loadServerModule(plugin.dir);
  const routes = (mod?.api?.routes || []) as PluginApiRoute[];
  const pathname = pathParts.join("/");
  const route = routes.find((item) => item.method.toUpperCase() === request.method.toUpperCase() && item.path === pathname);
  if (!route) {
    return NextResponse.json({ error: "Plugin route not found" }, { status: 404 });
  }

  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.json().catch(() => null);
  const response = await route.handler({
    request,
    params: pathParts,
    body,
    context: createPluginContext(principal),
  });

  if (response instanceof Response) {
    return response;
  }

  return NextResponse.json(response.body, { status: response.status || 200 });
}
