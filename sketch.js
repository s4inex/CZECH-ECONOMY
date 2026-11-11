// ČESKÁ EKONOMIKA - PROFESIONÁLNÍ VIZUÁL A SÉMANTICKÝ ZOOM

let rootPrijmy, rootVydaje, dluhovaObsluha;
let currentYear = 2024;
let baseDebt = 3200; // mld. Kč
let currentDebt = baseDebt;
let hoveredNode = null;

let panX = 0, panY = 0;
let zoom = 1.0;
let isDragging = false;
let lastMouseX, lastMouseY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity()); // Extrémně ostrý obraz na mobilech a retině
  textFont('sans-serif');
  
  inicializujHlubokaData();
  runSimulation();
  
  panX = windowWidth / 2;
  panY = windowHeight * 0.15;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  panX = windowWidth / 2;
}

function draw() {
  background(15, 15, 25); // Ještě temnější, profesionálnější podklad
  
  let scaleFactor = 0.35; 
  hoveredNode = null;
  
  updateLayout(rootPrijmy, -15, 0, scaleFactor, -1);
  updateLayout(rootVydaje, 15, 0, scaleFactor, 1);
  
  push();
  translate(panX, panY);
  scale(zoom);
  
  // Zapnutí plynulého prolínání pro křivky
  blendMode(BLEND);
  
  rootPrijmy.drawNode(-1, 0);
  rootVydaje.drawNode(1, 0);
  pop();
  
  drawUI();
  
  if (hoveredNode != null) {
    drawTooltip(hoveredNode);
  }
}

function formatMoney(val) {
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
}

function drawUI() {
  // Rozmazaný skleněný efekt pro UI lišty (Glassmorphism simulace)
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(0,0,0,0.5)';
  
  noStroke();
  fill(15, 15, 25, 240);
  rect(0, 0, width, 100);
  rect(0, height - 80, width, 80);
  
  drawingContext.shadowBlur = 0; // Vypnutí stínů pro texty

  // HORNÍ LIŠTA
  fill(255);
  textAlign(CENTER, TOP);
  textSize(min(22, width * 0.05));
  text("INTERAKTIVNÍ ROZPOČET ČR", width / 2, 10);
  
  let btnY = 45;
  textSize(20);
  
  fill(30, 30, 45); rect(width/2 - 90, btnY, 40, 35, 8);
  fill(255); text("<", width/2 - 70, btnY + 6);
  
  fill(220, 220, 255); text(currentYear, width/2, btnY + 6);
  
  fill(30, 30, 45); rect(width/2 + 50, btnY, 40, 35, 8);
  fill(255); text(">", width/2 + 70, btnY + 6);
  
  let zx = 15;
  fill(30, 30, 45); 
  rect(zx, 10, 35, 35, 8); fill(255); text("+", zx + 17, 16); 
  rect(zx, 55, 35, 35, 8); fill(255); text("-", zx + 17, 61); 
  
  rect(width - 65, 15, 50, 35, 8); 
  fill(255); textSize(12); text("Reset", width - 40, 26); 

  // SPODNÍ LIŠTA (Dynamické zobrazení podle velikosti displeje)
  let deficit = rootVydaje.targetVal - rootPrijmy.targetVal;
  
  if (width < 600) {
    textSize(14);
    textAlign(LEFT, BOTTOM);
    fill(166, 227, 161); text(`PŘÍJMY: ${formatMoney(rootPrijmy.targetVal)}`, 15, height - 55);
    fill(243, 139, 168); text(`VÝDAJE: ${formatMoney(rootVydaje.targetVal)}`, 15, height - 35);
    fill(200, 200, 255); text(`DLUH: ${formatMoney(currentDebt)}`, 15, height - 15);
    
    textAlign(RIGHT, BOTTOM);
    fill(deficit > 0 ? color(243, 139, 168) : color(166, 227, 161));
    text(`Saldo:\n${formatMoney(-deficit)}`, width - 15, height - 25);
  } else {
    textSize(16);
    textAlign(LEFT, BOTTOM);
    fill(166, 227, 161); text(`PŘÍJMY: ${formatMoney(rootPrijmy.targetVal)} mld.`, 25, height - 25);
    
    textAlign(RIGHT, BOTTOM);
    fill(243, 139, 168); text(`VÝDAJE: ${formatMoney(rootVydaje.targetVal)} mld.`, width - 25, height - 25);
    
    textAlign(CENTER, BOTTOM);
    fill(200, 200, 255); text(`STÁTNÍ DLUH: ${formatMoney(currentDebt)} mld.`, width/2, height - 45);
    fill(deficit > 0 ? color(243, 139, 168) : color(166, 227, 161));
    text(`Roční saldo: ${formatMoney(-deficit)} mld.`, width/2, height - 20);
  }
}

