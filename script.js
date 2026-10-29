

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const zombieCountText = document.getElementById("zombieCount");
const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const powerText = document.getElementById("powerText");

const overlay = document.getElementById("overlay");
const titleText = document.getElementById("title");
const descriptionText = document.getElementById("description");
const startButton = document.getElementById("startButton");
const changeBackgroundButton = document.getElementById("changeBackground");



let W = window.innerWidth;
let H = window.innerHeight;

function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


let gameRunning = false;
let gameStarted = false;

let score = 0;
let bestScore = Number(localStorage.getItem("zombieTsunamiBest")) || 0;
let zombies = 1;
let coins = 0;

let worldSpeed = 4;
let worldDistance = 0;

let lastTime = 0;
let backgroundTimer = 0;

let currentBackground = 0;

let player = {
    x: 130,
    y: 0,
    width: 42,
    height: 58,
    velocityY: 0,
    gravity: 0.7,
    jumpPower: -15,
    grounded: false,
    rotation: 0
};

let obstacles = [];
let humans = [];
let coinItems = [];
let powerItems = [];
let particles = [];
let clouds = [];
let buildings = [];

let power = null;
let powerTimer = 0;
let invincibleTimer = 0;

let spawnObstacleTimer = 0;
let spawnHumanTimer = 0;
let spawnCoinTimer = 0;
let spawnPowerTimer = 0;

let gameOverReason = "";

// ==========================================
// BACKGROUND
// ==========================================

const backgrounds = [
    {
        name: "Kota Malam",
        sky: "#10152f",
        ground: "#252b43",
        building: "#343b5c",
        accent: "#f9d65c",
        cloud: "#d9e1ff"
    },
    {
        name: "Senja",
        sky: "#ff9466",
        ground: "#6e3d50",
        building: "#8a5061",
        accent: "#ffe08a",
        cloud: "#fff0d0"
    },
    {
        name: "Kota Siang",
        sky: "#6bc9ff",
        ground: "#559b4e",
        building: "#7d9eaf",
        accent: "#ffe45c",
        cloud: "#ffffff"
    },
    {
        name: "Hutan",
        sky: "#8cd9a5",
        ground: "#315d38",
        building: "#477c4d",
        accent: "#e7f59b",
        cloud: "#e5ffe7"
    },
    {
        name: "Kota Ungu",
        sky: "#4b2679",
        ground: "#292044",
        building: "#69489a",
        accent: "#ff83ed",
        cloud: "#e5c7ff"
    }
];

function changeBackground() {
    currentBackground = (currentBackground + 1) % backgrounds.length;
}

changeBackgroundButton.addEventListener("click", changeBackground);

// ==========================================
// UTILITAS
// ==========================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function groundY() {
    return H - Math.max(65, H * 0.14);
}

function rectangleCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function updateHUD() {
    zombieCountText.textContent = zombies;
    scoreText.textContent = Math.floor(score);
    bestText.textContent = bestScore;

    if (power) {
        powerText.textContent =
            "⚡ Power: " +
            (power === "giant" ? "GIANT" : "SHIELD") +
            " (" + Math.ceil(powerTimer / 60) + "s)";
    } else {
        powerText.textContent = "⚡ Power: -";
    }
}

// ==========================================
// RESET GAME
// ==========================================

function resetGame() {
    score = 0;
    zombies = 1;
    coins = 0;

    worldSpeed = 4;
    worldDistance = 0;

    obstacles = [];
    humans = [];
    coinItems = [];
    powerItems = [];
    particles = [];

    power = null;
    powerTimer = 0;
    invincibleTimer = 0;

    spawnObstacleTimer = 80;
    spawnHumanTimer = 100;
    spawnCoinTimer = 140;
    spawnPowerTimer = 600;

    backgroundTimer = 0;

    player.width = 42;
    player.height = 58;
    player.x = Math.min(130, W * 0.25);
    player.y = groundY() - player.height;
    player.velocityY = 0;
    player.grounded = true;
    player.rotation = 0;

    createScenery();

    updateHUD();
}

// ==========================================
// PEMANDANGAN
// ==========================================

