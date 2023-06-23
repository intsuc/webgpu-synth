// @ts-check

export default class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  /**
   * @param {Float32Array[][]} inputs
   * @param {Float32Array[][]} outputs
   * @param {Record<string, Float32Array>} parameters
   * @returns {boolean}
   */
  process(inputs, outputs, parameters) {
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
