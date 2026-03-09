"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";

interface ProfileUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  effectiveRole: string;
  approvalStatus: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setDisplayName(data.user.displayName || "");
        setBio(data.user.bio || "");
      });
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setUser(data.user);
      setMessage("Profile saved.");
    }
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "avatar");
    setUploading(true);
    setMessage("");

    const upload = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await upload.json();
    if (!upload.ok) {
      setUploading(false);
      setMessage(uploadData.error || "Upload failed");
      return;
    }

    const patch = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: uploadData.url }),
    });
    const patchData = await patch.json();
    setUploading(false);

    if (patch.ok) {
      setUser(patchData.user);
      setMessage("Avatar updated.");
    } else {
      setMessage(patchData.error || "Failed to save avatar");
    }
  }

  if (!user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 96 }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-dim)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>Profile</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>Update your display name, bio, and avatar.</p>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 24, display: "grid", gap: 24 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "1.4rem", fontWeight: 700 }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "1rem", color: "var(--text)", fontWeight: 600 }}>{user.displayName}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>@{user.username} · {user.effectiveRole}</div>
            <label style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 12px", cursor: "pointer" }}>
              <Upload style={{ width: 14, height: 14 }} />
              {uploading ? "Uploading..." : "Upload avatar"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadAvatar(file);
              }} />
            </label>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>Display Name</label>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>Bio</label>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} />
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div>Email: {user.email || "None"}</div>
          <div>Status: {user.approvalStatus}</div>
        </div>

        {message ? <div style={{ color: message.endsWith(".") ? "var(--accent)" : "var(--danger)", fontSize: "0.85rem" }}>{message}</div> : null}

        <div>
          <button onClick={saveProfile} disabled={saving} style={{ border: "none", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-contrast)", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
