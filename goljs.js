let aa = 0;
{
    const rules = {
        // eine Welt, in der ein sich ausbreitendes, labyrinthartiges Muster entsteht
        "12345/3": {
            size: 2,
            random: 9.9,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return "12345".includes(sum) ? 1 : 0;
                } else if (oldStatus === 0 && sum === 3) {
                    return 1;
                }

                return oldStatus;
            },
        },
        // Conways Original-Game of Life
        "23/3": {
            size: 2,
            random: 9,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return sum === 2 || sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && sum === 3) {
                    return 1;
                }

                return oldStatus;
            },
        },
        // ein Kopiersystem, wobei sich aus einfachen kleinen Strukturen komplexe Muster entwickeln können
        "1357/1357": {
            size: 2,
            random: 9.999,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return sum % 2 === 1 ? 1 : 0;
                } else if (oldStatus === 0 && sum % 2 === 1) {
                    return 1;
                }

                return oldStatus;
            },
        },

        "01234678/0123478": {
            size: 2,
            random: 2,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return "01234678".includes(sum) ? 1 : 0;
                } else if (oldStatus === 0 && "0123478".indexOf(sum) !== -1) {
                    return 1;
                }

                return oldStatus;
            },
        },

        "3/245": {
            size: 2,
            random: 0.4,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && "245".includes(sum)) {
                    return 1;
                }

                return oldStatus;
            },
        },

        "23/346": {
            size: 2,
            random: 0.7,
            getStatus: (sum, oldStatus) => {
                if (oldStatus === 1) {
                    return sum === 2 || sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && "346".includes(sum)) {
                    return 1;
                }

                return oldStatus;
            },
        },
    };

    // init
    let rule = rules["12345/3"];
    const width = 1000;
    const height = 500;
    const total = width * height;
    const pixels = width * height;
    const cDead = 0xff_ee_ee_ee;
    let cAlive = 0xff_c1_00_e8;
    let generation = 0;

    const options = Object.keys(rules).map((key) => `<option value="${key}">${key}</option>`);

    document.body.innerHTML = `
        rule <select id="rules" name="rules" title="rules">${options}</select>
        <button id="reset" name="reset" title="reset" type="button">reset</button> <span id="info">-</span><br><br>
        <canvas
            id="world"
            width="${width}"
            height="${height}"
            style="border: 1px solid #999 width:${(width * 1.5) | 0}px; height:${(height * 1.5) | 0}px;"></canvas>
    `;

    const select = document.getElementById("rules");
    const reset = document.getElementById("reset");
    const info = document.getElementById("info");
    const world = document.getElementById("world").getContext("2d");
    const data = world.createImageData(width, height);
    const buffer = new Uint32Array(data.data.buffer);

    // init world with random dots
    const initWorld = () => {
        generation = 0;
        let i = 0;
        for (let x = 0; x < width; ++x) {
            for (let y = 0; y < height; ++y) {
                buffer[i++] = Math.random() * 10 > rule.random ? cAlive : cDead;
            }
        }
        world.putImageData(data, 0, 0);
    };

    reset.onclick = initWorld;

    select.onchange = () => {
        rule = rules[select.options[select.selectedIndex].value];
        initWorld();
    };

    initWorld();

    let fps = "";
    let step = generation;

    // calc fps
    setInterval(() => {
        fps = generation - step;
        step = generation;
    }, 1000);

    // change fancy colors
    {
        const FREQ = Math.PI / 2 / 50;
        let c = 0;

        setInterval(() => {
            const r = Math.abs((Math.sin(FREQ * c + 2) * 255) | 0);
            const g = Math.abs((Math.sin(FREQ * c + 0) * 255) | 0);
            const b = Math.abs((Math.sin(FREQ * c + 4) * 255) | 0);

            cAlive = (0xff << 24) | (b << 16) | (g << 8) | r;

            ++c;
        }, 100);
    }

    // main loop
    setInterval(() => {
        const next = new Uint32Array(buffer);
        let dead = 0;
        let alive = 0;
        let changed = 0;
        let i = 0;

        for (let x = 0; x < width; ++x) {
            for (let y = 0; y < height; ++y) {
                const offsetT = i - width < 0 ? width * (height - 1) : -width;
                const offsetB = i + width >= total ? -width * (height - 1) : width;
                const offsetL = i % width === 0 ? width - 1 : -1;
                const offsetR = i % width === width - 1 ? -width + 1 : 1;

                const tl = buffer[i + offsetT + offsetL] === cDead ? 0 : 1;
                const tm = buffer[i + offsetT] === cDead ? 0 : 1;
                const tr = buffer[i + offsetT + offsetR] === cDead ? 0 : 1;
                const ml = buffer[i + offsetL] === cDead ? 0 : 1;
                const mr = buffer[i + offsetR] === cDead ? 0 : 1;
                const bl = buffer[i + offsetB + offsetL] === cDead ? 0 : 1;
                const bm = buffer[i + offsetB] === cDead ? 0 : 1;
                const br = buffer[i + offsetB + offsetR] === cDead ? 0 : 1;

                const sum = tl + tm + tr + ml + mr + bl + bm + br;

                const oldStatus = buffer[i] === cDead ? 0 : 1;
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

        // replace buffer with next generation
        buffer.set(next);
        world.putImageData(data, 0, 0);

        info.textContent = `
            pixels: ${pixels} -
            fps: ${fps} -
            generation: ${++generation} -
            alive: ${alive} -
            dead: ${dead} -
            ratio: ${Math.round((alive / pixels) * 100)} : ${Math.round((dead / pixels) * 100)} -
            changed: ${changed}
        `;
    }, 1);
}
