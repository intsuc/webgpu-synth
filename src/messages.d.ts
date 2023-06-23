export type SharedBuffers = {
  states: SharedArrayBuffer,
  output: SharedArrayBuffer,
};

export type Data =
  | {
    type: "initialize_worker",
    sampleRate: number,
  }
  | {
    type: "worker_ready",
    buffers: SharedBuffers,
  }
  | {
    type: "processor_ready",
  };
