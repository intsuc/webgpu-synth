// @ts-check

/** @typedef {import("./messages").Data} Data */

function initialize() {
  const kernelLength = 1024;
  const bufferLength = kernelLength * 4;
  const channelLength = 1;

  const buffers = {
    states: new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT),
    output: new SharedArrayBuffer(bufferLength * channelLength * Float32Array.BYTES_PER_ELEMENT),
  }
  postMessage(/** @type {Data} */({
    type: "worker_ready",
    buffers,
  }));

  const states = new Int32Array(buffers.states);
  const outputs = [new Float32Array(buffers.output)];
  let outputWriteIndex = 0;

  while (Atomics.wait(states, 0, 0) === "ok") {
    for (let i = 0; i < kernelLength; ++i) {
      outputs[0][outputWriteIndex++] = Math.random() - 0.5;
    }

    if (outputWriteIndex === bufferLength) {
      outputWriteIndex = 0;
    }

    Atomics.store(states, 0, 0);
  }
}

onmessage = (event) => {
  const data = /** @type {Data} */ (event.data);
  switch (data.type) {
    case "initialize_worker": {
      initialize();
      break;
    }
    default: {
      console.error("unknown message", data);
      break;
    }
  }
};
