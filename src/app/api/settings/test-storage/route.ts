import { NextRequest, NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import * as Minio from "minio";

export async function POST(request: NextRequest) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
