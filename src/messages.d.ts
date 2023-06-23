export type Data =
  | {
    type: "initialize_worker",
    sampleRate: number,
  }
  | {
    type: "worker_ready",
    buffers: {
      states: SharedArrayBuffer,
      output: SharedArrayBuffer,
    },
  }
  | {
    type: "processor_ready",
  };
