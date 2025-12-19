/**
 * Default epoch timestamp (2025-01-01 00:00:00 UTC)
 * You can use your own epoch by passing it in the constructor options
 */
export const DEFAULT_EPOCH = 1735657200000; // 2025-01-01

/**
 * Common epoch timestamps for convenience
 */
export const EPOCHS = {
  /** Twitter Snowflake epoch (2010-11-04 01:42:54 UTC) */
  TWITTER: 1288834974657,
  /** Discord epoch (2015-01-01 00:00:00 UTC) */
  DISCORD: 1420070400000,
  /** Default epoch (2025-01-01 00:00:00 UTC) */
  DEFAULT: DEFAULT_EPOCH,
  /** Instagram epoch (2011-01-01 00:00:00 UTC) */
  INSTAGRAM: 1293840000000,
} as const;

/**
 * Utility functions for creating custom epochs
 */
export const EpochUtils = {
  /**
   * Create epoch from Date object
   */
  fromDate(date: Date): number {
    return date.getTime();
  },

  /**
   * Create epoch from ISO date string
   */
  fromISOString(isoString: string): number {
    return new Date(isoString).getTime();
  },

  /**
   * Create epoch from date components
   */
  fromDateComponents(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0
  ): number {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).getTime();
  },

  /**
   * Create epoch from Unix timestamp (seconds)
   */
  fromUnixTimestamp(unixTimestamp: number): number {
    return unixTimestamp * 1000;
  },

  /**
   * Get current timestamp (useful for relative epochs)
   */
  now(): number {
    return Date.now();
  },

  /**
   * Create epoch relative to now (e.g., 1 year ago)
   */
  relativeToNow(offsetMs: number): number {
    return Date.now() + offsetMs;
  },
} as const;

/**
 * Configuration options for SnowflakeIdGenerator
 */
export interface SnowflakeGeneratorOptions {
  /** Node ID (0-1023 range) */
  nodeId?: number;
  /** Epoch timestamp in milliseconds */
  epoch?: number;
}

/**
 * Information extracted from a Snowflake ID
 */
export interface SnowflakeIdInfo {
  /** The original Snowflake ID */
  id: string;
  /** Extracted timestamp */
  timestamp: Date;
  /** Extracted node ID */
  nodeId: number;
  /** Extracted sequence number */
  sequence: number;
  /** Epoch used for timestamp calculation */
  epoch: number;
}

/**
 * Generator statistics for monitoring
 */
export interface GeneratorStats {
  /** Total number of IDs generated */
  totalGenerated: number;
  /** Number of sequence overflows */
  sequenceOverflows: number;
  /** Number of clock skew occurrences */
  clockSkews: number;
  /** Last generation timestamp */
  lastGenerationTime: number;
}

/**
 * Snowflake ID Generator Class
 * Generates 64-bit unique IDs based on Twitter's Snowflake algorithm.
 */
export class SnowflakeIdGenerator {
  private readonly epoch: number;
  private readonly nodeId: number;
  private sequence: number;
  private lastTimestamp: number;
  private stats: GeneratorStats;

  /**
   * SnowflakeIdGenerator constructor
   * @param options Configuration options
   * @throws {Error} If node ID is out of range or epoch is invalid
   */
  constructor(options: SnowflakeGeneratorOptions = {}) {
    const nodeId = options.nodeId ?? parseInt(process.env.NODE_ID ?? '1', 10);
    const epoch = options.epoch ?? DEFAULT_EPOCH;

    if (!Number.isInteger(nodeId) || nodeId < 0 || nodeId > 0x3ff) {
      throw new Error(`Node ID must be an integer between 0 and 1023, got ${nodeId}`);
    }
    if (!Number.isInteger(epoch) || epoch < 0 || epoch > Date.now()) {
      throw new Error(`Epoch must be a positive integer and not in the future, got ${epoch}`);
    }

    this.epoch = epoch;
    this.nodeId = nodeId;
    this.sequence = 0;
    this.lastTimestamp = -1;
    this.stats = {
      totalGenerated: 0,
      sequenceOverflows: 0,
      clockSkews: 0,
      lastGenerationTime: 0,
    };
  }

