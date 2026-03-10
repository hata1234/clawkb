"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import EntryMentionPopup from "./EntryMentionPopup";

interface MentionTextareaProps {
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  style?: CSSProperties;
}

interface MentionEntry {
  id: number;
  title: string;
  type: string;
}

/**
 * Textarea with [[ mention support.
 * When user types [[, a popup appears to search and link entries.
 * Selected entry inserts [[entry:ID|title]] at cursor.
 */
export default function MentionTextarea({
  name,
  value,
  onChange,
  placeholder,
  rows = 10,
  style,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1); // cursor position of the first [
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  // Compute popup position relative to wrapper
  const updatePopupPosition = useCallback(() => {
    const ta = textareaRef.current;
    const wrapper = wrapperRef.current;
    if (!ta || !wrapper) return;

    // Position popup below textarea, left-aligned
    // For a more precise position we'd need textarea-caret, but this is clean enough
    const taRect = ta.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    setPopupPos({
      top: taRect.bottom - wrapperRect.top + 4,
      left: 0,
    });
  }, []);

  // Detect [[ trigger and track query
  const handleInput = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);

      const ta = e.target;
      const pos = ta.selectionStart;
      const text = ta.value;

      // Check if we're inside a [[ ... (no ]] yet)
      // Look backwards from cursor for [[
      const before = text.slice(0, pos);
      const lastOpen = before.lastIndexOf("[[");
      const lastClose = before.lastIndexOf("]]");

      if (lastOpen > -1 && lastOpen > lastClose) {
        // We're inside a [[ mention
        const query = before.slice(lastOpen + 2);
        // Don't open if query contains newlines (user moved on)
        if (!query.includes("\n") && query.length <= 50) {
          setMentionOpen(true);
          setMentionStart(lastOpen);
          setMentionQuery(query);
          setActiveIndex(0);
          updatePopupPosition();
          return;
        }
      }

      // Close if we're not inside [[
      if (mentionOpen) {
        setMentionOpen(false);
      }
    },
    [onChange, mentionOpen, updatePopupPosition]
  );

  // Also check on cursor movement (click, arrow keys)
  const handleSelect = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const pos = ta.selectionStart;
    const text = ta.value;
    const before = text.slice(0, pos);
    const lastOpen = before.lastIndexOf("[[");
    const lastClose = before.lastIndexOf("]]");

    if (lastOpen > -1 && lastOpen > lastClose) {
      const query = before.slice(lastOpen + 2);
      if (!query.includes("\n") && query.length <= 50) {
        if (!mentionOpen) {
          setMentionOpen(true);
          setMentionStart(lastOpen);
          setMentionQuery(query);
          setActiveIndex(0);
          updatePopupPosition();
        }
        return;
      }
    }

    if (mentionOpen) {
      setMentionOpen(false);
    }
  }, [mentionOpen, updatePopupPosition]);

  // Handle keyboard navigation in popup
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => prev + 1); // popup will clamp
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        // Let the popup handle selection via activeIndex
        // We need to trigger select on the active item
        e.preventDefault();
        // Dispatch a custom event that the popup listens to
        const event = new CustomEvent("mention-select-active");
        document.dispatchEvent(event);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
      }
    },
    [mentionOpen]
  );

  // Handle entry selection from popup
  const handleSelect2 = useCallback(
    (entry: MentionEntry) => {
      const ta = textareaRef.current;
      if (!ta || mentionStart < 0) return;

      const before = value.slice(0, mentionStart);
      const after = value.slice(ta.selectionStart);
      const insertion = `[[entry:${entry.id}|${entry.title}]]`;
      const newValue = before + insertion + after;
      const newCursor = before.length + insertion.length;

      // Create synthetic event
      const syntheticEvent = {
        target: {
          name,
          value: newValue,
        },
      } as ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
      setMentionOpen(false);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newCursor, newCursor);
      });
    },
    [value, mentionStart, name, onChange]
  );

  // Listen for Enter key selection via custom event
  useEffect(() => {
    if (!mentionOpen) return;

    const handler = () => {
      // We need to get the current results from the popup
      // Since we can't directly, we'll use a ref-based approach
      // For now, trigger a click on the active item
      const activeItem = document.querySelector(
        `[data-index="${activeIndex}"]`
      ) as HTMLButtonElement;
      if (activeItem) activeItem.click();
    };

    document.addEventListener("mention-select-active", handler);
    return () =>
      document.removeEventListener("mention-select-active", handler);
  }, [mentionOpen, activeIndex]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleInput}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={style}
      />

      {mentionOpen && (
        <EntryMentionPopup
          query={mentionQuery}
          position={popupPos}
          onSelect={handleSelect2}
          onClose={() => setMentionOpen(false)}
          activeIndex={activeIndex}
        />
      )}
    </div>
  );
}
