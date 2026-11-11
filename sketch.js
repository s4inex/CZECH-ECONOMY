// ČESKÁ EKONOMIKA - SIMULÁTOR PRO PC I MOBIL (p5.js)

let rootPrijmy, rootVydaje, dluhovaObsluha;
let currentYear = 2024;
let baseDebt = 3200; // mld. Kč
let currentDebt = baseDebt;

let hoveredNode = null;

// Kamera a zoom
let panX = 0, panY = 0;
let zoom = 1.0;
let isDragging = false;
let lastMouseX, lastMouseY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
  
  inicializujHlubokaData();
  runSimulation();
  
  // Výchozí vycentrování (počátek je na X=0, takže ho posuneme doprostřed obrazovky)
  panX = windowWidth / 2;
  panY = windowHeight * 0.15; // Posun mírně dolů
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  panX = windowWidth / 2;
}

function draw() {
  background(24, 24, 37);
  
  let scaleFactor = 0.35; 
  hoveredNode = null;
  
  // Přepočet layoutu relativně k nule
  updateLayout(rootPrijmy, -10, 0, scaleFactor, -1);
  updateLayout(rootVydaje, 10, 0, scaleFactor, 1);
  
  push();
  translate(panX, panY);
  scale(zoom);
  
  rootPrijmy.drawNode(-1);
  rootVydaje.drawNode(1);
  pop();
  
  drawUI();
  
  if (hoveredNode != null) {
    drawTooltip(hoveredNode);
  }
}

// Funkce pro hezké formátování čísel (např. 1 500,5)
function formatMoney(val) {
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
}

function drawUI() {
  // Horní lišta
  noStroke();
  fill(24, 24, 37, 230);
  rect(0, 0, width, 100);
  
  // Spodní lišta
  rect(0, height - 80, width, 80);

  // --- HORNÍ OVLÁDÁNÍ ---
  fill(255);
  textAlign(CENTER, TOP);
  textSize(min(22, width * 0.05)); // Přizpůsobení velikosti textu na mobilu
  text("ROZPOČET ČR", width / 2, 10);
  
  // Tlačítka Roku
  let btnY = 45;
  textSize(20);
  
  // Tlačítko VLEVO
  fill(50, 50, 70); rect(width/2 - 90, btnY, 40, 35, 5);
  fill(255); text("<", width/2 - 70, btnY + 5);
  
  // Rok uprostřed
  fill(255); text(currentYear, width/2, btnY + 5);
  
  // Tlačítko VPRAVO
  fill(50, 50, 70); rect(width/2 + 50, btnY, 40, 35, 5);
  fill(255); text(">", width/2 + 70, btnY + 5);
  
  // Tlačítka ZOOM a STŘED (Vlevo nahoře)
  let zx = 10;
  fill(50, 50, 70); 
  rect(zx, 10, 35, 35, 5); fill(255); text("+", zx + 17, 15); // Zoom In
  rect(zx, 50, 35, 35, 5); fill(255); text("-", zx + 17, 55); // Zoom Out
  
  rect(width - 55, 10, 45, 35, 5); 
  fill(255); textSize(12); text("Zpět", width - 32, 20); // Reset kamery

  // --- SPODNÍ STATISTIKY ---
  let deficit = rootVydaje.targetVal - rootPrijmy.targetVal;
  let bottomTextSize = min(16, width * 0.04);
  textSize(bottomTextSize);
  
  // Na velmi úzkých displejích (telefony na výšku) skládáme pod sebe
  if (width < 600) {
    textAlign(LEFT, BOTTOM);
    fill(166, 227, 161); text(`PŘÍJMY: ${formatMoney(rootPrijmy.targetVal)} mld.`, 10, height - 55);
    fill(243, 139, 168); text(`VÝDAJE: ${formatMoney(rootVydaje.targetVal)} mld.`, 10, height - 35);
    fill(255); text(`DLUH: ${formatMoney(currentDebt)} mld.`, 10, height - 10);
    
    textAlign(RIGHT, BOTTOM);
    fill(deficit > 0 ? color(243, 139, 168) : color(166, 227, 161));
    text(`Saldo:\n${formatMoney(-deficit)} mld.`, width - 10, height - 15);
  } else {
    textAlign(LEFT, BOTTOM);
    fill(166, 227, 161); text(`PŘÍJMY: ${formatMoney(rootPrijmy.targetVal)} mld.`, 20, height - 20);
    
    textAlign(RIGHT, BOTTOM);
    fill(243, 139, 168); text(`VÝDAJE: ${formatMoney(rootVydaje.targetVal)} mld.`, width - 20, height - 20);
    
    textAlign(CENTER, BOTTOM);
    fill(255); text(`STÁTNÍ DLUH: ${formatMoney(currentDebt)} mld.`, width/2, height - 40);
    fill(deficit > 0 ? color(243, 139, 168) : color(166, 227, 161));
    text(`Roční saldo: ${formatMoney(-deficit)} mld.`, width/2, height - 15);
  }
}

