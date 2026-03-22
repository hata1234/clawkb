"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface UploadedImage {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 20 }: ImageUploadProps) {
  const t = useTranslations('ImageUpload');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
        return null;
      }
      return await res.json();
    } catch {
      alert(t('uploadFailed'));
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const remaining = maxImages - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results = await Promise.all(toUpload.map(uploadFile));
    const successful = results.filter(Boolean) as UploadedImage[];
    onChange([...images, ...successful]);
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const updateCaption = (idx: number, caption: string) => {
    const updated = [...images];
    updated[idx] = { ...updated[idx], caption };
    onChange(updated);
  };

  return (
    <div>
      <label style={{
        display: "block", fontSize: "0.85rem", color: "var(--text-secondary)",
        fontWeight: 500, marginBottom: 8,
      }}>
        {t('label')}
      </label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="image-upload-grid" style={{ marginBottom: 12 }}>
          {images.map((img, idx) => (
            <div key={img.key} style={{
              position: "relative",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}>
              <img
                src={img.url}
                alt={img.filename}
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
              />
              <button onClick={() => removeImage(idx)} style={{
                position: "absolute", top: 6, right: 6,
                width: 24, height: 24,
                background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
              <input
                value={img.caption || ""}
                onChange={(e) => updateCaption(idx, e.target.value)}
                placeholder={t('captionPlaceholder')}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--background)", border: "none",
                  borderTop: "1px solid var(--border)",
                  padding: "6px 8px", fontSize: "0.75rem", color: "var(--text-secondary)",
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-md)",
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--accent-muted)" : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          {uploading ? (
            <Loader2 style={{ width: 24, height: 24, color: "var(--accent)", margin: "0 auto", animation: "spin 1s linear infinite" }} />
          ) : (
            <>
              <Upload style={{ width: 20, height: 20, color: "var(--text-muted)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {t('dropOrClick')}
              </p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 4 }}>
                {t('formats')}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <style>{`
        .image-upload-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        @media (min-width: 640px) {
          .image-upload-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
