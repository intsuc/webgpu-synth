// @ts-check

/** @typedef {import("./messages").Data} Data */

onmessage = (event) => {
  const data = /** @type {Data} */ (event.data);
  switch (data.type) {
    case "initialize_worker": {
      const buffers = {
        states: new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT),
        output: new SharedArrayBuffer(4096 * 1 * Float32Array.BYTES_PER_ELEMENT),
      }
      const states = new Int32Array(buffers.states);
      const output = [new Float32Array(buffers.output)];

      postMessage(/** @type {Data} */({
        type: "worker_ready",
        buffers,
      }));

      while (Atomics.wait(states, 0, 0) === "ok") {
        // TODO

        Atomics.store(states, 0, 0);
      }

      break;
    }
    default: {
      console.error("unknown message", data);
      break;
    }
  }
};
