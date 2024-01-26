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

    birth = birth
      .slice(1)
      .split("")
      .map((n) => parseInt(n, 10));

    survival = survival
      .slice(1)
      .split("")
      .map((n) => parseInt(n, 10));

    return {
      density: parseFloat(density.slice(1)),
      getStatus(alive, sum) {
        if (alive) return survival.includes(sum);
        if (birth.includes(sum)) return true;
        return alive;
      },
    };
  }

  function createAudio() {
    const audioCtx = new AudioContext();
    const gainNode = new GainNode(audioCtx, { gain: 0.02 });

    function scale(x, in_min, in_max, out_min, out_max) {
      return ((x - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
    }

    let min = 1;
    let max = 2;

    let ready = false;

    return {
      play(val) {
        if (!ready) {
          audioCtx.resume().then(() => {
            ready = true;
          });

          return;
        }

        if (val < min) min = val;
        if (val > max) max = val;

        const d = Math.round((max - min) / 2) + min;

        if (val > d) {
          min += Math.round(min * 0.01);
        } else {
          max -= Math.round(max * 0.01);
        }

        const osc = new OscillatorNode(audioCtx, {
          type: "sawtooth",
          frequency: scale(val, min, max, 30, 400),
        });

        const start = audioCtx.currentTime + 0.1;

        osc.connect(gainNode).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      },
    };
  }

  function createHistory(limit = 50_000) {
    let history = Array(limit);
    let pos = 0;

    return {
      reset() {
        history = Array(limit);
        pos = 0;
      },
      add(val) {
        if (history.size > limit) {
          pos = 0;
        }

        history[pos++] = val;
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

    setInterval(() => {
      $info.innerHTML = `
        <span>pixels: ${new Intl.NumberFormat("de-DE").format(TOTAL)}</span>
        <span>fps: ${fps.get()}</span>
        <span>generation: ${new Intl.NumberFormat("de-DE").format(generation)}</span>
        <span>alive: ${new Intl.NumberFormat("de-DE").format(alive)}</span>
        <span>dead: ${new Intl.NumberFormat("de-DE").format(dead)}</span>
        <span>ratio: ${Math.round((alive / TOTAL) * 100)} : ${Math.round((dead / TOTAL) * 100)}</span>
        <span>changed: ${new Intl.NumberFormat("de-DE").format(changed)}</span>`;
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
  const history = createHistory(MAX_GENERATIONS);
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

        const tl = buffer[i + offsetT + offsetL] === COLOR_DEAD ? 0 : 1;
        const tm = buffer[i + offsetT] === COLOR_DEAD ? 0 : 1;
        const tr = buffer[i + offsetT + offsetR] === COLOR_DEAD ? 0 : 1;
        const ml = buffer[i + offsetL] === COLOR_DEAD ? 0 : 1;
        const mr = buffer[i + offsetR] === COLOR_DEAD ? 0 : 1;
        const bl = buffer[i + offsetB + offsetL] === COLOR_DEAD ? 0 : 1;
        const bm = buffer[i + offsetB] === COLOR_DEAD ? 0 : 1;
        const br = buffer[i + offsetB + offsetR] === COLOR_DEAD ? 0 : 1;

        const sum = tl + tm + tr + ml + mr + bl + bm + br;

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
    audio.play(changed);
    history.add(hash);
    info.update(dead, alive, changed);
    world.putImageData(data, 0, 0);

    ++generation;
  });
}
