// Rókák Nyulak Farkasok v.2
// Simulation script providing rivalising predators and preys
//
// Copyright (C) 2013 REUSS András
// 
// This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.


//globals

var graph_plant = {
  x : 0,
  max : 0,
  scale : 0.0,
  opacity : 0.45
}

var graph_anim = {
  x : 0,
  max : 0,
  scale : 0.0,
  opacity : 0.45
}

var table = {
  width : 100,
  height : 100,
  field : 5
};

var findmode = {
  bg : 0,
  fg : 1,
  noAnimal : 2 // plants, empty or dried in fg
};

var palette = {
  base: "#FFFFFF",
  plant_live: "#00FF00",
  plant_dry: "#FFD700",
  rabbit: "#1E90FF",
  fox: "#FF0000",
  wolf: "#080808",  // warning: #000000 is impossible!
  any: "#CABAFA"
};

// RULES
// Plants
// Starts with startvalue entities
// if color = dried
//  if random number <= mortality
//    then color = white
//    else color = green
// else if color = green
//  if random number <= mortality
//    then color = dried
// if color = green and random number <= natality and there is empty square in 1 distance 
//    then new entity 

var plants = {
    id : "plants",
    startvalue : 8000, // max 
    currentvalue : 0,
    mortality : 5, // 5 death / 100
    natality : 95, // 95 births / 100
    color : palette.plant_live,
};

var driedplants = {
    id : "driedplants",
    regeneration: 60,
    currentvalue : 0,
    color : palette.plant_dry,
};

var emptyfield = {
    id : "empty_field",
    color : palette.base,
};

// RULES
// Animals
// Starts with startvalue entities
// if random number <= mortality then dies
//    otherwise it eats as much as it can in its zone and moves there 
//    if number of food in zone < needed then it dies
//    if random number <= natality and there is empty square in 1 distance then new entity 

var rabbits = {
    id : "rabbits",
    startvalue : 4000, 
    currentvalue : 0,
    mortality : 5, // 5 death / 100
    natality : 95, // 95 births / 100
    zone : 2, // neighbour squares (it is speed)
    needed : 1, // food needed
    food : plants,
    color : palette.rabbit,
};

var foxes = {
    id : "foxes",
    startvalue : 2000, 
    currentvalue : 0,
    mortality : 5, // 5 death / 100
    natality : 95, // 95 births / 100
    zone : 1, // neighbour squares (it is speed)
    needed : 1, // food needed
    food : rabbits,
    color : palette.fox,
};

var wolves = {
    id : "wolves",
    startvalue : 2000, 
    currentvalue : 0,
    mortality : 5, // 5 death / 100
    natality : 95, // 95 births / 100
    zone : 1, // neighbour squares (it is speed)
    needed : 1, // food needed
    food : rabbits,
    color : palette.wolf,
};

var lifeforms = [rabbits, plants, wolves, foxes, driedplants];
var animforms = [rabbits, wolves, foxes];
var plantforms = [plants, driedplants];
var errordata = new Array();

//==============================================
//======= services =============================
//==============================================

function printToBox(kiirando, box)
{ 
  var d=document.getElementById(box);
  d.innerHTML = kiirando;
}

function utanir(kiirando, hely)
{ 
  var d=document.getElementById(hely);
  d.innerHTML += "<BR>" ;
  d.innerHTML += kiirando ;
}

function intToHex(num)
{
  if (num < 16)
  {
    return "0" + num.toString(16).toUpperCase();
  }
  return num.toString(16).toUpperCase();
}

function findCountedItemsAsArrayInRange(xpoz, ypoz, range, what, mode, count)
{
  var startx = xpoz - range < 0 ? 0 : xpoz - range;
  var starty = ypoz - range < 0 ? 0 : ypoz - range;
  var endx = xpoz + range > table.width - 1? table.width : xpoz + range + 1;
  var endy = ypoz + range > table.height - 1? table.height  : ypoz + range + 1;
  var colors = {fg : 0, bg : 0};
  var output = new Array();  
  for (var i = startx; i < endx; i++)
  {
    if (count < 1)
    {
      break;
    }
    for (var j = starty; j < endy; j++)
    { 
        if (count < 1)
        {
          break;
        }
        colors = getColorsForXY(i, j);
        if (mode == findmode.noAnimal &&
            (colors.fg == plants.color 
              || colors.fg == driedplants.color 
              || colors.fg == emptyfield.color ))
        {
          output.push ({x: i, y: j, bg: colors.bg, fg: colors.fg});
          count--;
        }
        else if (mode == findmode.bg && colors.bg == what)
        {
          output.push ({x: i, y: j, bg: colors.bg, fg: colors.fg});
          count--;
        }
        else if (mode == findmode.fg && colors.fg == what)
        {
          output.push ({x: i, y: j, bg: colors.bg, fg: colors.fg});
          count--           
        }
    }
  } 
  return output;
}

