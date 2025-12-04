import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRegistry } from './registry.js';
import type { Component, Framework } from './types.js';

const createComponent = (overrides: Partial<Component> = {}): Component => ({
  id: 'test-component',
  name: 'TestComponent',
  description: 'A test component',
  props: [
    { name: 'title', type: 'string', required: true },
    { name: 'disabled', type: 'boolean', required: false },
  ],
  source: '/components/TestComponent.tsx',
  framework: 'react',
  ...overrides,
});

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  describe('register() and registerMany()', () => {
    it('registers a single component', () => {
      const component = createComponent();
      registry.register(component);
      expect(registry.size).toBe(1);
      expect(registry.get('test-component')).toEqual(component);
    });

    it('overwrites component with same id', () => {
      const original = createComponent({ name: 'Original' });
      const updated = createComponent({ name: 'Updated' });
      registry.register(original);
      registry.register(updated);
      expect(registry.size).toBe(1);
      expect(registry.get('test-component')?.name).toBe('Updated');
    });

    it('registers multiple components', () => {
      const components = [
        createComponent({ id: 'comp-1', name: 'Component1' }),
        createComponent({ id: 'comp-2', name: 'Component2' }),
        createComponent({ id: 'comp-3', name: 'Component3' }),
      ];
      registry.registerMany(components);
      expect(registry.size).toBe(3);
    });
  });

  describe('get() and getAll()', () => {
    it('returns undefined for non-existent component', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('returns component by id', () => {
      const component = createComponent({ id: 'my-id' });
      registry.register(component);
      expect(registry.get('my-id')).toEqual(component);
    });

    it('returns empty array when no components registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('returns all registered components', () => {
      const components = [
        createComponent({ id: 'a' }),
        createComponent({ id: 'b' }),
      ];
      registry.registerMany(components);
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('findByName()', () => {
    it('returns undefined when component not found', () => {
      expect(registry.findByName('NonExistent')).toBeUndefined();
    });

    it('finds component by exact name', () => {
      const component = createComponent({ name: 'Button' });
      registry.register(component);
      expect(registry.findByName('Button')).toEqual(component);
    });

    it('finds component case-insensitively', () => {
      const component = createComponent({ name: 'Button' });
      registry.register(component);
      expect(registry.findByName('button')).toEqual(component);
      expect(registry.findByName('BUTTON')).toEqual(component);
    });
  });

  describe('findByFramework()', () => {
    it('returns empty array when no matching framework', () => {
      registry.register(createComponent({ framework: 'react' }));
      expect(registry.findByFramework('vue')).toEqual([]);
    });

    it('returns all components for specified framework', () => {
      registry.registerMany([
        createComponent({ id: 'react-1', framework: 'react' }),
        createComponent({ id: 'vue-1', framework: 'vue' }),
        createComponent({ id: 'react-2', framework: 'react' }),
      ]);
      const reactComponents = registry.findByFramework('react');
      expect(reactComponents).toHaveLength(2);
      expect(reactComponents.every((c) => c.framework === 'react')).toBe(true);
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      registry.registerMany([
        createComponent({ id: 'btn', name: 'Button', description: 'Clickable button' }),
        createComponent({ id: 'input', name: 'TextInput', description: 'Text input field' }),
        createComponent({ id: 'modal', name: 'Modal', description: 'Dialog with button actions' }),
      ]);
    });

    it('returns empty array for no matches', () => {
      expect(registry.search('nonexistent')).toEqual([]);
    });

    it('searches by name', () => {
      const results = registry.search('TextInput');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('TextInput');
    });

    it('searches by description', () => {
      const results = registry.search('dialog');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Modal');
    });

    it('returns multiple matches', () => {
      const results = registry.search('button');
      expect(results.some((c) => c.name === 'Button')).toBe(true);
    });

    it('search is case-insensitive', () => {
      expect(registry.search('MODAL')).toHaveLength(1);
      expect(registry.search('modal')).toHaveLength(1);
    });
  });

  describe('toContext()', () => {
    it('returns message when no components registered', () => {
      expect(registry.toContext()).toBe('No components registered.');
    });

    it('formats single component correctly', () => {
      registry.register(createComponent({
        name: 'Button',
        description: 'A clickable button',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'disabled', type: 'boolean', required: false },
        ],
        source: '/components/Button.tsx',
      }));
      const context = registry.toContext();
      expect(context).toContain('## Button');
      expect(context).toContain('A clickable button');
      expect(context).toContain('- label: string (required)');
      expect(context).toContain('- disabled: boolean');
      expect(context).not.toContain('disabled: boolean (required)');
      expect(context).toContain('Source: /components/Button.tsx');
    });

    it('separates multiple components with dividers', () => {
      registry.registerMany([
        createComponent({ id: 'a', name: 'ComponentA' }),
        createComponent({ id: 'b', name: 'ComponentB' }),
      ]);
      const context = registry.toContext();
      expect(context).toContain('---');
      expect(context).toContain('## ComponentA');
      expect(context).toContain('## ComponentB');
    });
  });

  describe('clear() and size', () => {
    it('size is 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('size reflects number of components', () => {
      registry.registerMany([
        createComponent({ id: 'a' }),
        createComponent({ id: 'b' }),
        createComponent({ id: 'c' }),
      ]);
      expect(registry.size).toBe(3);
    });

    it('clear removes all components', () => {
      registry.registerMany([
        createComponent({ id: 'a' }),
        createComponent({ id: 'b' }),
      ]);
      expect(registry.size).toBe(2);
      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });
});
