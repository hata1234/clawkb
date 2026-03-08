import * as Minio from "minio";

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "192.168.1.62",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

export const BUCKET = process.env.MINIO_BUCKET || "knowledge-hub";
export const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "https://minio.cellar.men/knowledge-hub";

export async function uploadToMinio(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return `${PUBLIC_URL}/${key}`;
}
