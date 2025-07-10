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
    let audioCtx = null;
    let masterGain = null;
    const drones = new Set();
    let ready = false;

    return {
      init() {
        if (audioCtx) return;

        audioCtx = new AudioContext();
        masterGain = new GainNode(audioCtx, { gain: 0.2 });
        masterGain.connect(audioCtx.destination);
      },
      play(dead, alive, changed) {
        if (!audioCtx) return; // Audio not initialized yet, skip

        if (!ready) {
          audioCtx.resume().then(() => (ready = true));
          return;
        }

        const total = alive + dead;
        const density = alive / total;
        const activity = Math.min(changed / 500, 1);

        const targetDrones = alive > 0 ? Math.max(1, Math.floor(density * 3)) : 0;

        // Add drones if needed
        while (drones.size < targetDrones) {
          const freq = 60 + activity * 50;
          const gain = new GainNode(audioCtx, { gain: 0 }); // START AT ZERO
          const osc = new OscillatorNode(audioCtx, {
            type: "sine",
            frequency: freq,
          });

          // SMOOTH FADE-IN
          const now = audioCtx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.1); // 100ms fade-in

          osc.connect(gain).connect(masterGain);
          osc.start(now);

          drones.add({ osc, gain, baseFreq: freq });
        }

        // Remove excess drones gracefully
        while (drones.size > targetDrones) {
          const drone = drones.values().next().value;
          drones.delete(drone);
          const now = audioCtx.currentTime;

          // SMOOTH FADE-OUT
          drone.gain.gain.cancelScheduledValues(now);
          drone.gain.gain.setValueAtTime(drone.gain.gain.value, now);
          drone.gain.gain.linearRampToValueAtTime(0, now + 0.2); // 200ms fade-out

          setTimeout(() => {
            try {
              drone.osc.stop();
            } catch {}
          }, 0);
        }

        // Modulate existing drones (SMOOTHLY)
        drones.forEach((drone, i) => {
          const now = audioCtx.currentTime;
          const modulation = Math.sin(now * (0.3 + i * 0.15)) * activity * 15;

          // Ensure modulation is finite and within reasonable bounds
          const safeModulation = isFinite(modulation) ? Math.max(-50, Math.min(50, modulation)) : 0;

          // SMOOTH frequency changes
          drone.osc.frequency.cancelScheduledValues(now);
          drone.osc.frequency.setValueAtTime(drone.osc.frequency.value, now);
          drone.osc.frequency.linearRampToValueAtTime(drone.baseFreq + safeModulation, now + 0.05);

          // SMOOTH volume changes
          const targetVolume = Math.max(0, Math.min(1, 0.08 + activity * 0.06));
          drone.gain.gain.cancelScheduledValues(now);
          drone.gain.gain.setValueAtTime(drone.gain.gain.value, now);
          drone.gain.gain.linearRampToValueAtTime(targetVolume, now + 0.05);
        });

        // Sharp sparkle sounds
        if (activity > 0.01 && Math.random() < 0.3) {
          const density = alive / (alive + dead);
          const sparkleCount = Math.max(1, Math.ceil(density * 5));

          for (let i = 0; i < sparkleCount; i++) {
            const freq = Math.max(200, Math.min(800, 300 + density * 400 + i * 50));
            const sparkle = new OscillatorNode(audioCtx, {
              type: "sine",
              frequency: freq,
            });

            const now = audioCtx.currentTime;
            const delay = i * 1;

            const sparkleGain = new GainNode(audioCtx, { gain: 0 });
            sparkleGain.gain.setValueAtTime(0, now + delay);
            sparkleGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.005);
            sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);

            sparkle.connect(sparkleGain).connect(masterGain);
            sparkle.start(now + delay);
            sparkle.stop(now + delay + 0.05);
          }
        }

        // Simple pulse sound for high activity
        if (activity > 0.5 && Math.random() < 0.1) {
          const pulse = new OscillatorNode(audioCtx, {
            type: "triangle",
            frequency: 120 + activity * 80,
          });
          const pulseGain = new GainNode(audioCtx, { gain: 0.05 });

          const now = audioCtx.currentTime;
          pulseGain.gain.setValueAtTime(0, now);
          pulseGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          pulse.connect(pulseGain).connect(masterGain);
          pulse.start(now);
          pulse.stop(now + 0.1);
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
    "B0/S6/D0.00001",
    "B01/S012467/D0.04",
    "B0123478/S01234678/D80",
    "B0123478/S34678/D3",
    "B017/S1/D99.5",
    "B028/S0124/D0.2",
    "B05/S35678/D1",
    "B058/S4567/D.00001",
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
      <button id="randomBtn">?</button><input type="text" id="ruleInput" placeholder="e.g., B3/S23/D5"><br>
      <select id="rules" name="rules" title="rules" multiple>${options}</select>
    </div>
    <canvas
      id="world"
      width="${WIDTH}"
      height="${HEIGHT}"
      style="border: 1px solid #999 width:${Math.round(WIDTH * SCALE)}px; height:${Math.round(HEIGHT * SCALE)}px;">
    `;

  const $select = document.getElementById("rules");
  const $ruleInput = document.getElementById("ruleInput");
  const $randomBtn = document.getElementById("randomBtn");
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

  $select.onchange = $select.onclick = (e) => {
    e.preventDefault();

    audio.init();
    const selectedRule = rules[$select.options[$select.selectedIndex].value];
    $ruleInput.value = selectedRule;
    rule = getRule(selectedRule);
    initWorld();
  };

  $ruleInput.onkeydown = (e) => {
    audio.init();
    if (e.key === "Enter") {
      try {
        rule = getRule($ruleInput.value);
        initWorld();
      } catch {
        alert(`Invalid rule format: ${$ruleInput.value}`);
      }
    }
  };

  $randomBtn.onclick = () => {
    audio.init();

    // Generate random birth conditions
    const birthCount = Math.floor(Math.random() * 9) + 1;
    const birthNumbers = [];
    for (let i = 0; i < birthCount; i++) {
      birthNumbers.push(Math.floor(Math.random() * 9));
    }
    const birth = "B" + [...new Set(birthNumbers)].sort().join("");

    // Generate random survival conditions
    const survivalCount = Math.floor(Math.random() * 9) + 1;
    const survivalNumbers = [];
    for (let i = 0; i < survivalCount; i++) {
      survivalNumbers.push(Math.floor(Math.random() * 9));
    }
    const survival = "S" + [...new Set(survivalNumbers)].sort().join("");

    // Generate random density
    const densities =
      "0.000001 0.00001 0.0001 0.001 0.01 0.1 1 2 3 4 5 6 7 8 9 10 20 30 40 50 60 70 80 90 " +
      "99 99.9 99.99 99.999 99.9999 99.99999 99.999999".split(" ");

    const randomDensity = densities[Math.floor(Math.random() * densities.length)];
    const densityStr = "D" + randomDensity;

    const randomRule = `${birth}/${survival}/${densityStr}`;
    $ruleInput.value = randomRule;
    rule = getRule(randomRule);
    initWorld();
  };

  initWorld();

  loop(() => {
    const n = new Uint32Array(buffer);

    let [dead, alive, changed] = [0, 0, 0];
    let hash = 0;

    COLOR_ALIVE = colors.get();

    for (let i = 0; i < TOTAL; ++i) {
      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);

      const top = y === 0 ? TOTAL - WIDTH : -WIDTH;
      const bottom = y === HEIGHT - 1 ? -TOTAL + WIDTH : WIDTH;
      const left = x === 0 ? WIDTH - 1 : -1;
      const right = x === WIDTH - 1 ? -WIDTH + 1 : 1;

      const sum =
        (buffer[i + top + left] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + top] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + top + right] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + left] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + right] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + bottom + left] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + bottom] === COLOR_DEAD ? 0 : 1) +
        (buffer[i + bottom + right] === COLOR_DEAD ? 0 : 1);

      const oldStatus = buffer[i] !== COLOR_DEAD;
      const newStatus = rule.getStatus(oldStatus, sum);

      if (newStatus !== oldStatus) {
        ++changed;
        n[i] = newStatus ? COLOR_ALIVE : COLOR_DEAD;
      }

      hash += newStatus << i;
      newStatus ? ++alive : ++dead;
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