function createScenery() {
    clouds = [];
    buildings = [];

    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: random(0, W),
            y: random(35, H * 0.35),
            size: random(20, 45),
            speed: random(0.2, 0.7)
        });
    }

    for (let i = 0; i < 12; i++) {
        buildings.push({
            x: i * 110,
            width: random(65, 100),
            height: random(H * 0.12, H * 0.35),
            windows: Math.floor(random(2, 5))
        });
    }
}

// ==========================================
// LOMPAT
// ==========================================

function jump() {
    if (!gameRunning) return;

    if (player.grounded) {
        player.velocityY = player.jumpPower;
        player.grounded = false;

        createParticles(
            player.x + player.width / 2,
            player.y + player.height,
            "#d6e7c2",
            5
        );
    }
}

window.addEventListener("keydown", function (event) {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
    ) {
        event.preventDefault();

        if (!gameRunning && gameStarted) {
            return;
        }

        jump();
    }
});

canvas.addEventListener("pointerdown", function () {
    jump();
});

// ==========================================
// MEMULAI GAME
// ==========================================

function startGame() {
    resetGame();

    gameStarted = true;
    gameRunning = true;

    overlay.classList.add("hidden");

    lastTime = performance.now();
}

startButton.addEventListener("click", startGame);

// ==========================================
// GAME OVER
// ==========================================

function gameOver(reason) {
    if (!gameRunning) return;

    gameRunning = false;
    gameOverReason = reason;

    if (Math.floor(score) > bestScore) {
        bestScore = Math.floor(score);
        localStorage.setItem("zombieTsunamiBest", bestScore);
    }

    updateHUD();

    titleText.textContent = "GAME OVER!";
    descriptionText.textContent =
        reason +
        " Skor kamu: " +
        Math.floor(score) +
        ". Koin terkumpul: " +
        coins +
        ".";

    startButton.textContent = "MAIN LAGI";
    overlay.classList.remove("hidden");
}

// ==========================================
// MEMBUAT PARTIKEL
// ==========================================

function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: random(-3, 3),
            vy: random(-4, 1),
            size: random(3, 7),
            life: random(15, 35),
            color: color
        });
    }
}

// ==========================================
// SPAWN OBSTACLE
// ==========================================

function spawnObstacle() {
    const type = Math.random();

    if (type < 0.45) {
        obstacles.push({
            type: "car",
            x: W + 30,
            y: groundY() - 35,
            width: 75,
            height: 35
        });
    } else if (type < 0.75) {
        obstacles.push({
            type: "bomb",
            x: W + 30,
            y: groundY() - 32,
            width: 32,
            height: 32
        });
    } else {
        obstacles.push({
            type: "gap",
            x: W + 30,
            y: groundY(),
            width: 100,
            height: 30
        });
    }
}

// ==========================================
// SPAWN MANUSIA
// ==========================================

function spawnHumans() {
    const amount = Math.floor(random(1, 4));

    for (let i = 0; i < amount; i++) {
        humans.push({
            x: W + i * 45,
            y: groundY() - random(45, 95),
            width: 25,
            height: 40,
            collected: false
        });
    }
}

// ==========================================
// SPAWN KOIN
// ==========================================

function spawnCoins() {
    const amount = Math.floor(random(4, 8));
    const baseY = groundY() - random(65, 125);

    for (let i = 0; i < amount; i++) {
        coinItems.push({
            x: W + i * 38,
            y: baseY - Math.sin(i * 0.6) * 20,
            radius: 10,
            collected: false
        });
    }
}

// ==========================================
// SPAWN POWER-UP
// ==========================================

function spawnPowerUp() {
    powerItems.push({
        x: W + 30,
        y: groundY() - random(80, 130),
        width: 30,
        height: 30,
        type: Math.random() < 0.5 ? "giant" : "shield"
    });
}

// ==========================================
// UPDATE GAME
// ==========================================

