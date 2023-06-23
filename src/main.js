// @ts-check

async function playAudio() {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { createSynth } = await import("./synth-node.js");

  const synth = await createSynth(context);
  synth.connect(context.destination);

  const frequencyValue = /** @type {HTMLSpanElement} */(document.getElementById("frequency-value"));
  document.addEventListener("mousemove", (event) => {
    const frequency = 2 ** (Math.log2(24000) * event.x / window.innerWidth);
    frequencyValue.textContent = frequency.toFixed(2);
    synth.frequency.setValueAtTime(frequency, context.currentTime);
  });

  document.addEventListener("mousedown", (event) => {
    synth.amplitude.setTargetAtTime(0.5, context.currentTime, 0.001);
  });

  document.addEventListener("mouseup", (event) => {
    synth.amplitude.setTargetAtTime(0.0, context.currentTime, 0.1);
  });

  context.resume();
}

window.addEventListener("load", () => {
  window.addEventListener("click", playAudio, { once: true });
});
