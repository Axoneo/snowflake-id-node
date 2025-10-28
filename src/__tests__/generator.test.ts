import {
  SnowflakeIdGenerator,
  generateId,
  generateIdSync,
  parseId,
  isValidId,
  EPOCHS,
  DEFAULT_EPOCH,
  EpochUtils,
} from '../index.js';

describe('SnowflakeIdGenerator', () => {
  let generator: SnowflakeIdGenerator;

  beforeEach(() => {
    generator = new SnowflakeIdGenerator({ nodeId: 1 });
  });

  describe('constructor', () => {
    it('should create generator with default options', () => {
      const gen = new SnowflakeIdGenerator();
      expect(gen).toBeInstanceOf(SnowflakeIdGenerator);
    });

    it('should create generator with custom options', () => {
      const gen = new SnowflakeIdGenerator({ nodeId: 123, epoch: 1640995200000 });
      expect(gen).toBeInstanceOf(SnowflakeIdGenerator);
    });

    it('should throw error for invalid node ID', () => {
      expect(() => new SnowflakeIdGenerator({ nodeId: -1 })).toThrow();
      expect(() => new SnowflakeIdGenerator({ nodeId: 1024 })).toThrow();
    });

    it('should throw error for invalid epoch', () => {
      expect(() => new SnowflakeIdGenerator({ epoch: -1 })).toThrow();
      expect(() => new SnowflakeIdGenerator({ epoch: Date.now() + 1000 })).toThrow();
    });
  });

  describe('generate', () => {
    it('should generate unique IDs', async () => {
      const id1 = await generator.generate();
      const id2 = await generator.generate();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate IDs in ascending order', async () => {
      const id1 = await generator.generate();
      const id2 = await generator.generate();

      expect(BigInt(id2) > BigInt(id1)).toBe(true);
    });
  });

  describe('generateSync', () => {
    it('should generate unique IDs synchronously', () => {
      const id1 = generator.generateSync();
      const id2 = generator.generateSync();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });

  describe('static methods', () => {
    let testId: string;

    beforeEach(async () => {
      testId = await generator.generate();
    });

    it('should extract timestamp correctly', () => {
      const timestamp = SnowflakeIdGenerator.extractTimestamp(testId);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(1640995200000);
    });

    it('should extract node ID correctly', () => {
      const nodeId = SnowflakeIdGenerator.extractNodeId(testId);
      expect(nodeId).toBe(1);
    });

    it('should extract sequence correctly', () => {
      const sequence = SnowflakeIdGenerator.extractSequence(testId);
      expect(sequence).toBeGreaterThanOrEqual(0);
      expect(sequence).toBeLessThan(4096);
    });

    it('should parse ID correctly', () => {
      const info = SnowflakeIdGenerator.parseId(testId);
      expect(info.id).toBe(testId);
      expect(info.timestamp).toBeInstanceOf(Date);
      expect(info.nodeId).toBe(1);
      expect(info.sequence).toBeGreaterThanOrEqual(0);
      expect(info.epoch).toBe(DEFAULT_EPOCH);
    });

    it('should validate IDs correctly', () => {
      expect(SnowflakeIdGenerator.isValidId(testId)).toBe(true);
      expect(SnowflakeIdGenerator.isValidId('invalid')).toBe(false);
      expect(SnowflakeIdGenerator.isValidId('')).toBe(false);
      expect(SnowflakeIdGenerator.isValidId('123')).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('should generate ID using convenience function', async () => {
      const id = await generateId();
      expect(typeof id).toBe('string');
      expect(isValidId(id)).toBe(true);
    });

    it('should generate ID synchronously using convenience function', () => {
      const id = generateIdSync();
      expect(typeof id).toBe('string');
      expect(isValidId(id)).toBe(true);
    });

    it('should parse ID using convenience function', async () => {
      const id = await generateId();
      const info = parseId(id);
      expect(info.id).toBe(id);
      expect(info.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('statistics', () => {
    it('should track generation statistics', async () => {
      const initialStats = generator.getStats();
      expect(initialStats.totalGenerated).toBe(0);

      await generator.generate();
      await generator.generate();

      const newStats = generator.getStats();
      expect(newStats.totalGenerated).toBe(2);
    });

    it('should reset statistics', async () => {
      await generator.generate();
      generator.resetStats();

      const stats = generator.getStats();
      expect(stats.totalGenerated).toBe(0);
    });
  });

  describe('epochs', () => {
    it('should use default epoch when not specified', () => {
      const gen = new SnowflakeIdGenerator();
      expect(gen).toBeInstanceOf(SnowflakeIdGenerator);
    });

    it('should use custom epoch', async () => {
      const customEpoch = EPOCHS.TWITTER;
      const gen = new SnowflakeIdGenerator({ nodeId: 1, epoch: customEpoch });
      const id = await gen.generate();

      const info = SnowflakeIdGenerator.parseId(id, customEpoch);
      expect(info.epoch).toBe(customEpoch);
    });

    it('should extract timestamp with different epochs', async () => {
      const gen = new SnowflakeIdGenerator({ nodeId: 1, epoch: EPOCHS.DISCORD });
      const id = await gen.generate();

      // Extract with same epoch
      const timestamp1 = SnowflakeIdGenerator.extractTimestamp(id, EPOCHS.DISCORD);
      expect(timestamp1).toBeInstanceOf(Date);

      // Extract with different epoch should give different result
      const timestamp2 = SnowflakeIdGenerator.extractTimestamp(id, DEFAULT_EPOCH);
      expect(timestamp1.getTime()).not.toBe(timestamp2.getTime());
    });

    it('should parse ID with correct epoch', async () => {
      const customEpoch = EPOCHS.INSTAGRAM;
      const gen = new SnowflakeIdGenerator({ nodeId: 42, epoch: customEpoch });
      const id = await gen.generate();

      const info = SnowflakeIdGenerator.parseId(id, customEpoch);
      expect(info.epoch).toBe(customEpoch);
      expect(info.nodeId).toBe(42);
      expect(info.id).toBe(id);
    });

    it('should validate EPOCHS constants', () => {
      expect(EPOCHS.TWITTER).toBe(1288834974657);
      expect(EPOCHS.DISCORD).toBe(1420070400000);
      expect(EPOCHS.DEFAULT).toBe(DEFAULT_EPOCH);
      expect(EPOCHS.INSTAGRAM).toBe(1293840000000);
    });
  });

  describe('bulk generation and atomicity', () => {
    it('should generate unique IDs under high concurrency', async () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const numGenerations = 1000;
      const numConcurrentBatches = 10;

      // Create multiple concurrent batches of ID generation
      const promises = Array.from({ length: numConcurrentBatches }, () =>
        Promise.all(
          Array.from({ length: numGenerations / numConcurrentBatches }, () => generator.generate())
        )
      );

      const results = await Promise.all(promises);
      const allIds = results.flat();

      // All IDs should be unique
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
      expect(allIds.length).toBe(numGenerations);
    });

    it('should generate unique IDs with synchronous bulk generation', () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const numGenerations = 10000;

      const ids: string[] = [];
      const startTime = Date.now();

      for (let i = 0; i < numGenerations; i++) {
        ids.push(generator.generateSync());
      }

      const endTime = Date.now();
      console.log(`Generated ${numGenerations} IDs in ${endTime - startTime}ms`);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(numGenerations);

      // IDs should be in ascending order (monotonic)
      for (let i = 1; i < ids.length; i++) {
        expect(BigInt(ids[i]) > BigInt(ids[i - 1])).toBe(true);
      }
    });

    it('should handle sequence overflow correctly', () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const ids: string[] = [];

      // Generate enough IDs to potentially trigger sequence overflow
      // This tests the internal sequence counter behavior
      for (let i = 0; i < 5000; i++) {
        ids.push(generator.generateSync());
      }

      // All IDs should still be unique even with potential sequence overflow
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Check that sequences are properly handled
      const sequences = ids.map(id => SnowflakeIdGenerator.extractSequence(id));
      expect(Math.max(...sequences)).toBeLessThan(4096); // Sequence should not exceed 12-bit limit
    });

    it('should maintain atomicity across multiple generators with different node IDs', async () => {
      const numNodes = 5;
      const idsPerNode = 200;

      const generators = Array.from(
        { length: numNodes },
        (_, i) => new SnowflakeIdGenerator({ nodeId: i + 1 })
      );

      // Generate IDs concurrently from multiple generators
      const promises = generators.map(generator =>
        Promise.all(Array.from({ length: idsPerNode }, () => generator.generate()))
      );

      const results = await Promise.all(promises);
      const allIds = results.flat();

      // All IDs should be unique across all generators
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
      expect(allIds.length).toBe(numNodes * idsPerNode);

      // Verify node IDs are correctly embedded
      for (let i = 0; i < numNodes; i++) {
        const nodeIds = results[i];
        nodeIds.forEach(id => {
          expect(SnowflakeIdGenerator.extractNodeId(id)).toBe(i + 1);
        });
      }
    });

    it('should handle rapid successive calls without duplicates', async () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const batchSize = 100;
      const numBatches = 10;

      const allIds: string[] = [];

      // Generate IDs in rapid succession
      for (let batch = 0; batch < numBatches; batch++) {
        const batchPromises = Array.from({ length: batchSize }, () => generator.generate());
        const batchIds = await Promise.all(batchPromises);
        allIds.push(...batchIds);

        // Small delay between batches to test different timestamp scenarios
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // All IDs should be unique
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);

      // IDs should be in ascending order
      for (let i = 1; i < allIds.length; i++) {
        expect(BigInt(allIds[i]) >= BigInt(allIds[i - 1])).toBe(true);
      }
    });

    it('should maintain consistency under mixed sync/async calls', async () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const numOperations = 500;

      const ids: string[] = [];
      const operations: Promise<void>[] = [];

      // Mix of synchronous and asynchronous ID generation
      for (let i = 0; i < numOperations; i++) {
        if (i % 2 === 0) {
          // Synchronous generation
          operations.push(
            Promise.resolve().then(() => {
              ids.push(generator.generateSync());
            })
          );
        } else {
          // Asynchronous generation
          operations.push(
            generator.generate().then(id => {
              ids.push(id);
            })
          );
        }
      }

      await Promise.all(operations);

      // All IDs should be unique despite mixed sync/async generation
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(numOperations);
    });

    it('should maintain thread safety with worker simulation', async () => {
      const generator = new SnowflakeIdGenerator({ nodeId: 1 });
      const numWorkers = 20;
      const idsPerWorker = 50;

      // Simulate multiple workers generating IDs concurrently
      const workerPromises = Array.from({ length: numWorkers }, async (_, workerId) => {
        const workerIds: string[] = [];

        for (let i = 0; i < idsPerWorker; i++) {
          // Mix of delays to simulate real-world usage patterns
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
          }

          const id = Math.random() > 0.5 ? await generator.generate() : generator.generateSync();

          workerIds.push(id);
        }

        return { workerId, ids: workerIds };
      });

      const results = await Promise.all(workerPromises);
      const allIds = results.flatMap(result => result.ids);

      // Verify uniqueness across all workers
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
      expect(allIds.length).toBe(numWorkers * idsPerWorker);

      // Verify each worker generated the expected number of IDs
      results.forEach(result => {
        expect(result.ids.length).toBe(idsPerWorker);

        // Verify uniqueness within each worker's IDs
        const workerUniqueIds = new Set(result.ids);
        expect(workerUniqueIds.size).toBe(result.ids.length);
      });
    });
  });

  describe('EpochUtils', () => {
    it('should create epoch from Date object', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const epoch = EpochUtils.fromDate(date);
      expect(epoch).toBe(1672531200000);
    });

    it('should create epoch from ISO string', () => {
      const epoch = EpochUtils.fromISOString('2023-06-15T12:30:45.000Z');
      expect(epoch).toBe(1686832245000);
    });

    it('should create epoch from date components', () => {
      // 2023-03-15 14:30:00 UTC
      const epoch = EpochUtils.fromDateComponents(2023, 3, 15, 14, 30, 0);
      expect(epoch).toBe(1678890600000);
    });

    it('should create epoch from date components without time', () => {
      // 2023-03-15 00:00:00 UTC (default time)
      const epoch = EpochUtils.fromDateComponents(2023, 3, 15);
      expect(epoch).toBe(1678838400000);
    });

    it('should create epoch from Unix timestamp', () => {
      const unixTimestamp = 1672531200; // 2023-01-01 in seconds
      const epoch = EpochUtils.fromUnixTimestamp(unixTimestamp);
      expect(epoch).toBe(1672531200000);
    });

    it('should get current timestamp', () => {
      const before = Date.now();
      const now = EpochUtils.now();
      const after = Date.now();

      expect(now).toBeGreaterThanOrEqual(before);
      expect(now).toBeLessThanOrEqual(after);
    });

    it('should create relative epoch', () => {
      const offset = -365 * 24 * 60 * 60 * 1000; // 1 year ago
      const relativeEpoch = EpochUtils.relativeToNow(offset);
      const expectedRange = Date.now() + offset;

      // Allow for small timing differences
      expect(Math.abs(relativeEpoch - expectedRange)).toBeLessThan(100);
    });

    it('should work with generator using custom epochs', async () => {
      // Test with epoch created from date components
      const customEpoch = EpochUtils.fromDateComponents(2020, 1, 1);
      const generator = new SnowflakeIdGenerator({ nodeId: 1, epoch: customEpoch });

      const id = await generator.generate();
      const info = SnowflakeIdGenerator.parseId(id, customEpoch);

      expect(info.epoch).toBe(customEpoch);
      expect(info.nodeId).toBe(1);
    });

    it('should work with epoch from ISO string', async () => {
      const customEpoch = EpochUtils.fromISOString('2021-07-01T00:00:00.000Z');
      const generator = new SnowflakeIdGenerator({ nodeId: 42, epoch: customEpoch });

      const id = await generator.generate();
      const timestamp = SnowflakeIdGenerator.extractTimestamp(id, customEpoch);

      expect(timestamp.getTime()).toBeGreaterThan(customEpoch);
    });
  });
});
