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

  /** @type {HTMLCanvasElement} */
  #canvas;

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

          this.#initialize();
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

  #initialize() {
    this.#canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("display"));

    new ResizeObserver((entries) => {
      const entry = entries[0];
      const canvas = /** @type {HTMLCanvasElement} */ (entry.target);
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = width;
      canvas.height = height;
      this.#draw();
    }).observe(this.#canvas);

    this.#draw();
  }

  #draw() {
    requestAnimationFrame(this.#draw.bind(this));

    const kernelLength = 1024;
    const width = this.#canvas.width;
    const height = this.#canvas.height;
    const centerHeight = height / 2;
    const step = width / kernelLength;
    const startIndex = kernelLength * this.#states[stateIndex.outputKernelIndex];

    // TODO: use webgpu
    const context = /** @type {CanvasRenderingContext2D } */ (this.#canvas.getContext("2d"));
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.moveTo(0, centerHeight - this.#output[startIndex] * centerHeight);
    for (let i = 1; i < kernelLength; ++i) {
      context.lineTo(i * step, centerHeight - this.#output[startIndex + i] * centerHeight);
    }

    context.stroke();
  }
}
