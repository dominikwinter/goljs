{
    const rules = {
        "12345/3": {
            density: 0.1,
            getStatus: (sum, status) => {
                if (status) return "12345".includes(sum);
                if (sum === 3) return true;
                return status;
            },
        },
        "01234678/0123478": {
            density: 8,
            getStatus: (sum, status) => {
                if (status) return "01234678".includes(sum);
                if ("0123478".includes(sum)) return true;
                return status;
            },
        },
        "123/1": {
            density: 0.00001,
            getStatus: (sum, status) => {
                if (status) return "123".includes(sum);
                if ("1".includes(sum)) return true;
                return status;
            },
        },
        "1357/1357": {
            density: 0.001,
            getStatus: (sum, status) => {
                if (status) return sum % 2 === 1;
                if (sum % 2 === 1) return true;
                return status;
            },
        },
        "23/3 (Conway's Original-Game of Life)": {
            density: 1,
            getStatus: (sum, status) => {
                if (status) return sum === 2 || sum === 3;
                if (sum === 3) return true;
                return status;
            },
        },
        "23/346": {
            density: 9.3,
            getStatus: (sum, status) => {
                if (status) return sum === 2 || sum === 3;
                if ("346".includes(sum)) return true;
                return status;
            },
        },
        "3/245": {
            density: 9.6,
            getStatus: (sum, status) => {
                if (status) return sum === 3;
                if ("245".includes(sum)) return true;
                return status;
            },
        },
    };

    // init
    const WIDTH = 700;
    const HEIGHT = 500;
    const TOTAL = WIDTH * HEIGHT;

    const cDead = 0xff_ee_ee_ee;
    let cAlive = 0xff_c1_00_e8;
    let rule = rules["12345/3"];
    let generation = 0;
    let step = generation;

    const options = Object.keys(rules).map((key) => `<option value="${key}">${key}</option>`);

    document.body.innerHTML = `
        rule <select id="rules" name="rules" title="rules">${options}</select>
        <button id="reset" name="reset" title="reset" type="button">reset</button> <span id="info">-</span><br><br>
        <canvas
            id="world"
            width="${WIDTH}"
            height="${HEIGHT}"
            style="border: 1px solid #999 width:${(WIDTH * 1.5) | 0}px; height:${(HEIGHT * 1.5) | 0}px;"></canvas>
    `;

    const $select = document.getElementById("rules");
    const $reset = document.getElementById("reset");
    const $info = document.getElementById("info");
    const world = document.getElementById("world").getContext("2d");
    const data = world.createImageData(WIDTH, HEIGHT);
    const buffer = new Uint32Array(data.data.buffer);

    // init world with random dots
    const initWorld = () => {
        generation = 0;
        step = 0;

        for (let i = 0, x = 0; x < WIDTH; ++x) {
            for (let y = 0; y < HEIGHT; ++y) {
                buffer[i++] = Math.random() * 10 < rule.density ? cAlive : cDead;
            }
        }

        world.putImageData(data, 0, 0);
    };

    $reset.onclick = initWorld;
    $select.onchange = () => {
        rule = rules[$select.options[$select.selectedIndex].value];
        initWorld();
    };

    initWorld();

    // calc fps
    let fps = "";
    {
        setInterval(() => {
            fps = generation - step;
            step = generation;
        }, 1000);
    }

    const FREQ = Math.PI / 2 / 50;
    let l = 0;
    let c = 0;

    // when for a longer times nothing changed, then reset the world with initWorld()
    const changedHistory = [];

    // main loop
    setInterval(() => {
        // change fancy colors
        if (l % 10 === 0) {
            const r = Math.abs((Math.sin(FREQ * c + 0) * 220) | 0);
            const g = Math.abs((Math.sin(FREQ * c + 2) * 220) | 0);
            const b = Math.abs((Math.sin(FREQ * c + 4) * 220) | 0);

            cAlive = (0xff << 24) | (b << 16) | (g << 8) | r;

            ++c;
        }

        let dead = 0;
        let alive = 0;
        let changed = 0;

        const next = new Uint32Array(buffer);

        for (let i = 0, x = 0; x < WIDTH; ++x) {
            for (let y = 0; y < HEIGHT; ++y) {
                const offsetT = i - WIDTH < 0 ? WIDTH * (HEIGHT - 1) : -WIDTH;
                const offsetB = i + WIDTH >= TOTAL ? -WIDTH * (HEIGHT - 1) : WIDTH;
                const offsetL = i % WIDTH === 0 ? WIDTH - 1 : -1;
                const offsetR = i % WIDTH === WIDTH - 1 ? -WIDTH + 1 : 1;

                const tl = buffer[i + offsetT + offsetL] === cDead ? 0 : 1;
                const tm = buffer[i + offsetT] === cDead ? 0 : 1;
                const tr = buffer[i + offsetT + offsetR] === cDead ? 0 : 1;
                const ml = buffer[i + offsetL] === cDead ? 0 : 1;
                const mr = buffer[i + offsetR] === cDead ? 0 : 1;
                const bl = buffer[i + offsetB + offsetL] === cDead ? 0 : 1;
                const bm = buffer[i + offsetB] === cDead ? 0 : 1;
                const br = buffer[i + offsetB + offsetR] === cDead ? 0 : 1;

                const sum = tl + tm + tr + ml + mr + bl + bm + br;

                const oldStatus = buffer[i] !== cDead;
                const newStatus = rule.getStatus(sum, oldStatus);

                if (newStatus !== oldStatus) {
                    ++changed;
                    next[i] = newStatus ? cAlive : cDead;
                }

                if (newStatus) {
                    ++dead;
                } else {
                    ++alive;
                }

                ++i;
            }
        }

        buffer.set(next);

        if (!changed) return initWorld();

        if (changedHistory.length > 100) {
            if (changedHistory.every((c) => c === changed)) return initWorld();
            changedHistory.shift();
        }

        changedHistory.push(changed);

        world.putImageData(data, 0, 0);

        $info.textContent = `
            pixels: ${TOTAL} -
            fps: ${fps} -
            generation: ${++generation} -
            alive: ${alive} -
            dead: ${dead} -
            ratio: ${Math.round((alive / TOTAL) * 100)} : ${Math.round((dead / TOTAL) * 100)} -
            changed: ${changed}
        `;

        ++l;
    }, 0);
}
