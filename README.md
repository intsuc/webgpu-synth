# <samp>webgpu-synth</samp>

## Architecture

```mermaid
flowchart LR
  MainScope --> DedicatedWorkerGlobalScope

  DedicatedWorkerGlobalScope --> OutputBuffer
  States --> DedicatedWorkerGlobalScope
  DedicatedWorkerGlobalScope <--> GPU

  subgraph SharedArrayBuffer
    States
    OutputBuffer
  end

  OutputBuffer --> AudioWorkletGlobalScope
  AudioWorkletGlobalScope --> States
```
