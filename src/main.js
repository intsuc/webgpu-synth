// @ts-check

async function playAudio() {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { createSynth } = await import("./synth-node.js");

  const synth = await createSynth(context);
  synth.connect(context.destination);

  const frequencyControl = /** @type {HTMLInputElement} */ (document.getElementById("frequency-control"));
  synth.frequency.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);

  frequencyControl.addEventListener("input", () => {
    synth.frequency.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);
  });

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "z": {
        synth.amplitude.setTargetAtTime(0.5, context.currentTime, 0.001);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "z": {
        synth.amplitude.setTargetAtTime(0.0, context.currentTime, 0.1);
      }
    }
  });

  context.resume();
}

window.addEventListener("load", () => {
  window.addEventListener("click", playAudio, { once: true });
});
