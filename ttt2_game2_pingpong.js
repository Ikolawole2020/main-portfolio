// Neon Ping-Pong (Game2) module
(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const canvas = $('#pp2-canvas');
    const statusEl = $('#pp2-status');
    const restartBtn = $('#pp2-restart');
    const scoreLeftEl = $('#pp2-leftscore');
    const scoreRightEl = $('#pp2-rightscore');

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Mode: pvp | cpu
    const modeBtns = $$('[data-pp2-mode].seg__btn');
    const setModeUI = (m) => {
        modeBtns.forEach((b) => {
            const active = b.getAttribute('data-pp2-mode') === m;
            b.classList.toggle('is-active', active);
        });
    };

    let mode = 'cpu';
    modeBtns.forEach((b) => {
        b.addEventListener('click', () => {
            mode = b.getAttribute('data-pp2-mode') || 'cpu';
            setModeUI(mode);
            resetRound(true);
        });
    });

    // Controls
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) e.preventDefault();
        keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => {
        keys.delete(e.key);
    });

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 800;
    let H = 420;

    const resize = () => {
        const rect = canvas.getBoundingClientRect();
        W = Math.max(320, Math.floor(rect.width));
        H = Math.max(220, Math.floor(rect.height));
        canvas.width = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    window.addEventListener('resize', () => {
        resize();
        draw();
    });

    const randRange = (a, b) => a + Math.random() * (b - a);

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // Game constants
    const paddle = {
        w: 16,
        h: 92,
        speed: 420,
        marginX: 28
    };

    const ball = {
        r: 8,
        vx: 240,
        vy: 160,
        speedUpPerScore: 14
    };

    const targetScore = 7;

    let scores = { left: 0, right: 0 };

    let leftPaddleY = 0;
    let rightPaddleY = 0;

    let round = 1;
    let over = false;

    let ballX = 0;
    let ballY = 0;
    let ballVX = 0;
    let ballVY = 0;

    let lastT = 0;
    let raf = null;

    const resetRound = (keepScores = false) => {
        over = false;
        round++;
        if (!keepScores) scores = { left: 0, right: 0 };

        leftPaddleY = H / 2 - paddle.h / 2;
        rightPaddleY = H / 2 - paddle.h / 2;

        ballX = W / 2;
        ballY = H / 2;

        // Random initial direction
        const dir = Math.random() < 0.5 ? -1 : 1;
        const angle = randRange(-Math.PI / 6, Math.PI / 6);
        const speed = randRange(260, 320);

        ballVX = dir * speed * Math.cos(angle);
        ballVY = speed * Math.sin(angle);

        if (statusEl) {
            statusEl.textContent = mode === 'cpu' ? 'You: Left Paddle' : 'PVP: Left/Right paddles';
        }

        if (scoreLeftEl) scoreLeftEl.textContent = String(scores.left);
        if (scoreRightEl) scoreRightEl.textContent = String(scores.right);

        if (restartBtn) restartBtn.textContent = 'Restart';
        lastT = performance.now();
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
    };

    const updateScores = () => {
        if (scoreLeftEl) scoreLeftEl.textContent = String(scores.left);
        if (scoreRightEl) scoreRightEl.textContent = String(scores.right);

        if (scores.left >= targetScore || scores.right >= targetScore) {
            over = true;
            if (statusEl) {
                const winner = scores.left >= targetScore ? 'LEFT wins ✦' : 'RIGHT wins ✦';
                const isCpu = mode === 'cpu';
                const msg = isCpu
                    ? (scores.left >= targetScore ? 'You win ✦' : 'CPU wins ✦')
                    : `${winner}`;
                statusEl.textContent = msg + ' Restart to play again.';
            }
            if (restartBtn) restartBtn.disabled = false;
            return true;
        }
        return false;
    };

    const aiMove = (dt) => {
        // Predict ball intersection with the right wall (simple)
        const paddleX = W - paddle.marginX - paddle.w;
        const timeToWall = (paddleX - ballX) / ballVX;
        const targetY = timeToWall > 0 ? ballY + ballVY * timeToWall : H / 2;

        // Reflect within top/bottom bounds
        const top = 0;
        const bottom = H;
        let y = targetY;
        const travel = bottom - top;
        if (travel > 0) {
            y = ((y - top) % (2 * travel) + 2 * travel) % (2 * travel) + top;
            if (y > bottom) y = 2 * bottom - y;
        }

        const desired = clamp(y - paddle.h / 2, 0, H - paddle.h);

        // Difficulty scaling with some reaction delay illusion
        const difficulty = 0.92; // 0..1 higher is faster
        const follow = (desired - rightPaddleY) * (dt * 9.5) * difficulty;

        rightPaddleY = clamp(rightPaddleY + follow, 0, H - paddle.h);
    };

    const readPvpInputs = (dt) => {
        const up1 = keys.has('w') || keys.has('W');
        const down1 = keys.has('s') || keys.has('S');
        const up2 = keys.has('ArrowUp');
        const down2 = keys.has('ArrowDown');

        const vLeft = (down1 ? 1 : 0) - (up1 ? 1 : 0);
        const vRight = (down2 ? 1 : 0) - (up2 ? 1 : 0);

        leftPaddleY = clamp(leftPaddleY + vLeft * paddle.speed * dt, 0, H - paddle.h);
        rightPaddleY = clamp(rightPaddleY + vRight * paddle.speed * dt, 0, H - paddle.h);
    };

    const readCpuInputs = (dt) => {
        const up1 = keys.has('w') || keys.has('W');
        const down1 = keys.has('s') || keys.has('S');
        const vLeft = (down1 ? 1 : 0) - (up1 ? 1 : 0);
        leftPaddleY = clamp(leftPaddleY + vLeft * paddle.speed * dt, 0, H - paddle.h);
        aiMove(dt);
    };

    const drawGlowRect = (x, y, w, h, color) => {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.20)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.restore();
    };

    const draw = () => {
        // Background
        ctx.clearRect(0, 0, W, H);

        // Net / mid line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 10);
        ctx.lineTo(W / 2, H - 10);
        ctx.stroke();
        ctx.restore();

        // Court glow border
        ctx.save();
        ctx.strokeStyle = 'rgba(0,229,255,0.22)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0,229,255,0.35)';
        ctx.shadowBlur = 18;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.restore();

        // Paddles
        const leftX = paddle.marginX;
        const rightX = W - paddle.marginX - paddle.w;

        drawGlowRect(leftX, leftPaddleY, paddle.w, paddle.h, 'rgba(0,229,255,0.30)');
        drawGlowRect(rightX, rightPaddleY, paddle.w, paddle.h, 'rgba(168,85,247,0.30)');

        // Ball
        ctx.save();
        ctx.shadowColor = 'rgba(255,45,149,0.55)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = 'rgba(255,45,149,0.82)';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Small highlight
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.arc(ballX - ball.r * 0.25, ballY - ball.r * 0.25, ball.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const resetBallAfterPoint = (scorer) => {
        if (scorer === 'left') scores.left++;
        else scores.right++;

        const done = updateScores();
        if (done) return;

        // Serve
        leftPaddleY = H / 2 - paddle.h / 2;
        rightPaddleY = H / 2 - paddle.h / 2;

        ballX = W / 2;
        ballY = H / 2;

        const dir = scorer === 'left' ? 1 : -1;
        const angle = randRange(-Math.PI / 6, Math.PI / 6);
        const base = randRange(260, 320) + (Math.max(scores.left, scores.right) * ball.speedUpPerScore);
        ballVX = dir * base * Math.cos(angle);
        ballVY = base * Math.sin(angle);
    };

    const handleCollisions = () => {
        const leftX = paddle.marginX;
        const rightX = W - paddle.marginX - paddle.w;

        // Paddle AABB
        const ballLeft = ballX - ball.r;
        const ballRight = ballX + ball.r;
        const ballTop = ballY - ball.r;
        const ballBottom = ballY + ball.r;

        // Top/bottom walls
        if (ballTop <= 0) {
            ballY = ball.r;
            ballVY *= -1;
        } else if (ballBottom >= H) {
            ballY = H - ball.r;
            ballVY *= -1;
        }

        // Left paddle
        if (ballVX < 0 && ballLeft <= leftX + paddle.w) {
            const withinY = ballBottom >= leftPaddleY && ballTop <= leftPaddleY + paddle.h;
            if (withinY) {
                ballX = leftX + paddle.w + ball.r;
                const rel = (ballY - (leftPaddleY + paddle.h / 2)) / (paddle.h / 2);
                const bounce = clamp(rel, -1, 1);
                const speed = Math.hypot(ballVX, ballVY) * 1.03;
                ballVX = Math.abs(speed * (0.85 + 0.2 * Math.random()));
                ballVY = speed * bounce * 0.80;
            }
        }

        // Right paddle
        if (ballVX > 0 && ballRight >= rightX) {
            const withinY = ballBottom >= rightPaddleY && ballTop <= rightPaddleY + paddle.h;
            if (withinY) {
                ballX = rightX - ball.r;
                const rel = (ballY - (rightPaddleY + paddle.h / 2)) / (paddle.h / 2);
                const bounce = clamp(rel, -1, 1);
                const speed = Math.hypot(ballVX, ballVY) * 1.03;
                ballVX = -Math.abs(speed * (0.85 + 0.2 * Math.random()));
                ballVY = speed * bounce * 0.80;
            }
        }

        // Points
        if (ballX + ball.r < 0) {
            resetBallAfterPoint('right');
        } else if (ballX - ball.r > W) {
            resetBallAfterPoint('left');
        }
    };

    const tick = (t) => {
        const dt = Math.min(0.03, (t - lastT) / 1000);
        lastT = t;

        if (!over) {
            if (mode === 'pvp') readPvpInputs(dt);
            else readCpuInputs(dt);

            ballX += ballVX * dt;
            ballY += ballVY * dt;

            handleCollisions();

            // Prevent runaway speed
            const maxSpeed = 820;
            const sp = Math.hypot(ballVX, ballVY);
            if (sp > maxSpeed) {
                const s = maxSpeed / sp;
                ballVX *= s;
                ballVY *= s;
            }
        }

        draw();
        raf = requestAnimationFrame(tick);
    };

    if (restartBtn) {
        restartBtn.addEventListener('click', () => resetRound(false));
    }

    // Boot
    const boot = () => {
        resize();
        setModeUI(mode);
        resetRound(false);
    };

    boot();
})();

