"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import "./RichEditor.css";

// ──────────────────────────────────────────────
// SVG icon helpers
// ──────────────────────────────────────────────

const Bold = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>
);

const Italic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
  </svg>
);

const UnderlineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/>
  </svg>
);

const Strikethrough = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
);

const Quote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
  </svg>
);

const CodeBlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);

const BulletList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
  </svg>
);

const OrderedList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
    <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text>
    <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
    <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);

const AlignLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>
  </svg>
);

const AlignCenter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/>
  </svg>
);

const AlignRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>
  </svg>
);

const SourceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20" strokeWidth="1.5"/>
  </svg>
);

// ──────────────────────────────────────────────
// Image Insert Dialog
// ──────────────────────────────────────────────

interface ImageDialogProps {
  onInsert: (url: string) => void;
  onClose: () => void;
}

function ImageDialog({ onInsert, onClose }: ImageDialogProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInsert = () => {
    if (url.trim()) {
      onInsert(url.trim());
    }
  };

  return (
    <div className="rich-editor-image-dialog-overlay" onClick={onClose}>
      <div className="rich-editor-image-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Insert Image</h3>
        <input
          ref={inputRef}
          type="url"
          placeholder="https://example.com/image.png"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInsert();
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="rich-editor-image-dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleInsert}>Insert</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Toolbar Button
// ──────────────────────────────────────────────

interface ToolbarBtnProps {
  onClick: () => void;
  active?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarBtn({ onClick, active, tooltip, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className={`rich-editor-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      data-tooltip={tooltip}
      aria-label={tooltip}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────
// Main RichEditor component
// ──────────────────────────────────────────────

interface RichEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const isInternalUpdate = useRef(false);
  const lastMarkdown = useRef<string | null>(null); // null = not yet initialized
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose-kb",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdate.current) return;
      // @ts-expect-error tiptap-markdown augments the editor
      const md: string = ed.storage.markdown?.getMarkdown?.() ?? "";
      if (md !== lastMarkdown.current) {
        lastMarkdown.current = md;
        onChange(md);
      }
    },
  });

  // Load initial content + sync external value changes → editor
  useEffect(() => {
    if (!editor) return;
    // Skip if value hasn't changed from what we last set
    if (lastMarkdown.current !== null && value === lastMarkdown.current) return;

    isInternalUpdate.current = true;
    editor.commands.setContent(value ?? "");
    lastMarkdown.current = value;
    requestAnimationFrame(() => {
      isInternalUpdate.current = false;
    });
  }, [editor, value]);

  // Toggle source mode: sync content between WYSIWYG ↔ textarea
  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      // Switching FROM source → WYSIWYG: push textarea value into editor
      if (editor && textareaRef.current) {
        const md = textareaRef.current.value;
        isInternalUpdate.current = true;
        editor.commands.setContent(md);
        lastMarkdown.current = md;
        onChange(md);
        requestAnimationFrame(() => {
          isInternalUpdate.current = false;
        });
      }
    }
    setSourceMode(!sourceMode);
  }, [sourceMode, editor, onChange]);

  const insertImage = useCallback(
    (url: string) => {
      editor?.chain().focus().setImage({ src: url }).run();
      setShowImageDialog(false);
    },
    [editor]
  );

  const setLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", prev);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      <div className="rich-editor-wrapper">
        {/* ── Toolbar ── */}
        <div className="rich-editor-toolbar">
          {/* Source toggle */}
          <div className="rich-editor-toolbar-group">
            <ToolbarBtn
              tooltip={sourceMode ? "WYSIWYG 模式" : "原始碼模式"}
              active={sourceMode}
              onClick={toggleSourceMode}
            >
              <SourceIcon />
            </ToolbarBtn>
          </div>

          <div className="rich-editor-toolbar-sep" />

          {/* Text style */}
          <div className="rich-editor-toolbar-group">
            <ToolbarBtn tooltip="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough />
            </ToolbarBtn>
          </div>

          <div className="rich-editor-toolbar-sep" />

          {/* Headings */}
          <div className="rich-editor-toolbar-group">
            {([1, 2, 3] as const).map((level) => (
              <ToolbarBtn
                key={level}
                tooltip={`Heading ${level}`}
                active={editor.isActive("heading", { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              >
                <span style={{ fontSize: 11, fontWeight: 700 }}>H{level}</span>
              </ToolbarBtn>
            ))}
          </div>

          <div className="rich-editor-toolbar-sep" />

          {/* Lists & block */}
          <div className="rich-editor-toolbar-group">
            <ToolbarBtn tooltip="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <BulletList />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Ordered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <OrderedList />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Code Block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <CodeBlockIcon />
            </ToolbarBtn>
          </div>

          <div className="rich-editor-toolbar-sep" />

          {/* Text align */}
          <div className="rich-editor-toolbar-group">
            <ToolbarBtn tooltip="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight />
            </ToolbarBtn>
          </div>

          <div className="rich-editor-toolbar-sep" />

          {/* Link & Image */}
          <div className="rich-editor-toolbar-group">
            <ToolbarBtn tooltip="Link" active={editor.isActive("link")} onClick={setLink}>
              <LinkIcon />
            </ToolbarBtn>
            <ToolbarBtn tooltip="Insert Image" active={false} onClick={() => setShowImageDialog(true)}>
              <ImageIcon />
            </ToolbarBtn>
          </div>
        </div>

        {/* ── Content: WYSIWYG or Source ── */}
        {sourceMode ? (
          <textarea
            ref={textareaRef}
            className="rich-editor-source"
            defaultValue={value}
            onChange={(e) => {
              lastMarkdown.current = e.target.value;
              onChange(e.target.value);
            }}
            spellCheck={false}
          />
        ) : (
          <div className="rich-editor-content">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      {showImageDialog && (
        <ImageDialog onInsert={insertImage} onClose={() => setShowImageDialog(false)} />
      )}
    </>
  );
}
