const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const view = { x: 350, y: 100, scale: 1 };

const mapimg = new Image();
mapimg.src = "./indonesia.svg";
const pinimg = new Image();
pinimg.src = "./map-pin.svg";

const game = document.getElementById("game");
const pincontainer = document.getElementById("pincontainer");

const transportmode = {
  train: {
    color: "#33E339",
    speed: 120,
    cost: 500,
  },
  bus: {
    color: "#A83BE8",
    speed: 80,
    cost: 100,
  },
  airplane: {
    color: "#000000",
    speed: 800,
    cost: 1000,
  },
};

let fromPin = null;
let toPin = null;

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  ctx.drawImage(mapimg, 0, 0);

  const pins = getData("pins");

  pincontainer.innerHTML = "";
  pins.forEach((pin) => {
    ctx.drawImage(pinimg, pin.x - 10, pin.y - 10, 20, 20);

    const worldx = pin.x * view.scale + view.x;
    const worldy = pin.y * view.scale + view.y;
    let bordercolor = fromPin?.x == pin.x ? "blue" : "black";

    pincontainer.innerHTML += `<div class="modal pin" style='border-color: ${bordercolor}; left: ${worldx}px; top: ${worldy - 10}px;'>
          <div style='border-color: ${bordercolor};'>
            <h6>${pin.name}</h6>
          </div>
          <div onclick="addFromPin(${pin.x})" style='border-color: ${bordercolor};'>
            <h6 style="color: blue">Link</h6>
          </div>
          <div style='border-color: ${bordercolor};' onclick="deletePin(${pin.x})">
            <h6>🗑️</h6>
          </div>
        </div>`;
    ctx.beginPath();

    ctx.closePath();
  });

  const conns = getData("conns");

  let counts = {};

  conns.forEach((conn) => {
    let pairId = [conn.from.name, conn.to.name].sort().join("-");

    const offset = counts[pairId] || 0;
    counts[pairId] = offset + 1;

    const gap = 5;
    const shift = offset * gap;
    ctx.beginPath();
    ctx.strokeStyle = transportmode[conn.mode].color;
    ctx.moveTo(conn.from.x, conn.from.y + shift);
    ctx.lineTo(conn.to.x, conn.to.y + shift);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.font = `10px Arial`;
    console.log(conn.dist.length);
    const midX = (conn.from.x + conn.to.x) / 2;
    const midY = (conn.from.y + conn.to.y) / 2;

    const horizontalGap = 35;

    const sideShift =
      (offset % 2 === 0 ? 1 : -1) * Math.ceil(offset / 2) * horizontalGap;

    ctx.textAlign = "center";
    ctx.fillText(conn.dist, midX + sideShift, midY - 10);
    ctx.closePath();
  });

  if (fromPin && toPin) {
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.moveTo(fromPin.x, fromPin.y);
    ctx.lineTo(toPin.x, toPin.y);
    ctx.stroke();
    ctx.closePath();
  }
  ctx.restore();

  updateModal();
}

function addFromPin(pinx) {
  if (fromPin && fromPin.x === pinx) {
    fromPin = null;
    render();
  } else {
    const pins = getData("pins");
    const findPin = pins.find((p) => p.x === pinx);
    fromPin = findPin;
    render();
  }
}

function deletePin(x) {
  let pins = getData("pins");
  let pin = pins.find((p) => p.x === x);
  let conns = getData("conns");

  console.log(conns.length);
  conns = conns.filter(
    (c) => c.from.name !== pin.name && c.to.name !== pin.name,
  );
  console.log(conns.length);
  const indexPin = pins.indexOf(pin);
  pins.splice(indexPin, 1);

  setData("pins", pins);
  setData("conns", conns);
  render();
}

