export { SnowflakeIdGenerator, DEFAULT_EPOCH, EPOCHS, EpochUtils } from './generator.js';
export type { SnowflakeIdInfo, SnowflakeGeneratorOptions, GeneratorStats } from './generator.js';

// Export a default instance for convenience
import { SnowflakeIdGenerator } from './generator.js';
import type { SnowflakeIdInfo } from './generator.js';

export const defaultGenerator = new SnowflakeIdGenerator();

// Export convenience functions
export const generateId = (): Promise<string> => defaultGenerator.generate();
export const generateIdSync = (): string => defaultGenerator.generateSync();
export const extractTimestamp = (id: string, epoch?: number): Date =>
  SnowflakeIdGenerator.extractTimestamp(id, epoch);
export const extractNodeId = (id: string): number => SnowflakeIdGenerator.extractNodeId(id);
export const extractSequence = (id: string): number => SnowflakeIdGenerator.extractSequence(id);
export const parseId = (id: string, epoch?: number): SnowflakeIdInfo =>
  SnowflakeIdGenerator.parseId(id, epoch);
export const isValidId = (id: string): boolean => SnowflakeIdGenerator.isValidId(id);
