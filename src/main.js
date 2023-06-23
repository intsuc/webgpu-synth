// @ts-check

const playAudio = async () => {
  const context = new AudioContext();

  await context.audioWorklet.addModule("src/synth-processor.js");
  const { default: SynthNode } = await import("./synth-node.js");

  const oscillator = new OscillatorNode(context, { frequency: 20 });
  const synth = new SynthNode(context);
  oscillator.connect(synth).connect(context.destination);
  oscillator.start();

  context.resume();
};

window.addEventListener("load", async () => {
  const play = /** @type {HTMLButtonElement} */ (document.getElementById("play"));
  play.disabled = false;
  play.addEventListener("click", async () => {
    await playAudio();
    play.disabled = true;
    play.textContent = "playing";
  }, false);
});
