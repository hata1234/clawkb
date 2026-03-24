import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings, jsonError } from "@/lib/auth";
import * as Minio from "minio";

export async function POST(request: NextRequest) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden: admin only", 403);

  const { endpoint, port, useSSL, accessKey, secretKey, bucket } = await request.json();

  try {
    const client = new Minio.Client({
      endPoint: endpoint,
      port: parseInt(port),
      useSSL: !!useSSL,
      accessKey,
      secretKey,
    });

    const exists = await client.bucketExists(bucket);
    if (!exists) {
      return NextResponse.json({ ok: false, message: `Bucket "${bucket}" does not exist` });
    }
    return NextResponse.json({ ok: true, message: `Connected · bucket "${bucket}" found` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message });
  }
}
