let gui = {};
let drawingLayer; 
let loadedMedia = null; 
let drawingHistory = []; 
let isGlitchActive = false; 
const MAX_UNDO = 15; 
let lastMouseX = 0, lastMouseY = 0;
let customInputValue = '𓀀'; 

const unicodeGroups = {
  "Egyptian Hieroglyphs": [0x13000, 0x1342F],
  "General Punctuation": [0x2000, 0x206F],
  "Number Forms": [0x2150, 0x218F],
  "Arrows": [0x2190, 0x21FF],
  "Math Symbols-A": [0x27C0, 0x27EF],
  "Math Operators": [0x2200, 0x22FF],
  "Arrows-B": [0x2900, 0x297F],
  "Math Symbols-B": [0x2980, 0x29FF],
  "Supp. Math Ops": [0x2A00, 0x2AFF],
  "Misc. Technical": [0x2300, 0x23FF],
  "Box Drawing": [0x2500, 0x257F],
  "Block Elements": [0x2580, 0x259F],
  "Geometric Shapes": [0x25A0, 0x25FF],
  "Misc. Symbols": [0x2600, 0x26FF]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawingLayer = createGraphics(750, 750);
  drawingLayer.noSmooth(); 
  drawingLayer.clear();
  
  setupInterface();
  saveToHistory();
  updateUnicodeGrid("Egyptian Hieroglyphs");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setupInterface() {
  let btnW = 190;
  let panelColor = '#001b3d'; // Koyu Mavi
  let textColor = '#FFFFFF';
  
  // --- LEFT PANEL ---
  gui.leftPanel = createDiv('').position(0, 0).size(230, windowHeight).style('background', panelColor).style('padding', '15px').style('color', textColor).style('font-family', 'monospace').style('border-right', '1px solid #002d66').style('z-index', '10');
  createP("DEMONIC PAINT v1.0").style('font-weight', 'bold').style('color', '#ff0000').style('border-bottom','2px solid #ff0000').parent(gui.leftPanel);

  createP("CANVAS BG").style('margin-top', '15px').parent(gui.leftPanel);
  gui.canvasBG = createColorPicker('#FFFFFF').parent(gui.leftPanel).size(btnW, 30);

  createP("SOURCE").style('margin-top', '15px').parent(gui.leftPanel);
  let fileContainer = createDiv('').parent(gui.leftPanel).style('position', 'relative').style('width', btnW + 'px').style('height', '35px');
  createDiv('OPEN FILE').parent(fileContainer).style('position', 'absolute').style('width', '100%').style('height', '100%').style('background', '#002d66').style('color', '#fff').style('border', '1px solid #004aab').style('text-align', 'center').style('line-height', '35px');
  gui.uploadBtn = createFileInput(handleFile).parent(fileContainer).style('opacity', '0').style('width', '100%').style('height', '100%').style('cursor', 'pointer');

  createP("ENGINE").style('margin-top', '20px').parent(gui.leftPanel);
  gui.toggleBtn = createButton("START/PAUSE (P)").parent(gui.leftPanel).size(btnW, 35).mousePressed(toggleFlow);
  gui.toggleBtn.style('background', '#00ff41').style('color', '#000').style('font-weight', 'bold').style('border','none').style('cursor', 'pointer');

  createLabel("FLOW SPEED", gui.leftPanel);
  gui.flowSpeed = createSlider(1, 60, 60).parent(gui.leftPanel).size(btnW);
  createLabel("SHIFT X / Y", gui.leftPanel);
  gui.shiftX = createSlider(0, 50, 15).parent(gui.leftPanel).size(btnW);
  gui.shiftY = createSlider(0, 50, 0).parent(gui.leftPanel).size(btnW);

  createP("EXPORT & RESET").style('margin-top', '40px').style('border-top', '1px solid #002d66').parent(gui.leftPanel);
  createButton("SAVE JPG (S)").parent(gui.leftPanel).size(btnW, 35).mousePressed(exportJPG).style('background', '#0088ff').style('color', '#fff').style('border','none').style('margin-bottom', '5px').style('cursor', 'pointer');
  createButton("RESET CANVAS").parent(gui.leftPanel).size(btnW, 35).mousePressed(resetCanvasAction).style('background', '#ff0000').style('color', '#fff').style('border','none').style('cursor', 'pointer');

  // --- RIGHT PANEL ---
  gui.rightPanel = createDiv('').position(230 + 750, 0).size(470, windowHeight).style('background', panelColor).style('padding', '15px').style('color', textColor).style('font-family', 'monospace').style('border-left', '1px solid #002d66').style('z-index', '10');
  
  createP("BRUSH CONFIG").style('font-weight', 'bold').style('color', '#ff0055').parent(gui.rightPanel);
  
  let brushTop = createDiv('').parent(gui.rightPanel).style('display', 'flex').style('gap', '10px');
  gui.brushColor = createColorPicker('#ff0055').parent(brushTop).size(60, 30);

  let sliderCont = createDiv('').parent(gui.rightPanel).style('display', 'flex').style('flex-direction', 'column').style('gap', '2px');
  createLabel("SIZE", sliderCont);
  gui.brushSize = createSlider(5, 200, 40).parent(sliderCont).size(btnW);
  createLabel("SPACING", sliderCont);
  gui.brushSpacing = createSlider(1, 100, 10).parent(sliderCont).size(btnW);

  createP("UNICODE LIBRARY").style('margin-top', '15px').style('color', '#ff0055').style('border-bottom', '1px solid #ff0055').parent(gui.rightPanel);
  
  gui.groupSelect = createSelect().parent(gui.rightPanel).size(230, 30);
  Object.keys(unicodeGroups).forEach(g => gui.groupSelect.option(g));
  gui.groupSelect.changed(() => updateUnicodeGrid(gui.groupSelect.value()));

  gui.activeCharDisplay = createSpan(customInputValue).parent(gui.rightPanel).style('margin-left', '10px').style('color', '#00ff41').style('font-size', '20px').style('vertical-align', 'middle');

  gui.unicodeGrid = createDiv('').parent(gui.rightPanel).size(440, 320).style('overflow-y', 'scroll').style('background', '#000d1a').style('margin-top', '10px').style('display', 'grid').style('grid-template-columns', 'repeat(8, 1fr)').style('gap', '5px').style('padding', '5px').style('border', '1px solid #002d66');

  gui.undoBtn = createButton("UNDO (Z)").parent(gui.rightPanel).size(btnW, 35).style('margin-top', '15px').mousePressed(undoLastAction).style('background', '#333').style('color', '#fff').style('border','none').style('cursor', 'pointer');
}

function updateUnicodeGrid(groupName) {
  gui.unicodeGrid.html('');
  let range = unicodeGroups[groupName];
  let limit = Math.min(range[1], range[0] + 800); 
  for (let i = range[0]; i <= limit; i++) {
    let char = String.fromCodePoint(i);
    let btn = createButton(char).parent(gui.unicodeGrid).size(45, 45).style('background', '#002244').style('color', '#fff').style('border', 'none').style('cursor', 'pointer').style('font-size', '18px');
    btn.mousePressed(() => {
      customInputValue = char;
      gui.activeCharDisplay.html(char);
    });
  }
}

function draw() {
  frameRate(gui.flowSpeed.value());
  background(5); 
  
  let canvasX = 230;
  let canvasY = 50; 
  let adjX = mouseX - canvasX;
  let adjY = mouseY - canvasY;

  push();
  translate(canvasX, canvasY); 
  fill(gui.canvasBG.value()); 
  noStroke(); 
  rect(0, 0, 750, 750);

  if (isGlitchActive) {
    drawingLayer.blendMode(SCREEN);
    applyPixelGlitch(gui.shiftX.value(), gui.shiftY.value());
  }
  
  if (mouseIsPressed && adjX >= 0 && adjX <= 750 && adjY >= 0 && adjY <= 750) {
    let d = dist(adjX, adjY, lastMouseX, lastMouseY);
    if (d > gui.brushSpacing.value()) {
      renderPixelBrush(adjX, adjY);
      lastMouseX = adjX;
      lastMouseY = adjY;
    }
  }

  image(drawingLayer, 0, 0);
  
  if (adjX <= 750 && adjX >= 0 && adjY >= 0 && adjY <= 750) {
    noFill(); stroke(gui.brushColor.value()); rect(adjX - 5, adjY - 5, 10, 10);
  }
  pop();
}

function mousePressed() {
  let adjX = mouseX - 230;
  let adjY = mouseY - 50;
  if (adjX >= 0 && adjX <= 750 && adjY >= 0 && adjY <= 750) {
    saveToHistory();
  }
}

function resetCanvasAction() {
  saveToHistory();
  drawingLayer.clear();
}

function applyPixelGlitch(sx, sy) {
  for (let i = 0; i < sx; i++) {
    let x = random(750), y = random(750);
    drawingLayer.copy(x, y, random(30,150), random(1,10), x + random(-sx,sx), y, 100, 10);
  }
  for (let i = 0; i < sy; i++) {
    let x = random(750), y = random(750);
    drawingLayer.copy(x, y, random(1,10), random(30,150), x, y + random(-sy,sy), 10, 100);
  }
}

function renderPixelBrush(x, y) {
  let sz = gui.brushSize.value();
  let bCol = color(gui.brushColor.value());
  drawingLayer.push();
  drawingLayer.noStroke();
  drawingLayer.fill(bCol);
  drawingLayer.textAlign(CENTER, CENTER);
  drawingLayer.textSize(sz);
  drawingLayer.text(customInputValue, x, y);
  drawingLayer.pop();
}

function keyPressed() {
  if (key === 's' || key === 'S') exportJPG();
  if (key === 'p' || key === 'P') toggleFlow();
  if (key === 'z' || key === 'Z') undoLastAction();
}

function exportJPG() { 
  let exportImg = createGraphics(750, 750);
  exportImg.background(gui.canvasBG.value());
  exportImg.image(drawingLayer, 0, 0);
  save(exportImg, 'Demonic_' + Date.now() + '.jpg'); 
}

function handleFile(file) {
  if (file.type === 'image') {
    loadedMedia = loadImage(file.data, (img) => {
      saveToHistory();
      drawingLayer.clear();
      isGlitchActive = false;
      let ratio = img.width / img.height;
      let nw = ratio > 1 ? 750 : 750 * ratio;
      let nh = ratio > 1 ? 750 / ratio : 750;
      drawingLayer.push();
      drawingLayer.imageMode(CENTER);
      drawingLayer.image(img, 375, 375, nw, nh);
      drawingLayer.pop();
    });
  }
}

function toggleFlow() {
  isGlitchActive = !isGlitchActive;
  gui.toggleBtn.style('background', isGlitchActive ? '#333' : '#00ff41');
}

function undoLastAction() {
  if (drawingHistory.length > 0) {
    let prevState = drawingHistory.pop();
    drawingLayer.clear();
    drawingLayer.image(prevState, 0, 0);
  }
}

function saveToHistory() {
  drawingHistory.push(drawingLayer.get());
  if (drawingHistory.length > MAX_UNDO) drawingHistory.shift();
}

function createLabel(txt, parent) {
  return createP(txt).parent(parent).style('margin', '10px 0 2px 0').style('font-size', '10px').style('color', '#aab');
}