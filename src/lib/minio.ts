import * as Minio from "minio";
import { getSetting, DEFAULT_STORAGE, type StorageConfig } from "./settings";

// ─── Dynamic client from DB settings ─────────────────────────────────────
export async function getStorageConfig(): Promise<StorageConfig> {
  return getSetting<StorageConfig>("storage", DEFAULT_STORAGE);
}

export async function getMinioClient(): Promise<{ client: Minio.Client; bucket: string; publicUrl: string }> {
  const cfg = await getStorageConfig();
  const client = new Minio.Client({
    endPoint: cfg.endpoint,
    port: cfg.port,
    useSSL: cfg.useSSL,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
  });
  return { client, bucket: cfg.bucket, publicUrl: cfg.publicUrl };
}

// ─── Legacy static client (fallback for non-async contexts) ───────────────
export const minioClient = new Minio.Client({
  endPoint:  process.env.S3_ENDPOINT  ?? process.env.MINIO_ENDPOINT  ?? "192.168.1.62",
  port:      parseInt(process.env.S3_PORT      ?? process.env.MINIO_PORT      ?? "9000"),
  useSSL:    (process.env.S3_USE_SSL ?? "false") === "true",
  accessKey: process.env.S3_ACCESS_KEY ?? process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.S3_SECRET_KEY ?? process.env.MINIO_SECRET_KEY ?? "minioadmin",
});

export const BUCKET     = process.env.S3_BUCKET     ?? process.env.MINIO_BUCKET     ?? "knowledge-hub";
export const PUBLIC_URL = process.env.S3_PUBLIC_URL ?? process.env.MINIO_PUBLIC_URL ?? "https://minio.cellar.men/knowledge-hub";

export async function uploadToMinio(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  const { client, bucket, publicUrl } = await getMinioClient();
  await client.putObject(bucket, key, buffer, buffer.length, { "Content-Type": mimeType });
  return `${publicUrl}/${key}`;
}