function updateGame(dt) {
    if (!gameRunning) return;

    const step = Math.min(dt / 16.67, 2);

    worldDistance += worldSpeed * step;
    score += 0.1 * step;

    worldSpeed = Math.min(14, 7 + score / 300);

    // Pergantian background otomatis
    backgroundTimer += step;

    if (backgroundTimer >= 1200) {
        backgroundTimer = 0;
        changeBackground();
    }

    // Gerakan pemain
    player.velocityY += player.gravity * step;
    player.y += player.velocityY * step;

    const floor = groundY() - player.height;

    if (player.y >= floor) {
        player.y = floor;
        player.velocityY = 0;
        player.grounded = true;
        player.rotation = 0;
    } else {
        player.grounded = false;
        player.rotation = Math.min(0.4, player.velocityY * 0.025);
    }

    // Timer spawn
    spawnObstacleTimer -= step;
    spawnHumanTimer -= step;
    spawnCoinTimer -= step;
    spawnPowerTimer -= step;

    if (spawnObstacleTimer <= 0) {
        spawnObstacle();
        spawnObstacleTimer = random(85, 145) / (worldSpeed / 4);
    }

    if (spawnHumanTimer <= 0) {
        spawnHumans();
        spawnHumanTimer = random(130, 220);
    }

    if (spawnCoinTimer <= 0) {
        spawnCoins();
        spawnCoinTimer = random(180, 280);
    }

    if (spawnPowerTimer <= 0) {
        spawnPowerUp();
        spawnPowerTimer = random(650, 950);
    }

    // Bergerakkan obstacle
    for (const obstacle of obstacles) {
        obstacle.x -= worldSpeed * step;
    }

    obstacles = obstacles.filter(
        obstacle => obstacle.x + obstacle.width > -50
    );

    // Bergerakkan manusia
    for (const human of humans) {
        human.x -= worldSpeed * step;

        if (!human.collected && rectangleCollision(player, human)) {
            human.collected = true;
            zombies++;

            score += 10;

            createParticles(
                human.x,
                human.y,
                "#9cff73",
                10
            );
        }
    }

    humans = humans.filter(
        human => !human.collected && human.x + human.width > -30
    );

    // Bergerakkan koin
    for (const coin of coinItems) {
        coin.x -= worldSpeed * step;

        const coinBox = {
            x: coin.x - coin.radius,
            y: coin.y - coin.radius,
            width: coin.radius * 2,
            height: coin.radius * 2
        };

        if (!coin.collected && rectangleCollision(player, coinBox)) {
            coin.collected = true;
            coins++;
            score += 5;

            createParticles(
                coin.x,
                coin.y,
                "#ffd84d",
                6
            );
        }
    }

    coinItems = coinItems.filter(
        coin => !coin.collected && coin.x > -30
    );

    // Bergerakkan power-up
    for (const item of powerItems) {
        item.x -= worldSpeed * step;

        if (!item.collected && rectangleCollision(player, item)) {
            item.collected = true;
            power = item.type;
            powerTimer = 600;

            if (power === "giant") {
                player.width = 62;
                player.height = 78;
            } else {
                invincibleTimer = 600;
            }

            createParticles(
                item.x,
                item.y,
                item.type === "giant" ? "#ff69d4" : "#66eaff",
                15
            );
        }
    }

    powerItems = powerItems.filter(
        item => !item.collected && item.x > -40
    );

    // Timer power-up
    if (power) {
        powerTimer -= step;

        if (powerTimer <= 0) {
            if (power === "giant") {
                player.width = 42;
                player.height = 58;
                player.y = Math.min(
                    player.y,
                    groundY() - player.height
                );
            }

            power = null;
            powerTimer = 0;
        }
    }

    if (invincibleTimer > 0) {
        invincibleTimer -= step;
    }

    // Tabrakan dengan obstacle
    for (const obstacle of obstacles) {
        if (obstacle.type === "gap") {
            const playerOverGap =
                player.x + player.width * 0.7 > obstacle.x &&
                player.x + player.width * 0.2 < obstacle.x + obstacle.width;

            const playerOnGround =
                player.y + player.height >= groundY() - 3;

            if (playerOverGap && playerOnGround) {
                gameOver("Kamu jatuh ke dalam jurang!");
                return;
            }

            continue;
        }

        const hitbox = {
            x: obstacle.x + 5,
            y: obstacle.y + 5,
            width: obstacle.width - 10,
            height: obstacle.height - 5
        };

        if (rectangleCollision(player, hitbox)) {
            if (power === "giant") {
                obstacle.destroyed = true;

                createParticles(
                    obstacle.x,
                    obstacle.y,
                    "#ff8ae2",
                    15
                );
            } else if (invincibleTimer > 0) {
                obstacle.destroyed = true;

                createParticles(
                    obstacle.x,
                    obstacle.y,
                    "#67eaff",
                    15
                );
            } else {
                gameOver(
                    obstacle.type === "car"
                        ? "Kamu tertabrak mobil!"
                        : "Kamu terkena bom!"
                );
                return;
            }
        }
    }

    obstacles = obstacles.filter(obstacle => !obstacle.destroyed);

    // Update partikel
    for (const particle of particles) {
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        particle.vy += 0.15 * step;
        particle.life -= step;
    }

    particles = particles.filter(particle => particle.life > 0);

    // Update awan
    for (const cloud of clouds) {
        cloud.x -= cloud.speed * step;

        if (cloud.x + cloud.size * 2 < 0) {
            cloud.x = W + cloud.size;
            cloud.y = random(35, H * 0.35);
        }
    }

    // Update bangunan
    for (const building of buildings) {
        building.x -= worldSpeed * 0.25 * step;

        if (building.x + building.width < 0) {
            building.x = W + random(0, 80);
            building.height = random(H * 0.12, H * 0.35);
        }
    }

    updateHUD();
}

