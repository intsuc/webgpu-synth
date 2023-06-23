export type Data =
  | {
    type: "initialize_worker",
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
  }
