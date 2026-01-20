export type NodeType = "agent" | "subagent"

export type BlockType = "tool" | "skill" | "storage"

export interface Block {
  id: string
  type: BlockType
  label: string
  description: string
}

export interface StorageBlock extends Block {
  type: "storage"
  endpoint: string
  bucketName: string
  accessKey: string
  secretKey: string
  mountPath: string
  accessMode: "readonly" | "full"
}

export interface NodeData {
  label: string
  description: string
  tools: Block[]
  skills: Block[]
  storages: StorageBlock[]
}

export interface SelectedBlock {
  block: Block | StorageBlock
  nodeId: string
}

export function isStorageBlock(block: Block | StorageBlock): block is StorageBlock {
  return block.type === "storage"
}
