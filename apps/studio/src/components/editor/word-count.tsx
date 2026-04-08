interface WordCountProps {
  text: string;
}

export function WordCount({ text }: WordCountProps) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 250));

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>{words} {words === 1 ? "word" : "words"}</span>
      <span>~{minutes} min read</span>
    </div>
  );
}
