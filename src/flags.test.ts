import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { InMemoryFlagProvider, FileFlagProvider, type FlagConfig } from './flags.js';

describe('InMemoryFlagProvider', () => {
  let provider: InMemoryFlagProvider;

  beforeEach(() => {
    provider = new InMemoryFlagProvider();
  });

  describe('createFlag', () => {
    it('creates a flag with the given config', async () => {
      const config: FlagConfig = {
        description: 'Test flag',
        defaultEnabled: true,
      };
      const flag = await provider.createFlag('test-flag', config);

      expect(flag.name).toBe('test-flag');
      expect(flag.enabled).toBe(true);
      expect(flag.config).toEqual(config);
      expect(flag.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getFlag', () => {
    it('retrieves an existing flag', async () => {
      const config: FlagConfig = {
        description: 'Test flag',
        defaultEnabled: false,
      };
      await provider.createFlag('my-flag', config);

      const flag = await provider.getFlag('my-flag');
      expect(flag).not.toBeNull();
      expect(flag?.name).toBe('my-flag');
    });

    it('returns null for non-existent flag', async () => {
      const flag = await provider.getFlag('does-not-exist');
      expect(flag).toBeNull();
    });
  });

  describe('setEnabled', () => {
    it('toggles flag state to enabled', async () => {
      await provider.createFlag('toggle-flag', {
        description: 'Toggle test',
        defaultEnabled: false,
      });

      await provider.setEnabled('toggle-flag', true);
      const flag = await provider.getFlag('toggle-flag');
      expect(flag?.enabled).toBe(true);
    });

    it('toggles flag state to disabled', async () => {
      await provider.createFlag('toggle-flag', {
        description: 'Toggle test',
        defaultEnabled: true,
      });

      await provider.setEnabled('toggle-flag', false);
      const flag = await provider.getFlag('toggle-flag');
      expect(flag?.enabled).toBe(false);
    });

    it('throws error for non-existent flag', async () => {
      await expect(provider.setEnabled('missing', true)).rejects.toThrow(
        'Flag "missing" not found'
      );
    });
  });

  describe('evaluate', () => {
    it('returns true for enabled flag', async () => {
      await provider.createFlag('enabled-flag', {
        description: 'Enabled',
        defaultEnabled: true,
      });

      const result = await provider.evaluate('enabled-flag');
      expect(result).toBe(true);
    });

    it('returns false for disabled flag', async () => {
      await provider.createFlag('disabled-flag', {
        description: 'Disabled',
        defaultEnabled: false,
      });

      const result = await provider.evaluate('disabled-flag');
      expect(result).toBe(false);
    });

    it('returns false for non-existent flag', async () => {
      const result = await provider.evaluate('nonexistent');
      expect(result).toBe(false);
    });

    it('respects rollout percentage with user context', async () => {
      await provider.createFlag('rollout-flag', {
        description: 'Rollout test',
        defaultEnabled: true,
        rolloutPercentage: 50,
      });

      const result1 = await provider.evaluate('rollout-flag', { userId: 'user-a' });
      const result2 = await provider.evaluate('rollout-flag', { userId: 'user-b' });

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });

    it('returns true for enabled flag when no userId provided with rollout', async () => {
      await provider.createFlag('rollout-no-user', {
        description: 'Rollout without user',
        defaultEnabled: true,
        rolloutPercentage: 50,
      });

      const result = await provider.evaluate('rollout-no-user');
      expect(result).toBe(true);
    });

    it('returns false for 0% rollout', async () => {
      await provider.createFlag('zero-rollout', {
        description: 'Zero rollout',
        defaultEnabled: true,
        rolloutPercentage: 0,
      });

      const result = await provider.evaluate('zero-rollout', { userId: 'any-user' });
      expect(result).toBe(false);
    });

    it('returns true for 100% rollout', async () => {
      await provider.createFlag('full-rollout', {
        description: 'Full rollout',
        defaultEnabled: true,
        rolloutPercentage: 100,
      });

      const result = await provider.evaluate('full-rollout', { userId: 'any-user' });
      expect(result).toBe(true);
    });
  });
});

describe('FileFlagProvider', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flags-test-'));
    filePath = path.join(tempDir, 'flags.json');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates file if it does not exist', async () => {
    const provider = new FileFlagProvider(filePath);
    await provider.createFlag('new-flag', {
      description: 'New flag',
      defaultEnabled: true,
    });

    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('persists flags across instances', async () => {
    const provider1 = new FileFlagProvider(filePath);
    await provider1.createFlag('persistent-flag', {
      description: 'Persistent',
      defaultEnabled: true,
    });

    const provider2 = new FileFlagProvider(filePath);
    const flag = await provider2.getFlag('persistent-flag');

    expect(flag).not.toBeNull();
    expect(flag?.name).toBe('persistent-flag');
    expect(flag?.enabled).toBe(true);
  });

  it('persists enabled state changes', async () => {
    const provider1 = new FileFlagProvider(filePath);
    await provider1.createFlag('toggle-persist', {
      description: 'Toggle persist',
      defaultEnabled: false,
    });
    await provider1.setEnabled('toggle-persist', true);

    const provider2 = new FileFlagProvider(filePath);
    const flag = await provider2.getFlag('toggle-persist');
    expect(flag?.enabled).toBe(true);
  });

  it('returns null for non-existent flag', async () => {
    const provider = new FileFlagProvider(filePath);
    const flag = await provider.getFlag('missing');
    expect(flag).toBeNull();
  });

  it('evaluate works correctly', async () => {
    const provider = new FileFlagProvider(filePath);
    await provider.createFlag('eval-flag', {
      description: 'Eval test',
      defaultEnabled: true,
    });

    const result = await provider.evaluate('eval-flag');
    expect(result).toBe(true);
  });

  it('throws error when setting enabled on non-existent flag', async () => {
    const provider = new FileFlagProvider(filePath);
    await expect(provider.setEnabled('missing', true)).rejects.toThrow(
      'Flag "missing" not found'
    );
  });
});