function drawTooltip(n) {
  let perc = n.parent != null ? `\n${(n.targetVal / n.parent.targetVal * 100).toFixed(1)} % nadřazené skupiny` : "";
  let growthTxt = (n.children.length === 0 && n.growth !== 0) ? `\nRůst: ${(n.growth * 100).toFixed(1)} % p.a.` : "";
  let txt = `${n.name}\n${formatMoney(n.targetVal)} mld. Kč${growthTxt}${perc}`;
  
  textSize(14);
  let lines = txt.split('\n');
  let maxW = 0;
  for(let l of lines) {
    let w = textWidth(l);
    if(w > maxW) maxW = w;
  }
  let tw = maxW + 24;
  
  let tx = mouseX + 15;
  let ty = mouseY + 15;
  if (tx + tw > width) tx = mouseX - tw - 15;
  if (ty + (lines.length * 18 + 20) > height) ty = mouseY - (lines.length * 18 + 25);
  
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = 'rgba(0,0,0,0.8)';
  
  fill(20, 20, 30, 245);
  stroke(n.col);
  strokeWeight(1);
  rect(tx, ty, tw, lines.length * 18 + 15, 6);
  
  drawingContext.shadowBlur = 0;
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  text(txt, tx + 12, ty + 12);
}

function checkUIInteraction() {
  let btnY = 45;
  if (mouseY > btnY && mouseY < btnY + 35) {
    if (mouseX > width/2 - 90 && mouseX < width/2 - 50) {
      if (currentYear > 2024) currentYear--; runSimulation(); return true;
    }
    if (mouseX > width/2 + 50 && mouseX < width/2 + 90) {
      if (currentYear < 2050) currentYear++; runSimulation(); return true;
    }
  }
  if (mouseX > 15 && mouseX < 50) {
    if (mouseY > 10 && mouseY < 45) { zoom *= 1.25; return true; }
    if (mouseY > 55 && mouseY < 90) { zoom /= 1.25; return true; }
  }
  if (mouseX > width - 65 && mouseX < width - 15 && mouseY > 15 && mouseY < 50) {
    panX = width / 2; panY = windowHeight * 0.15; zoom = 1.0; return true;
  }
  return false;
}

