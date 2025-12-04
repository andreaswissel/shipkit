import { describe, it, expect } from 'vitest';
import { CodeValidator } from './validator.js';

describe('CodeValidator', () => {
  const validator = new CodeValidator();

  describe('valid code', () => {
    it('passes valid React component code', async () => {
      const code = `
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default Counter;
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes valid Vue composition API code', async () => {
      const code = `
import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}
      `;
      const result = await validator.validate(code, 'vue');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes valid Svelte-style code', async () => {
      const code = `
let count = 0;

function handleClick() {
  count += 1;
}
      `;
      const result = await validator.validate(code, 'svelte');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('syntax errors', () => {
    it('catches unclosed braces', async () => {
      const code = `
function broken() {
  const x = 1;
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('brace') || e.includes('}'))).toBe(true);
    });

    it('catches invalid JavaScript syntax', async () => {
      const code = `
function test() {
  const x = ++;
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('catches unmatched parentheses', async () => {
      const code = `
function test() {
  console.log((1 + 2);
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('parenthes'))).toBe(true);
    });
  });

  describe('unclosed JSX tags', () => {
    it('detects unclosed div tag', async () => {
      const code = `
function Component() {
  return (
    <div>
      <p>Hello</p>
  );
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unclosed tag') && e.includes('div'))).toBe(true);
    });

    it('detects unexpected closing tag', async () => {
      const code = `
function Component() {
  return (
    <div>
      </span>
    </div>
  );
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unexpected closing tag'))).toBe(true);
    });

    it('allows self-closing tags', async () => {
      const code = `
function Component() {
  return (
    <div>
      <img src="test.png" />
      <input type="text" />
      <br />
    </div>
  );
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(true);
    });
  });

  describe('missing import warnings', () => {
    it('warns about missing React hook imports', async () => {
      const code = `
import React from 'react';

function Component() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    console.log(value);
  }, [value]);
  return <div>{value}</div>;
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.warnings.some(w => w.includes('useState'))).toBe(true);
      expect(result.warnings.some(w => w.includes('useEffect'))).toBe(true);
    });

    it('warns about missing Vue composition imports', async () => {
      const code = `
import { defineComponent } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);
      `;
      const result = await validator.validate(code, 'vue');
      expect(result.warnings.some(w => w.includes('ref'))).toBe(true);
      expect(result.warnings.some(w => w.includes('computed'))).toBe(true);
    });

    it('does not warn when imports are present', async () => {
      const code = `
import { useState, useEffect } from 'react';

function Component() {
  const [value, setValue] = useState(0);
  useEffect(() => {}, []);
  return <div>{value}</div>;
}
      `;
      const result = await validator.validate(code, 'react');
      expect(result.warnings.filter(w => w.includes('useState'))).toHaveLength(0);
      expect(result.warnings.filter(w => w.includes('useEffect'))).toHaveLength(0);
    });

    it('does not check imports when no import statements exist', async () => {
      const code = `
const [value, setValue] = useState(0);
      `;
      const result = await validator.validate(code, 'react');
      expect(result.warnings.filter(w => w.includes('useState'))).toHaveLength(0);
    });
  });

  describe('ValidationResult structure', () => {
    it('returns correct structure for valid code', async () => {
      const code = `const x = 1;`;
      const result = await validator.validate(code, 'vanilla');
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('returns valid=true when no errors exist', async () => {
      const code = `const x = 1;`;
      const result = await validator.validate(code, 'vanilla');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid=false when errors exist', async () => {
      const code = `const x = {`;
      const result = await validator.validate(code, 'vanilla');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('can have warnings while still being valid', async () => {
      const code = `
import React from 'react';
const [x, setX] = useState(0);
      `;
      const result = await validator.validate(code, 'react');
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
