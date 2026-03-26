import type { AppPrincipal } from "@/lib/auth";

export type PluginHookName =
  | "entry.beforeCreate"
  | "entry.afterCreate"
  | "entry.beforeUpdate"
  | "entry.afterUpdate"
  | "entry.beforeDelete"
  | "entry.beforeStatusChange"
  | "entry.afterStatusChange"
  | "entry.beforeQuery"
  | "entry.render"
  | "entry.serialize"
  | "entry.afterQuery"
  | "content.tags"
  | "entryCard.render"
  | "sidebar.register"
  | "dashboard.register"
  | "branding.register"
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
  icon?: string;
  badge?: string | number;
  order?: number;
}

/** Dashboard widget registered by a plugin */
export interface PluginDashboardWidget {
  id: string;
  title: string;
  /** Width hint: 1 = quarter, 2 = half, 3 = three-quarter, 4 = full */
  width?: 1 | 2 | 3 | 4;
  order?: number;
  /** Client component name in the widget registry */
  component: string;
  props?: Record<string, unknown>;
}

/** Branding overrides registered by a plugin */
export interface PluginBranding {
  /** Product name displayed in nav/title */
  productName?: string;
  /** Logo URL or path */
  logoUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Default theme preset to apply */
  defaultTheme?: string;
  /** Custom landing page component name */
  landingComponent?: string;
}

/** Status definition registered by a plugin */
export interface PluginStatusDef {
  /** Status key, e.g. "in_review", "approved" */
  key: string;
  /** Human-readable label */
  label: string;
  /** Display color (hex or CSS color name) */
  color?: string;
  /** Icon name */
  icon?: string;
  /** Allowed transitions from this status */
  allowedTransitions?: string[];
}

/** Status change context passed to hooks */
export interface StatusChangeContext {
  entry: Record<string, unknown>;
  fromStatus: string;
  toStatus: string;
  /** Optional reason/comment for the status change */
  reason?: string;
}

/** Query filter context passed to beforeQuery hook */
export interface BeforeQueryContext {
  /** The Prisma where clause being built */
  where: Record<string, unknown>;
  /** Additional AND conditions plugins can inject */
  andConditions: Record<string, unknown>[];
  /** The requesting principal */
  principal: AppPrincipal | null;
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
    /** Called before an entry's status changes. Return false to block the transition. */
    beforeStatusChange?: (input: {
      entry: Record<string, unknown>;
      fromStatus: string;
      toStatus: string;
      reason?: string;
      context: PluginContext;
    }) => Promise<boolean | void>;
    /** Called after an entry's status has changed. */
    afterStatusChange?: (input: {
      entry: Record<string, unknown>;
      fromStatus: string;
      toStatus: string;
      reason?: string;
      context: PluginContext;
    }) => Promise<void>;
    /** Called before a query is executed. Plugin can inject WHERE conditions (e.g. workspace_id). */
    beforeQuery?: (input: {
      where: Record<string, unknown>;
      andConditions: Record<string, unknown>[];
      principal: AppPrincipal | null;
      context: PluginContext;
    }) => Promise<void>;
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
  dashboard?: {
    /** Register dashboard widgets */
    register?: (input: { context: PluginContext }) => Promise<PluginDashboardWidget[] | void>;
  };
  branding?: {
    /** Register branding overrides (last plugin wins for each field) */
    register?: (input: { context: PluginContext }) => Promise<PluginBranding | void>;
  };
  status?: {
    /** Register custom status definitions (extends the default statuses) */
    register?: (input: { context: PluginContext }) => Promise<PluginStatusDef[] | void>;
  };
  api?: {
    routes?: PluginApiRoute[];
  };
}