function mousePressed() {
  if (checkUIInteraction()) return false;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  isDragging = false;
  return false; 
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

function mouseWheel(event) {
  if(mouseY > 100 && mouseY < height - 80) {
    let zoomAmount = event.delta > 0 ? 0.85 : 1.15; // Rychlejší zoom
    panX = mouseX - (mouseX - panX) * zoomAmount;
    panY = mouseY - (mouseY - panY) * zoomAmount;
    zoom *= zoomAmount;
    return false;
  }
}

// ==========================================
// TŘÍDA UZLU S VIZUÁLNÍM LOD (Sémantický Zoom)
// ==========================================
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
  
  drawNode(dir, depth) {
    // Plynulá kinematika (interpolace)
    this.dispX = lerp(this.dispX, this.targetX, 0.15);
    this.dispY = lerp(this.dispY, this.targetY, 0.15);
    this.dispW = lerp(this.dispW, this.targetW, 0.15);
    this.dispH = lerp(this.dispH, this.targetH, 0.15);
    
    // Výpočet skutečné vizuální velikosti na obrazovce (LOD metrika)
    let renderH = this.dispH * zoom;
    let renderW = this.dispW * zoom;
    
    // Optimalizace: Pokud je uzel na obrazovce menší než 1 pixel, nekreslíme ho
    if (renderH < 1) return;

    let adjX = (mouseX - panX) / zoom;
    let adjY = (mouseY - panY) / zoom;
    let isHovered = (adjX >= this.dispX && adjX <= this.dispX + this.dispW && adjY >= this.dispY && adjY <= this.dispY + this.dispH);
    
    if (isHovered && !isDragging && mouseY > 100 && mouseY < height-80) {
      hoveredNode = this;
    }
    
    // LOD 1: Pokud je to malé, kreslíme jen minimalistický indikátor (barvu bez okrajů)
    if (renderH < 8) {
      noStroke();
      fill(this.col);
      rect(this.dispX, this.dispY, this.dispW, this.dispH, 2);
    } 
    // LOD 2: Dostatečně velké pro plný box, stíny a texty
    else {
      if (isHovered) {
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = this.col.toString();
      } else {
        drawingContext.shadowBlur = 4;
        drawingContext.shadowColor = 'rgba(0,0,0,0.4)';
      }
      
      fill(10, 10, 18, 220); // Tmavé sklo pro tělo bloku
      stroke(isHovered ? color(255) : this.col);
      strokeWeight(max(1 / zoom, 0.5));
      rect(this.dispX, this.dispY, this.dispW, this.dispH, 5);
      
      drawingContext.shadowBlur = 0; // Vypnout stín pro text
      
      // Sémantický zoom pro TEXT
      if (renderH > 22) {
        fill(220, 220, 240); 
        textAlign(LEFT, TOP);
        textSize(12);
        
        let label = this.name;
        // Ořezání textu, pokud je blok úzký
        if (textWidth(label) > this.dispW - 15) {
          label = label.substring(0, 18) + "..";
        }
        text(label, this.dispX + 8, this.dispY + 6);
        
        // Hodnota se ukáže, až když si to ještě víc přiblížíš
        if (renderH > 40) {
          fill(this.col);
          textSize(11);
          text(`${formatMoney(this.targetVal)} mld.`, this.dispX + 8, this.dispY + 22);
          
          // Indikátor podskupin
          if (this.children.length > 0) {
            fill(255, 255, 255, 150);
            text(`▶ ${this.children.length}`, this.dispX + this.dispW - 30, this.dispY + 22);
          }
        }
      }
    }
    
    // Organické Spojovací Křivky (Bezier) k potomkům
    if (this.expanded && this.children.length > 0) {
      let startX = this.dispX + (dir === 1 ? this.dispW : 0);
      let endX = startX + (dir * 25); // Širší rozestup pro křivky
      
      noFill();
      strokeWeight(max(1.5 / zoom, 0.5));
      
      for (let child of this.children) {
        // Propojení kreslíme, jen když má dítě smysluplnou velikost
        if (child.dispH * zoom >= 1) {
          let startY = this.dispY + (this.dispH / 2);
          let endY = child.dispY + (child.dispH / 2);
          
          // Barva křivky plynule přechází (nebo aspoň bere barvu dítěte s průhledností)
          let c = color(child.col.levels[0], child.col.levels[1], child.col.levels[2], 120);
          stroke(c);
          
          // Kontrolní body pro elegantní S-křivku (Bezier)
          let controlX1 = startX + (dir * 12);
          let controlX2 = endX - (dir * 12);
          
          bezier(startX, startY, controlX1, startY, controlX2, endY, endX, endY);
          
          child.drawNode(dir, depth + 1);
        }
      }
    }
  }
}

