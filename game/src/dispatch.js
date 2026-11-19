// BCPDDispatch: Sgt. Elena Brooks runs the Bayline City Police Department's radio
// net. Dispatch owns the response table — how many units, roadblocks and aircraft
// each star level buys — keeps the chatter log the HUD panel prints, and builds
// the roster rows (unit, officer, status, distance) from the live systems.

export const DISPATCHER = 'Sgt. Elena Brooks';
export const DEPARTMENT = 'BAYLINE CITY POLICE DEPARTMENT';

export const GROUND_OFFICERS = [
  { unit: 'Unit 7', officer: 'Ofc. Dana Reyes' },
  { unit: 'Unit 12', officer: 'Ofc. Marcus Vale' },
  { unit: 'Unit 3', officer: 'Sgt. Priya Nair' },
  { unit: 'Unit 21', officer: 'Ofc. Tom Okafor' },
  { unit: 'Unit 9', officer: 'Ofc. June Park' },
];

export const BLOCK_OFFICERS = [
  { unit: 'Block A', officer: 'Ofc. Ray Delgado' },
  { unit: 'Block B', officer: 'Ofc. June Park' },
];

export const AIR_ONE = { unit: 'Air One', officer: 'Pilot Rosa Quintana' };

// What each star level buys the BCPD.
export const RESPONSE_TABLE = [
  { units: 0, roadblocks: 0, heli: false, armed: false },
  { units: 1, roadblocks: 0, heli: false, armed: false },
  { units: 2, roadblocks: 0, heli: false, armed: false },
  { units: 3, roadblocks: 1, heli: false, armed: false },
  { units: 4, roadblocks: 1, heli: true, armed: true },
  { units: 5, roadblocks: 2, heli: true, armed: true },
];

export class BCPDDispatch {
  constructor() {
    this.log = [`${DEPARTMENT} — dispatch online. ${DISPATCHER} on the desk.`];
  }

  responseFor(stars) { return RESPONSE_TABLE[Math.max(0, Math.min(5, stars))]; }

  say(text) {
    this.log.push(text);
    if (this.log.length > 6) this.log.shift();
  }

  crimeReported(what, district) {
    this.say(`Patrol reports a ${what} in ${district}. Responding.`);
  }

  starsChanged(stars) {
    if (stars <= 0) this.say('All units — suspect lost. Stand down and resume patrol.');
    else if (stars === 3) this.say('Dispatch: suspect at 3 stars. First roadblock authorized.');
    else if (stars === 4) this.say('Air One is airborne — Pilot Rosa Quintana has the suspect\'s area.');
    else if (stars === 5) this.say('Dispatch: 5 stars. All units converge — second roadblock rolling.');
    else this.say(`Dispatch: suspect now at ${stars} star${stars === 1 ? '' : 's'}. Units responding.`);
  }

  roadblockDeployed(block) {
    this.say(`Dispatch: roadblock up — ${block.officerName} holding the line.`);
  }

  suspectLost() {
    this.say('Dispatch: suspect lost. All units, resume patrol.');
  }

  // Roster rows for the HUD panel, nearest first, roadblocks and Air One included.
  buildRoster(policeUnits, roadblocks, heli, playerPos) {
    const rows = [];
    for (const u of policeUnits) {
      rows.push({
        unit: u.officer.unit, officer: u.officer.officer,
        status: u.disabled ? 'DISABLED' : u.status,
        dist: Math.round(u.vehicle.pos.distanceTo(playerPos)),
      });
    }
    for (const b of roadblocks) {
      rows.push({
        unit: b.unitName, officer: b.officerName, status: 'AT ROADBLOCK',
        dist: Math.round(Math.hypot(b.pos.x - playerPos.x, b.pos.z - playerPos.z)),
      });
    }
    if (heli && heli.active) {
      rows.push({
        unit: AIR_ONE.unit, officer: AIR_ONE.officer, status: heli.status,
        dist: Math.round(heli.group.position.distanceTo(playerPos)),
      });
    }
    rows.sort((a, b) => a.dist - b.dist);
    return rows;
  }
}