// ==========================================
// GAMBAR BACKGROUND
// ==========================================

function drawBackground() {
    const bg = backgrounds[currentBackground];

    ctx.fillStyle = bg.sky;
    ctx.fillRect(0, 0, W, H);

    // Matahari / bulan
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.17, 32, 0, Math.PI * 2);
    ctx.fillStyle = bg.accent;
    ctx.fill();

    // Awan
    for (const cloud of clouds) {
        ctx.fillStyle = bg.cloud;
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        ctx.arc(
            cloud.x,
            cloud.y,
            cloud.size * 0.5,
            0,
            Math.PI * 2
        );
        ctx.arc(
            cloud.x + cloud.size * 0.5,
            cloud.y - 8,
            cloud.size * 0.6,
            0,
            Math.PI * 2
        );
        ctx.arc(
            cloud.x + cloud.size,
            cloud.y,
            cloud.size * 0.45,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Gedung
    for (const building of buildings) {
        const y = groundY() - building.height;

        ctx.fillStyle = bg.building;
        ctx.fillRect(
            building.x,
            y,
            building.width,
            building.height
        );

        ctx.fillStyle = bg.accent;
        ctx.globalAlpha = 0.65;

        for (let row = 0; row < building.windows; row++) {
            for (let col = 0; col < 3; col++) {
                ctx.fillRect(
                    building.x + 12 + col * 22,
                    y + 15 + row * 25,
                    9,
                    12
                );
            }
        }

        ctx.globalAlpha = 1;
    }

    // Tanah
    ctx.fillStyle = bg.ground;
    ctx.fillRect(0, groundY(), W, H - groundY());

    // Garis jalan
    ctx.fillStyle = bg.accent;

    const lineWidth = 45;
    const gap = 45;
    const offset = worldDistance % (lineWidth + gap);

    for (
        let x = -offset;
        x < W;
        x += lineWidth + gap
    ) {
        ctx.fillRect(
            x,
            groundY() + 25,
            lineWidth,
            5
        );
    }
}

// ==========================================
// GAMBAR ZOMBIE
// ==========================================

function drawZombie(x, y, width, height, mainZombie = false) {
    ctx.save();

    // Bayangan
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(
        x + width / 2,
        groundY() - 2,
        width * 0.55,
        5,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Badan
    ctx.fillStyle = mainZombie ? "#65c94d" : "#79d65d";
    ctx.fillRect(
        x + width * 0.2,
        y + height * 0.36,
        width * 0.58,
        height * 0.46
    );

    // Kepala
    ctx.fillStyle = "#8ce66b";
    ctx.fillRect(
        x + width * 0.15,
        y,
        width * 0.7,
        height * 0.43
    );

    // Rambut
    ctx.fillStyle = "#38552c";
    ctx.fillRect(
        x + width * 0.18,
        y - 3,
        width * 0.22,
        7
    );
    ctx.fillRect(
        x + width * 0.55,
        y - 2,
        width * 0.2,
        6
    );

    // Mata
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
        x + width * 0.28,
        y + height * 0.16,
        width * 0.17,
        height * 0.12
    );
    ctx.fillRect(
        x + width * 0.58,
        y + height * 0.16,
        width * 0.17,
        height * 0.12
    );

    ctx.fillStyle = "#222222";
    ctx.fillRect(
        x + width * 0.34,
        y + height * 0.18,
        width * 0.07,
        height * 0.09
    );
    ctx.fillRect(
        x + width * 0.64,
        y + height * 0.18,
        width * 0.07,
        height * 0.09
    );

    // Mulut
    ctx.fillStyle = "#4d2626";
    ctx.fillRect(
        x + width * 0.36,
        y + height * 0.32,
        width * 0.3,
        height * 0.07
    );

    // Gigi
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
        x + width * 0.4,
        y + height * 0.32,
        width * 0.06,
        height * 0.05
    );
    ctx.fillRect(
        x + width * 0.54,
        y + height * 0.32,
        width * 0.06,
        height * 0.05
    );

    // Tangan
    ctx.fillStyle = "#8ce66b";
    ctx.fillRect(
        x,
        y + height * 0.4,
        width * 0.22,
        height * 0.12
    );
    ctx.fillRect(
        x + width * 0.76,
        y + height * 0.4,
        width * 0.24,
        height * 0.12
    );

    // Kaki
    ctx.fillStyle = "#314d30";
    ctx.fillRect(
        x + width * 0.25,
        y + height * 0.8,
        width * 0.2,
        height * 0.2
    );
    ctx.fillRect(
        x + width * 0.55,
        y + height * 0.8,
        width * 0.2,
        height * 0.2
    );

    ctx.restore();
}

