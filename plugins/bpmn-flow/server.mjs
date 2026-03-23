export const entry = {
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
  async tags() {
    return [
      {
        tag: "flow",
        component: "BpmnFlowTag",
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
