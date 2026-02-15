export type ProxyControlMsg = {
  type: "start" | "stop";
  sampleRate: number;
  encoding: "linear16";
  chunkMs: 20;
};

export type ProxyTranscriptMsg = {
  type: "transcript";
  text: string;
  isFinal: boolean;
  speaker: "interviewer" | "other";
  ts: number;
};

export type ProxyStatusMsg = {
  type: "status";
  state: "connected" | "streaming" | "error" | "closed";
  detail?: string;
};

export type ProxyServerMsg = ProxyTranscriptMsg | ProxyStatusMsg;

