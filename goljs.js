{
  function createAudio() {
    const audioCtx = new AudioContext();
    const gainNode = new GainNode(audioCtx, { gain: 0.1 });

    function scale(x, in_min, in_max, out_min, out_max) {
      if (x > in_min) in_min = x;
      if (x > in_max) in_max = x;

      const d1 = x - in_min;
      const d2 = in_max - in_min;
      const f = d2 === 0 ? 1 : d1 / d2;

      return out_min + (out_max - out_min) * f;
    }

    let min = 1;
    let max = Number.MAX_SAFE_INTEGER;

    return {
      play(val) {
        if (val < min) min = val;
        if (val > max) max = val;

        const d = Math.round((max - min) / 2) + min;

        if (val > d) {
          min += Math.round(d * 0.1);
        } else {
          max -= Math.round(d * 0.1);
        }

        audioCtx.resume().then(() => {
          const osc = new OscillatorNode(audioCtx, { type: "sine", frequency: scale(val, min, max, 100, 1000) });
          const start = audioCtx.currentTime + 0.1;
          osc.connect(gainNode).connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 0.1);
        });
      },
    };
  }

  function createHistory(limit = 10_000) {
    const history = new Set();

    return {
      reset() {
        history.clear();
      },
      add(val) {
        // limit history
        if (history.size > limit) {
          const iter = history[Symbol.iterator]();
          history.delete(iter.next().value);
        }

        history.add(val);
      },
      has(val) {
        return history.has(val);
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
    let fps = "";

    timer = setInterval(() => {
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

  const rules = {
    "23678/25678": {
      density: 0.1,
      getStatus(alive, sum) {
        if (alive) return "23678".includes(sum);
        if ("25678".includes(sum)) return true;
        return alive;
      },
    },
    "1234567/2358": {
      density: 0.2,
      getStatus(alive, sum) {
        if (alive) return "1234567".includes(sum);
        if ("2358".includes(sum)) return true;
        return alive;
      },
    },
    "12345/3": {
      density: 1,
      getStatus(alive, sum) {
        if (alive) return "12345".includes(sum);
        if ("3".includes(sum)) return true;
        return alive;
      },
    },
    "01234678/0123478": {
      density: 80,
      getStatus(alive, sum) {
        if (alive) return "01234678".includes(sum);
        if ("0123478".includes(sum)) return true;
        return alive;
      },
    },
    "123/1": {
      density: 99.2,
      getStatus(alive, sum) {
        if (alive) return "234678".includes(sum);
        if ("1238".includes(sum)) return true;
        return alive;
      },
    },
    "14567/3": {
      density: 50,
      getStatus(alive, sum) {
        if (alive) return "14567".includes(sum);
        if ("3".includes(sum)) return true;
        return alive;
      },
    },
    "1357/1357": {
      density: 0.01,
      getStatus(alive, sum) {
        if (alive) return sum % 2 === 1;
        if (sum % 2 === 1) return true;
        return alive;
      },
    },
    "23/3 (Conway's Original-Game of Life)": {
      density: 6,
      getStatus(alive, sum) {
        if (alive) return sum === 2 || sum === 3;
        if (sum === 3) return true;
        return alive;
      },
    },
  };

  // init
  const WIDTH = 600;
  const HEIGHT = 400;
  const TOTAL = WIDTH * HEIGHT;

  let rule = rules["23678/25678"];
  let generation = 0;

  const options = Object.keys(rules).map((key) => `<option value="${key}">${key}</option>`);

  document.body.innerHTML = `
    <span id="controls">
      rule <select id="rules" name="rules" title="rules">${options}</select>
      <button id="reset" name="reset" title="reset" type="button">reset</button>
    </span>
    <span id="info">-</span><br><br>
    <canvas
      id="world"
      width="${WIDTH}"
      height="${HEIGHT}"
      style="border: 1px solid #999 width:${(WIDTH * 2) | 0}px; height:${(HEIGHT * 2) | 0}px;">
    `;

  const $select = document.getElementById("rules");
  const $reset = document.getElementById("reset");
  const $info = document.getElementById("info");
  const w = document.getElementById("world").getContext("2d");
  const d = w.createImageData(WIDTH, HEIGHT);
  const b = new Uint32Array(d.data.buffer);
  const a = createAudio();
  const h = createHistory();
  const c = createColors();
  const f = createFPSCounter();

  const COLOR_DEAD = 0xff_ee_ee_ee;
  let COLOR_ALIVE = c.get();

  // init world with random dots
  const initWorld = () => {
    generation = 0;
    f.reset();
    h.reset();

    for (let i = 0, x = 0; x < WIDTH; ++x) {
      for (let y = 0; y < HEIGHT; ++y) {
        b[i++] = Math.random() * 100 < rule.density ? COLOR_ALIVE : COLOR_DEAD;
      }
    }

    w.putImageData(d, 0, 0);
  };

  $reset.onclick = initWorld;
  $select.onchange = () => {
    rule = rules[$select.options[$select.selectedIndex].value];
    initWorld();
  };

  initWorld();

  // main loop
  setInterval(() => {
    const n = new Uint32Array(b);

    let [dead, alive, changed] = [0, 0, 0];
    let hash = 0;

    COLOR_ALIVE = c.get();

    for (let i = 0, x = 0; x < WIDTH; ++x) {
      for (let y = 0; y < HEIGHT; ++y) {
        const offsetT = i - WIDTH < 0 ? WIDTH * (HEIGHT - 1) : -WIDTH;
        const offsetB = i + WIDTH >= TOTAL ? -WIDTH * (HEIGHT - 1) : WIDTH;
        const offsetL = i % WIDTH === 0 ? WIDTH - 1 : -1;
        const offsetR = i % WIDTH === WIDTH - 1 ? -WIDTH + 1 : 1;

        const tl = b[i + offsetT + offsetL] === COLOR_DEAD ? 0 : 1;
        const tm = b[i + offsetT] === COLOR_DEAD ? 0 : 1;
        const tr = b[i + offsetT + offsetR] === COLOR_DEAD ? 0 : 1;
        const ml = b[i + offsetL] === COLOR_DEAD ? 0 : 1;
        const mr = b[i + offsetR] === COLOR_DEAD ? 0 : 1;
        const bl = b[i + offsetB + offsetL] === COLOR_DEAD ? 0 : 1;
        const bm = b[i + offsetB] === COLOR_DEAD ? 0 : 1;
        const br = b[i + offsetB + offsetR] === COLOR_DEAD ? 0 : 1;

        const sum = tl + tm + tr + ml + mr + bl + bm + br;

        const oldStatus = b[i] !== COLOR_DEAD;
        const newStatus = rule.getStatus(oldStatus, sum);

        if (newStatus !== oldStatus) {
          ++changed;
          n[i] = newStatus ? COLOR_ALIVE : COLOR_DEAD;
        }

        hash += newStatus << i;
        newStatus ? ++dead : ++alive;
        ++i;
      }
    }

    if (!changed) {
      console.info("nothing changed");
      return initWorld();
    }

    if (h.has(hash)) {
      console.info("found dup in history");
      return initWorld();
    }

    b.set(n);
    a.play(changed);
    h.add(hash);
    w.putImageData(d, 0, 0);

    $info.textContent = `
      pixels: ${TOTAL} -
      fps: ${f.get()} -
      generation: ${++generation} -
      alive: ${alive} -
      dead: ${dead} -
      ratio: ${((alive / TOTAL) * 100) | 0} : ${((dead / TOTAL) * 100) | 0} -
      changed: ${changed}`;
  }, 0);
}
