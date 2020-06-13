declare class Chart {
  constructor(ctx: any, options: any);
}

async function main() {
  const audio_ctx = new AudioContext();
  await audio_ctx.audioWorklet.addModule('librnnoise.worker.js');

  const wasm = await WebAssembly.instantiateStreaming(fetch('librnnoise.wasm'), {});
  console.log(wasm);

  const constraints = {
    audio: {
      channelCount: {
        min: 1, max: 1
      },
      sampleRate: {
        min: 48000,
        max: 48000,
      },
      noiseSuppression: false,
      autoGainControl: true,
      echoCancellation: false,
    },
    video: false,
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const tracks = stream.getAudioTracks();
  if (tracks.length == 0)
    throw 'not found audio track';
  const audio_track = tracks[0];
  console.log(audio_track.id, audio_track.label);
  console.log(audio_track.getConstraints());
  console.log(audio_track.getSettings());

  const src_node =
    audio_ctx.createMediaStreamTrackSource ?
    audio_ctx.createMediaStreamTrackSource(audio_track) :
    audio_ctx.createMediaStreamSource(stream);
  const worklet_node = new AudioWorkletNode(audio_ctx, 'rnnoise-processor');
  src_node.connect(worklet_node);
  worklet_node.port.postMessage(wasm.module);
  audio_ctx.resume();

  const zero_filled: number[] = [];
  for (let i = 0; i < 1000; i++)
    zero_filled.push(0);
  const chart: any = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: zero_filled.map((_, i) => i),
      datasets: [{
        data: zero_filled,
      }]
    },
    options: {
      aspectRatio: 5,
      tooltips: {
        enabled: false,
      },
      hover: {
        mode: null,
      },
      events: [],
      animation: {
        duration: 0,
      },
      responsiveAnimationDuration: 0,
      elements: {
        line: {
          tension: 0,
        }
      },
      scales: {
        xAxes: [{
          display: false,
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true,
            min: 0,
            max: 1.0
          }
        }]
      },
      legend: {
        display: false,
      },
    },
  });

  worklet_node.port.onmessage = (m) => {
    const data = chart.data.datasets[0].data;
    data.shift();
    data.push(m.data);
  };

  const update = () => {
    chart.update();
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        update();
      });
    }, 1);
  };
  update();
}

window.addEventListener('DOMContentLoaded', _ => {
  main();
});
