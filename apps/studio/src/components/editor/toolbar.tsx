import { Bold, Italic, Heading1, Heading2, Link, Image, Code } from "lucide-react";
import { Button } from "@studio/components/ui/button";

interface ToolbarProps {
  onInsert: (before: string, after?: string) => void;
}

const actions = [
  { icon: Bold, before: "**", after: "**", label: "Bold" },
  { icon: Italic, before: "_", after: "_", label: "Italic" },
  { icon: Heading1, before: "# ", after: "", label: "H1" },
  { icon: Heading2, before: "## ", after: "", label: "H2" },
  { icon: Link, before: "[", after: "](url)", label: "Link" },
  { icon: Image, before: "![alt](", after: ")", label: "Image" },
  { icon: Code, before: "`", after: "`", label: "Code" },
] as const;

export function Toolbar({ onInsert }: ToolbarProps) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onInsert(action.before, action.after)}
            aria-label={action.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  );
}