// ==========================================
// GAMBAR OBSTACLE
// ==========================================

function drawObstacle(obstacle) {
    if (obstacle.type === "car") {
        // Badan mobil
        ctx.fillStyle = "#e54b4b";
        ctx.fillRect(
            obstacle.x,
            obstacle.y + 10,
            obstacle.width,
            obstacle.height - 10
        );

        // Atap mobil
        ctx.fillStyle = "#ff7777";
        ctx.fillRect(
            obstacle.x + 15,
            obstacle.y,
            obstacle.width - 30,
            18
        );

        // Kaca
        ctx.fillStyle = "#a8eaff";
        ctx.fillRect(
            obstacle.x + 21,
            obstacle.y + 3,
            15,
            10
        );
        ctx.fillRect(
            obstacle.x + 43,
            obstacle.y + 3,
            15,
            10
        );

        // Roda
        ctx.fillStyle = "#222222";
        ctx.beginPath();
        ctx.arc(obstacle.x + 18, obstacle.y + 31, 8, 0, Math.PI * 2);
        ctx.arc(obstacle.x + 58, obstacle.y + 31, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#bbbbbb";
        ctx.beginPath();
        ctx.arc(obstacle.x + 18, obstacle.y + 31, 3, 0, Math.PI * 2);
        ctx.arc(obstacle.x + 58, obstacle.y + 31, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    if (obstacle.type === "bomb") {
        ctx.fillStyle = "#242424";
        ctx.beginPath();
        ctx.arc(
            obstacle.x + obstacle.width / 2,
            obstacle.y + obstacle.height / 2,
            obstacle.width / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.strokeStyle = "#ffce55";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 17, obstacle.y + 3);
        ctx.lineTo(obstacle.x + 25, obstacle.y - 7);
        ctx.stroke();

        ctx.fillStyle = "#ff7b35";
        ctx.beginPath();
        ctx.arc(obstacle.x + 27, obstacle.y - 9, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    if (obstacle.type === "gap") {
        ctx.fillStyle = "#171717";
        ctx.fillRect(
            obstacle.x,
            groundY(),
            obstacle.width,
            H - groundY()
        );

        ctx.fillStyle = "#111111";
        ctx.fillRect(
            obstacle.x + 8,
            groundY() + 10,
            obstacle.width - 16,
            H - groundY()
        );
    }
}

// ==========================================
// GAMBAR MANUSIA
// ==========================================

function drawHuman(human) {
    const x = human.x;
    const y = human.y;

    // Kepala
    ctx.fillStyle = "#ffd2a1";
    ctx.beginPath();
    ctx.arc(x + 12, y + 7, 7, 0, Math.PI * 2);
    ctx.fill();

    // Rambut
    ctx.fillStyle = "#44352b";
    ctx.fillRect(x + 5, y, 14, 5);

    // Badan
    ctx.fillStyle = "#4b91e2";
    ctx.fillRect(x + 4, y + 15, 16, 16);

    // Tangan
    ctx.strokeStyle = "#ffd2a1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 18);
    ctx.lineTo(x, y + 25);
    ctx.moveTo(x + 19, y + 18);
    ctx.lineTo(x + 24, y + 25);
    ctx.stroke();

    // Kaki
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 31);
    ctx.lineTo(x + 5, y + 39);
    ctx.moveTo(x + 16, y + 31);
    ctx.lineTo(x + 20, y + 39);
    ctx.stroke();
}

// ==========================================
// GAMBAR KOIN
// ==========================================

function drawCoin(coin) {
    ctx.fillStyle = "#ffce35";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e99b19";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff2a3";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", coin.x, coin.y + 1);
}

// ==========================================
// GAMBAR POWER-UP
// ==========================================

function drawPowerUp(item) {
    ctx.save();

    ctx.fillStyle = item.type === "giant" ? "#f05bd4" : "#38d9ff";

    ctx.beginPath();
    ctx.arc(
        item.x + item.width / 2,
        item.y + item.height / 2,
        item.width / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        item.type === "giant" ? "G" : "S",
        item.x + item.width / 2,
        item.y + item.height / 2
    );

    ctx.restore();
}

// ==========================================
// GAMBAR PARTIKEL
// ==========================================

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life / 35);
        ctx.fillStyle = particle.color;

        ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
        );
    }

    ctx.globalAlpha = 1;
}

