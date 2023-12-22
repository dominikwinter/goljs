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
    const size = rule.size;
    const width = Math.floor(1400 / size);
    const height = Math.floor(700 / size);
    const pixels = width * height;
    const cDead = "#eee";
    let cAlive = "rgb(232, 0, 193)";

    const bh = height - 1;
    const bw = width - 1;

    const dots = new Array(width);

    let generation = 0;

    const options = Object.keys(rules).map((key) => `<option value="${key}">${key}</option>`);

    document.body.innerHTML = `
        rule <select id="rules" name="rules" title="rules">${options}</select>
        <button id="reset" name="reset" title="reset" type="button">reset</button> <span id="info">-</span><br><br>
        <canvas
            id="world"
            width="${width * size}"
            height="${height * size}"
            style="border: 1px solid #999"></canvas>
    `;

    const select = document.getElementById("rules");
    const reset = document.getElementById("reset");
    const info = document.getElementById("info");
    const world = document.getElementById("world").getContext("2d");

    select.onchange = () => {
        rule = rules[select.options[select.selectedIndex].value];
        initWorld();
    };

    // init world with random dots
    const initWorld = () => {
        generation = 0;

        world.fillStyle = cDead;
        world.fillRect(0, 0, width * size, height * size);

        for (let x = 0; x < width; ++x) {
            const row = new Uint8Array(height);

            for (let y = 0; y < height; ++y) {
                row[y] = Math.random() * 10 > rule.random ? draw(world, x, y, 1) : 0;
            }

            dots[x] = row;
        }
    };

    reset.onclick = initWorld;

    // draw dot
    const draw = (world, x, y, status) => {
        world.fillStyle = status ? cAlive : cDead;
        world.fillRect(x * size, y * size, size, size);
        // world.beginPath();
        // world.rect(x * size, y * size, size, size);
        // world.fill();

        return status;
    };

    initWorld();

    let fps = "",
        step = generation;

    // calc fps
    setInterval(() => {
        fps = generation - step;
        step = generation;
    }, 1000);

    // change fancy colors
    {
        let c = 0;
        const freq = Math.PI / 2 / 50;

        setInterval(() => {
            const r = Math.abs(Math.round(Math.sin(freq * c + 2) * 255));
            const g = Math.abs(Math.round(Math.sin(freq * c) * 255));
            const b = Math.abs(Math.round(Math.sin(freq * c + 4) * 255));

            cAlive = `rgb(${r},${g},${b})`;

            ++c;
        }, 100);
    }

    // main loop
    setInterval(() => {
        const next = new Array(width);
        let dead = 0;
        let alive = 0;
        let changed = 0;
        let x, y;

        for (x = 0; x < width; ++x) {
            const row = new Uint8Array(height);

            for (y = 0; y < height; ++y) {
                const t = x == 0 ? bw : x - 1;
                const b = x == bw ? 0 : x + 1;
                const l = y == 0 ? bh : y - 1;
                const r = y == bh ? 0 : y + 1;

                const tl = dots[t][l];
                const tm = dots[t][y];
                const tr = dots[t][r];

                const ml = dots[x][l];
                const mr = dots[x][r];

                const bl = dots[b][l];
                const bm = dots[b][y];
                const br = dots[b][r];

                // calc surroundings
                const sum = tl + tm + tr + ml + mr + bl + bm + br;
                const oldStatus = dots[x][y];
                const status = rule.getStatus(sum, oldStatus);

                // only draw if status has changed
                if (oldStatus != status) {
                    draw(world, x, y, status);
                    ++changed;
                }

                if (status) {
                    ++dead;
                } else {
                    ++alive;
                }

                row[y] = status;
            }

            next[x] = row;
        }

        // copy arrays
        for (x = 0; x < width; ++x) {
            dots[x] = new Uint8Array(next[x]);
            // dots[x] = next[x].slice(0);
            // dots[x] = next[x].slice();
            // dots[x] = [...next[x]];
        }

        info.textContent = `
            pixels: ${pixels} -
            fps: ${fps} -
            generation: ${++generation} -
            alive: ${alive} -
            dead: ${dead} -
            ratio: ${Math.round((alive / pixels) * 100)} : ${Math.round((dead / pixels) * 100)} -
            changed: ${changed}
        `;
    }, 0);
}
