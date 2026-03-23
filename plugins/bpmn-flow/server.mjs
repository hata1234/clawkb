export const entry = {
  async render({ entry }) {
    // Only show block if entry has bpmnXml
    if (!entry.bpmnXml) return [];
    return [
      {
        id: `bpmn-flow-${entry.id}`,
        type: "bpmn-flow",
        title: "Process Flow",
        data: { entryId: entry.id, hasBpmn: true }
      }
    ];
  }
};
