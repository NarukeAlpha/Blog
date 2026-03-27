export function slugify(value: string) {
  return (
    String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function createUniqueSlug(title: string, existingSlugs: string[]) {
  const seed = slugify(title);
  const seen = new Set(existingSlugs);

  if (!seen.has(seed)) {
    return seed;
  }

  let counter = 2;
  while (seen.has(`${seed}-${counter}`)) {
    counter += 1;
  }

  return `${seed}-${counter}`;
}
