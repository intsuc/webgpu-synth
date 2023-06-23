// @ts-check

async function playAudio() {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { createSynth } = await import("./synth-node.js");

  const synth = await createSynth(context);
  synth.connect(context.destination);
  const frequencyParameter = /** @type {AudioParam} */ (synth.parameters.get("frequency"));

  const frequencyControl = /** @type {HTMLInputElement} */ (document.getElementById("frequency-control"));
  frequencyParameter.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);

  frequencyControl.addEventListener("input", () => {
    frequencyParameter.setValueAtTime(frequencyControl.valueAsNumber, context.currentTime);
  });

  context.resume();
};

window.addEventListener("load", async () => {
  const play = /** @type {HTMLButtonElement} */ (document.getElementById("play"));
  play.disabled = false;
  play.addEventListener("click", async () => {
    play.disabled = true;
    play.textContent = "playing";
    await playAudio();
  }, false);
});
