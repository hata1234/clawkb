export const entry = {
  async render({ entry }) {
    return [
      {
        id: `related-${entry.id}`,
        type: "related-entries",
        title: "Related Entries",
        data: { entryId: entry.id },
      },
    ];
  },
};

export const settings = {
  async register() {
    return [
      {
        id: "related-entries",
        title: "Related Entries",
        description: "Built-in plugin that injects similar entries into the detail page.",
      },
    ];
  },
};