canvas.addEventListener("mousemove", (e) => {
  if (e.buttons) {
    view.x += e.movementX;
    view.y += e.movementY;
    render();
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const speed = 0.1;
    const delta = e.deltaY < 0 ? speed : -speed;

    const newScale = view.scale + delta;

    const mousex = e.offsetX;
    const mousey = e.offsetY;

    const worldx = (mousex - view.x) / view.scale;
    const worldy = (mousey - view.y) / view.scale;
    if (newScale > 0.5 && newScale < 8) {
      view.x = mousex - worldx * newScale;
      view.y = mousey - worldy * newScale;
      view.scale = newScale;
      render();
    }
  },
  { passive: false },
);

const modalconn = document.querySelector(".modal.conn");
const distinput = document.getElementById("distinput");
const modeinput = document.getElementById("modeinput");
const addconn = document.getElementById("addconn");
const closeconn = document.getElementById("closeconn");
let currentconn = { x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
  if (fromPin) {
    const worldx = (e.offsetX - view.x) / view.scale;
    const worldy = (e.offsetY - view.y) / view.scale;

    const pins = getData("pins");

    const pin = pins.find(
      (p) =>
        worldx > p.x - 10 &&
        worldx < p.x - 10 + 20 &&
        worldy > p.y - 10 &&
        worldy < p.y - 10 + 20,
    );

    if (pin) {
      if (pin.x !== fromPin.x) {
        toPin = pin;
        modalconn.style.display = "block";
        currentconn.x = (fromPin.x + toPin.x) / 2;
        currentconn.y = (fromPin.y + toPin.y) / 2;
        distinput.focus();
        render();
      }
    }
  }
});

addconn.addEventListener("click", (e) => {
  const dist = distinput.value.trim();
  const transport = modeinput.value.trim();

  if (dist !== "" && transport !== "") {
    const conns = getData("conns");
    conns.push({
      id: Date.now(),
      from: fromPin,
      to: toPin,
      dist: dist,
      mode: transport,
    });
    setData("conns", conns);
    modalconn.style.display = "none";
    fromPin = null;
    toPin = null;
    currentconn.x = 0;
    currentconn.y = 0;
    distinput.value = "";
    modeinput.value = "";
    render();
  }
});

closeconn.addEventListener("click", () => {
  modalconn.style.display = "none";
  fromPin = null;
  toPin = null;
  currentconn.x = 0;
  currentconn.y = 0;
  render();
});

const modaladd = document.querySelector(".modal.add");
const closeadd = document.getElementById("closeadd");
const namepin = document.getElementById("namepin");
let currentPin = { x: 0, y: 0 };

canvas.addEventListener("dblclick", (e) => {
  const mousex = e.offsetX;
  const mousey = e.offsetY;

  modaladd.style.display = "block";

  const worldx = (mousex - view.x) / view.scale;
  const worldy = (mousey - view.y) / view.scale;

  currentPin.x = worldx;
  currentPin.y = worldy;

  namepin.focus();
  render();
});

closeadd.addEventListener("click", (e) => {
  modaladd.style.display = "none";
});

namepin.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && namepin.value.trim() !== "") {
    const data = getData("pins");
    data.push({
      id: Date.now(),
      x: currentPin.x,
      y: currentPin.y,
      name: namepin.value.trim(),
    });
    setData("pins", data);
    modaladd.style.display = "none";
    namepin.value = "";
    render();
  }
});

function updateModal() {
  if (modaladd.style.display === "block") {
    const screenx = currentPin.x * view.scale + view.x;
    const screeny = currentPin.y * view.scale + view.y;
    modaladd.style.left = screenx + "px";
    modaladd.style.top = screeny + "px";
  }

  if (modalconn.style.display === "block") {
    const screenx = currentconn.x * view.scale + view.x;
    const screeny = currentconn.y * view.scale + view.y;
    modalconn.style.left = screenx + "px";
    modalconn.style.top = screeny + "px";
  }
}

const getData = (key) => {
  const data = JSON.parse(localStorage.getItem(key)) || [];
  return data;
};

const setData = (key, body) => {
  const data = getData(key);
  data.push(data);
  localStorage.setItem(key, JSON.stringify(body));
};

const frompininput = document.getElementById("frompininput");
const topininput = document.getElementById("topininput");
const btnsearch = document.getElementById("btnsearch");
const sortfastest = document.getElementById("sortfastest");
const sortcheapest = document.getElementById("sortcheapest");
const listroute = document.getElementById("list-route");