function drawTooltip(n) {
  let perc = "";
  if (n.parent != null) {
    perc = `\n${(n.targetVal / n.parent.targetVal * 100).toFixed(1)} % nadřazené skupiny`;
  }
  let growthTxt = (n.children.length === 0 && n.growth !== 0) ? `\nRůst: ${(n.growth * 100).toFixed(1)} % p.a.` : "";
  
  let txt = `${n.name}\n${formatMoney(n.targetVal)} mld. Kč${growthTxt}${perc}`;
  
  textSize(14);
  let lines = txt.split('\n');
  let maxW = 0;
  for(let l of lines) {
    let w = textWidth(l);
    if(w > maxW) maxW = w;
  }
  let tw = maxW + 20;
  
  let tx = mouseX + 15;
  let ty = mouseY + 15;
  if (tx + tw > width) tx = mouseX - tw - 15;
  if (ty + 80 > height) ty = mouseY - 85;
  
  fill(30, 30, 46, 245);
  stroke(100);
  rect(tx, ty, tw, lines.length * 18 + 15, 8);
  
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  text(txt, tx + 10, ty + 10);
}

// --- INTERAKCE (MYŠ A DOTYK) ---

function checkUIInteraction() {
  // Ovládání Roku
  let btnY = 45;
  if (mouseY > btnY && mouseY < btnY + 35) {
    if (mouseX > width/2 - 90 && mouseX < width/2 - 50) {
      if (currentYear > 2024) currentYear--; runSimulation(); return true;
    }
    if (mouseX > width/2 + 50 && mouseX < width/2 + 90) {
      if (currentYear < 2050) currentYear++; runSimulation(); return true;
    }
  }
  // Přiblížení a oddálení (Zoom)
  if (mouseX > 10 && mouseX < 45) {
    if (mouseY > 10 && mouseY < 45) { zoom *= 1.2; return true; }
    if (mouseY > 50 && mouseY < 85) { zoom /= 1.2; return true; }
  }
  // Tlačítko Reset kamery
  if (mouseX > width - 55 && mouseX < width - 10 && mouseY > 10 && mouseY < 45) {
    panX = width / 2; panY = windowHeight * 0.15; zoom = 1.0; return true;
  }
  return false;
}

function mousePressed() {
  if (checkUIInteraction()) return false;
  
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  isDragging = false;
  return false; // Zabrání defaultnímu chování prohlížeče
}

function mouseDragged() {
  panX += (mouseX - lastMouseX);
  panY += (mouseY - lastMouseY);
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  isDragging = true;
  return false;
}

function mouseReleased() {
  if (!isDragging) {
    // Přepočet kurzoru s ohledem na kameru a zoom
    let adjX = (mouseX - panX) / zoom;
    let adjY = (mouseY - panY) / zoom;
    checkClick(rootPrijmy, adjX, adjY);
    checkClick(rootVydaje, adjX, adjY);
  }
  return false;
}

function checkClick(n, adjX, adjY) {
  if (adjX >= n.dispX && adjX <= n.dispX + n.dispW &&
      adjY >= n.dispY && adjY <= n.dispY + n.dispH) {
    if (n.children.length > 0) n.expanded = !n.expanded;
  }
  if (n.expanded) {
    for (let child of n.children) checkClick(child, adjX, adjY);
  }
}

