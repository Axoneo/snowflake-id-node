# Snowflake ID Generator (Node.js)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance Snowflake ID generator for Node.js applications, inspired by Twitter's Snowflake algorithm. This library generates unique, distributed 64-bit IDs that are time-ordered and conflict-free across multiple nodes.

## Features

- **High Performance**: Generate 10,000+ IDs in milliseconds
- **Thread Safe**: Atomic ID generation with sequence overflow handling
- **Distributed**: Support for up to 1,024 nodes
- **Time Ordered**: IDs are chronologically sortable
- **Zero Dependencies**: Pure TypeScript/JavaScript implementation
- **Type Safe**: Full TypeScript support with comprehensive types

## Installation

```bash
npm install snowflake-id-node
```

## Quick Start

### Basic Usage

```typescript
import { generateId, generateIdSync } from 'snowflake-id-node';

// Async generation (recommended)
const id = await generateId();
console.log(id); // "1234567890123456789"

// Sync generation
const syncId = generateIdSync();
console.log(syncId); // "1234567890123456790"
```

### Using the Generator Class

```typescript
import { SnowflakeIdGenerator } from 'snowflake-id-node';

// Create a generator with custom options
const generator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: 1735657200000, // 2025-01-01 (default)
});

// Generate IDs
const id1 = await generator.generate();
const id2 = generator.generateSync();
```

## API Reference

### SnowflakeIdGenerator

#### Constructor Options

```typescript
interface SnowflakeGeneratorOptions {
  nodeId?: number; // Node ID (0-1023 range, default: NODE_ID env var or 1)
  epoch?: number; // Epoch timestamp in milliseconds (default: 2025-01-01)
}
```

#### Methods

##### `generate(): Promise<string>`

Generates a unique Snowflake ID asynchronously. Handles sequence overflow by waiting for the next millisecond.

```typescript
const id = await generator.generate();
```

##### `generateSync(): string`

Generates a unique Snowflake ID synchronously. Throws an error if sequence overflow occurs.

```typescript
const id = generator.generateSync();
```

##### `getStats(): GeneratorStats`

Returns generation statistics for monitoring.

```typescript
const stats = generator.getStats();
console.log(stats.totalGenerated); // Number of IDs generated
```

##### `resetStats(): void`

Resets generation statistics.

```typescript
generator.resetStats();
```

#### Static Methods

##### `extractTimestamp(id: string, epoch?: number): Date`

Extracts the timestamp from a Snowflake ID.

```typescript
const timestamp = SnowflakeIdGenerator.extractTimestamp('1234567890123456789');
console.log(timestamp); // Date object
```

##### `extractNodeId(id: string): number`

Extracts the node ID from a Snowflake ID.

```typescript
const nodeId = SnowflakeIdGenerator.extractNodeId('1234567890123456789');
console.log(nodeId); // 1
```

##### `extractSequence(id: string): number`

Extracts the sequence number from a Snowflake ID.

```typescript
const sequence = SnowflakeIdGenerator.extractSequence('1234567890123456789');
console.log(sequence); // 0-4095
```

##### `parseId(id: string, epoch?: number): SnowflakeIdInfo`

Parses a Snowflake ID and returns all components.

```typescript
const info = SnowflakeIdGenerator.parseId('1234567890123456789');
console.log(info);
// {
//   id: "1234567890123456789",
//   timestamp: Date,
//   nodeId: 1,
//   sequence: 0,
//   epoch: 1640995200000
// }
```

##### `isValidId(id: string): boolean`

Validates if a string is a valid Snowflake ID.

```typescript
const isValid = SnowflakeIdGenerator.isValidId('1234567890123456789');
console.log(isValid); // true
```

### Convenience Functions

The library exports convenient functions that use a default generator instance:

```typescript
import {
  generateId, // Async ID generation
  generateIdSync, // Sync ID generation
  parseId, // Parse ID components
  isValidId, // Validate ID format
  extractTimestamp, // Extract timestamp from ID
  extractNodeId, // Extract node ID from ID
  extractSequence, // Extract sequence from ID
  EPOCHS, // Predefined epoch constants
  DEFAULT_EPOCH, // Default epoch constant
  EpochUtils, // Utility functions for creating custom epochs
  defaultGenerator, // Default generator instance for advanced usage
} from 'snowflake-id-node';
```

## Configuration

### Environment Variables

- `NODE_ID`: Sets the default node ID (0-1023 range)

```bash
export NODE_ID=42
```

### Epoch Configuration

