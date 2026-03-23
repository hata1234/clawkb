import type { ComponentType } from "react";

/**
 * Client-side content tag component registry.
 * Plugins register their tag components here.
 * MarkdownRenderer looks up components by name when rendering {{tag:value}} placeholders.
 */

export interface ContentTagComponentProps {
  tag: string;
  value: string;
  props: Record<string, unknown>;
}

const registry = new Map<string, ComponentType<ContentTagComponentProps>>();

export function registerContentTagComponent(name: string, component: ComponentType<ContentTagComponentProps>) {
  registry.set(name, component);
}

export function getContentTagComponent(name: string): ComponentType<ContentTagComponentProps> | undefined {
  return registry.get(name);
}

export function listContentTagComponents(): string[] {
  return [...registry.keys()];
}
