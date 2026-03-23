// Entry Templates plugin — manage and serve entry templates
// Templates are stored in the settings table as JSON under key "plugin:entry-templates"

const SETTING_KEY = "plugin:entry-templates:list";

async function getTemplates(context) {
  return await context.settings.getSetting(SETTING_KEY, []);
}

async function saveTemplates(context, templates) {
  await context.settings.setSetting(SETTING_KEY, templates);
}

export const settings = {
  async register() {
    return [
      {
        id: "entry-templates",
        title: "Entry Templates",
        description: "Create and manage templates for new entries.",
      },
    ];
  },
};

export const api = {
  routes: [
    {
      method: "GET",
      path: "/templates",
      description: "List all entry templates",
      async handler({ context }) {
        const templates = await getTemplates(context);
        return { body: { templates } };
      },
    },
    {
      method: "POST",
      path: "/templates",
      description: "Create a new entry template",
      async handler({ body, context }) {
        if (!context.principal || !context.principal.isAdmin) {
          return { status: 403, body: { error: "Admin only" } };
        }
        const { name, type, source, status, tags, summary, content } = body;
        if (!name) return { status: 400, body: { error: "Name is required" } };

        const templates = await getTemplates(context);
        const id = `tpl-${Date.now().toString(36)}`;
        templates.push({ id, name, type, source, status, tags, summary, content });
        await saveTemplates(context, templates);

        return { status: 201, body: { template: templates[templates.length - 1] } };
      },
    },
    {
      method: "PATCH",
      path: "/templates/:id",
      description: "Update an entry template",
      async handler({ params, body, context }) {
        if (!context.principal || !context.principal.isAdmin) {
          return { status: 403, body: { error: "Admin only" } };
        }
        const templateId = params[0];
        const templates = await getTemplates(context);
        const idx = templates.findIndex((t) => t.id === templateId);
        if (idx === -1) return { status: 404, body: { error: "Template not found" } };

        const { name, type, source, status, tags, summary, content } = body;
        if (name !== undefined) templates[idx].name = name;
        if (type !== undefined) templates[idx].type = type;
        if (source !== undefined) templates[idx].source = source;
        if (status !== undefined) templates[idx].status = status;
        if (tags !== undefined) templates[idx].tags = tags;
        if (summary !== undefined) templates[idx].summary = summary;
        if (content !== undefined) templates[idx].content = content;

        await saveTemplates(context, templates);
        return { body: { template: templates[idx] } };
      },
    },
    {
      method: "DELETE",
      path: "/templates/:id",
      description: "Delete an entry template",
      async handler({ params, context }) {
        if (!context.principal || !context.principal.isAdmin) {
          return { status: 403, body: { error: "Admin only" } };
        }
        const templateId = params[0];
        const templates = await getTemplates(context);
        const filtered = templates.filter((t) => t.id !== templateId);
        if (filtered.length === templates.length) {
          return { status: 404, body: { error: "Template not found" } };
        }
        await saveTemplates(context, filtered);
        return { body: { deleted: true } };
      },
    },
  ],
};
