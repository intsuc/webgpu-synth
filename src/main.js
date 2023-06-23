// @ts-check

async function playAudio() {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { createSynth } = await import("./synth-node.js");

  const synth = await createSynth(context);
  synth.connect(context.destination);
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
