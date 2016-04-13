!function () {
    "use strict";

    var rules = {
        // eine Welt, in der ein sich ausbreitendes, labyrinthartiges Muster entsteht
        "12345/3": {
            size: 2,
            random: 9.9,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = "12345".indexOf(sum) !== -1 ? 1 : 0;
                } else if (oldStatus === 0 && sum === 3) {
                    status = 1;
                }

                return status;
            }
        },
        // Conways Original-Game of Life
        "23/3": {
            size: 2,
            random: 9,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = sum === 2 || sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && sum === 3) {
                    status = 1;
                }

                return status;
            }
        },
        // ein Kopiersystem, wobei sich aus einfachen kleinen Strukturen komplexe Muster entwickeln können
        "1357/1357": {
            size: 2,
            random: 9.999,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = sum % 2 === 1 ? 1 : 0;
                } else if (oldStatus === 0 && sum % 2 === 1) {
                    status = 1;
                }

                return status;
            }
        },

        "01234678/0123478": {
            size: 2,
            random: 2,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = "01234678".indexOf(sum) !== -1 ? 1 : 0;
                } else if (oldStatus === 0 && "0123478".indexOf(sum) !== -1) {
                    status = 1;
                }

                return status;
            }
        },

        "3/245": {
            size: 2,
            random: 0.4,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && "245".indexOf(sum) !== -1) {
                    status = 1;
                }

                return status;
            }
        },

        "23/346": {
            size: 2,
            random: 0.7,
            getStatus: function (sum, oldStatus) {
                let status = oldStatus;

                if (oldStatus === 1) {
                    status = sum === 2 || sum === 3 ? 1 : 0;
                } else if (oldStatus === 0 && "346".indexOf(sum) !== -1) {
                    status = 1;
                }

                return status;
            }
        }
    };

    // init
    var   rule    = rules["12345/3"];
    const size    = rule.size;
    const width   = Math.floor(1400 / size);
    const height  = Math.floor(700  / size);
    const pixels  = width * height;
    const cDead   = "#eeeeee";
    var   cAlive  = "#555555";


    const bh = height - 1;
    const bw = width  - 1;

    const dots = new Array(width);

    let generation  = 0;

    const options = Object.keys(rules).map(function (key) {
        return '<option value="' + key + '">' + key + '</option>';
    });

    document.body.innerHTML =
        'rule <select id="rules">' + options + '</select> <button id="reset">reset</button> <span id="info">-</span><br><br>' +
        '<canvas id="world" width="' + width * size + '" height="' + height * size + '" style="border: 1px solid #999"></canvas>'
    ;

    const select = document.getElementById("rules");
    const reset  = document.getElementById("reset");
    const info   = document.getElementById("info");
    const world  = document.getElementById("world").getContext("2d");

    select.onchange = function () {
        rule = rules[select.options[select.selectedIndex].value];
        initWorld();
    };

    reset.onclick = initWorld;

    // draw dot
    function draw(world, x, y, status) {
        world.fillStyle = status ? cAlive : cDead;
        world.fillRect(x * size, y * size, size, size);

        return status;
    }

    // init world with random dots
    function initWorld() {
        generation  = 0;

        world.fillStyle = cDead;
        world.fillRect(0, 0, width * size, height * size);

        for (let x = 0; x < width; ++x) {
            const row = new Array(height);

            for (let y = 0; y < height; ++y) {
                row[y] = Math.random() * 10 > rule.random ? draw(world, x, y, 1) : 0;
            }

            dots[x] = row;
        }
    }

    initWorld();

    let fps  = "", step = generation;

    // calc fps
    setInterval(function () {
        fps  = generation - step;
        step = generation;
    }, 1000);


    !function () {
        let c = 0;
        const freq = Math.PI / 2 / 50;

        function changeColor() {
            var r = Math.abs(Math.round(Math.sin(freq * c + 2) * 255));
            var g = Math.abs(Math.round(Math.sin(freq * c)     * 255));
            var b = Math.abs(Math.round(Math.sin(freq * c + 4) * 255));

            cAlive = "rgb(" + r + "," + g  + "," + b + ")";

            c += 1;
        }

        // colors
        setInterval(changeColor, 100);

        changeColor();
    }();


    // main loop
    setInterval(function () {
        const next  = new Array(width);
        var dead    = 0;
        var alive   = 0;
        var changed = 0;
        let x, y;

        for (x = 0; x < width; ++x) {
            const row = new Array(height);

            for (y = 0; y < height; ++y) {
                const t = x == 0  ? bw : x - 1;
                const b = x == bw ? 0  : x + 1;
                const l = y == 0  ? bh : y - 1;
                const r = y == bh ? 0  : y + 1;

                const tl = dots[t][l];
                const tm = dots[t][y];
                const tr = dots[t][r];

                const ml = dots[x][l];
                const mr = dots[x][r];

                const bl = dots[b][l];
                const bm = dots[b][y];
                const br = dots[b][r];

                // calc surroundings
                const sum =
                    tl + tm + tr +
                    ml + mr +
                    bl + bm + br
                ;

                const oldStatus = dots[x][y];
                const status    = rule.getStatus(sum, oldStatus);

                // only draw if status has changed
                if (oldStatus != status) {
                    draw(world, x, y, status);
                    ++changed;
                }

                status ? ++dead : ++alive;

                row[y] = status;
            }

            next[x] = row;
        }

        // copy array
        for (x = 0; x < width; ++x) {
            dots[x] = next[x].slice();
        }

        info.innerHTML =
            "pixels: "          + pixels +
            " - fps: "          + fps +
            " - generation: "   + ++generation +
            " - alive: "        + alive +
            " - dead: "         + dead +
            " - ratio: "        + Math.round(alive / pixels * 100) + ":" + Math.round(dead / pixels * 100) +
            " - changed: "      + changed
        ;
    }, 1);
}()