function updateFieldsWithValues()
{
  var prop = ["natality", "mortality", "startvalue", "regeneration", "zone", "needed"];
  for (var i = 0; i < lifeforms.length; i++)
  {
    for (var j = 0; j < prop.length; j++)
    {
      if (lifeforms[i][prop[j]])
      {
        var val = document.getElementById(prop[j] + "_" + lifeforms[i].id);
        val.value = lifeforms[i][prop[j]];
      }
    }
  }
}


//==============================================
//======= draw functions =======================
//
// table.field (5x5):
//  bbfbb
//  bfffb
//  fffff
//  bfffb
//  bbfbb
//==============================================

function clearGrid(spaceToClear)
{
  var c=document.getElementById(spaceToClear);
  var ctx=c.getContext("2d");
  ctx.fillStyle = emptyfield.color;
  ctx.fillRect(0, 0, c.width, c.height);
} 

function getColorsForXY(pozx, pozy)
{
// BxFxx
  var c=document.getElementById("terulet");
  var ctx=c.getContext("2d");
  var imgData = ctx.getImageData(pozx * table.field, pozy * table.field, table.field, table.field); 
  var fg = new Array(3);
  var bg = new Array(3) ;
  var fgcol = "#";
  var bgcol = "#";
  for (var i = 0; i < 3; i++)
    {
      bg[i] = imgData.data[i];
      fg[i] = imgData.data[i+8];
      bgcol += intToHex(imgData.data[i]);
      fgcol += intToHex(imgData.data[i+8]);
    }
  return {fg : fgcol, bg : bgcol};
}


function drawFieldAtPoz(bg, fg, pozx, pozy)
// Coloring: if center is white, then bg, else fg in the center
{
  var c=document.getElementById("terulet");
  var ctx=c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(pozx * table.field, pozy * table.field, table.field, table.field);
  if (fg != bg)
  {
    ctx.fillStyle = fg;
    ctx.fillRect(pozx * table.field + 2 , pozy * table.field , 1, 1);  
    ctx.fillRect(pozx * table.field + 1 , pozy * table.field + 1 , 3, 1);  
    ctx.fillRect(pozx * table.field , pozy * table.field + 2, table.field, 1);  
    ctx.fillRect(pozx * table.field + 1 , pozy * table.field + 3 , 3, 1);  
    ctx.fillRect(pozx * table.field + 2 , pozy * table.field + 4 , 1, 1);  
  }
}


function drawRandomObject(mode, object)
{
  var x;
  var y;
  var colors;
  x = Math.floor(Math.random() * table.width );
  y = Math.floor(Math.random() * table.height);
  colors = getColorsForXY(x, y);
// plants
  if (mode == findmode.bg && colors.bg == emptyfield.color && colors.fg == emptyfield.color)
  {
     drawFieldAtPoz(object.color, object.color, x, y); 
     object.currentvalue++;
  }
// animals
  else if (mode == findmode.fg && ( colors.fg == emptyfield.color 
              || colors.fg == plants.color))
  {
     drawFieldAtPoz(colors.bg, object.color, x, y);
     object.currentvalue++;
  }
}


//==============================================
//========== simulation reset ==================
//==============================================

function resetSimulation()
{
  var start = new Date().getTime();

  plants.currentvalue = 0;
  driedplants.currentvalue = 0;
  rabbits.currentvalue = 0;
  foxes.currentvalue = 0;
  wolves.currentvalue = 0;
  szam = 0;
  printToBox(szam, "lepesek");
  clearGrid("terulet");
  clearGrid("diag_plant");
  clearGrid("diag_anim");
  graph_anim.x = 0;
  graph_plant.x = 0;

  while (plants.startvalue > plants.currentvalue)
  {
    drawRandomObject(findmode.bg, plants);
  }
  while (rabbits.startvalue > rabbits.currentvalue)
  {
    drawRandomObject(findmode.fg, rabbits);
  }
  while (foxes.startvalue > foxes.currentvalue)
  {
    drawRandomObject(findmode.fg, foxes);
  }
  while (wolves.startvalue > wolves.currentvalue)
  {
    drawRandomObject(findmode.fg, wolves);
  }
  for (i = 0; i < lifeforms.length; i++)
  {
    printToBox(lifeforms[i].currentvalue, lifeforms[i].id + "_out");
  }

  var end = new Date().getTime();
  printToBox("Generation time: " + (end - start), "mesured_time");
}

