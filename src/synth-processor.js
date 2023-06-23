// @ts-check

/** @typedef {import("./messages").Data} Data */

export default class SynthProcessor extends AudioWorkletProcessor {
  /** @type {boolean} */
  #initialized;

  /** @type {Int32Array} */
  #states;

  /** @type {Float32Array[]} */
  #output;

  constructor() {
    super();

    this.#initialized = false;

    this.port.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.#states = new Int32Array(data.buffers.states);
          this.#output = [new Float32Array(data.buffers.output)];

          this.#initialized = true;
          this.port.postMessage(/** @type {Data} */({
            type: "processor_ready",
          }))
          break;
        }
        default: {
          console.error("unknown message", data);
          break;
        }
      }
    };
  }

  /**
   * @param {Float32Array[][]} inputs
   * @param {Float32Array[][]} outputs
   * @param {Record<string, Float32Array>} parameters
   * @returns {boolean}
   */
  process(inputs, outputs, parameters) {
    if (!this.#initialized) {
      return true;
    }

    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < output.length; ++channel) {
      const inputFrame = input[channel];
      const outputFrame = output[channel]
      outputFrame.set(inputFrame);
    }

    return true;
  }
}

registerProcessor("synth", SynthProcessor);
