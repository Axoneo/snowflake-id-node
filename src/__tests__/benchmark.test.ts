import { SnowflakeIdGenerator } from '../index.js';

describe('Snowflake ID Performance Benchmarks', () => {
  let generator: SnowflakeIdGenerator;

  beforeEach(() => {
    generator = new SnowflakeIdGenerator({ nodeId: 1 });
  });

  it('should benchmark synchronous ID generation performance', () => {
    const iterations = [1000, 10000, 100000];

    console.log('\n📊 Synchronous Generation Performance:');

    for (const count of iterations) {
      const ids: string[] = [];
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < count; i++) {
        ids.push(generator.generateSync());
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const idsPerSecond = Math.round((count / durationMs) * 1000);

      console.log(
        `   ${count.toLocaleString().padStart(7)} IDs: ${durationMs.toFixed(2).padStart(7)}ms → ${idsPerSecond.toLocaleString().padStart(11)} IDs/sec`
      );

      expect(new Set(ids).size).toBe(count);
      expect(idsPerSecond).toBeGreaterThan(500000);
    }
  });

  it('should benchmark asynchronous ID generation performance', async () => {
    const iterations = [1000, 10000, 50000];

    console.log('\n🚀 Asynchronous Generation Performance:');

    for (const count of iterations) {
      const startTime = process.hrtime.bigint();

      const promises = Array.from({ length: count }, () => generator.generate());
      const ids = await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const idsPerSecond = Math.round((count / durationMs) * 1000);

      console.log(
        `   ${count.toLocaleString().padStart(7)} IDs: ${durationMs.toFixed(2).padStart(7)}ms → ${idsPerSecond.toLocaleString().padStart(11)} IDs/sec`
      );

      expect(new Set(ids).size).toBe(count);
      expect(idsPerSecond).toBeGreaterThan(200000);
    }
  });

  it('should benchmark concurrent multi-node generation', async () => {
    const nodeCount = 8;
    const idsPerNode = 10000;
    const generators = Array.from(
      { length: nodeCount },
      (_, i) => new SnowflakeIdGenerator({ nodeId: i + 1 })
    );

    console.log('\n🔄 Concurrent Multi-Node Performance:');

    const startTime = process.hrtime.bigint();

    const promises = generators.map(gen =>
      Promise.all(Array.from({ length: idsPerNode }, () => gen.generate()))
    );

    const results = await Promise.all(promises);
    const allIds = results.flat();

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const totalIds = nodeCount * idsPerNode;
    const idsPerSecond = Math.round((totalIds / durationMs) * 1000);

    console.log(
      `   ${nodeCount} nodes × ${idsPerNode.toLocaleString()} = ${totalIds.toLocaleString()} IDs in ${durationMs.toFixed(2)}ms (${idsPerSecond.toLocaleString()} IDs/sec)`
    );

    expect(new Set(allIds).size).toBe(totalIds);
    expect(idsPerSecond).toBeGreaterThan(100000);
  });

  it('should benchmark parsing operations performance', async () => {
    const testCount = 50000;
    const testGenerator = new SnowflakeIdGenerator({ nodeId: 42 });

    console.log('\n🔍 Parsing Performance Analysis:');

    // Generate test IDs
    const promises = Array.from({ length: testCount }, () => testGenerator.generate());
    const testIds = await Promise.all(promises);

    // Timestamp extraction
    let startTime = process.hrtime.bigint();
    const timestamps = testIds.map(id => SnowflakeIdGenerator.extractTimestamp(id));
    let endTime = process.hrtime.bigint();
    let durationMs = Number(endTime - startTime) / 1_000_000;
    let opsPerSec = Math.round((testCount / durationMs) * 1000);

    console.log(`   Timestamp extraction: ${opsPerSec.toLocaleString().padStart(11)} ops/sec`);
    expect(timestamps.every(ts => ts instanceof Date)).toBe(true);
    expect(opsPerSec).toBeGreaterThan(1000000);

    // Node ID extraction
    startTime = process.hrtime.bigint();
    const nodeIds = testIds.map(id => SnowflakeIdGenerator.extractNodeId(id));
    endTime = process.hrtime.bigint();
    durationMs = Number(endTime - startTime) / 1_000_000;
    opsPerSec = Math.round((testCount / durationMs) * 1000);

    console.log(`   Node ID extraction:   ${opsPerSec.toLocaleString().padStart(11)} ops/sec`);
    expect(nodeIds.every(nodeId => nodeId === 42)).toBe(true);
    expect(opsPerSec).toBeGreaterThan(2000000);

    // Full parsing
    startTime = process.hrtime.bigint();
    const parsed = testIds.map(id => SnowflakeIdGenerator.parseId(id));
    endTime = process.hrtime.bigint();
    durationMs = Number(endTime - startTime) / 1_000_000;
    opsPerSec = Math.round((testCount / durationMs) * 1000);

    console.log(`   Full ID parsing:      ${opsPerSec.toLocaleString().padStart(11)} ops/sec`);
    expect(parsed.every(p => p.nodeId === 42 && p.id && p.timestamp instanceof Date)).toBe(true);
    expect(opsPerSec).toBeGreaterThan(500000);
  });

  it('should measure sustained performance over time', () => {
    const testDurationMs = 2000;
    const sampleIntervalMs = 400;

    console.log('\n⏱️  Sustained Performance Test:');

    const samples: Array<{ rate: number }> = [];
    let totalIds = 0;

    const startTime = Date.now();
    let lastSampleTime = startTime;
    let lastSampleCount = 0;

    while (Date.now() - startTime < testDurationMs) {
      const now = Date.now();

      // Generate batch
      const batchSize = 500;
      for (let i = 0; i < batchSize; i++) {
        generator.generateSync();
        totalIds++;
      }

      // Sample every interval
      if (now - lastSampleTime >= sampleIntervalMs) {
        const idsInInterval = totalIds - lastSampleCount;
        const timeInterval = now - lastSampleTime;
        const currentRate = Math.round((idsInInterval / timeInterval) * 1000);

        samples.push({ rate: currentRate });
        console.log(
          `   ${((now - startTime) / 1000).toFixed(1)}s: ${currentRate.toLocaleString()} IDs/sec`
        );

        lastSampleTime = now;
        lastSampleCount = totalIds;
      }
    }

    const averageRate = Math.round((totalIds / testDurationMs) * 1000);
    console.log(
      `   Average: ${averageRate.toLocaleString()} IDs/sec over ${totalIds.toLocaleString()} IDs`
    );

    expect(averageRate).toBeGreaterThan(100000);
    expect(totalIds).toBeGreaterThan(100000);
  });

  it('should compare sync vs async performance', async () => {
    const testCount = 25000;

    console.log('\n⚡ Sync vs Async Comparison:');

    // Sync test
    const syncStart = process.hrtime.bigint();
    const syncIds: string[] = [];

    for (let i = 0; i < testCount; i++) {
      syncIds.push(generator.generateSync());
    }

    const syncEnd = process.hrtime.bigint();
    const syncDuration = Number(syncEnd - syncStart) / 1_000_000;
    const syncRate = Math.round((testCount / syncDuration) * 1000);

    // Reset for fair comparison
    generator.resetStats();

    // Async test
    const asyncStart = process.hrtime.bigint();
    const asyncPromises = Array.from({ length: testCount }, () => generator.generate());
    const asyncIds = await Promise.all(asyncPromises);
    const asyncEnd = process.hrtime.bigint();
    const asyncDuration = Number(asyncEnd - asyncStart) / 1_000_000;
    const asyncRate = Math.round((testCount / asyncDuration) * 1000);

    console.log(`   Synchronous:  ${syncRate.toLocaleString().padStart(11)} IDs/sec`);
    console.log(`   Asynchronous: ${asyncRate.toLocaleString().padStart(11)} IDs/sec`);
    console.log(`   Ratio: ${(asyncDuration / syncDuration).toFixed(2)}x`);

    expect(new Set(syncIds).size).toBe(testCount);
    expect(new Set(asyncIds).size).toBe(testCount);
    expect(syncRate).toBeGreaterThan(500000);
    expect(asyncRate).toBeGreaterThan(200000);
  });

  it('should analyze memory efficiency', () => {
    const batchSize = 100000;
    const batches = 5;

    console.log('\n💾 Memory Efficiency Analysis:');

    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage();
    const startTime = process.hrtime.bigint();

    let totalGenerated = 0;

    for (let batch = 0; batch < batches; batch++) {
      const batchIds: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        batchIds.push(generator.generateSync());
      }

      expect(new Set(batchIds).size).toBe(batchSize);
      totalGenerated += batchSize;

      // Clear batch
      batchIds.length = 0;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000;
    const rate = Math.round((totalGenerated / duration) * 1000);

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = Math.max(0, finalMemory.heapUsed - initialMemory.heapUsed);
    const memoryPerID = totalGenerated > 0 ? memoryIncrease / totalGenerated : 0;

    console.log(`   Generated: ${totalGenerated.toLocaleString()} IDs`);
    console.log(`   Rate: ${rate.toLocaleString()} IDs/sec`);
    console.log(`   Memory: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB increase`);
    console.log(`   Per ID: ${memoryPerID.toFixed(4)} bytes/ID overhead`);

    expect(rate).toBeGreaterThan(500000);
    expect(memoryPerID).toBeLessThan(500);
  });
});
