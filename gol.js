{
  function loop(fn, delay = 0, cnt = 3) {
    (function repeat() {
      setTimeout(() => {
        for (let i = 0; i < cnt; ++i) {
          fn();
        }
        repeat();
      }, delay);
    })();
  }

  function getRule(rule) {
    let [birth, survival, density] = rule.split("/");

    birth = new Set(
      birth
        .slice(1)
        .split("")
        .map((n) => parseInt(n, 10))
    );

    survival = new Set(
      survival
        .slice(1)
        .split("")
        .map((n) => parseInt(n, 10))
    );

    return {
      density: parseFloat(density.slice(1)),
      getStatus(alive, sum) {
        if (alive) return survival.has(sum);
        if (birth.has(sum)) return true;
        return alive;
      },
    };
  }

  function createAudio() {
    const audioCtx = new AudioContext();
    const masterGain = new GainNode(audioCtx, { gain: 0.2 });
    masterGain.connect(audioCtx.destination);

    let drones = [];
    let ready = false;

    return {
      play(dead, alive, changed) {
        if (!ready) {
          audioCtx.resume().then(() => (ready = true));
          return;
        }

        const total = alive + dead;
        const density = alive / total;
        const activity = Math.min(changed / 500, 1);

        const targetDrones = alive > 0 ? Math.max(1, Math.floor(density * 4)) : 0;

        // Add drones if needed
        while (drones.length < targetDrones) {
          const freq = 60 + Math.random() * 100;
          const osc = new OscillatorNode(audioCtx, {
            type: "sine",
            frequency: freq,
          });
          const gain = new GainNode(audioCtx, { gain: 0 }); // START AT ZERO

          // SMOOTH FADE-IN
          const now = audioCtx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.1); // 100ms fade-in

          osc.connect(gain).connect(masterGain);
          osc.start(now);

          drones.push({ osc, gain, baseFreq: freq });
        }

        // Remove excess drones gracefully
        while (drones.length > targetDrones) {
          const drone = drones.pop();
          const now = audioCtx.currentTime;

          // SMOOTH FADE-OUT
          drone.gain.gain.cancelScheduledValues(now);
          drone.gain.gain.setValueAtTime(drone.gain.gain.value, now);
          drone.gain.gain.linearRampToValueAtTime(0, now + 0.2); // 200ms fade-out

          setTimeout(() => {
            try {
              drone.osc.stop();
            } catch (e) {
              // Oscillator might already be stopped
            }
          }, 250);
        }

        // Modulate existing drones (SMOOTHLY)
        drones.forEach((drone, i) => {
          const now = audioCtx.currentTime;
          const modulation = Math.sin(now * (0.3 + i * 0.15)) * activity * 15;

          // SMOOTH frequency changes
          drone.osc.frequency.cancelScheduledValues(now);
          drone.osc.frequency.setValueAtTime(drone.osc.frequency.value, now);
          drone.osc.frequency.linearRampToValueAtTime(drone.baseFreq + modulation, now + 0.05);

          // SMOOTH volume changes
          const targetVolume = 0.08 + activity * 0.06;
          drone.gain.gain.cancelScheduledValues(now);
          drone.gain.gain.setValueAtTime(drone.gain.gain.value, now);
          drone.gain.gain.linearRampToValueAtTime(targetVolume, now + 0.05);
        });

        // Sparkles with SMOOTH envelope
        if (activity > 0.3 && Math.random() < 0.4) {
          const sparkle = new OscillatorNode(audioCtx, {
            type: "sine",
            frequency: 400 + Math.random() * 800,
          });
          const sparkleGain = new GainNode(audioCtx, { gain: 0 }); // START AT ZERO

          const now = audioCtx.currentTime;
          // SMOOTH ATTACK-DECAY envelope
          sparkleGain.gain.setValueAtTime(0, now);
          sparkleGain.gain.linearRampToValueAtTime(0.15, now + 0.02); // 20ms attack
          sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // 280ms decay

          sparkle.connect(sparkleGain).connect(masterGain);
          sparkle.start(now);
          sparkle.stop(now + 0.3);
        }

        // Pulse sounds with SMOOTH envelope
        if (activity > 0.1 && Math.random() < 0.2) {
          const pulse = new OscillatorNode(audioCtx, {
            type: "triangle",
            frequency: 120 + activity * 80,
          });
          const pulseGain = new GainNode(audioCtx, { gain: 0 }); // START AT ZERO

          const now = audioCtx.currentTime;
          // SMOOTH envelope
          pulseGain.gain.setValueAtTime(0, now);
          pulseGain.gain.linearRampToValueAtTime(0.1, now + 0.01); // 10ms attack
          pulseGain.gain.linearRampToValueAtTime(0.05, now + 0.05); // 40ms sustain
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // 100ms release

          pulse.connect(pulseGain).connect(masterGain);
          pulse.start(now);
          pulse.stop(now + 0.15);
        }
      },
    };
  }

  function createHistory(limit = MAX_GENERATIONS) {
    let history = new Array(limit);
    let len = 0;

    return {
      reset() {
        history = new Array(limit);
        len = 0;
      },
      add(val) {
        if (len > limit) {
          len = 0;
        }

        history[len++] = val;
      },
      has(val) {
        return history.includes(val);
      },
    };
  }

  function createColors(color) {
    const FREQ = Math.PI / 2 / 50;
    let c = 0;
    let l = 0;

    return {
      get() {
        if (l++ % 10 === 0) {
          const r = Math.abs(Math.round(Math.sin(FREQ * c + 0) * 220));
          const g = Math.abs(Math.round(Math.sin(FREQ * c + 2) * 220));
          const b = Math.abs(Math.round(Math.sin(FREQ * c + 4) * 220));

          color = (0xff << 24) | (b << 16) | (g << 8) | r;

          ++c;
        }

        return color;
      },
    };
  }

  function createFPSCounter() {
    let step = generation;
    let fps = 0;

    setInterval(() => {
      fps = generation - step;
      step = generation;
    }, 1000);

    return {
      reset() {
        step = 0;
      },
      get() {
        return fps;
      },
    };
  }

  function createInfos($info) {
    let dead = 0;
    let alive = 0;
    let changed = 0;

    const num = new Intl.NumberFormat("de-DE");

    setInterval(() => {
      $info.innerHTML = `
        <span>pixels: ${num.format(TOTAL)}</span>
        <span>fps: ${fps.get()}</span>
        <span>generation: ${num.format(generation)}</span>
        <span>alive: ${num.format(alive)}</span>
        <span>dead: ${num.format(dead)}</span>
        <span>ratio: ${Math.round((alive / TOTAL) * 100)} : ${Math.round((dead / TOTAL) * 100)}</span>
        <span>changed: ${num.format(changed)}</span>`;
    }, 200);

    return {
      update(_dead, _alive, _changed) {
        dead = _dead;
        alive = _alive;
        changed = _changed;
      },
    };
  }

  const rules = [
    "B0123478/S01234678/D80",
    "B0123478/S34678/D3",
    "B017/S1/D99.5",
    "B028/S0124/D0.2",
    "B08/S4/D0.01",
    "B1/S012345678/D0.0005",
    "B1238/S234678/D99.2",
    "B12678/S15678/D1",
    "B1357/S1357/D0.01",
    "B2358/S1234567/D0.2",
    "B25678/S23678/D0.1",
    "B25678/S5678/D0.2",
    "B3/S012345678/D0.8",
    "B3/S0248/D99.99",
    "B3/S12345/D1",
    "B3/S14567/D50",
    "B3/S23/D6",
    "B3/S4567/D60",
    "B3/S45678/D20",
    "B34/S13/D5",
    "B34/S456/D17",
    "B345/S0456/D7",
    "B345/S4567/D16",
    "B34568/S15678/D7",
    "B35678/S4678/D46",
    "B35678/S4678/D54",
    "B35678/S5678/D50",
    "B3578/S24678/D33",
    "B36/S125/D8",
    "B367/S125678/D10",
    "B3678/S235678/D4",
    "B38/S012345678/D0.5",
    "B56/S14568/D70",
    "B5678/S45678/D50",
  ];

  // init
  const WIDTH = 400;
  const HEIGHT = 400;
  const SCALE = 2;
  const TOTAL = WIDTH * HEIGHT;
  const MAX_GENERATIONS = 10_000;

  let rule = getRule(rules[0]);
  let generation = 0;

  const options = rules.map((val, key) => `<option value="${key}">${val}</option>`);

  document.body.innerHTML = `
    <div id="info"></div>
    <div id="controls">
      rules<br>
      <select id="rules" name="rules" title="rules" multiple>${options}</select>
    </div>
    <canvas
      id="world"
      width="${WIDTH}"
      height="${HEIGHT}"
      style="border: 1px solid #999 width:${Math.round(WIDTH * SCALE)}px; height:${Math.round(HEIGHT * SCALE)}px;">
    `;

  const $select = document.getElementById("rules");
  const $info = document.getElementById("info");
  const world = document.getElementById("world").getContext("2d");
  const data = world.createImageData(WIDTH, HEIGHT);
  const buffer = new Uint32Array(data.data.buffer);
  const audio = createAudio();
  const history = createHistory();
  const colors = createColors();
  const fps = createFPSCounter();
  const info = createInfos($info);

  const COLOR_DEAD = 0xff_ee_ee_ee;
  let COLOR_ALIVE = colors.get();

  // init world with random dots
  const initWorld = () => {
    generation = 0;
    fps.reset();
    history.reset();

    for (let i = 0, x = 0; x < WIDTH; ++x) {
      for (let y = 0; y < HEIGHT; ++y) {
        buffer[i++] = Math.random() * 100 < rule.density ? COLOR_ALIVE : COLOR_DEAD;
      }
    }

    world.putImageData(data, 0, 0);
  };

  $select.onclick = () => {
    rule = getRule(rules[$select.options[$select.selectedIndex].value]);
    initWorld();
  };

  initWorld();

  loop(() => {
    const n = new Uint32Array(buffer);

    let [dead, alive, changed] = [0, 0, 0];
    let hash = 0;

    COLOR_ALIVE = colors.get();

    for (let i = 0, x = 0; x < WIDTH; ++x) {
      for (let y = 0; y < HEIGHT; ++y) {
        const offsetT = i - WIDTH < 0 ? WIDTH * (HEIGHT - 1) : -WIDTH;
        const offsetB = i + WIDTH >= TOTAL ? -WIDTH * (HEIGHT - 1) : WIDTH;
        const offsetL = i % WIDTH === 0 ? WIDTH - 1 : -1;
        const offsetR = i % WIDTH === WIDTH - 1 ? -WIDTH + 1 : 1;

        const sum =
          (buffer[i + offsetT + offsetL] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetT] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetT + offsetR] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetL] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetR] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetB + offsetL] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetB] === COLOR_DEAD ? 0 : 1) +
          (buffer[i + offsetB + offsetR] === COLOR_DEAD ? 0 : 1);

        const oldStatus = buffer[i] !== COLOR_DEAD;
        const newStatus = rule.getStatus(oldStatus, sum);

        if (newStatus !== oldStatus) {
          ++changed;
          n[i] = newStatus ? COLOR_ALIVE : COLOR_DEAD;
        }

        hash += newStatus << i;
        newStatus ? ++alive : ++dead;
        ++i;
      }
    }

    if (generation > MAX_GENERATIONS) {
      console.info("max generations reached");
      return initWorld();
    }

    if (!changed) {
      console.info("nothing changed");
      return initWorld();
    }

    if (history.has(hash)) {
      console.info("found dup in history");
      return initWorld();
    }

    buffer.set(n);
    audio.play(dead, alive, changed);
    history.add(hash);
    info.update(dead, alive, changed);
    world.putImageData(data, 0, 0);

    ++generation;
  });
}
