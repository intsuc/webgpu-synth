// @ts-check

import { stateIndex } from "./constants.js";

/** @typedef {import("./messages").Data} Data */

export default class SynthProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "frequency",
        defaultValue: 480,
        automationRate: "k-rate",
      },
    ];
  }

  /** @type {boolean} */
  #initialized = false;

  /** @type {Int32Array} */
  #states;

  /** @type {Float32Array[]} */
  #outputs;

  /** @type {number} */
  #outputReadIndex = 0;

  /** @type {number} */
  #inputFrameLength = 0;

  constructor() {
    super();

    this.port.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.#states = new Int32Array(data.buffers.states);
          this.#outputs = [new Float32Array(data.buffers.output)];

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
   * @param {Float32Array[][]} _inputs
   * @param {Float32Array[][]} outputs
   * @param {Record<string, Float32Array>} parameters
   * @returns {boolean}
   */
  process(_inputs, outputs, parameters) {
    if (!this.#initialized) {
      return true;
    }

    const outputFrame = outputs[0][0];
    const endIndex = this.#outputReadIndex + outputFrame.length;
    outputFrame.set(this.#outputs[0].subarray(this.#outputReadIndex, endIndex));
    this.#outputReadIndex = endIndex;

    this.#states[stateIndex.frequency] = parameters["frequency"][0];

    if (++this.#inputFrameLength >= 8) {
      Atomics.notify(this.#states, stateIndex.request, 1);

      this.#inputFrameLength = 0;
      if (this.#outputReadIndex === this.#outputs[0].length) {
        this.#outputReadIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("synth", SynthProcessor);
