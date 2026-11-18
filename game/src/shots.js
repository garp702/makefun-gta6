// Deterministic screenshot staging: ?shot=<name>&seed=<n> freezes the
// clock and poses a real, live scene — every system (police panel, heli,
// HUD, minimap) is showing its genuine state, just arranged for the camera.
export function shotParams() {
  const q = new URLSearchParams(location.search);
  return { shot: q.get('shot'), seed: Number(q.get('seed') || 7) };
}

export function applyStaging(game, name) {
  const s = game.state;
  game.staged = name;
  game.running = true;
  game.input.clearAll();
  document.getElementById('startScreen').style.display = 'none';
  game.hud.show();

  if (name === 'cover') {
    // The cover frame: Palm Boulevard at golden hour, everything live.
    s.cash = 640; s.rep = 24; s.day = 1; s.minuteOfDay = 17 * 60 + 48; s.jobIndex = 0;
    game.missions.leg = 0; game.missions.refreshMarker();
    const car = game.playerCar;
    car.pos.set(60, 0, 117); car.heading = Math.PI / 2; car.speed = 30; // 108 km/h east
    car.mesh.rotation.y = car.heading;
    game.player.enterCar(car);
    game.wanted.set(4);
    game.radio.index = 0; game.radio.on = true;
    game.dialog = 'Marisol Vega: "Cooler\'s in the car, the pier is yours — just don\'t let Pelican see the handoff."';
    stagePolice(game, [[38, 110.5, 'PURSUING', 18], [104, 123, 'EN ROUTE', 45], [16, 123, 'SEARCHING', 70]]);
    stageHeli(game, 25.6, 24, 19.2); // 32 m out, 24 m up → exactly 40 m, over the beach
    game.camera.position.set(38, 6.5, 103);
    game.camera.lookAt(100, 4, 130);
  } else if (name === 'chase') {
    s.day = 1; s.minuteOfDay = 15 * 60 + 20; s.cash = 890; s.rep = 36; s.jobIndex = 2;
    game.missions.refreshMarker();
    const car = game.playerCar;
    car.pos.set(20, 0, 117); car.heading = -Math.PI / 2; car.speed = 24;
    car.mesh.rotation.y = car.heading;
    game.player.enterCar(car);
    game.wanted.set(4);
    game.radio.index = 1; game.radio.on = true;
    game.dialog = 'Marisol Vega: "They sent the bird up for you? Drive like the tide, partner."';
    stagePolice(game, [[44, 110.5, 'PURSUING', 21, -Math.PI / 2], [52, 123, 'PURSUING', 28, -Math.PI / 2], [-30, 110, 'EN ROUTE', 52, -Math.PI / 2]]);
    stageHeli(game, -19.2, 24, -25.6);
    game.camera.position.set(52, 7, 126);
    game.camera.lookAt(-10, 2, 108);
  } else if (name === 'mission') {
    s.day = 2; s.minuteOfDay = 10 * 60 + 5; s.cash = 1280; s.rep = 48; s.jobIndex = 3;
    game.missions.leg = 0; game.missions.refreshMarker();
    const obj = game.missions.objectivePos();
    game.player.pos.set(obj.x - 6, 0, obj.z + 5);
    game.player.heading = Math.atan2(obj.x - game.player.pos.x, obj.z - game.player.pos.z);
    game.playerCar.pos.set(obj.x - 12, 0, obj.z + 10);
    game.playerCar.mesh.rotation.y = 0.8;
    game.wanted.set(0);
    game.dialog = 'Marisol Vega: "Canal road, end to end, before the tide turns. Fast is fine. Wet is not."';
    game.camera.position.set(obj.x - 13, 5.5, obj.z + 14);
    game.camera.lookAt(obj.x, 1.2, obj.z);
  } else if (name === 'garage') {
    s.day = 2; s.minuteOfDay = 13 * 60 + 40; s.cash = 1420; s.rep = 55; s.jobIndex = 4;
    game.missions.refreshMarker();
    const car = game.playerCar;
    car.pos.set(53, 0, 56); car.heading = Math.PI; car.speed = 0;
    car.mesh.rotation.y = car.heading;
    game.wanted.set(0);
    game.dialog = 'Marisol Vega: "Spend it where it counts — engine first, always."';
    game.camera.position.set(40, 7.5, 70);
    game.camera.lookAt(54, 1, 50);
    game.shop.show();
  }
  game.refreshSun();
  game.hudDirty = true;
}

function stagePolice(game, specs) {
  game.police.units.forEach((u, i) => {
    const [x, z, status, dist, heading = Math.PI / 2] = specs[i];
    u.active = true; u.status = status; u.distance = dist;
    u.vehicle.mesh.visible = true;
    u.vehicle.pos.set(x, 0, z);
    u.vehicle.heading = heading;
    u.vehicle.mesh.rotation.y = heading;
  });
}

function stageHeli(game, dx, dy, dz) {
  const h = game.helicopter;
  const t = game.playerCar.pos;
  h.active = true;
  h.group.visible = true;
  h.group.position.set(t.x + dx, dy, t.z + dz);
  h.group.lookAt(t.x, 0, t.z);
  h.distance = Math.round(h.group.position.distanceTo(t));
  h.status = `TRACKING · ${h.distance}m`;
  h.spotTarget.position.copy(t);
  h.cone.position.set(0, -13.5, 0);
}
