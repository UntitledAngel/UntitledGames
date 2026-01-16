const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let keys = {};
let paused = false;
let wave = 1;
let graceTime = true;
let graceTimer = 300*60; // 5 min in frames
let swapCooldown = 0; // weapon swap cooldown

let player = {
    x: 300, y: 200, size: 15,
    baseSpeed: 3, speed: 3,
    health: 100, maxHealth: 100,
    weapon: "sword", armor: 0,
    metal: 0
};
let playerClass = "None";

const weapons = {
    sword: { damage: 4, range: 50 },
    gun: { damage: 20, range: 300 }
};

let monsters = [];
let bullets = [];

// ---------------- INPUT ----------------
document.addEventListener("keydown", e => {
    keys[e.key] = true;

    if(e.key === "p") togglePause();

    // Weapon switching with cooldown
    if(e.key === "1") attemptSwitchWeapon("sword");
    if(e.key === "2") attemptSwitchWeapon("gun");
});
document.addEventListener("keyup", e => keys[e.key]=false);

// ---------------- PAUSE ----------------
function togglePause(){
    paused=!paused;
    document.getElementById("pauseMenu").style.display=paused?"flex":"none";
}

// ---------------- FORGING ----------------
function forgeSword(){ if(player.metal>=10){player.metal-=10;player.weapon="sword"; updateUI();} }
function forgeGun(){ if(player.metal>=15){player.metal-=15;player.weapon="gun"; updateUI();} }
function forgeArmor(){ 
    if(player.metal>=20){
        player.metal-=20;
        player.armor+=0.1;
        if(player.armor>0.7) player.armor=0.7;
        updateSpeed();
        updateUI();
    } 
}
function skipGrace(){ if(graceTime){graceTime=false;spawnWave();} }

// ---------------- CLASS SELECTION ----------------
function chooseClass(cls){
    if(!graceTime) return;
    playerClass = cls;
    document.getElementById("playerClass").innerText = cls.toUpperCase();

    switch(cls){
        case "tank":
            player.maxHealth=150; player.health=150; weapons.sword.damage=20;
            player.baseSpeed=10; break;
        case "assassin":
            player.maxHealth=100; player.health=100; weapons.sword.damage=10;
            player.baseSpeed=15; break;
        case "gunner":
            player.maxHealth=90; player.health=90; weapons.gun.damage=15;
            player.baseSpeed=5; break;
        case "berserker":
            player.maxHealth=120; player.health=120; weapons.sword.damage=20; player.armor=0;
            player.baseSpeed=10; break;
    }
    updateSpeed();
}

// ---------------- SPEED UPDATE ----------------
function updateSpeed(){
    let armorPenalty = player.armor * 0.0;
    player.speed = Math.max(0.0, player.baseSpeed - armorPenalty);
}

// ---------------- WEAPON SWITCHING ----------------
function attemptSwitchWeapon(weapon){
    if(swapCooldown>0) return;
    player.weapon = weapon;
    swapCooldown = 30; // 30 frames ~0.5s
    updateUI();
}

// ---------------- SPAWN ----------------
function spawnWave(){
    monsters=[];
    for(let i=0;i<wave*3;i++) monsters.push(createMonster(false));
    if(wave%5===0) monsters.push(createMonster(true));
}
function createMonster(boss){
    return { x:Math.random()*canvas.width, y:Math.random()*canvas.height,
            size:boss?25:12, health:boss?300:30, maxHealth:boss?300:30,
            speed:boss?0.6:1, boss:boss, poison:0 };
}

// ---------------- SHOOTING ----------------
canvas.addEventListener("space", e=>{
    if(player.weapon==="gun" && !paused){
        bullets.push({x:player.x, y:player.y,
            dx:(e.offsetX-player.x)/15, dy:(e.offsetY-player.y)/15});
    }
});

// ---------------- UPDATE ----------------
function update(){
    if(!player || paused) return;

    if(swapCooldown>0) swapCooldown--;

    // Movement
    if(keys["w"]) player.y -= player.speed;
    if(keys["s"]) player.y += player.speed;
    if(keys["a"]) player.x -= player.speed;
    if(keys["d"]) player.x += player.speed;

    // Grace period healing
    if(graceTime){
        graceTimer--;
        if(player.health<player.maxHealth){
            player.health+=0.15;
            if(player.health>player.maxHealth) player.health=player.maxHealth;
        }
        if(graceTimer<=0){ graceTime=false; spawnWave(); }
    }

    // Monsters AI
    monsters.forEach(m=>{
        let dx=player.x-m.x, dy=player.y-m.y;
        let dist=Math.hypot(dx,dy);
        m.x += (dx/dist)*m.speed;
        m.y += (dy/dist)*m.speed;

        if(dist<m.size+player.size){
            player.health-=0.4*(1-player.armor);
        }

        if(m.poison>0){
            m.health-=0.1; m.poison--;
        }
    });

    // Bullets
    bullets.forEach((b,bi)=>{
        b.x+=b.dx;b.y+=b.dy;
        monsters.forEach((m,mi)=>{
            if(Math.hypot(b.x-m.x,b.y-m.y)<m.size){
                m.health-=weapons.gun.damage;
                bullets.splice(bi,1);
                if(m.health<=0) killMonster(mi);
            }
        });
    });

    // Sword attack
    if(keys[" "] && player.weapon==="sword"){
        monsters.forEach((m,i)=>{
            if(Math.hypot(player.x-m.x,player.y-m.y)<weapons.sword.range){
                m.health-=weapons.sword.damage;
                if(playerClass==="assassin") m.poison=180;
                if(m.health<=0) killMonster(i);
            }
        });
    }

    // Death
    if(player.health<=0) showDeathScreen();

    // Wave clear
    if(!graceTime && monsters.length===0){
        wave++; graceTime=true; graceTimer=300*60;
    }

    updateUI();
}

