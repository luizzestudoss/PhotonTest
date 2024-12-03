let debug = {
  debugMode: true,
  colission: false,
  showHitbox: false,
  speed: 1,
  zoom: 1,
  drawFog: false,
  spidersAmount: 0,
  SpawnSpider: true
};

let players = []

let gameStarted = false;

let maze;
let player;
let camera;
let interfaceHandler;
let minigame = null;
let isHoldingSpace = false;

let startX;
let startY;

let zoom = debug.minZoom && debug.debugMode ? 1 : 6;
let MainCharacterSpeed = debug.fastSpeed && debug.debugMode ? 10 : 1;
let MonsterSpeed = debug.fastSpeed && debug.debugMode ? 10 : 1.5;

let Textures = {};
let Sprites = {}

let Spiders = [];


function preload() {
  Textures["FloorTexture"] = loadImage('../../assets/Textures/Floor3.jpg');
  Textures["WallTexture"] = loadImage('../../assets/Textures/Wall.jpg');
  Textures['DoorTexture'] = loadImage('../../assets/Textures/Wall1.jpg');

  Sprites["MainCharacter"] = {}

  let MainCharacter = Sprites["MainCharacter"]
  MainCharacter['up'] = loadImage('../../assets/Sprites/MainCharacter/up.png');
  MainCharacter['down'] = loadImage('../../assets/Sprites/MainCharacter/down.png');
  MainCharacter['left'] = loadImage('../../assets/Sprites/MainCharacter/left.png');
  MainCharacter['right'] = loadImage('../../assets/Sprites/MainCharacter/right.png');

  Sprites["Monster"] = loadImage('../../assets/Sprites/Monster/SpiderSprite.png')
  Sprites['SpiderWebEffect'] = loadImage('../../assets/Sprites/SpiderWebEffect.png')
  Sprites['Chest'] = loadImage('../../assets/Sprites/Chest.png')
}

function spawnSpiders(botCount) {
  setTimeout(() => {
      for (let i = 0; i < botCount; i++) {
        let monster = new CharacterManager(createVector(startX, startY), maze.cellSize, maze.grid, "Monster");
        Spiders.push(monster);

        interfaceHandler.AddGameText(botCount + " aranhas spawnaram no meio.", 0.5, 0.2, 2000);
      }
  }, 15000);
}

function setup() {
  waitForGameStart();
}

function initializePlayers() {
  const myActor = window.Server.myActor();
  const actors = window.Server.myRoomActors();

  for (const actorId in actors) {
    if (parseInt(actorId) !== myActor.actorNr) {
      const otherPlayer = actors[actorId];
      const newPlayer = new CharacterManager(
        createVector(startX, startY),
        maze.cellSize,
        maze.grid,
        "Player",
        otherPlayer
      );
      players.push(newPlayer);
    }
  }
}



function initializeGame() {
  const mainContainer = document.getElementById("main-container");
  mainContainer.innerHTML = '';

  createCanvas(windowWidth, windowHeight);
  if (debug.debugMode) {
    debugHandler = new DebugHandler(debug);
  }

  let gameMode = window.Server.getRoomProperty('gamemode')
  let monsterMode = window.Server.getRoomProperty('monsterMode')
  let botCount = window.Server.getRoomProperty('botCount')
  let seed = window.Server.getRoomProperty('seed')
  let mapDimensions = window.Server.getRoomProperty('mapDimensions')

  maze = new MazeGenerator(mapDimensions.width, mapDimensions.height, seed);
  maze.generateMaze();

  let cellSize = maze.cellSize;

  startX = floor(maze.cols / 2) * cellSize + cellSize / 2;
  startY = floor(maze.rows / 2) * cellSize + cellSize / 2;

  player = new CharacterManager(createVector(startX, startY), cellSize, maze.grid, "Player");
  players.push(player);

  initializePlayers()

  interfaceHandler = new InterfaceHandler();
  camera = new CameraHandler();

  minigame = new MinigameBar();

  if (monsterMode == "bot") {
    spawnSpiders(botCount);
  }

  gameStarted = true;
}

function waitForGameStart() {
  if (window.Server.getRoomProperty("isStarted")) {
    initializeGame();
  } else {
    setTimeout(waitForGameStart, 100);
  }
}

function draw() {
  if (gameStarted) {
    background(0)
  
    let cameraX = -player.pos.x * zoom + width / 2;
    let cameraY = -player.pos.y * zoom + height / 2;
    camera.update(cameraX, cameraY);
  
    maze.render();
  
    if (maze.chest) {
      maze.chest.show()
    }
  
    player.move();

    for (const otherPlayer of players) {
      if (otherPlayer.playerData?.actorNr !== window.Server.myActor().actorNr) {
        otherPlayer.renderReplicatedPlayer();
      }
    }
    
  
    for (let spider of Spiders) {
      spider.moveAI();
    } 
  
    if (debug.debugMode) {
     if (debug.drawFog) {
      drawFog();
     }
    } else {
      drawFog();
    }
    
    interfaceHandler.DrawUI()
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawFog() {
  let visibleRadius = 75;

  let gradient = drawingContext.createRadialGradient(
    player.pos.x,
    player.pos.y,
    visibleRadius / 2,
    player.pos.x,
    player.pos.y,
    visibleRadius
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");
  gradient.addColorStop(0.2, "rgba(0, 0, 0, 0.4)");
  gradient.addColorStop(0.4, "rgba(0, 0, 0, 0.6)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.8)");
  gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.975)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.999)");

  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(-width, -height, width * 3, height * 3);
}

function keyPressed() {
  if (keyCode === 32 && minigame.canHoldSpace) {
      isHoldingSpace = true;
      if (!minigame.active) {
          minigame.start();
      }
  }
}
function keyReleased() {
  if (keyCode === 32 && minigame.active) {
    isHoldingSpace = false;
    minigame.stop();
  }
}


/* TO DO:
Fazer o framerate dos sprites ser de acordo com a velocidade do jogador.

Labirinto {
  Mudar as texturas
}

Monster {
  Habilidade {
    Spawnar pequenas aranhas, andam pelo mapa e avisam a posição dos jogadores que elas veem.
    3 aranhas
  }
}

Servidor {
  Enviar as posições do jogador -> player.pos.x,player.pos.y
  Enviar o evento de atacar e carregar a hitbox no servidor
  Enviar o evento de abrir o baú e carregar a hitbox no servidor
}

Adicionar modo online e offline.
Analisar formas de exploit {
  Abas minimizadas dão vantagem
}
*/