// Kolečno myši na PC pro zoom
function mouseWheel(event) {
  // Ignoruj na mobilu / na okrajích
  if(mouseY > 100 && mouseY < height - 80) {
    let zoomAmount = event.delta > 0 ? 0.9 : 1.1;
    
    // Posunutí k cíli myši
    panX = mouseX - (mouseX - panX) * zoomAmount;
    panY = mouseY - (mouseY - panY) * zoomAmount;
    zoom *= zoomAmount;
    return false;
  }
}

// --- DATOVÁ A VÝPOČETNÍ ČÁST (ES6 TŘÍDA) ---

class Node {
  constructor(name, v, g, c) {
    this.name = name;
    this.baseVal = v;
    this.simVal = v;
    this.targetVal = v;
    this.growth = g;
    this.col = c;
    this.expanded = false;
    this.parent = null;
    this.children = [];
    
    this.targetX = 0; this.targetY = 0; this.targetW = 0; this.targetH = 0;
    this.dispX = 0; this.dispY = windowHeight/2; this.dispW = 0; this.dispH = 0;
  }
  
  addChild(name, v, g, c) {
    let child = new Node(name, v, g, c);
    child.parent = this;
    child.dispX = this.dispX; child.dispY = this.dispY;
    this.children.push(child);
    return child;
  }
  
  resetToDefault() {
    this.simVal = this.baseVal;
    for (let c of this.children) c.resetToDefault();
  }
  
  applyGrowth() {
    if (this.children.length === 0) {
      this.simVal = this.simVal * (1.0 + this.growth);
    } else {
      for (let c of this.children) c.applyGrowth();
    }
  }
  
  calcTotal() {
    if (this.children.length === 0) {
      this.targetVal = this.simVal;
    } else {
      let sum = 0;
      for (let c of this.children) sum += c.calcTotal();
      this.targetVal = sum;
    }
    return this.targetVal;
  }
  
  drawNode(dir) {
    this.dispX = lerp(this.dispX, this.targetX, 0.15);
    this.dispY = lerp(this.dispY, this.targetY, 0.15);
    this.dispW = lerp(this.dispW, this.targetW, 0.15);
    this.dispH = lerp(this.dispH, this.targetH, 0.15);
    
    let adjX = (mouseX - panX) / zoom;
    let adjY = (mouseY - panY) / zoom;
    let isHovered = (adjX >= this.dispX && adjX <= this.dispX + this.dispW && adjY >= this.dispY && adjY <= this.dispY + this.dispH);
    
    if (isHovered && !isDragging && mouseY > 100 && mouseY < height-80) {
      hoveredNode = this;
    }
    
    noStroke();
    fill(0, 40);
    rect(this.dispX + 4, this.dispY + 4, this.dispW, this.dispH, 3);
    
    fill(isHovered ? color(255) : this.col);
    stroke(24, 24, 37);
    strokeWeight(1.5 / zoom);
    rect(this.dispX, this.dispY, this.dispW, this.dispH, 3);
    
    if (this.dispH * zoom > 18) {
      fill(24, 24, 37); 
      textAlign(LEFT, TOP);
      textSize(11);
      
      let label = this.name;
      if (textWidth(label) > this.dispW - 12) {
        label = label.substring(0, 20) + "..";
      }
      text(label, this.dispX + 6, this.dispY + 4);
      
      if (this.dispH * zoom > 35) {
        textSize(10);
        text(`${formatMoney(this.targetVal)} mld.`, this.dispX + 6, this.dispY + 18);
        if (this.children.length > 0) {
          text(`▶ [${this.children.length}]`, this.dispX + this.dispW - 35, this.dispY + 18);
        }
      }
    }
    
    if (this.expanded && this.children.length > 0) {
      stroke(200, 100);
      strokeWeight(1 / zoom);
      let childStartX = this.dispX + (dir === 1 ? this.dispW : 0);
      let nextColX = childStartX + (dir * 15); 
      
      for (let child of this.children) {
        let childCenterY = child.dispY + (child.dispH / 2);
        let parentCenterY = this.dispY + (this.dispH / 2);
        line(childStartX, parentCenterY, nextColX, childCenterY);
        child.drawNode(dir);
      }
    }
  }
}

