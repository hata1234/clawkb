import { NextRequest, NextResponse } from "next/server";
import { uploadToMinio } from "@/lib/minio";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    // Check API token or session auth
    const authHeader = req.headers.get("authorization");
    const apiToken = process.env.API_TOKEN;
    if (apiToken && authHeader !== `Bearer ${apiToken}`) {
      // Check session auth via cookie (for browser uploads)
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const key = `${Date.now()}-${uuid().slice(0, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToMinio(buffer, key, file.type);

    return NextResponse.json({
      url,
      key,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
