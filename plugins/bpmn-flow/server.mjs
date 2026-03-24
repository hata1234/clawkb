export const entry = {
  /**
   * @param {object} input
   * @param {Record<string, unknown>} input.entry
   * @param {import('../../src/lib/plugins/types').PluginContext} input.context
   */
  async render({ entry }) {
    // Legacy: show block if entry has old bpmnXml field (migration compat)
    if (!entry.bpmnXml) return [];
    return [
      {
        id: `bpmn-flow-${entry.id}`,
        type: "bpmn-flow",
        title: "Process Flow",
        data: { entryId: entry.id, hasBpmn: true },
      },
    ];
  },
};

export const content = {
  /** @returns {Promise<import('../../src/lib/plugins/types').PluginContentTagDef[]>} */
  async tags() {
    return [
      {
        tag: "flow",
        component: "BpmnFlowTag",
        /**
         * @param {object} input
         * @param {string} input.value
         * @param {Record<string, unknown>} input.entry
         * @param {import('../../src/lib/plugins/types').PluginContext} input.context
         */
        async resolve({ value, entry, context }) {
          const flowId = parseInt(value);
          if (isNaN(flowId)) return null;

          const flow = await context.prisma.entryFlow.findFirst({
            where: { id: flowId, entryId: entry.id },
          });
          if (!flow) return null;

          return {
            flowId: flow.id,
            name: flow.name,
            bpmnXml: flow.bpmnXml,
          };
        },
      },
    ];
  },
};