The epoch is the starting point for timestamp calculation. The default epoch is **2025-01-01 00:00:00 UTC**. You can use predefined epochs or set a custom one:

#### Using Predefined Epochs

```typescript
import { SnowflakeIdGenerator, EPOCHS } from 'snowflake-id-node';

// Twitter Snowflake compatible
const twitterGenerator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: EPOCHS.TWITTER, // 2010-11-04 01:42:54 UTC
});

// Discord compatible
const discordGenerator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: EPOCHS.DISCORD, // 2015-01-01 00:00:00 UTC
});

// Instagram compatible
const instagramGenerator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: EPOCHS.INSTAGRAM, // 2011-01-01 00:00:00 UTC
});
```

#### Available Epoch Constants

```typescript
import { EPOCHS } from 'snowflake-id-node';

console.log(EPOCHS.DEFAULT); // 1735657200000 (2025-01-01)
console.log(EPOCHS.TWITTER); // 1288834974657 (Twitter Snowflake)
console.log(EPOCHS.DISCORD); // 1420070400000 (Discord)
console.log(EPOCHS.INSTAGRAM); // 1293840000000 (Instagram)
```

#### Creating Custom Epochs with EpochUtils

The `EpochUtils` provides convenient methods for creating custom epochs:

```typescript
import { SnowflakeIdGenerator, EpochUtils } from 'snowflake-id-node';

// From Date object
const epochFromDate = EpochUtils.fromDate(new Date('2023-01-01'));

// From ISO string
const epochFromISO = EpochUtils.fromISOString('2023-06-15T12:30:45.000Z');

// From date components (year, month, day, hour?, minute?, second?)
const epochFromComponents = EpochUtils.fromDateComponents(2023, 3, 15, 14, 30, 0);

// From Unix timestamp (seconds)
const epochFromUnix = EpochUtils.fromUnixTimestamp(1672531200);

// Relative to current time (e.g., 1 year ago)
const oneYearAgo = EpochUtils.relativeToNow(-365 * 24 * 60 * 60 * 1000);

// Current timestamp
const now = EpochUtils.now();

// Use with generator
const generator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: epochFromComponents,
});
```

#### Manual Custom Epoch

```typescript
// Using timestamp in milliseconds
const generator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: 1672531200000, // 2023-01-01 00:00:00 UTC
});

// Or relative to current time
const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
const relativeGenerator = new SnowflakeIdGenerator({
  epoch: oneYearAgo,
});
```

#### Extracting with Custom Epoch

When extracting timestamp or parsing IDs, make sure to use the same epoch:

```typescript
const customEpoch = EpochUtils.fromDateComponents(2023, 1, 1);
const generator = new SnowflakeIdGenerator({ epoch: customEpoch });
const id = await generator.generate();

// Extract timestamp with the same epoch
const timestamp = SnowflakeIdGenerator.extractTimestamp(id, customEpoch);

// Parse ID with the same epoch
const info = SnowflakeIdGenerator.parseId(id, customEpoch);
```

## Snowflake ID Structure

The generated 64-bit ID has the following structure:

```
| 1 bit (unused) | 41 bits (timestamp) | 10 bits (node ID) | 12 bits (sequence) |
|       0        |    milliseconds     |     0-1023        |      0-4095        |
```

- **Timestamp**: Milliseconds since epoch (41 bits = ~69 years)
- **Node ID**: Unique identifier for each generator instance (10 bits = 1024 nodes)
- **Sequence**: Counter for IDs generated within the same millisecond (12 bits = 4096 IDs/ms)

## Error Handling

The library handles several edge cases:

- **Clock skew**: Automatically retries when system clock moves backwards
- **Sequence overflow**: Waits for next millisecond (async) or throws error (sync)
- **Invalid parameters**: Validates node ID and epoch ranges

```typescript
try {
  const generator = new SnowflakeIdGenerator({ nodeId: 9999 }); // Invalid node ID
} catch (error) {
  console.error(error.message); // "Node ID must be an integer between 0 and 1023"
}
```

## Performance

The generator is optimized for high-throughput scenarios:

- **Async generation**: Up to 4,096 IDs per millisecond per node
- **Sync generation**: 10,000+ IDs in ~6ms on modern hardware
- **Memory efficient**: Minimal memory footprint with built-in statistics
- **Zero dependencies**: Pure TypeScript implementation
- **Thread safety**: Atomic operations with sequence overflow handling

### Benchmarks

Our comprehensive test suite validates:

