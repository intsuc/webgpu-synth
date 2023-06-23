// @ts-check
/// <reference types="@webgpu/types" />

/** @typedef {import("./messages").Data} Data */

const code = `
@group(0)
@binding(0)
var<storage, read_write> samples: array<f32>;

@compute
@workgroup_size(32)
fn main(
  @builtin(global_invocation_id)
  global_invocation_id : vec3<u32>
) {
  let index = global_invocation_id.x * 4;
  samples[index + 0] = f32(index + 0) / 1024.0 - 0.5;
  samples[index + 1] = f32(index + 1) / 1024.0 - 0.5;
  samples[index + 2] = f32(index + 2) / 1024.0 - 0.5;
  samples[index + 3] = f32(index + 3) / 1024.0 - 0.5;
}
`;

async function initialize() {
  const kernelLength = 1024;
  const bufferLength = kernelLength * 4;
  const channelLength = 1;

  const adapter = /** @type {GPUAdapter} */ (await navigator.gpu.requestAdapter());
  const device = await adapter.requestDevice();
  const module = device.createShaderModule({ code });
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });
  const bufferSize = kernelLength * Float32Array.BYTES_PER_ELEMENT;
  const samplesBuffer = device.createBuffer({
    label: "samples",
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const resultsBuffer = device.createBuffer({
    label: "results",
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: samplesBuffer } },
    ],
  });

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
    outputs[0].set(results, outputWriteIndex);
    resultsBuffer.unmap();

    outputWriteIndex += kernelLength;
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