let currentCriteria = "fastest";

sortfastest.addEventListener("click", () => {
  currentCriteria = "fastest";
  sortfastest.classList.add("current-criteria");
  sortcheapest.classList.remove("current-criteria");
  searchRoute();
});
sortcheapest.addEventListener("click", () => {
  currentCriteria = "cheapest";
  console.log(currentCriteria);
  sortcheapest.classList.add("current-criteria");
  sortfastest.classList.remove("current-criteria");
  searchRoute();
});

function validateInput() {
  const pins = getData("pins");
  const fromname = frompininput.value.trim().toLowerCase();
  const toname = topininput.value.trim().toLowerCase();

  const checkFrom = pins.some((pin) => pin.name.toLowerCase() === fromname);
  const checkTo = pins.some((pin) => pin.name.toLowerCase() === toname);

  if (checkFrom && checkTo) {
    btnsearch.removeAttribute("disabled");
  } else {
    btnsearch.setAttribute("disabled", true);
  }
}

frompininput.addEventListener("input", () => {
  validateInput();
});
topininput.addEventListener("input", () => {
  validateInput();
});

function djikstra() {
  const pins = getData("pins");
  const conns = getData("conns");
  const fromname = frompininput.value.trim().toLowerCase();
  const toname = topininput.value.trim().toLowerCase();

  const startpin = pins.find((pin) => pin.name.toLowerCase() === fromname);
  const targetpin = pins.find((pin) => pin.name.toLowerCase() === toname);

  if (!startpin || !targetpin) return;
  let queue = [
    { id: startpin.id, path: [], totalCost: 0, totalTime: 0, weight: 0 },
  ];
  let allResults = [];

  while (queue.length > 0) {
    queue.sort((a, b) => a.weight - b.weight);
    let current = queue.shift();
    if (current.id === targetpin.id) {
      allResults.push(current);
      if (allResults.length > 10) break;
    }

    const neighbors = conns.filter(
      (c) => c.from.id === current.id || c.to.id === current.id,
    );

    neighbors.forEach((conn) => {
      const nextId = conn.from.id === current.id ? conn.to.id : conn.from.id;

      if (current.path.some((c) => c.stepFrom === nextId)) return;
      const dist = JSON.parse(conn.dist);
      const mode = transportmode[conn.mode];
      const segmentCost = mode.cost * dist;
      const segmentTime = dist / mode.speed;
      const weight = currentCriteria === "fastest" ? segmentTime : segmentCost;

      queue.push({
        id: nextId,
        path: [
          ...current.path,
          { data: conn, stepFrom: current.id, toStep: nextId },
        ],
        totalCost: segmentCost + current.totalCost,
        totalTime: segmentTime + current.totalTime,
        weight: current.weight + weight,
      });
    });
  }

  return allResults;
}

function searchRoute() {
  listroute.innerHTML = ``;

  const allResults = djikstra();
  console.log(allResults);

  if (allResults.length === 0) {
    listroute.innerHTML =
      "<p style='color: red; margin-top: 20px; text-align: center;'>Route not found</p>";
    return;
  }

  allResults.forEach((route) => {
    console.log(route);

    listroute.innerHTML += `<div class="route">
            <div
              style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
              "
            >
              <p style="font-size: 22px">${frompininput.value} - ${topininput.value}</p>
              <p>${Math.round(route.totalTime)}h</p>
            </div>
            <ol>
              ${route.path.map((r) => {
                const pins = getData("pins");
                const fromPin = pins.find((p) => p.id === r.stepFrom);
                const toPin = pins.find((p) => p.id === r.toStep);
                return `<li>${fromPin.name} - ${toPin.name} (${r.data.mode})</li>`;
              })}
            </ol>
            <p style="margin-top: 10px; font-size: 22px">${Intl.NumberFormat(
              "id-ID",
              {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              },
            ).format(route.totalCost)}</p>
          </div>`;
  });
}

mapimg.onload = () => {
  render();
};

pinimg.onload = () => {
  render();
};
