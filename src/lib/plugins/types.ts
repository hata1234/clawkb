import type { AppPrincipal } from "@/lib/auth";

export type PluginHookName =
  | "entry.beforeCreate"
  | "entry.afterCreate"
  | "entry.beforeUpdate"
  | "entry.afterUpdate"
  | "entry.beforeDelete"
  | "entry.render"
  | "entry.serialize"
  | "entry.afterQuery"
  | "content.tags"
  | "entryCard.render"
  | "sidebar.register"
  | "api.register"
  | "settings.register";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  builtIn?: boolean;
  hooks?: PluginHookName[];
  permissions?: string[];
}

export interface PluginSidebarItem {
  id: string;
  label: string;
  href: string;
}

export interface PluginSettingsPanel {
  id: string;
  title: string;
  description?: string;
}

export interface PluginEntryRenderBlock {
  id: string;
  type: string;
  title?: string;
  data?: Record<string, unknown>;
}

export interface PluginEntryCardElement {
  id: string;
  type: "badge" | "icon" | "indicator";
  position: "top-right" | "bottom-left" | "meta-row";
  label?: string;
  icon?: string;
  color?: string;
  tooltip?: string;
  data?: Record<string, unknown>;
}

export interface PluginApiRoute {
  method: string;
  path: string;
  description?: string;
  handler: (input: {
    request: Request;
    params: string[];
    body: unknown;
    context: PluginContext;
  }) => Promise<Response | { status?: number; body: unknown }>;
}

export interface PluginContext {
  principal: AppPrincipal | null;
  prisma: typeof import("@/lib/prisma").prisma;
  storage: {
    uploadToMinio: typeof import("@/lib/minio").uploadToMinio;
    getMinioClient: typeof import("@/lib/minio").getMinioClient;
  };
  embedding: {
    generateAndStoreEmbedding: typeof import("@/lib/embedding").generateAndStoreEmbedding;
  };
  settings: {
    getSetting: typeof import("@/lib/settings").getSetting;
    setSetting: typeof import("@/lib/settings").setSetting;
    getAllSettings: typeof import("@/lib/settings").getAllSettings;
  };
  helpers: {
    autoTagEntry: typeof import("@/lib/auto-tag").autoTagEntry;
  };
}

/** Resolved content tag — returned by plugin tag resolvers, consumed by MarkdownRenderer */
export interface ResolvedContentTag {
  /** The original placeholder, e.g. "{{flow:3}}" */
  placeholder: string;
  /** Tag name, e.g. "flow" */
  tag: string;
  /** Raw value after the colon, e.g. "3" */
  value: string;
  /** Client component name in the tag registry */
  component: string;
  /** Props passed to the client component */
  props: Record<string, unknown>;
}

/** Plugin content tag registration */
export interface PluginContentTagDef {
  /** Tag name — matches {{name:value}} */
  tag: string;
  /** Client component name in tag registry */
  component: string;
  /** Server resolver — fetches data for rendering */
  resolve: (input: {
    value: string;
    entry: Record<string, unknown>;
    context: PluginContext;
  }) => Promise<Record<string, unknown> | null>;
}

export interface PluginServerModule {
  entry?: {
    beforeCreate?: (input: {
      input: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<Record<string, unknown> | void>;
    afterCreate?: (input: {
      entry: Record<string, unknown>;
      originalInput: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<void>;
    beforeUpdate?: (input: {
      input: Record<string, unknown>;
      existingEntry: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<Record<string, unknown> | void>;
    afterUpdate?: (input: {
      entry: Record<string, unknown>;
      existingEntry: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<void>;
    beforeDelete?: (input: { entry: Record<string, unknown>; context: PluginContext }) => Promise<void>;
    render?: (input: {
      entry: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<PluginEntryRenderBlock[] | void>;
    serialize?: (input: {
      entry: Record<string, unknown>;
      principal: AppPrincipal | null;
      context: PluginContext;
    }) => Promise<Record<string, unknown> | void>;
    afterQuery?: (input: {
      entries: Record<string, unknown>[];
      principal: AppPrincipal | null;
      context: PluginContext;
    }) => Promise<Record<string, unknown>[] | void>;
  };
  entryCard?: {
    render?: (input: {
      entry: Record<string, unknown>;
      context: PluginContext;
    }) => Promise<PluginEntryCardElement[] | void>;
  };
  sidebar?: {
    register?: (input: { context: PluginContext }) => Promise<PluginSidebarItem[] | void>;
  };
  content?: {
    tags?: (input: { context: PluginContext }) => Promise<PluginContentTagDef[] | void>;
  };
  settings?: {
    register?: (input: { context: PluginContext }) => Promise<PluginSettingsPanel[] | void>;
  };
  api?: {
    routes?: PluginApiRoute[];
  };
}