function updateLayout(n, startX, startY, scaleF, dir) {
  let nHeight = n.targetVal * scaleF;
  let nWidth = 190; 
  
  n.targetX = dir === -1 ? startX - nWidth : startX;
  n.targetY = startY;
  n.targetW = nWidth;
  n.targetH = nHeight;
  
  if (n.expanded && n.children.length > 0) {
    let currentY = startY;
    let nextStartX = startX + (dir * (nWidth + 15)); 
    
    for (let child of n.children) {
      updateLayout(child, nextStartX, currentY, scaleF, dir);
      currentY += child.targetVal * scaleF + 2; 
    }
  }
}

function runSimulation() {
  rootPrijmy.resetToDefault();
  rootVydaje.resetToDefault();
  currentDebt = baseDebt;
  dluhovaObsluha.baseVal = currentDebt * 0.042; 
  
  for (let y = 2024; y < currentYear; y++) {
    rootPrijmy.applyGrowth();
    rootVydaje.applyGrowth(); 
    
    let totalP = rootPrijmy.calcTotal();
    let totalV = rootVydaje.calcTotal();
    let deficit = totalV - totalP;
    
    if (deficit > 0) {
      currentDebt += deficit;
    }
    dluhovaObsluha.simVal = currentDebt * 0.042; 
  }
  
  rootPrijmy.calcTotal();
  rootVydaje.calcTotal();
}