- High concurrency (1,000 IDs across 10 concurrent batches)
- Bulk generation (10,000 sequential IDs maintaining uniqueness)
- Sequence overflow handling (5,000+ IDs in rapid succession)
- Multi-node atomicity (5 generators with different node IDs)
- Mixed sync/async consistency (500 operations)
- Worker simulation (20 concurrent workers, 50 IDs each)

## Examples

### Multiple Generators with Different Epochs

```typescript
import { SnowflakeIdGenerator, EPOCHS, EpochUtils } from 'snowflake-id-node';

// Create generators for different services with different epochs
const userService = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: EPOCHS.DEFAULT,
});

const legacyService = new SnowflakeIdGenerator({
  nodeId: 2,
  epoch: EPOCHS.TWITTER,
});

// Use EpochUtils for custom epoch
const projectLaunchEpoch = EpochUtils.fromDateComponents(2023, 6, 15);
const projectService = new SnowflakeIdGenerator({
  nodeId: 3,
  epoch: projectLaunchEpoch,
});

const userId = await userService.generate();
const legacyId = await legacyService.generate();
const projectId = await projectService.generate();
```

### Creating Epochs with EpochUtils

```typescript
import { SnowflakeIdGenerator, EpochUtils } from 'snowflake-id-node';

// Different ways to create epochs
const examples = {
  // From specific date
  launchDate: EpochUtils.fromDateComponents(2023, 1, 1),

  // From ISO string
  releaseDate: EpochUtils.fromISOString('2023-12-25T00:00:00.000Z'),

  // From Date object
  todayDate: EpochUtils.fromDate(new Date()),

  // Relative epochs
  oneYearAgo: EpochUtils.relativeToNow(-365 * 24 * 60 * 60 * 1000),
  oneMonthFromNow: EpochUtils.relativeToNow(30 * 24 * 60 * 60 * 1000),

  // From Unix timestamp
  unixEpoch: EpochUtils.fromUnixTimestamp(1672531200),
};

// Use any of these with generators
const generator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: examples.launchDate,
});
```

### Cross-Platform Compatibility

```typescript
import { SnowflakeIdGenerator, EPOCHS, parseId } from 'snowflake-id-node';

// Generate Twitter Snowflake compatible ID
const twitterGenerator = new SnowflakeIdGenerator({
  nodeId: 1,
  epoch: EPOCHS.TWITTER,
});

const twitterId = await twitterGenerator.generate();

// This ID can be used with Twitter's original Snowflake system
console.log(`Twitter compatible ID: ${twitterId}`);

// Parse the ID with the correct epoch
const info = parseId(twitterId, EPOCHS.TWITTER);
console.log(`Generated at: ${info.timestamp}`);
console.log(`Node ID: ${info.nodeId}`);
```

### Monitoring and Statistics

```typescript
import { defaultGenerator } from 'snowflake-id-node';

// Generate some IDs
await defaultGenerator.generate();
await defaultGenerator.generate();

// Check statistics
const stats = defaultGenerator.getStats();
console.log(`Generated ${stats.totalGenerated} IDs`);
console.log(`Sequence overflows: ${stats.sequenceOverflows}`);
console.log(`Clock skews: ${stats.clockSkews}`);
console.log(`Last generation: ${new Date(stats.lastGenerationTime)}`);

// Reset statistics
defaultGenerator.resetStats();
```

### Parsing IDs with Different Epochs

```typescript
import { parseId, extractTimestamp, EPOCHS } from 'snowflake-id-node';

// Parse ID generated with default epoch
const defaultId = '1234567890123456789';
const defaultInfo = parseId(defaultId); // Uses DEFAULT_EPOCH
console.log(`Default epoch timestamp: ${defaultInfo.timestamp}`);

// Parse the same ID as if it was generated with Twitter epoch
const twitterInfo = parseId(defaultId, EPOCHS.TWITTER);
console.log(`Twitter epoch timestamp: ${twitterInfo.timestamp}`);

// Extract timestamp with specific epoch
const timestamp = extractTimestamp(defaultId, EPOCHS.DISCORD);
console.log(`Discord epoch timestamp: ${timestamp}`);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## See also this

- [Snowflake ID Generator (Rust)](https://github.com/Axoneo/snowflake-id-rs)

## Related Projects

- [Twitter Snowflake](https://github.com/twitter-archive/snowflake) - Original Snowflake implementation
- [Snowflake ID](https://en.wikipedia.org/wiki/Snowflake_ID) - Wikipedia article on Snowflake IDs
