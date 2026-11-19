// ShotStaging: deterministic screenshot scenes for ?shot=<name>&seed=7.
// Each scene starts a fresh run, then poses the city like a film set — the clock
// frozen at golden hour (Day 1, 17:48), the chase mid-flight, every HUD panel
// telling the truth about the systems underneath. window.__game.staged flips
// true only when the frame is fully dressed.

import { JOBS } from './missions.js';

function poseCamera(game, carPos, heading, dist = 10.5, height = 3.4) {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  game.camera.placeDirect(
    new game.THREE.Vector3(carPos.x - fx * dist, height, carPos.z - fz * dist),
    new game.THREE.Vector3(carPos.x + fx * 7, 1.1, carPos.z + fz * 7),
  );
}

function takeParkedCar(game, x, z, heading, speed) {
  const car = game.traffic.parked[0];
  game.traffic.takeCar(car);
  car.pos.set(x, 0, z);
  car.heading = heading;
  car.speed = speed;
  car.syncMesh();
  game.player.enterVehicle(car);
  return car;
}

function stageUnits(game, list) {
  for (const [x, z, officer] of list) {
    const unit = game.police.spawnUnitAt(x, z, officer);
    unit.status = 'PURSUING';
    unit.vehicle.heading = Math.PI;
    unit.vehicle.syncMesh();
  }
}

export function stageShot(game, name) {
  game.startRun({ fresh: true });
  game.frozen = true;
  game.clockMinutes = 17 * 60 + 48;
  game.day = 1;

  if (name === 'cover') {
    // Palm Boulevard at 108 km/h, four stars, Air One overhead, job one rolling.
    const car = takeParkedCar(game, 150, 44, Math.PI, 30);
    game.wanted.setStars(4);
    game.dispatch.starsChanged(4);
    game.respect.setPoints(210);
    stageUnits(game, [[144, 16, 0], [157, 6, 1], [150, 72, 2]]);
    game.heli.setStaged(141, 14, 16, car.pos);
    game.showDialog('Marisol Vega', JOBS[0].intro, 9999);
    poseCamera(game, car.pos, Math.PI);
  } else if (name === 'chase') {
    // Old Town, five stars: cruisers behind, Block A's roadblock ahead.
    game.jobs.index = 7;
    game.jobs.phase = 0;
    game.jobs.completed = 7;
    game.jobs.syncMarker();
    game.cash = 2400;
    game.respect.setPoints(900);
    const car = takeParkedCar(game, 0, 36, Math.PI, 22.2);
    game.wanted.setStars(5);
    game.dispatch.starsChanged(5);
    stageUnits(game, [[-5, 18, 0], [5, 70, 1], [-2, 84, 2]]);
    game.roadblocks.deployAt(0, -6, true);
    game.dispatch.say('Dispatch: roadblock up — Ofc. Ray Delgado holding the line.');
    game.heli.setStaged(-16, 14, 12, car.pos);
    game.showDialog('Marisol Vega', JOBS[7].intro, 9999);
    poseCamera(game, car.pos, Math.PI);
  } else if (name === 'mission') {
    // On foot at the Marina, gold pillar ahead, penthouse safehouse in frame.
    game.player.pos.set(128, 0, 114);
    game.player.heading = Math.atan2(150 - 128, 138 - 114);
    // Keep walkers out of the camera's face for a clean frame.
    for (const ped of game.peds.peds) {
      if (ped.pos.distanceTo(game.player.pos) < 18) ped.pos.set(game.player.pos.x + 42, 0, game.player.pos.z + 30);
    }
    game.player.mesh.rotation.y = game.player.heading;
    game.showDialog('Marisol Vega', JOBS[0].intro, 9999);
    const p = game.player.pos;
    const fx = Math.sin(game.player.heading), fz = Math.cos(game.player.heading);
    game.camera.placeDirect(
      new game.THREE.Vector3(p.x - fx * 6.4, 2.7, p.z - fz * 6.4),
      new game.THREE.Vector3(p.x + fx * 8, 1.2, p.z + fz * 8),
    );
  } else if (name === 'garage') {
    // Parked up at Bayline Garage with the upgrade panel open.
    game.cash = 1730;
    const car = takeParkedCar(game, 58, 58, Math.PI / 4, 0);
    game.showDialog('Marisol Vega', JOBS[0].intro, 9999);
    poseCamera(game, car.pos, Math.PI / 4, 10.5, 3.4);
  }

  game.hud.update(0);
  game.staged = true;
}