function updateLayout(n, startX, startY, scaleF, dir) {
  let nHeight = n.targetVal * scaleF;
  let nWidth = 200; // Mírně širší bloky pro eleganci
  
  n.targetX = dir === -1 ? startX - nWidth : startX;
  n.targetY = startY;
  n.targetW = nWidth;
  n.targetH = nHeight;
  
  if (n.expanded && n.children.length > 0) {
    let currentY = startY;
    let nextStartX = startX + (dir * (nWidth + 25)); // Místo na křivky
    
    for (let child of n.children) {
      updateLayout(child, nextStartX, currentY, scaleF, dir);
      currentY += child.targetVal * scaleF + 3; // Zvětšená mezera mezi řádky
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

// ZDE JE STEJNÁ INICIALIZAČNÍ FUNKCE DAT JAKO V MINULÉM KROKU
function inicializujHlubokaData() {
  rootPrijmy = new Node("CELKOVÉ PŘÍJMY", 0, 0, color(166, 227, 161));
  let dane = rootPrijmy.addChild("Daňové příjmy", 0, 0.0, color(148, 226, 213));
  dane.addChild("DPH", 386, 0.03, color(116, 199, 236)); 
  
  let danePrijem = dane.addChild("Daně z příjmů", 0, 0.0, color(137, 180, 250));
  danePrijem.addChild("Právnické osoby (Firmy)", 240, 0.025, color(137, 180, 250));
  let danePrijemFO = danePrijem.addChild("Fyzické osoby", 0, 0.0, color(180, 190, 254));
  danePrijemFO.addChild("Ze závislé činnosti", 140, 0.04, color(180, 190, 254));
  danePrijemFO.addChild("Z přiznání (OSVČ)", 10, 0.03, color(180, 190, 254));
  danePrijemFO.addChild("Srážková daň", 10, 0.02, color(180, 190, 254));
  
  let spotrebni = dane.addChild("Spotřební daně", 0, 0.0, color(203, 166, 247));
  spotrebni.addChild("Minerální oleje", 85, 0.01, color(203, 166, 247));
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
  
  let nedanove = rootPrijmy.addChild("Nedaňové a kapitálové", 0, 0.0, color(250, 179, 135));
  nedanove.addChild("Příjmy z rozpočtu EU", 110, 0.01, color(250, 179, 135));
  nedanove.addChild("Příjmy z prodeje majetku", 15, 0.0, color(250, 179, 135));
  nedanove.addChild("Sankce a poplatky", 104, 0.02, color(250, 179, 135));

  rootVydaje = new Node("CELKOVÉ VÝDAJE", 0, 0, color(243, 139, 168));
  
  let mpsv = rootVydaje.addChild("Ministerstvo práce", 0, 0.0, color(235, 160, 172));
  let duchody = mpsv.addChild("Důchodový systém", 0, 0.0, color(243, 139, 168)); 
  duchody.addChild("Starobní důchody", 580, 0.045, color(243, 139, 168));
  duchody.addChild("Invalidní důchody", 65, 0.03, color(243, 139, 168));
  duchody.addChild("Vdovské a sirotčí", 55, 0.025, color(243, 139, 168));
  
  let podpora = mpsv.addChild("Sociální podpora", 0, 0.0, color(210, 150, 160));
  podpora.addChild("Rodičovský příspěvek", 42, 0.01, color(210, 150, 160));
  podpora.addChild("Příspěvek na bydlení", 18, 0.05, color(210, 150, 160));
  podpora.addChild("Přídavky na děti", 6, 0.02, color(210, 150, 160));
  podpora.addChild("Ostatní dávky", 14, 0.02, color(210, 150, 160));
  
  let msmt = rootVydaje.addChild("Ministerstvo školství", 0, 0.0, color(250, 179, 135));
  let regSkol = msmt.addChild("Regionální školství", 0, 0.0, color(250, 179, 135));
  regSkol.addChild("Platy učitelů", 160, 0.035, color(250, 179, 135));
  regSkol.addChild("Provozní výdaje škol", 30, 0.02, color(250, 179, 135));
  msmt.addChild("Vysoké školy", 40, 0.03, color(250, 179, 135));
  msmt.addChild("Věda a výzkum", 43, 0.04, color(250, 179, 135));
  
  let zdrav = rootVydaje.addChild("Ministerstvo zdravotnictví", 0, 0.0, color(249, 226, 175));
  zdrav.addChild("Státní pojištěnci", 145, 0.04, color(249, 226, 175));
  zdrav.addChild("Dotace nemocnicím", 15, 0.02, color(249, 226, 175));
  
  let obrana = rootVydaje.addChild("Ministerstvo obrany", 0, 0.0, color(166, 227, 161));
  obrana.addChild("Akvizice techniky", 70, 0.06, color(166, 227, 161));
  obrana.addChild("Personální náklady", 50, 0.04, color(166, 227, 161));
  obrana.addChild("Provoz a výcvik", 40, 0.03, color(166, 227, 161));
  
  let doprava = rootVydaje.addChild("Ministerstvo dopravy", 0, 0.0, color(148, 226, 213));
  let sfdi = doprava.addChild("Dopravní infrastruktura", 0, 0.0, color(148, 226, 213));
  sfdi.addChild("Dálnice a silnice 1. tř.", 80, 0.03, color(148, 226, 213));
  sfdi.addChild("Železnice", 55, 0.03, color(148, 226, 213));
  doprava.addChild("Dotace regionům", 15, 0.02, color(148, 226, 213));
  
  let vnitro = rootVydaje.addChild("Ministerstvo vnitra", 0, 0.0, color(137, 180, 250));
  vnitro.addChild("Policie ČR", 50, 0.03, color(137, 180, 250));
  vnitro.addChild("Hasičský sbor", 15, 0.03, color(137, 180, 250));
  vnitro.addChild("Státní správa", 35, 0.02, color(137, 180, 250));
  
  dluhovaObsluha = rootVydaje.addChild("Obsluha st. dluhu", 95, 0.0, color(203, 166, 247));
  
  let ostatni = rootVydaje.addChild("Ostatní resorty", 0, 0.0, color(180, 190, 254));
  ostatni.addChild("Ministerstvo zemědělství", 65, 0.015, color(180, 190, 254));
  ostatni.addChild("Ministerstvo průmyslu", 50, 0.02, color(180, 190, 254));
  ostatni.addChild("Zbytek a rezervy", 151, 0.02, color(180, 190, 254));
  
  rootPrijmy.expanded = true;
  dane.expanded = true;
  rootVydaje.expanded = true;
  mpsv.expanded = true;
  msmt.expanded = true;
}
