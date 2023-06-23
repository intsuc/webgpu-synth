// @ts-check

import { stateIndex } from "./constants.js";

/** @typedef {import("./messages").Data} Data */

/**
 * @param {BaseAudioContext} context
 * @param {AudioWorkletNodeOptions | undefined} options
 * @returns {Promise<SynthNode>}
 */
export async function createSynth(context, options = undefined) {
  return new Promise(async (resolve) => {
    new SynthNode(context, options, (synth) => {
      resolve(synth);
    });
  });
};

class SynthNode extends AudioWorkletNode {
  /** @type {Worker} */
  #worker;

  /** @type {Int32Array} */
  #states;

  /** @type {Float32Array} */
  #output;

  /**
   * @param {BaseAudioContext} context
   * @param {AudioWorkletNodeOptions | undefined} options
   * @param {(synth: SynthNode) => void} onInit
   */
  constructor(context, options = undefined, onInit) {
    super(context, "synth", options);

    this.#worker = new Worker("src/synth-worker.js", { type: "module" });

    this.#worker.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.#states = new Int32Array(data.buffers.states);
          this.#output = new Float32Array(data.buffers.output);

          this.port.postMessage(/** @type {Data} */({
            type: "worker_ready",
            buffers: data.buffers,
          }));

          this.#draw();
          break;
        }
        default: {
          console.error("unknown message", data);
          break;
        }
      }
    };

    this.port.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "processor_ready": {
          onInit(this);
          break;
        }
        default: {
          console.error("unknown message", data);
          break;
        }
      }
    };

    this.#worker.postMessage(/** @type {Data} */({
      type: "initialize_worker",
      sampleRate: context.sampleRate,
    }));
  }

  #draw() {
    requestAnimationFrame(this.#draw.bind(this));

    const kernelLength = 1024;

    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("display"));
    // TODO: use webgpu
    const context = /** @type {CanvasRenderingContext2D } */ (canvas.getContext("2d"));
    const width = canvas.width;
    const height = canvas.height;
    const centerHeight = height / 2;
    const step = width / kernelLength;

    const startIndex = kernelLength * this.#states[stateIndex.outputKernelIndex];

    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.moveTo(0, centerHeight - this.#output[startIndex] * centerHeight);
    for (let i = 1; i < kernelLength; ++i) {
      context.lineTo(i * step, centerHeight - this.#output[startIndex + i] * centerHeight);
    }

    context.stroke();
  }
}
