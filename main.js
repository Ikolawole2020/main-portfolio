(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // ================= Topbar / Nav =================
    const menuBtn = $('#menu-icon');
    const nav = document.querySelector('.nav');

    const setAriaExpanded = (expanded) => {
        if (!menuBtn) return;
        menuBtn.setAttribute('aria-expanded', String(expanded));
    };

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('is-open');
            setAriaExpanded(isOpen);
        });

        // close on link click (mobile)
        $$('a.nav__link', nav).forEach((a) => {
            a.addEventListener('click', () => {
                nav.classList.remove('is-open');
                setAriaExpanded(false);
            });
        });
    }

    // Active link on scroll
    const sections = $$('section[id]');
    const navLinks = $$('.nav__link');

    const setActiveLink = (id) => {
        if (!id) return;
        navLinks.forEach((l) => {
            const match = l.getAttribute('href') === `#${id}`;
            l.classList.toggle('is-active', match);
        });
    };

    const updateScrollProgress = () => {
        const progress = document.querySelector('.scroll-progress');
        if (!progress) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const value = max > 0 ? (window.scrollY / max) * 100 : 0;
        progress.style.width = value + '%';
    };

    const onScroll = () => {
        const headerOffset = 120;
        let currentId = null;

        for (const sec of sections) {
            const top = sec.getBoundingClientRect().top;
            const absTop = sec.offsetTop;
            const height = sec.offsetHeight;
            const scrollY = window.scrollY;
            const offset = absTop - headerOffset;

            if (scrollY >= offset && scrollY < offset + height) {
                currentId = sec.id;
                break;
            }
        }

        setActiveLink(currentId);
        updateScrollProgress();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    updateScrollProgress();
    onScroll();

    // ================= ScrollReveal =================
    try {
        if (window.ScrollReveal) {
            ScrollReveal({ distance: '18px', duration: 800, delay: 120 });
            ScrollReveal().reveal('[data-reveal]', { interval: 90 });
        }
    } catch (_) { }

    // ================= Typed.js =================
    try {
        if (window.Typed) {
            new Typed('#typed-target', {
                strings: ['Frontend Developer', 'Flask Engineer', 'UI Architect'],
                typeSpeed: 55,
                backSpeed: 35,
                backDelay: 900,
                loop: true,
                smartBackspace: true
            });
        }
    } catch (_) { }

    // ================= Cursor glow =================
    const cursorGlow = document.querySelector('.cursor-glow');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (cursorGlow && !prefersReduced) {
        window.addEventListener('mousemove', (e) => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    }

    // ================= Hero stat counters =================
    const animateCount = (el, target, duration = 900) => {
        const start = performance.now();
        const from = 0;

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(from + (target - from) * eased);
            if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    };

    const countEls = $$('.stat__value[data-count]');
    if (countEls.length) {
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const el = entry.target;
                    const target = parseInt(el.getAttribute('data-count') || '0', 10);
                    animateCount(el, target, 900);
                    io.unobserve(el);
                }
            },
            { threshold: 0.35 }
        );
        countEls.forEach((el) => io.observe(el));
    }

    // ================= Neon Tic-Tac-Toe =================
    const boardEl = $('#ttt-board');
    const statusEl = $('#ttt-status');
    const restartBtn = $('#ttt-restart');
    const xScoreEl = $('#ttt-xscore');
    const oScoreEl = $('#ttt-oscore');
    const drawScoreEl = $('#ttt-drawscore');

    const segBtns = $$('[data-mode].seg__btn');
    const diffBtns = $$('[data-difficulty].seg__btn');


    const WIN_LINES = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    let mode = 'pvp'; // pvp | cpu
    let difficulty = 'easy'; // easy | medium | hard (only for cpu)
    let game = null;
    let cpuTimer = null;
    let scores = { x: 0, o: 0, d: 0 };

    const setScoresUI = () => {

        if (xScoreEl) xScoreEl.textContent = String(scores.x);
        if (oScoreEl) oScoreEl.textContent = String(scores.o);
        if (drawScoreEl) drawScoreEl.textContent = String(scores.d);
    };

    const computeWinner = (cells) => {
        for (const [a, b, c] of WIN_LINES) {
            if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
        }
        if (cells.every(Boolean)) return 'draw';
        return null;
    };

    const renderBoard = () => {
        if (!boardEl) return;
        boardEl.innerHTML = '';

        game.cells.forEach((v, idx) => {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'cell';
            cell.setAttribute('data-idx', String(idx));
            cell.setAttribute('aria-label', `Cell ${idx + 1}`);

            const isFilled = !!v;
            const disabled = game.over || isFilled || (game.turn === 'o' && mode === 'cpu');
            if (disabled) cell.classList.add('is-disabled');
            if (!game.over) cell.disabled = disabled;

            const mark = document.createElement('div');
            mark.className = 'cell__mark';
            if (v === 'x') mark.classList.add('cell__mark--x');
            if (v === 'o') mark.classList.add('cell__mark--o');
            mark.textContent = v ? v.toUpperCase() : '';

            cell.appendChild(mark);
            boardEl.appendChild(cell);
        });
    };

    const setStatus = (text) => {
        if (statusEl) statusEl.textContent = text;
    };

    const finalize = (result) => {
        game.over = true;

        if (result === 'x') {
            scores.x++;
            setStatus('X wins ✦ Restart to play again');
        } else if (result === 'o') {
            scores.o++;
            setStatus(mode === 'cpu' ? 'CPU (O) wins ✦ Restart' : 'O wins ✦ Restart to play again');
        } else if (result === 'draw') {
            scores.d++;
            setStatus('Draw ✦ Clean match');
        }

        setScoresUI();
        renderBoard();
    };

    const makeMove = (idx) => {
        if (!game || game.over) return;
        if (game.cells[idx]) return;

        // CPU guard
        if (mode === 'cpu' && game.turn === 'o') return;

        game.cells[idx] = game.turn;

        const res = computeWinner(game.cells);
        if (res) {
            finalize(res);
            return;
        }

        game.turn = game.turn === 'x' ? 'o' : 'x';
        renderBoard();

        // CPU response scheduling is fully handled by maybeCpuTurn().
        if (mode === 'cpu' && !game.over) {
            maybeCpuTurn();
        } else {
            clearCpuTimer();
            setStatus(game.turn === 'x' ? 'X to play' : 'O to play');
        }
    };


    const getAvailableMoves = (cells) => {
        const empties = [];
        for (let i = 0; i < 9; i++) if (!cells[i]) empties.push(i);
        return empties;
    };

    const cpuMoveEasy = () => {
        const cells = game.cells;
        const empties = getAvailableMoves(cells);
        if (!empties.length) return;
        const pick = empties[Math.floor(Math.random() * empties.length)];
        makeMove(pick);
    };

    const cpuMoveMedium = () => {
        // win > block > else random
        const cells = game.cells;
        const empties = getAvailableMoves(cells);
        const cpu = 'o';
        const human = 'x';

        const tryPlaceToWin = (player) => {
            for (const i of empties) {
                const test = cells.slice();
                test[i] = player;
                const res = computeWinner(test);
                if (res === player) return i;
            }
            return null;
        };

        let pick = tryPlaceToWin(cpu);
        if (pick === null) pick = tryPlaceToWin(human);
        if (pick === null) pick = empties[Math.floor(Math.random() * empties.length)];
        makeMove(pick);
    };

    const cpuMoveHard = () => {
        // Perfect play via minimax
        const cpu = 'o';
        const human = 'x';

        const minimax = (cells, turn) => {
            const res = computeWinner(cells);
            if (res) {
                // maximize cpu
                if (res === cpu) return { score: 10 };
                if (res === human) return { score: -10 };
                return { score: 0 };
            }

            const moves = getAvailableMoves(cells);

            if (turn === cpu) {
                let bestScore = -Infinity;
                let bestMove = moves[0];

                for (const idx of moves) {
                    const next = cells.slice();
                    next[idx] = cpu;
                    const { score } = minimax(next, human);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = idx;
                    }
                }

                return { score: bestScore, move: bestMove };
            } else {
                let bestScore = Infinity;
                let bestMove = moves[0];

                for (const idx of moves) {
                    const next = cells.slice();
                    next[idx] = human;
                    const { score } = minimax(next, cpu);
                    if (score < bestScore) {
                        bestScore = score;
                        bestMove = idx;
                    }
                }

                return { score: bestScore, move: bestMove };
            }
        };

        const { move } = minimax(game.cells.slice(), 'o');
        if (typeof move === 'number') makeMove(move);
    };

    const cpuMove = () => {
        if (!game || game.over) return;
        if (difficulty === 'hard') return cpuMoveHard();
        if (difficulty === 'medium') return cpuMoveMedium();
        return cpuMoveEasy();
    };


    const clearCpuTimer = () => {
        if (cpuTimer) {
            clearTimeout(cpuTimer);
            cpuTimer = null;
        }
    };

    const maybeCpuTurn = () => {
        if (!game || game.over) return;
        if (mode !== 'cpu') return;
        if (game.turn !== 'o') return;

        clearCpuTimer();
        setStatus('CPU thinking…');
        cpuTimer = setTimeout(() => {
            if (!game || game.over) return;
            cpuMove();
        }, 0);
    };

    const newGame = () => {
        clearCpuTimer();
        game = {
            cells: Array(9).fill(null),
            turn: 'x',
            over: false
        };

        setStatus('X to play');
        renderBoard();

        // If CPU should start (future-proof), ensure it plays
        maybeCpuTurn();
    };


    if (boardEl) {
        boardEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.cell');
            if (!btn || !boardEl.contains(btn)) return;
            const idx = parseInt(btn.getAttribute('data-idx') || '-1', 10);
            if (Number.isNaN(idx) || idx < 0) return;
            makeMove(idx);
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // keep scores, restart match
            newGame();
        });
    }

    // Mode switch
    segBtns.forEach((b) => {
        b.addEventListener('click', () => {
            segBtns.forEach((x) => x.classList.remove('is-active'));
            b.classList.add('is-active');

            const nextMode = b.getAttribute('data-mode');
            mode = nextMode === 'cpu' ? 'cpu' : 'pvp';

            // reset current match (keep score)
            newGame();
            setStatus(mode === 'cpu' ? `X to play (CPU is O · ${difficulty})` : 'X to play');
        });
    });

    // Difficulty switch (only meaningful in cpu mode)
    diffBtns.forEach((b) => {
        b.addEventListener('click', () => {
            diffBtns.forEach((x) => x.classList.remove('is-active'));
            b.classList.add('is-active');

            difficulty = b.getAttribute('data-difficulty') || 'easy';

            // restart current match so the new AI strength applies immediately
            newGame();
            setStatus(mode === 'cpu' ? `X to play (CPU is O · ${difficulty})` : 'X to play');
        });
    });


    // Init
    setScoresUI();
    newGame();

    // Footer year
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
})();

