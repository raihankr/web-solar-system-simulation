const $ = q => document.querySelector(q);
$.all = q => document.querySelectorAll(q);

$.all('.slider-container > input').forEach((el) => {
    el.oninput = () => el.parentElement.children[0].innerHTML = el.value;
    el.oninput();
});

const canvas = $('#canvas'),
    ctx = canvas.getContext('2d');

let midX, midY, max;
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    midX = canvas.width / 2, midY = canvas.height / 2;
    max = Math.max(canvas.width, canvas.height)
}
resize();
window.addEventListener('resize', resize);

let fps = 50;
$('#fps-slider').addEventListener('input', () => {
    fps = $('#fps-slider').value;
    refresh()
});

renderInterval = 0
function refresh() {
    clearInterval(renderInterval);
    renderInterval = setInterval(renderLoop, 1000 / fps);
}
refresh();

let speed = 1;
$('#speed-slider').addEventListener('input', () => {
    speed = $('#speed-slider').value
});

let camX = 0, camY = 45, camZ = 12;

canvas.addEventListener('wheel', e => {
    if (e.deltaY > 0 && camZ < 100) camZ += .5;
    else if (camZ > .5) camZ -= .5;
});

let mousedown = false, lastMouseX = -1, lastMouseY = -1;
canvas.addEventListener('mousedown', () => mousedown = true);
document.addEventListener('mouseup', () => mousedown = false);
canvas.addEventListener('mousemove', e => {
    if (!mousedown) return lastMouseX = -1, lastMouseY = -1;
    if (lastMouseX == -1 && lastMouseY == -1)
        lastMouseX = e.pageX, lastMouseY = e.pageY;

    let deltaX = e.pageX - lastMouseX, deltaY = e.pageY - lastMouseY;

    if (deltaY > 0 && camY < 90) camY += 1;
    else if (deltaY < 0 && camY > -90) camY -= 1;

    if (deltaX > 0) camX += (lastMouseY < midY ? -1 : 1);
    else if (deltaX < 0) camX += (lastMouseY < midY ? 1 : -1);
    if (camX > 360) camX -= 360;
    if (camX < 0) camX += 360;

    lastMouseX = e.pageX, lastMouseY = e.pageY;
});

let touched = false, scaling = false,
    lastTouchX = -1, lastTouchY = -1, lastPinchDist = -1;
canvas.addEventListener('touchstart', e => {
    touched = true;
    if (e.touches.length == 2) scaling = true;
});
document.addEventListener('touchend', e => (touched = false, scaling = false));
canvas.addEventListener('touchmove', e => {
    if (scaling) {
        let pinchDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );

        if (lastPinchDist == -1) lastPinchDist = pinchDist;

        let deltaDist = pinchDist - lastPinchDist;

        if (deltaDist < 0 && camZ < 100) camZ += 1;
        else if (deltaDist > 0 && camZ > .5) camZ -= 1;

        return lastPinchDist = pinchDist;
    } else lastPinchDist = -1;

    if (touched) {
        if (lastTouchX == -1 && lastTouchY == -1)
            lastTouchX = e.touches[0].pageX, lastTouchY = e.touches[0].pageY;

        let deltaX = e.touches[0].pageX - lastTouchX,
            deltaY = e.touches[0].pageY - lastTouchY;

        if (deltaY > 0 && camY < 90) camY += 1;
        else if (deltaY < 0 && camY > -90) camY -= 1;

        if (deltaX > 0) camX += (lastTouchY < midY ? -1 : 1);
        else if (deltaX < 0) camX += (lastTouchY < midY ? 1 : -1);
        if (camX > 360) camX -= 360;
        if (camX < 0) camX += 360;

        lastTouchX = e.touches[0].pageX, lastTouchY = e.touches[0].pageY;
    } else lastTouchX = -1, lastTouchY = -1;
});

class Orbit {
    constructor(radius, lyr) {
        this.radius = radius;
        this.stroke = '#777777'
        this._lyr = lyr;
        this.startAngle = 0;
        this.endAngle = 2 * Math.PI;
        this.center = { x: midX, y: midY }
    }

    lyr() { return this._lyr }

    draw(x = midX, y = midY) {
        let radius = max * (this.radius / camZ);

        ctx.lineWidth = 1;
        ctx.strokeStyle = this.stroke;
        ctx.beginPath();
        ctx.ellipse(
            x, y,
            radius, radius * (Math.abs(camY) / 90),
            camY < 0 ? Math.PI : 0, this.startAngle, this.endAngle, false);
        ctx.stroke();
    }
}

class Ring extends Orbit {
    constructor(radius, parent, lyrOffset, width, color) {
        super(radius);
        this.lyrOffset = lyrOffset;
        this.parent = parent;
        this.width = width;
        this.color = color;
        this.stroke = color;
    }