  /**
   * Generate Snowflake ID (async)
   * 64-bit ID structure:
   * - 1 bit: unused (always 0)
   * - 41 bits: timestamp (ms)
   * - 10 bits: node ID
   * - 12 bits: sequence number
   * @returns Generated Snowflake ID as string
   * @throws {Error} If clock moved backwards and retries failed
   */
  async generate(): Promise<string> {
    let timestamp = Date.now();

    if (timestamp < this.lastTimestamp) {
      // Clock skew handling: retry up to 10 times
      this.stats.clockSkews++;
      for (let i = 0; i < 10 && timestamp < this.lastTimestamp; i++) {
        timestamp = Date.now();
      }
      if (timestamp < this.lastTimestamp) {
        throw new Error(
          `Clock moved backwards by ${this.lastTimestamp - timestamp}ms. Refusing to generate id`
        );
      }
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff; // 12 bits
      if (this.sequence === 0) {
        // Sequence overflow: wait for next millisecond
        this.stats.sequenceOverflows++;
        timestamp = await this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;
    this.stats.totalGenerated++;
    this.stats.lastGenerationTime = timestamp;

    const timestampPart = BigInt(timestamp - this.epoch) << 22n; // 22 = 10 + 12
    const nodeIdPart = BigInt(this.nodeId) << 12n; // 12
    const sequencePart = BigInt(this.sequence);

    const id = timestampPart | nodeIdPart | sequencePart;

    return id.toString();
  }

  /**
   * Generate Snowflake ID (synchronous version)
   * Note: This method may throw if sequence overflow occurs
   * @returns Generated Snowflake ID as string
   * @throws {Error} If clock moved backwards or sequence overflow
   */
  generateSync(): string {
    const timestamp = Date.now();

    if (timestamp < this.lastTimestamp) {
      this.stats.clockSkews++;
      throw new Error(
        `Clock moved backwards by ${this.lastTimestamp - timestamp}ms. Refusing to generate id`
      );
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff; // 12 bits
      if (this.sequence === 0) {
        this.stats.sequenceOverflows++;
        throw new Error('Sequence overflow - too many IDs generated in the same millisecond');
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;
    this.stats.totalGenerated++;
    this.stats.lastGenerationTime = timestamp;

    const timestampPart = BigInt(timestamp - this.epoch) << 22n; // 22 = 10 + 12
    const nodeIdPart = BigInt(this.nodeId) << 12n; // 12
    const sequencePart = BigInt(this.sequence);

    const id = timestampPart | nodeIdPart | sequencePart;

    return id.toString();
  }

  /**
   * Get generator statistics
   */
  getStats(): GeneratorStats {
    return { ...this.stats };
  }

  /**
   * Reset generator statistics
   */
  resetStats(): void {
    this.stats = {
      totalGenerated: 0,
      sequenceOverflows: 0,
      clockSkews: 0,
      lastGenerationTime: 0,
    };
  }

  private async waitNextMillis(lastTimestamp: number): Promise<number> {
    return new Promise(resolve => {
      const check = (): void => {
        const timestamp = Date.now();
        if (timestamp > lastTimestamp) {
          resolve(timestamp);
        } else {
          setTimeout(check, 1); // Retry after 1ms
        }
      };
      check();
    });
  }

  /**
   * Extract timestamp from Snowflake ID
   */
  static extractTimestamp(snowflakeId: string, epoch: number = DEFAULT_EPOCH): Date {
    const id = BigInt(snowflakeId);
    const timestamp = Number(id >> 22n) + epoch;
    return new Date(timestamp);
  }

  /**
   * Extract node ID from Snowflake ID
   */
  static extractNodeId(snowflakeId: string): number {
    const id = BigInt(snowflakeId);
    return Number((id >> 12n) & 0x3ffn);
  }

  /**
   * Extract sequence number from Snowflake ID
   */
  static extractSequence(snowflakeId: string): number {
    const id = BigInt(snowflakeId);
    return Number(id & 0xfffn);
  }

  /**
   * Parse Snowflake ID and return all components
   */
  static parseId(snowflakeId: string, epoch: number = DEFAULT_EPOCH): SnowflakeIdInfo {
    return {
      id: snowflakeId,
      timestamp: this.extractTimestamp(snowflakeId, epoch),
      nodeId: this.extractNodeId(snowflakeId),
      sequence: this.extractSequence(snowflakeId),
      epoch,
    };
  }

  /**
   * Validate if a string is a valid Snowflake ID
   */
  static isValidId(snowflakeId: string): boolean {
    try {
      if (!snowflakeId || typeof snowflakeId !== 'string') {
        return false;
      }
      const id = BigInt(snowflakeId);
      // Check if the ID is positive and within reasonable bounds
      return id >= 0n && id <= (1n << 63n) - 1n; // 63 bits max
    } catch {
      return false;
    }
  }
}