//==============================================
//======= simulation function begin ============
//==============================================
 var timeout;
 var timer_is_on = 0;
 var szam = 0;

function stop()
{
 clearTimeout(timeout);
 timer_is_on = 0;
}

function simulateAnimals()
{
  var x = Math.floor(Math.random()*101);
  var y = Math.floor(Math.random()*101);
  var colors = getColorsForXY(x, y);
  var animal = null;
  printToBox(szam++, "lepesek"); 

  if (colors.fg == rabbits.color)
  {
    animal = rabbits;
  }
  else if (colors.fg == foxes.color)
  {
    animal = foxes;
  }
  else if (colors.fg == wolves.color)
  {
    animal = wolves;
  }

  if (animal != null)
  {
    var mortality = Math.floor(Math.random()*101);
    if (animal.mortality != 0 && mortality <= animal.mortality)
    {
      animal.currentvalue--;
      printToBox(animal.currentvalue, animal.id + "_out");

      drawFieldAtPoz(colors.bg, colors.bg, x, y);
    }
    else
    {
      var tempx = x;
      var tempy = y ;
      var tempbg = colors.bg;
      var tempfg = colors.fg;
      var neededFood = animal.needed;
 
      // clear current position 
      if (colors.bg == (animal.food).color && animal == rabbits)
      {
      // if food in place, need decreases 
        neededFood--;
        plants.currentvalue--;
        driedplants.currentvalue++;
        tempbg = driedplants.color;
        tempfg = driedplants.color;
        printToBox(plants.currentvalue, "plants_out");
        printToBox(driedplants.currentvalue, "driedplants_out");
      }
      else
      {
      // food not in place
        tempbg = colors.bg;
        tempfg = colors.bg;  
      }
      drawFieldAtPoz(tempbg, tempfg, x, y);

      // clear needed cells
      var found = findCountedItemsAsArrayInRange(x, y, animal.zone, 
                      (animal.food).color, findmode.fg, neededFood);

      for (var i = 0; i < found.length; i++)
      {
        tempx = found[i].x;       
        tempy = found[i].y;       
        tempfg = found[i].fg;       
        tempbg = found[i].bg;       
      // eats all it needs and moves
        if (animal == rabbits)
        {
          driedplants.currentvalue++;
          tempbg = driedplants.color;
          printToBox(driedplants.currentvalue, "driedplants_out");
        }
        (animal.food).currentvalue--;
        printToBox((animal.food).currentvalue, (animal.food).id + "_out");
        drawFieldAtPoz(tempbg, tempbg, tempx, tempy); // fill with background
      }
 
      if (found.length < neededFood)
      {
        // not enough food, so dies
        animal.currentvalue--;
        printToBox(animal.currentvalue, animal.id + "_out");
      }
      else
      {
        // survives and takes last position
        drawFieldAtPoz(tempbg, animal.color, tempx, tempy);

        var natality = Math.floor(Math.random()*101);
        if (animal.natality != 0 && natality <= animal.natality)
        {
        // reproducing
          var found = findCountedItemsAsArrayInRange(tempx, tempy, 1, 
                        palette.any, findmode.noAnimal, 1);
          if (found.length > 0)
          {
            animal.currentvalue++;
            printToBox(animal.currentvalue, animal.id + "_out");
            drawFieldAtPoz(found[0].bg, animal.color, found[0].x, found[0].y);
           }
        }
      }
    }
  }
}

function simulatePlants()
{
  var x = Math.floor(Math.random()*101);
  var y = Math.floor(Math.random()*101);
  var colors = getColorsForXY(x, y);
  printToBox(szam++, "lepesek"); 

  if (colors.bg == driedplants.color) // dried
  {
    var regeneration = Math.floor(Math.random()*101);
    driedplants.currentvalue--;

    if (driedplants.regeneration != 0
        && regeneration <= driedplants.regeneration)
// if set to 0, no regeneration
    {
      colors.bg = plants.color; // rebirth
      plants.currentvalue++;
    }
    else
    {
      colors.bg = emptyfield.color; // yes, it dies
    }
  }
  else if (colors.bg == plants.color) // green
  {
    var mortality = Math.floor(Math.random()*101);
    if (plants.mortality != 0 && mortality <= plants.mortality)
    // if set to 0, it survives
    {
      colors.bg = driedplants.color;
      plants.currentvalue--;
      driedplants.currentvalue++;
    }
    else
    {
      var natality = Math.floor(Math.random()*101);
      if (plants.natality != 0 && natality <= plants.natality)
      // if set to 0, no birth
      {
        var match = findCountedItemsAsArrayInRange(x, y, 1, emptyfield.color, findmode.bg, 1);
        if (match.length > 0)
        {
          match[0].bg = plants.color;
          if (match[0].fg == emptyfield.color)
          {
            match[0].fg = match[0].bg;
          }
          plants.currentvalue++;
          drawFieldAtPoz(match[0].bg, match[0].fg, match[0].x, match[0].y);
          printToBox(plants.currentvalue, "plants_out");
          printToBox(driedplants.currentvalue, "driedplants_out");
        }
      }
    }
  }
  if (colors.fg == plants.color  // update also foreground
        || colors.fg == driedplants.color)
  {
    colors.fg = colors.bg;
  }

  drawFieldAtPoz(colors.bg, colors.fg, x, y);

  printToBox(plants.currentvalue, "plants_out");
  printToBox(driedplants.currentvalue, "driedplants_out");
}


