// @ts-check

window.addEventListener("load", async () => {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { createSynth } = await import("./synth-node.js");

  const synth = await createSynth(context);
  synth.connect(context.destination);
  const frequencyParameter = /** @type {AudioParam} */ (synth.parameters.get("frequency"));
  const amplitudeParameter = /** @type {AudioParam} */ (synth.parameters.get("amplitude"));

  const frequencyControl = /** @type {HTMLInputElement} */ (document.getElementById("frequency-control"));
  frequencyParameter.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);

  frequencyControl.addEventListener("input", () => {
    frequencyParameter.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);
  });

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "z": {
        amplitudeParameter.setTargetAtTime(0.5, context.currentTime, 0.1);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "z": {
        amplitudeParameter.setTargetAtTime(0.0, context.currentTime, 0.1);
      }
    }
  });

  context.resume();
});
