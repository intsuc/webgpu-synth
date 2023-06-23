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

  /** @type {Float32Array} */
  #output;

  /** @type {number} */
  #outputFrameIndex = 0;

  /** @type {number} */
  #outputKernelIndex = 0;

  /** @type {number} */
  #inputFrameLength = 0;

  constructor() {
    super();

    this.port.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.#states = new Int32Array(data.buffers.states);
          this.#output = new Float32Array(data.buffers.output);

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
    const endIndex = this.#outputFrameIndex + outputFrame.length;
    outputFrame.set(this.#output.subarray(this.#outputFrameIndex, endIndex));
    this.#outputFrameIndex = endIndex;

    this.#states[stateIndex.frequency] = parameters["frequency"][0];

    if (++this.#inputFrameLength >= 8) {
      Atomics.notify(this.#states, stateIndex.processRequest, 1);

      if (++this.#outputKernelIndex === 4) {
        this.#outputKernelIndex = 0;
      }
      this.#states[stateIndex.outputKernelIndex] = this.#outputKernelIndex;

      if (this.#outputFrameIndex === this.#output.length) {
        this.#outputFrameIndex = 0;
      }

      this.#inputFrameLength = 0;
    }

    return true;
  }
}

registerProcessor("synth", SynthProcessor);
