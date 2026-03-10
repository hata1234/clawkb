"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import getCaretCoordinates from "textarea-caret";
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
  const [mentionStart, setMentionStart] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  // Compute popup position using textarea-caret for accurate cursor tracking
  const updatePopupPosition = useCallback((cursorPos?: number) => {
    const ta = textareaRef.current;
    const wrapper = wrapperRef.current;
    if (!ta || !wrapper) return;

    const pos = cursorPos ?? ta.selectionStart;
    const caret = getCaretCoordinates(ta, pos);

    // caret.top is relative to textarea content (includes scroll)
    // caret.left is relative to textarea left edge
    // We need to account for textarea's padding and scroll position
    const caretTop = caret.top - ta.scrollTop;
    const caretLeft = caret.left;
    const lineHeight = caret.height || 20;

    // Position popup below the caret line
    // If not enough space below, position above
    const taRect = ta.getBoundingClientRect();
    const viewportBottom = window.innerHeight;
    const absoluteCaretBottom = taRect.top + caretTop + lineHeight;
    const popupHeight = 300; // approximate

    let top: number;
    if (absoluteCaretBottom + popupHeight > viewportBottom) {
      // Not enough space below → show above
      top = caretTop - popupHeight;
    } else {
      // Show below
      top = caretTop + lineHeight + 4;
    }

    setPopupPos({
      top: Math.max(0, top),
      left: Math.min(caretLeft, ta.clientWidth - 350),
    });
  }, []);

  // Detect [[ trigger and track query
  const handleInput = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);

      const ta = e.target;
      const pos = ta.selectionStart;
      const text = ta.value;

      const before = text.slice(0, pos);
      const lastOpen = before.lastIndexOf("[[");
      const lastClose = before.lastIndexOf("]]");

      if (lastOpen > -1 && lastOpen > lastClose) {
        const query = before.slice(lastOpen + 2);
        if (!query.includes("\n") && query.length <= 50) {
          setMentionOpen(true);
          setMentionStart(lastOpen);
          setMentionQuery(query);
          setActiveIndex(0);
          updatePopupPosition(pos);
          return;
        }
      }

      if (mentionOpen) {
        setMentionOpen(false);
      }
    },
    [onChange, mentionOpen, updatePopupPosition]
  );

  // Also check on cursor movement
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
          updatePopupPosition(pos);
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
        setActiveIndex((prev) => prev + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
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
  const handleEntrySelect = useCallback(
    (entry: MentionEntry) => {
      const ta = textareaRef.current;
      if (!ta || mentionStart < 0) return;

      const before = value.slice(0, mentionStart);
      const after = value.slice(ta.selectionStart);
      const insertion = `[[entry:${entry.id}|${entry.title}]]`;
      const newValue = before + insertion + after;
      const newCursor = before.length + insertion.length;

      const syntheticEvent = {
        target: {
          name,
          value: newValue,
        },
      } as ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
      setMentionOpen(false);

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
          onSelect={handleEntrySelect}
          onClose={() => setMentionOpen(false)}
          activeIndex={activeIndex}
        />
      )}
    </div>
  );
}
