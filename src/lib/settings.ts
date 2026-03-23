import { prisma } from "./prisma";

// ─── Default values (mirrors the old hardcoded constants) ─────────────────
export const DEFAULT_ENTRY_TYPES = [
  { id: "opportunity", label: "Opportunity", icon: "💡" },
  { id: "report",      label: "Report",      icon: "📊" },
  { id: "reference",   label: "Reference",   icon: "📚" },
  { id: "project_note",label: "Project Note",icon: "📝" },
];

export const DEFAULT_SOURCE_OPTIONS = [
  "nightly-recon",
  "stock-daily",
  "reddit",
  "web",
  "manual",
];

export const DEFAULT_STATUS_OPTIONS = [
  { id: "new",         label: "New" },
  { id: "interested",  label: "Interested" },
  { id: "in_progress", label: "In Progress" },
  { id: "done",        label: "Done" },
  { id: "dismissed",   label: "Dismissed" },
];

export const DEFAULT_EMBEDDING = {
  provider: "ollama" as "ollama" | "openai" | "disabled",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ollamaModel: "bge-m3",
  openaiApiKey: "",
  openaiModel: "text-embedding-3-small",
};

export const DEFAULT_STORAGE = {
  endpoint:  process.env.S3_ENDPOINT  ?? process.env.MINIO_ENDPOINT  ?? "localhost",
  port:      parseInt(process.env.S3_PORT      ?? process.env.MINIO_PORT      ?? "9000"),
  useSSL:    (process.env.S3_USE_SSL ?? "false") === "true",
  accessKey: process.env.S3_ACCESS_KEY ?? process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.S3_SECRET_KEY ?? process.env.MINIO_SECRET_KEY ?? "minioadmin",
  bucket:    process.env.S3_BUCKET    ?? process.env.MINIO_BUCKET    ?? "knowledge-hub",
  publicUrl: process.env.S3_PUBLIC_URL ?? process.env.MINIO_PUBLIC_URL ?? "https://minio.cellar.men/knowledge-hub",
};

export const DEFAULT_AUTH = {
  allowRegistration: true,
  requireAdminApproval: true,
  requireEmailVerification: false,
  allowAgentRegistration: true,
};

export const DEFAULT_PLUGIN_SETTINGS = {
  states: {} as Record<string, { enabled: boolean }>,
};

export const DEFAULT_SMTP = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromAddress: "",
  fromName: "ClawKB",
  enabled: false,
};

export const DEFAULT_RAG = {
  provider: "spark-vllm" as "openai" | "ollama" | "spark-vllm" | "disabled",
  baseUrl: "http://192.168.1.113:8888/v1",
  model: "Qwen/Qwen3.5-35B-A3B-FP8",
  apiKey: "",
  topK: 5,
  maxTokens: 1024,
  systemPrompt: "You are a knowledge base assistant. Answer based on the provided context. Cite entry IDs when referencing specific entries. If the context doesn't contain the answer, say so.",
};

// ─── Types ────────────────────────────────────────────────────────────────
export interface EntryTypeOption { id: string; label: string; icon: string }
export interface StatusOption    { id: string; label: string }
export interface EmbeddingConfig {
  provider: "ollama" | "openai" | "disabled";
  ollamaUrl?: string;
  ollamaModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
}
export interface StorageConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
}
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
  enabled: boolean;
}
export interface RagConfig {
  provider: "openai" | "ollama" | "spark-vllm" | "disabled";
  baseUrl: string;
  model: string;
  apiKey: string;
  topK: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface AllSettings {
  entry_types:    EntryTypeOption[];
  source_options: string[];
  status_options: StatusOption[];
  embedding:      EmbeddingConfig;
  storage:        StorageConfig;
  auth:           typeof DEFAULT_AUTH;
  plugins:        typeof DEFAULT_PLUGIN_SETTINGS;
  rag:            RagConfig;
  smtp:           SmtpConfig;
}

// ─── Server-side helpers ──────────────────────────────────────────────────
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return defaultValue;
    return row.value as T;
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  });
}

export async function getAllSettings(): Promise<AllSettings> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    entry_types:    (map.entry_types    as EntryTypeOption[]) ?? DEFAULT_ENTRY_TYPES,
    source_options: (map.source_options as string[])          ?? DEFAULT_SOURCE_OPTIONS,
    status_options: (map.status_options as StatusOption[])    ?? DEFAULT_STATUS_OPTIONS,
    embedding:      (map.embedding      as EmbeddingConfig)   ?? DEFAULT_EMBEDDING,
    storage:        (map.storage        as StorageConfig)     ?? DEFAULT_STORAGE,
    auth:           (map.auth           as typeof DEFAULT_AUTH) ?? DEFAULT_AUTH,
    plugins:        (map.plugins        as typeof DEFAULT_PLUGIN_SETTINGS) ?? DEFAULT_PLUGIN_SETTINGS,
    rag:            (map.rag            as RagConfig)                      ?? DEFAULT_RAG,
    smtp:           (map.smtp           as SmtpConfig)                     ?? DEFAULT_SMTP,
  };
}