    lyr() {
        return this.parent.lyr() + this.lyrOffset;
    }

    draw() {
        super.draw(this.parent.x, this.parent.y);

        let radius = max * ((this.radius - this.width) / camZ);

        ctx.ellipse(
            this.parent.x, this.parent.y,
            radius, radius * (Math.abs(camY) / 90),
            camY < 0 ? Math.PI : 0, this.startAngle, this.endAngle, true);

        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Planet {
    constructor(radius, color, orbitRadius, period, lyr) {
        this.radius = radius;
        this.color = color;
        this.orbitRadius = orbitRadius;
        this.period = period;
        this._lyr = lyr;
        this.angle = 0;
    }

    lyr() {
        let differenceAngle = this.angle - camX;
        if (differenceAngle > 180) differenceAngle -= 360;
        if (differenceAngle < -180) differenceAngle += 360;

        return differenceAngle > 90 || differenceAngle < -90 ? -this._lyr + 1 : this._lyr;
    }

    draw() {
        var radius = max * (this.radius / camZ);
        let orbitRadius = max * (this.orbitRadius / camZ);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.x = Math.cos((this.angle - camX + 90) * Math.PI / 180) * orbitRadius + midX,
            this.y = Math.sin((this.angle - camX + 90) * Math.PI / 180) * orbitRadius * (camY / 90) + midY, radius, 0, 2 * Math.PI);
        ctx.fill();

        this.angle -= 360 / (this.period * fps) * speed;
        if (this.angle > 360) this.angle -= 360;
        if (this.angle < 0) this.angle += 360;
    }
}

let sun = {
    radius: .2,
    lyr: function () { return 0 },
    draw: function () {
        let radius = max * (this.radius / camZ);

        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(midX, midY, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
};

let orbitRadius = []
$('#real-distance').addEventListener('change', () => {
    defineOrbitRadius();
    buildPlanets();
    buildOrbits();
});

function defineOrbitRadius() {
    if ($('#real-distance').checked)
        orbitRadius = [.4, .7, 1, 1.5, 5.2, 9.5, 19.8, 30];
    else orbitRadius = [.5, 1, 1.5, 2, 3, 4.5, 6, 7.5];
}
defineOrbitRadius();

let planets = [];
function buildPlanets() {
    planets = [
        new Planet(.08, '#9c8a67', orbitRadius[0], 87 / 40, 3), // Mercury
        new Planet(.08, '#dda520', orbitRadius[1], 225 / 40, 5), // Venus
        new Planet(.08, '#1575ea', orbitRadius[2], 365 / 40, 7), // Earth
        new Planet(.08, '#dd3200', orbitRadius[3], 687 / 40, 9), // Mars
        new Planet(.15, '#804900', orbitRadius[4], 4380 / 40, 11), // Jupiter
        new Planet(.15, '#e7b51d', orbitRadius[5], 10585 / 40, 13), // Saturn
        new Planet(.15, '#3eb7ff', orbitRadius[6], 30660 / 40, 15), // Uranus
        new Planet(.15, '#0000ff', orbitRadius[7], 60225 / 40, 17), // Neptune
    ];
}
buildPlanets();

let orbits = [];
function buildOrbits() {
    orbits = [
        new Orbit(orbitRadius[0], 2), // Mercury's orbit
        new Orbit(orbitRadius[1], 4), // Venus' orbit
        new Orbit(orbitRadius[2], 6), // Earth's orbit
        new Orbit(orbitRadius[3], 8), // Mars' orbit
        new Orbit(orbitRadius[4], 10), // Jupiter's orbit
        new Orbit(orbitRadius[5], 12), // Saturn's orbit
        new Orbit(orbitRadius[6], 14), // Uranus' orbit
        new Orbit(orbitRadius[7], 16) // Neptune's orbit
    ];

    orbits.forEach(orbit => { orbit.startAngle = 0, orbit.endAngle = Math.PI });

    orbits = orbits.concat([
        new Orbit(orbitRadius[0], -2), // Mercury's orbit
        new Orbit(orbitRadius[1], -4), // Venus' orbit
        new Orbit(orbitRadius[2], -6), // Earth's orbit
        new Orbit(orbitRadius[3], -8), // Mars' orbit
        new Orbit(orbitRadius[4], -10), // Jupiter's orbit
        new Orbit(orbitRadius[5], -12), // Saturn's orbit
        new Ring(.3, planets[5], -.5, .1, '#e7b51d'),
        new Orbit(orbitRadius[6], -14), // Uranus' orbit
        new Orbit(orbitRadius[7], -16) // Neptune's orbit
    ]);
}
buildOrbits();

function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let elements = [...orbits, sun, ...planets];
    elements.sort((a, b) => a.lyr() - b.lyr());
    for (let element of elements) {
        element.draw();
    }
}