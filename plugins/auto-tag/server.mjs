export const entry = {
  async afterCreate({ entry, originalInput, context }) {
    const tags = Array.isArray(originalInput.tags) ? originalInput.tags : [];
    if (tags.length > 0) return;
    await context.helpers.autoTagEntry(entry.id, entry.title, entry.content || entry.summary || "", entry.source);
  },
};

export const settings = {
  async register() {
    return [
      {
        id: "auto-tag",
        title: "Auto Tag",
        description: "Built-in plugin that suggests tags after entry creation.",
      },
    ];
  },
};
