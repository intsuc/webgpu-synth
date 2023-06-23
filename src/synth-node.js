// @ts-check

export default class SynthNode extends AudioWorkletNode {
  /**
   * @param {BaseAudioContext} context
   * @param {AudioWorkletNodeOptions | undefined} options
   */
  constructor(context, options = undefined) {
    super(context, "synth", options);
  }
}
