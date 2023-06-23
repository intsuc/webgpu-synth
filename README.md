# <samp>webgpu-synth</samp>

## Architecture

```mermaid
flowchart LR
  subgraph SharedArrayBuffer
    States
    OutputRingBuffer
  end

  MainScope --> DedicatedWorkerGlobalScope
  States --> MainScope
  OutputRingBuffer --> MainScope
  MainScope <--> GPU

  DedicatedWorkerGlobalScope --> OutputRingBuffer
  DedicatedWorkerGlobalScope <--> States
  DedicatedWorkerGlobalScope <--> GPU

  AudioWorkletGlobalScope --> States
  OutputRingBuffer --> AudioWorkletGlobalScope
```