// ---------------- KILL ----------------
function killMonster(i){ monsters.splice(i,1); player.metal+=3; }

// ---------------- UI ----------------
function updateUI(){
    if(!player) return;
    let minutes=Math.floor(graceTimer/3600);
    let seconds=Math.floor((graceTimer/60)%60);
    let timerText = graceTime ? `Grace ${minutes}:${seconds.toString().padStart(2,'0')}` : "Fighting";

    document.getElementById("info").innerText = `Wave: ${wave} | ${timerText}`;
    document.getElementById("metal").innerText = player.metal;
    document.getElementById("weaponStats").innerText=
        `${player.weapon.toUpperCase()}\nDamage: ${weapons[player.weapon].damage}\nArmor: ${Math.floor(player.armor*100)}%\nSpeed: ${player.speed.toFixed(2)}`;
}

// ---------------- DRAW ----------------
function draw(){
    if(!player) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="cyan";
    ctx.beginPath();
    ctx.arc(player.x,player.y,player.size,0,Math.PI*2);
    ctx.fill();

    monsters.forEach(m=>{
        ctx.fillStyle=m.boss?"purple":"red";
        ctx.beginPath();
        ctx.arc(m.x,m.y,m.size,0,Math.PI*2);
        ctx.fill();
        // Health bar
        ctx.fillStyle="black";
        ctx.fillRect(m.x-m.size,m.y-m.size-8,m.size*2,4);
        ctx.fillStyle="lime";
        ctx.fillRect(m.x-m.size,m.y-m.size-8,(m.health/m.maxHealth)*m.size*2,4);
    });

    ctx.fillStyle="yellow";
    bullets.forEach(b=>ctx.fillRect(b.x,b.y,4,4));

    document.getElementById("healthFill").style.width=(player.health/player.maxHealth)*100+"%";
}

// ---------------- LOOP ----------------
function gameLoop(){ update(); draw(); requestAnimationFrame(gameLoop); }

// ---------------- DEATH ----------------
function showDeathScreen(){ document.getElementById("deathScreen").style.display="flex"; }
function restartGame(){ localStorage.clear(); location.reload(); }

gameLoop();
// ---------------- SAVE / LOAD SYSTEM ----------------
function exportSave() {
    let saveData = {
        player: {
            x: player.x,
            y: player.y,
            health: player.health,
            maxHealth: player.maxHealth,
            weapon: player.weapon,
            armor: player.armor,
            metal: player.metal,
            baseSpeed: player.baseSpeed,
            speed: player.speed
        },
        playerClass: playerClass,
        wave: wave,
        graceTime: graceTime,
        graceTimer: graceTimer,
        monsters: monsters.map(m => ({
            x: m.x, y: m.y, size: m.size, health: m.health, maxHealth: m.maxHealth,
            speed: m.speed, boss: m.boss, poison: m.poison
        }))
    };

    let json = JSON.stringify(saveData);
    let code = btoa(json); // encode as base64
    prompt("Copy your save code:", code);
}

function importSave() {
    let code = prompt("Paste your save code:");
    if (!code) return;
    try {
        let json = atob(code);
        let data = JSON.parse(json);

        // Restore player
        player.x = data.player.x;
        player.y = data.player.y;
        player.health = data.player.health;
        player.maxHealth = data.player.maxHealth;
        player.weapon = data.player.weapon;
        player.armor = data.player.armor;
        player.metal = data.player.metal;
        player.baseSpeed = data.player.baseSpeed;
        player.speed = data.player.speed;

        playerClass = data.playerClass;
        document.getElementById("playerClass").innerText = playerClass;

        // Restore wave & grace
        wave = data.wave;
        graceTime = data.graceTime;
        graceTimer = data.graceTimer;

        // Restore monsters
        monsters = data.monsters.map(m => ({
            x: m.x, y: m.y, size: m.size, health: m.health, maxHealth: m.maxHealth,
            speed: m.speed, boss: m.boss, poison: m.poison
        }));

        updateUI();
        alert("Game loaded!");
    } catch (err) {
        alert("Invalid save code!");
        console.error(err);
    }
}
