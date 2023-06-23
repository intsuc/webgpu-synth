// @ts-check

import { stateIndex } from "./constants.js";

/** @typedef {import("./messages").SharedBuffers} SharedBuffers */
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

    this.#worker = new Worker("src/synth-worker.js", { type: "module" });

    this.#worker.onmessage = (event) => {
      const data = /** @type {Data} */ (event.data);
      switch (data.type) {
        case "worker_ready": {
          this.port.postMessage(/** @type {Data} */({
            type: "worker_ready",
            buffers: data.buffers,
          }));

          this.#initialize(data.buffers);
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

  /**
   * @param {number} kernelLength
   * @returns
   */
  static #generateCode(kernelLength) {
    return `
@group(0) @binding(0) var<storage, read> samples: array<f32, ${kernelLength}>;

@vertex fn vertex_main(
  @builtin(vertex_index) index : u32
) -> @builtin(position) vec4f {
  return vec4f(f32(index) / ${kernelLength / 2} - 1.0, samples[index], 0.0, 1.0);
}

@fragment fn fragment_main() -> @location(0) vec4f {
  return vec4f(0.5725490196, 0.83921568627, 0.90196078431, 1.0);
}
`;
  }

  /**
   * @param {SharedBuffers} buffers
   */
  async #initialize(buffers) {
    const kernelLength = 1024;

    const states = new Int32Array(buffers.states);
    const samples = new Float32Array(buffers.samples);

    // TODO: handle errors
    const adapter = /** @type {GPUAdapter} */ (await navigator.gpu.requestAdapter());
    const device = await adapter.requestDevice();
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("display"));
    const context = /** @type {GPUCanvasContext} */ (canvas.getContext("webgpu"));
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      ],
    });
    const bufferSize = kernelLength * Float32Array.BYTES_PER_ELEMENT;
    const samplesBuffer = device.createBuffer({
      label: "samples",
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: samplesBuffer } },
      ],
    });
    const module = device.createShaderModule({
      code: SynthNode.#generateCode(kernelLength),
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: "vertex_main",
      },
      fragment: {
        module,
        entryPoint: "fragment_main",
        targets: [{ format }],
      },
      primitive: {
        topology: "line-strip",
      },
    });
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
      colorAttachments: [{
        clearValue: [1 / 255, 4 / 255, 9 / 255, 1.0],
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      }],
    };
    const queue = device.queue;

    const draw = () => {
      requestAnimationFrame(draw);

      renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

      const kernelIndex = kernelLength * states[stateIndex.outputKernelIndex];
      queue.writeBuffer(samplesBuffer, 0, samples, kernelIndex, kernelLength);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(kernelLength);
      pass.end();
      const commandBuffer = encoder.finish();
      queue.submit([commandBuffer]);
    };
    draw();

    new ResizeObserver((entries) => {
      const entry = entries[0];
      const canvas = /** @type {HTMLCanvasElement} */ (entry.target);
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = width;
      canvas.height = height;
      draw();
    }).observe(canvas);
  }
}
