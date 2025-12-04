import type { Component, Framework } from "./types.js";

export class ComponentRegistry {
  private components: Map<string, Component> = new Map();

  register(component: Component): void {
    this.components.set(component.id, component);
  }

  registerMany(components: Component[]): void {
    for (const component of components) {
      this.register(component);
    }
  }

  get(id: string): Component | undefined {
    return this.components.get(id);
  }

  getAll(): Component[] {
    return Array.from(this.components.values());
  }

  findByName(name: string): Component | undefined {
    return this.getAll().find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
  }

  findByFramework(framework: Framework): Component[] {
    return this.getAll().filter((c) => c.framework === framework);
  }

  search(query: string): Component[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery)
    );
  }

  toContext(): string {
    const components = this.getAll();
    if (components.length === 0) {
      return "No components registered.";
    }

    return components
      .map((c) => {
        const props = c.props
          .map((p) => `  - ${p.name}: ${p.type}${p.required ? " (required)" : ""}`)
          .join("\n");
        return `## ${c.name}\n${c.description}\n\nProps:\n${props}\n\nSource: ${c.source}`;
      })
      .join("\n\n---\n\n");
  }

  clear(): void {
    this.components.clear();
  }

  get size(): number {
    return this.components.size;
  }
}