// ==========================================
// RENDER GAME
// ==========================================

function renderGame() {
    ctx.clearRect(0, 0, W, H);

    drawBackground();

    // Jurang dan obstacle digambar di depan
    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }

    for (const human of humans) {
        drawHuman(human);
    }

    for (const coin of coinItems) {
        drawCoin(coin);
    }

    for (const item of powerItems) {
        drawPowerUp(item);
    }

    // Efek shield
    if (invincibleTimer > 0) {
        ctx.strokeStyle = "#5ce8ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width * 0.8,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }

    // Efek giant
    if (power === "giant") {
        ctx.strokeStyle = "#ff74db";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            player.x - 5,
            player.y - 5,
            player.width + 10,
            player.height + 10
        );
    }

    // Pemain
    ctx.save();

    ctx.translate(
        player.x + player.width / 2,
        player.y + player.height / 2
    );

    ctx.rotate(player.rotation);

    drawZombie(
        -player.width / 2,
        -player.height / 2,
        player.width,
        player.height,
        true
    );

    ctx.restore();

    // Zombie tambahan mengikuti pemain
    const extraZombies = Math.min(zombies - 1, 8);

    for (let i = 0; i < extraZombies; i++) {
        const followerX = player.x - (i + 1) * 32;
        const followerY = groundY() - 48;

        if (followerX > -35) {
            drawZombie(
                followerX,
                followerY,
                30,
                43,
                false
            );
        }
    }

    drawParticles();

    // Nama background
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(12, H - 43, 125, 28);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
        backgrounds[currentBackground].name,
        22,
        H - 29
    );
}

// ==========================================
// LOOP UTAMA
// ==========================================

function gameLoop(timestamp) {
    const dt = lastTime ? timestamp - lastTime : 16.67;
    lastTime = timestamp;

    updateGame(dt);
    renderGame();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// INISIALISASI
// ==========================================

resetGame();

titleText.textContent = "ZOMBIE TSUNAMI";
descriptionText.textContent =
    "Kumpulkan manusia untuk menambah zombie, ambil koin dan power-up, lalu hindari mobil, bom, dan jurang!";

startButton.textContent = "MULAI BERMAIN";

updateHUD();

requestAnimationFrame(gameLoop);
