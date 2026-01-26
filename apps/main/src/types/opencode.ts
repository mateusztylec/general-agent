export type ToolState = {
  status?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
};

export type OpencodePart = {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type?: string;
  text?: string;
  tool?: string;
  callID?: string;
  state?: ToolState;
  [key: string]: unknown;
};

export type OpencodePayload = {
  type?: string;
  properties?: {
    part?: OpencodePart;
    delta?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ParsedEvent = {
  id: string;
  raw: string;
  payloadType?: string;
  part?: OpencodePart;
  delta?: string;
};