// INICIALIZACE DAT (STEJNÁ JAKO V JAVĚ, UPRAVENÁ SYNTAXE PRO JS)
function inicializujHlubokaData() {
  rootPrijmy = new Node("CELKOVÉ PŘÍJMY", 0, 0, color(166, 227, 161));
  let dane = rootPrijmy.addChild("Daňové příjmy", 0, 0.0, color(148, 226, 213));
  dane.addChild("DPH", 386, 0.03, color(116, 199, 236)); 
  
  let danePrijem = dane.addChild("Daně z příjmů", 0, 0.0, color(137, 180, 250));
  danePrijem.addChild("Právnické osoby (Firmy)", 240, 0.025, color(137, 180, 250));
  let danePrijemFO = danePrijem.addChild("Fyzické osoby", 0, 0.0, color(180, 190, 254));
  danePrijemFO.addChild("Ze závislé činnosti (Zam.)", 140, 0.04, color(180, 190, 254));
  danePrijemFO.addChild("Z přiznání (OSVČ)", 10, 0.03, color(180, 190, 254));
  danePrijemFO.addChild("Srážková daň", 10, 0.02, color(180, 190, 254));
  
  let spotrebni = dane.addChild("Spotřební daně", 0, 0.0, color(203, 166, 247));
  spotrebni.addChild("Minerální oleje (Paliva)", 85, 0.01, color(203, 166, 247));
  spotrebni.addChild("Tabákové výrobky", 60, -0.01, color(203, 166, 247));
  spotrebni.addChild("Líh a lihoviny", 15, 0.01, color(203, 166, 247));
  spotrebni.addChild("Pivo a víno", 10, 0.01, color(203, 166, 247));
  
  let majetek = dane.addChild("Majetkové a ostatní", 0, 0.0, color(245, 194, 231));
  majetek.addChild("Daň z nemovitých věcí", 15, 0.02, color(245, 194, 231));
  majetek.addChild("Silniční daň", 1, 0.0, color(245, 194, 231));
  
  let pojistne = rootPrijmy.addChild("Sociální pojištění", 0, 0.0, color(249, 226, 175));
  pojistne.addChild("Důchodové pojištění", 630, 0.035, color(249, 226, 175));
  pojistne.addChild("Nemocenské pojištění", 45, 0.03, color(249, 226, 175));
  pojistne.addChild("Pol. zaměstnanosti", 25, 0.03, color(249, 226, 175));
  
  let nedanove = rootPrijmy.addChild("Nedaňové, kapitálové a EU", 0, 0.0, color(250, 179, 135));
  nedanove.addChild("Příjmy z rozpočtu EU", 110, 0.01, color(250, 179, 135));
  nedanove.addChild("Příjmy z prodeje majetku", 15, 0.0, color(250, 179, 135));
  nedanove.addChild("Ostatní (Sankce, poplatky)", 104, 0.02, color(250, 179, 135));

  rootVydaje = new Node("CELKOVÉ VÝDAJE", 0, 0, color(243, 139, 168));
  
  let mpsv = rootVydaje.addChild("Ministerstvo pr. a soc. věcí", 0, 0.0, color(235, 160, 172));
  let duchody = mpsv.addChild("Důchodový systém", 0, 0.0, color(243, 139, 168)); 
  duchody.addChild("Starobní důchody", 580, 0.045, color(243, 139, 168));
  duchody.addChild("Invalidní důchody", 65, 0.03, color(243, 139, 168));
  duchody.addChild("Vdovské a sirotčí", 55, 0.025, color(243, 139, 168));
  
  let podpora = mpsv.addChild("Státní sociální podpora", 0, 0.0, color(210, 150, 160));
  podpora.addChild("Rodičovský příspěvek", 42, 0.01, color(210, 150, 160));
  podpora.addChild("Příspěvek na bydlení", 18, 0.05, color(210, 150, 160));
  podpora.addChild("Přídavky na děti", 6, 0.02, color(210, 150, 160));
  podpora.addChild("Ostatní dávky (hm. nouze)", 14, 0.02, color(210, 150, 160));
  
  let msmt = rootVydaje.addChild("Ministerstvo školství", 0, 0.0, color(250, 179, 135));
  let regSkol = msmt.addChild("Regionální školství", 0, 0.0, color(250, 179, 135));
  regSkol.addChild("Platy učitelů a personálu", 160, 0.035, color(250, 179, 135));
  regSkol.addChild("Provozní výdaje škol", 30, 0.02, color(250, 179, 135));
  msmt.addChild("Vysoké školy", 40, 0.03, color(250, 179, 135));
  msmt.addChild("Věda, výzkum a inovace", 43, 0.04, color(250, 179, 135));
  
  let zdrav = rootVydaje.addChild("Ministerstvo zdravotnictví", 0, 0.0, color(249, 226, 175));
  zdrav.addChild("Platby za státní pojištěnce", 145, 0.04, color(249, 226, 175));
  zdrav.addChild("Investice a dotace nemocnicím", 15, 0.02, color(249, 226, 175));
  
  let obrana = rootVydaje.addChild("Ministerstvo obrany", 0, 0.0, color(166, 227, 161));
  obrana.addChild("Akvizice (Nová technika)", 70, 0.06, color(166, 227, 161));
  obrana.addChild("Personální náklady (Vojáci)", 50, 0.04, color(166, 227, 161));
  obrana.addChild("Provoz a výcvik", 40, 0.03, color(166, 227, 161));
  
  let doprava = rootVydaje.addChild("Ministerstvo dopravy", 0, 0.0, color(148, 226, 213));
  let sfdi = doprava.addChild("Státní fond dopr. infr.", 0, 0.0, color(148, 226, 213));
  sfdi.addChild("Dálnice a silnice 1. třídy", 80, 0.03, color(148, 226, 213));
  sfdi.addChild("Železnice", 55, 0.03, color(148, 226, 213));
  doprava.addChild("Dotace regionům", 15, 0.02, color(148, 226, 213));
  
  let vnitro = rootVydaje.addChild("Ministerstvo vnitra", 0, 0.0, color(137, 180, 250));
  vnitro.addChild("Policie ČR", 50, 0.03, color(137, 180, 250));
  vnitro.addChild("Hasičský záchranný sbor", 15, 0.03, color(137, 180, 250));
  vnitro.addChild("Státní správa a úřady", 35, 0.02, color(137, 180, 250));
  
  dluhovaObsluha = rootVydaje.addChild("Obsluha st. dluhu (Úroky)", 95, 0.0, color(203, 166, 247));
  
  let ostatni = rootVydaje.addChild("Ostatní resorty", 0, 0.0, color(180, 190, 254));
  ostatni.addChild("Ministerstvo zemědělství", 65, 0.015, color(180, 190, 254));
  ostatni.addChild("Ministerstvo prům. a obchodu", 50, 0.02, color(180, 190, 254));
  ostatni.addChild("Zbytek resortů a rezervy", 151, 0.02, color(180, 190, 254));
  
  rootPrijmy.expanded = true;
  dane.expanded = true;
  rootVydaje.expanded = true;
  mpsv.expanded = true;
  msmt.expanded = true;
}