function simulation()
{
  simulatePlants();
  simulateAnimals();
  if (szam % 10 == 0)
  {
  updateDiagram(plantforms, graph_plant, "diag_plant", "black");
  updateDiagram(animforms, graph_anim, "diag_anim", "white");
  }

  if (timer_is_on)
  {
  timeout = setTimeout( function () { simulation()}, 0); 
  }
}

function start()
 {
   if (!timer_is_on)
   {
     timer_is_on = 1;
     simulation();
   }
 }
 
//==============================================
//======= events and errors ====================
//==============================================

function manageError(datain, action)
{
  var string = datain.id + ": " + datain.value +  ": out of range. Possible values: " + datain.min + "-" + datain.max;

  if (action == "add")
  {
    errordata[datain.id] = string;
  }
  else if (action == "remove")
  {
    delete errordata[datain.id];
  }
  var keys = Object.keys(errordata);
  
  if (keys.length > 0)
  {
    printToBox("Error:", "errors");
    for (var j = 0; j < keys.length; j++)
    {
      utanir(errordata[keys[j]], "errors"); 
    }
    document.getElementById("errors").style.backgroundColor = "red";
  }
  else
  {
    printToBox("", "errors");
    document.getElementById("errors").style.backgroundColor = "";
  }
}

function updateData(datain)
{
  var arr = (datain.id).split("_");
  var selected;
  var j = 0;
  while (j < lifeforms.length && lifeforms[j].id != arr[1])
  {
    j++;
  }
  selected = lifeforms[j];

  if (isNaN(parseInt(datain.value)) 
      || parseInt(datain.value) < parseInt(datain.min) 
      || parseInt(datain.value) > parseInt(datain.max))
  {
    datain.style.backgroundColor = "red";
    manageError(datain, "add");
  }
  else
  {
    selected[arr[0]] = parseInt(datain.value);
    datain.value=parseInt(datain.value);
    datain.style.backgroundColor = "white";
    manageError(datain, "remove");
  }
}


//==============================================
//========= diagram drawing ====================
//==============================================

function colorToRGBaString(col)
{
  var color = "rgba(";
  color += parseInt(col.substring(1,3), 16) + ", " ;
  color += parseInt(col.substring(3,5), 16) + ", ";
  color += parseInt(col.substring(5), 16) + ", ";
  return color;
}


function updateDiagram(lifearray, graphtype, diagname, kurzorcolor)
{
  var c=document.getElementById(diagname);
  var ctx=c.getContext("2d");
  var color;
  var scaledvalue;
  var sum = 0;
  var y = 0;

  if (graphtype.x == c.width)
  {
    graphtype.x = 0;
  }

  for (var i = 0; i < lifearray.length; i++)
  {
      sum += lifearray[i].currentvalue;
  }
  
  graphtype.scale = c.height / sum;

  for (var i = 0; i < lifearray.length; i++)
  {
    color = colorToRGBaString(lifearray[i].color);
    ctx.fillStyle = color + "1.0)"; 
    if (i == lifearray.length - 1)
    {
      ctx.fillRect(graphtype.x, y, 1, c.height - y);
    }
    else
    {
      scaledvalue = Math.ceil(lifearray[i].currentvalue * graphtype.scale);
      ctx.fillRect(graphtype.x, y, 1, scaledvalue);
      y += scaledvalue;
    }
  }
  
  if (graphtype.x < c.width - 1)
  {
    ctx.fillStyle = kurzorcolor;
    ctx.fillRect(graphtype.x + 1, 0, 1, c.height);
  }
  
  graphtype.x++;
}

// TODO
// - write documentation
// - create translations
// - change texts to images
// - create challenges: settings -> objectives 
//    -- e.g. rabbits: 5 -> save rabbits
//    -- maybe with some parameters disabled... 
//    -- to implement: challenge tester, value initialisation ...
// - implement data saving (png?, localstorage?, both?)
// Ok, that is fine.

