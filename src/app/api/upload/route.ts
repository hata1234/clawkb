import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { uploadToMinio } from "@/lib/minio";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const principal = await getRequestPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (principal.authMethod === "token" && principal.agent && !principal.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const kind = String(formData.get("kind") || "entry").trim().toLowerCase();
    if (kind !== "entry" && kind !== "avatar") {
      return NextResponse.json({ error: "Invalid upload kind" }, { status: 400 });
    }

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
    const folder = kind === "avatar" ? "avatars" : "entries";
    const owner = principal.id ? `user-${principal.id}` : principal.username;
    const key = `${folder}/${owner}/${Date.now()}-${uuid().slice(0, 8)}.${ext}`;

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
