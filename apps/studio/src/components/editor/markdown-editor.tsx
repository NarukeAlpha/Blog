import { useCallback, useRef } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Toolbar } from "./toolbar";
import { WordCount } from "./word-count";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = useCallback((before: string, after = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = `${before}${selected || "text"}${after}`;
    const next = value.slice(0, start) + replacement + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + before.length;
      const cursorEnd = cursorPos + (selected || "text").length;
      el.setSelectionRange(cursorPos, cursorEnd);
    });
  }, [value, onChange]);

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <Toolbar onInsert={handleInsert} />
        <WordCount text={value} />
      </div>

      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden rounded-xl border border-border">
        <Panel defaultSize={50} minSize={30}>
          <textarea
            ref={textareaRef}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Write your post in Markdown..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </Panel>
        <PanelResizeHandle className="w-px bg-border hover:bg-accent/40 transition-colors" />
        <Panel defaultSize={50} minSize={25}>
          <div className="h-full overflow-y-auto border-l border-border bg-muted/20 p-4">
            {value.trim() ? (
              <div className="ink-prose text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">Preview will appear here...</p>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
