export type SharedBuffers = {
  states: SharedArrayBuffer,
  amplitudes: SharedArrayBuffer,
  samples: SharedArrayBuffer,
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
