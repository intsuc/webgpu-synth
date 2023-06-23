// @ts-check

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

  /**
   * @param {BaseAudioContext} context
   * @param {AudioWorkletNodeOptions | undefined} options
   * @param {(synth: SynthNode) => void} onInit
   */
  constructor(context, options = undefined, onInit) {
    super(context, "synth", options);

    this.#worker = new Worker("src/synth-worker.js");

    this.#worker.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.port.postMessage(/** @type {Data} */({
            type: "worker_ready",
            buffers: data.buffers,
          }));
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
}
