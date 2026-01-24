import type { AvailableTool } from "@general-agent/agent/config-types";

export type NodeType = "agent" | "subagent";

export type BlockType = "tool" | "skill" | "storage";

/**
 * Subagent tool block - represents an OpenCode tool
 * toolName must be selected from AvailableTool enum
 * Empty string means tool not yet configured
 */
export interface SubagentToolBlock {
  id: string;
  type: "tool";
  toolName: AvailableTool | "";
}

/**
 * Skill block - user-defined skill
 */
export interface SkillBlock {
  id: string;
  type: "skill";
  label: string;
  description: string;
}

/**
 * Storage block - R2/S3 storage configuration
 */
export interface StorageBlock {
  id: string;
  type: "storage";
  label: string;
  description: string;
  endpoint: string;
  bucketName: string;
  accessKey: string;
  secretKey: string;
  mountPath: string;
  accessMode: "readonly" | "full";
}

/**
 * Union type for all block types
 */
export type AnyBlock = SubagentToolBlock | SkillBlock | StorageBlock;

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  tools: SubagentToolBlock[];
  skills: SkillBlock[];
  storages: StorageBlock[];
}

export interface SelectedBlock {
  block: AnyBlock;
  nodeId: string;
}

export type SubagentToolBlockUpdate = Partial<Omit<SubagentToolBlock, "type">>;
export type SkillBlockUpdate = Partial<Omit<SkillBlock, "type">>;
export type StorageBlockUpdate = Partial<Omit<StorageBlock, "type">>;
export type UpdateBlockData =
  | SubagentToolBlockUpdate
  | SkillBlockUpdate
  | StorageBlockUpdate;

export function isStorageBlock(block: AnyBlock): block is StorageBlock {
  return block.type === "storage";
}

export function isSubagentToolBlock(block: AnyBlock): block is SubagentToolBlock {
  return block.type === "tool";
}

export function isSkillBlock(block: AnyBlock): block is SkillBlock {
  return block.type === "skill";
}
