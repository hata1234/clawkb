"use client";

import { registerContentTagComponent } from "@/lib/content-tag-registry";
import BpmnFlowTag from "./BpmnFlowTag";

// Register all built-in content tag components
registerContentTagComponent("BpmnFlowTag", BpmnFlowTag);

// Future plugins add their registrations here:
// registerContentTagComponent("TableChartTag", TableChartTag);
// registerContentTagComponent("FormTag", FormTag);
