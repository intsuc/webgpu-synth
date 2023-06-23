// @ts-check
/// <reference types="@webgpu/types" />

/** @typedef {import("./messages").Data} Data */

/**
 * @param {number} frequency
 * @param {number} sampleRate
 */
function generateCode(frequency, sampleRate) {
  return `
const omega: f32 = ${2.0 * Math.PI * frequency / sampleRate};

@group(0)
@binding(0)
var<uniform> phase: u32;

@group(0)
@binding(1)
var<storage, read_write> samples: array<f32>;

@compute
@workgroup_size(32)
fn main(
  @builtin(global_invocation_id)
  global_invocation_id : vec3<u32>
) {
  let index = global_invocation_id.x;
  samples[index] = sin(omega * f32(phase + index));
}
`;
}

/**
 * @param {number} sampleRate
 */
async function initialize(sampleRate) {
  const kernelLength = 1024;
  const bufferLength = kernelLength * 4;
  const channelLength = 1;

  // TODO: handle errors
  const adapter = /** @type {GPUAdapter} */ (await navigator.gpu.requestAdapter());
  const device = await adapter.requestDevice();

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  const phaseArray = new Uint32Array([0]);
  const phaseBuffer = device.createBuffer({
    label: "phase",
    size: phaseArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bufferSize = kernelLength * Float32Array.BYTES_PER_ELEMENT;

  const samplesBuffer = device.createBuffer({
    label: "samples",
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: phaseBuffer } },
      { binding: 1, resource: { buffer: samplesBuffer } },
    ],
  });

  const resultsBuffer = device.createBuffer({
    label: "results",
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: device.createShaderModule({
        code: generateCode(480 /* TODO */, sampleRate),
      }),
      entryPoint: "main",
    },
  });

  const buffers = {
    states: new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT),
    output: new SharedArrayBuffer(bufferLength * channelLength * Float32Array.BYTES_PER_ELEMENT),
  }
  const states = new Int32Array(buffers.states);
  const outputs = [new Float32Array(buffers.output)];

  postMessage(/** @type {Data} */({
    type: "worker_ready",
    buffers,
  }));

  let phase = 0;
  let index = 0;

  while (Atomics.wait(states, 0, 0) === "ok") {
    phaseArray[0] = phase;
    device.queue.writeBuffer(phaseBuffer, 0, phaseArray);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(32);
    pass.end();
    encoder.copyBufferToBuffer(samplesBuffer, 0, resultsBuffer, 0, resultsBuffer.size);
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    await resultsBuffer.mapAsync(GPUMapMode.READ);
    const results = new Float32Array(resultsBuffer.getMappedRange());
    outputs[0].set(results, index);
    resultsBuffer.unmap();

    phase += kernelLength;
    if (phase >= sampleRate) {
      phase -= sampleRate;
    }

    index += kernelLength;
    if (index === bufferLength) {
      index = 0;
    }

    Atomics.store(states, 0, 0);
  }
}

onmessage = (event) => {
  const data = /** @type {Data} */ (event.data);
  switch (data.type) {
    case "initialize_worker": {
      initialize(data.sampleRate);
      break;
    }
    default: {
      console.error("unknown message", data);
      break;
    }
  }
};
