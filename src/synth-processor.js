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
      {
        name: "amplitude",
        defaultValue: 0.0,
        automationRate: "a-rate",
      },
    ];
  }

  /** @type {boolean} */
  #initialized = false;

  /** @type {Int32Array} */
  #states;

  /** @type {Float32Array} */
  #amplitudes;

  /** @type {Float32Array} */
  #output;

  /** @type {number} */
  #outputSampleIndex = 0;

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
          this.#amplitudes = new Float32Array(data.buffers.amplitudes);
          this.#output = new Float32Array(data.buffers.samples);

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

    const frequency = parameters["frequency"][0];
    const amplitude = parameters["amplitude"];

    const outputFrame = outputs[0][0];
    const startIndex = this.#outputSampleIndex;
    const endIndex = startIndex + outputFrame.length;

    this.#states[stateIndex.frequency] = frequency;
    this.#amplitudes.set(amplitude, startIndex);
    outputFrame.set(this.#output.subarray(startIndex, endIndex));
    this.#outputSampleIndex = endIndex;

    if (++this.#inputFrameLength >= 8) {
      Atomics.notify(this.#states, stateIndex.processRequest, 1);

      if (++this.#outputKernelIndex === 4) {
        this.#outputKernelIndex = 0;
      }
      this.#states[stateIndex.outputKernelIndex] = this.#outputKernelIndex;

      if (this.#outputSampleIndex === this.#output.length) {
        this.#outputSampleIndex = 0;
      }

      this.#inputFrameLength = 0;
    }

    return true;
  }
}

registerProcessor("synth", SynthProcessor);
