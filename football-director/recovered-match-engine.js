"use strict";
/* Recovered Football Lab archive f081668b3ebc9e0d9010d207675a658549a9e8b5; isolated module scopes. */
const NGMatchEngine=(()=>{const modules={};
modules["matchday-engine-v041.js"]=(()=>{
const LIVE_ENGINE_VERSION = 2;
const MAX_SUBSTITUTIONS = 5;
const FORMATION_OPTIONS = ['4-3-3', '4-2-3-1', '4-4-2', '4-1-4-1', '4-5-1', '3-5-2', '3-4-3', '5-3-2'];
const DEFAULT_LIVE_TACTICS = {
  formation: '4-3-3',
  mentality: 'Balanced',
  pressing: 'Standard',
  tempo: 'Standard',
  passing: 'Mixed',
  width: 'Balanced',
  defensiveLine: 'Standard'
};

const TACTIC_OPTIONS = {
  formation: FORMATION_OPTIONS,
  mentality: ['Defensive', 'Balanced', 'Attacking'],
  pressing: ['Low', 'Standard', 'High'],
  tempo: ['Slow', 'Standard', 'High'],
  passing: ['Short', 'Mixed', 'Direct'],
  width: ['Narrow', 'Balanced', 'Wide'],
  defensiveLine: ['Low', 'Standard', 'High']
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clone = value => JSON.parse(JSON.stringify(value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda, random) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > limit && count < 9);
  return clamp(count - 1, 0, 6);
}

function normalizeTactics(tactics = {}) {
  const next = { ...DEFAULT_LIVE_TACTICS };
  for (const [key, values] of Object.entries(TACTIC_OPTIONS)) {
    if (values.includes(tactics[key])) next[key] = tactics[key];
  }
  return next;
}

function club(db, id) {
  return db.clubs.find(item => item.id === id);
}

function clubName(db, id) {
  return club(db, id)?.shortName || club(db, id)?.name || 'Unknown';
}

function playerById(db, id) {
  return db.players.find(player => player.id === id);
}

function squadFor(db, clubId) {
  return db.players.filter(player => player.clubId === clubId && !player.isPlaceholder);
}

function autoPickLineup(players, clubId) {
  const squad = players
    .filter(player => player.clubId === clubId && !player.isPlaceholder)
    .sort((a, b) => (b.currentAbility || 0) - (a.currentAbility || 0));
  const picked = [];
  const quotas = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
  for (const [group, required] of Object.entries(quotas)) {
    picked.push(...squad.filter(player => player.positionGroup === group).slice(0, required));
  }
  for (const player of squad) {
    if (picked.length < 11 && !picked.some(selected => selected.id === player.id)) picked.push(player);
  }
  return picked.slice(0, 11).map(player => player.id);
}

function validateUserLineup(career, db) {
  const unique = [...new Set(career.lineupIds || [])];
  const squadIds = new Set(squadFor(db, career.clubId).map(player => player.id));
  if (unique.length !== 11) throw new Error('Select exactly 11 players before kick-off.');
  if (unique.some(id => !squadIds.has(id))) throw new Error('Every selected player must belong to your club.');
  if (!unique.some(id => playerById(db, id)?.positionGroup === 'GK')) throw new Error('Your starting XI needs a goalkeeper.');
}

function sideForClub(state, clubId) {
  return clubId === state.homeClubId ? 'home' : 'away';
}

function otherSide(side) {
  return side === 'home' ? 'away' : 'home';
}

function userSide(state) {
  return sideForClub(state, state.userClubId);
}

function lineupsFor(state, side) {
  return side === 'home' ? state.homeLineupIds : state.awayLineupIds;
}

function setLineup(state, side, ids) {
  if (side === 'home') state.homeLineupIds = ids;
  else state.awayLineupIds = ids;
}

function formationProfile(formation) {
  return {
    '4-3-3': { attack: 1.06, defense: 1.00, control: 1.02 },
    '4-2-3-1': { attack: 1.04, defense: 1.02, control: 1.04 },
    '4-4-2': { attack: 1.02, defense: 1.00, control: .98 },
    '4-1-4-1': { attack: .98, defense: 1.08, control: 1.03 },
    '4-5-1': { attack: .94, defense: 1.11, control: 1.05 },
    '3-5-2': { attack: 1.08, defense: .98, control: 1.05 },
    '3-4-3': { attack: 1.13, defense: .92, control: 1.00 },
    '5-3-2': { attack: .96, defense: 1.13, control: .98 }
  }[formation] || { attack: 1, defense: 1, control: 1 };
}

function tacticalProfile(tactics) {
  const base = formationProfile(tactics.formation);
  const profile = { ...base, fatigue: 1 };

  if (tactics.mentality === 'Defensive') { profile.attack *= .84; profile.defense *= 1.13; profile.control *= .96; }
  if (tactics.mentality === 'Attacking') { profile.attack *= 1.17; profile.defense *= .89; profile.control *= 1.03; }
  if (tactics.pressing === 'Low') { profile.attack *= .96; profile.defense *= .98; profile.fatigue *= .76; }
  if (tactics.pressing === 'High') { profile.attack *= 1.06; profile.defense *= 1.04; profile.control *= 1.03; profile.fatigue *= 1.34; }
  if (tactics.tempo === 'Slow') { profile.attack *= .94; profile.defense *= 1.03; profile.control *= 1.05; profile.fatigue *= .88; }
  if (tactics.tempo === 'High') { profile.attack *= 1.07; profile.defense *= .96; profile.control *= .98; profile.fatigue *= 1.16; }
  if (tactics.passing === 'Short') { profile.attack *= .98; profile.control *= 1.07; }
  if (tactics.passing === 'Direct') { profile.attack *= 1.05; profile.control *= .95; }
  if (tactics.width === 'Narrow') { profile.defense *= 1.03; profile.control *= 1.02; }
  if (tactics.width === 'Wide') { profile.attack *= 1.04; profile.defense *= .97; }
  if (tactics.defensiveLine === 'Low') { profile.attack *= .95; profile.defense *= 1.07; }
  if (tactics.defensiveLine === 'High') { profile.attack *= 1.03; profile.defense *= .96; profile.fatigue *= 1.05; }

  return profile;
}

function aiTactics(state, side) {
  const goalsFor = side === 'home' ? state.homeGoals : state.awayGoals;
  const goalsAgainst = side === 'home' ? state.awayGoals : state.homeGoals;
  const trailing = goalsFor < goalsAgainst;
  const leading = goalsFor > goalsAgainst;
  const baseFormation = hashString(side === 'home' ? state.homeClubId : state.awayClubId) % 2 ? '4-2-3-1' : '4-3-3';

  if (state.minute >= 68 && trailing) {
    return { ...DEFAULT_LIVE_TACTICS, formation: state.minute >= 80 ? '3-4-3' : baseFormation, mentality: 'Attacking', pressing: 'High', tempo: 'High', passing: 'Direct', width: 'Wide', defensiveLine: 'High' };
  }
  if (state.minute >= 74 && leading) {
    return { ...DEFAULT_LIVE_TACTICS, formation: '4-5-1', mentality: 'Defensive', pressing: 'Low', tempo: 'Slow', passing: 'Mixed', width: 'Narrow', defensiveLine: 'Low' };
  }
  return { ...DEFAULT_LIVE_TACTICS, formation: baseFormation };
}

function tacticsFor(state, side) {
  return side === userSide(state) ? state.tactics : (state.directorOpponentTactics || aiTactics(state, side));
}

function averageAbility(state, db, side) {
  const ids = lineupsFor(state, side);
  if (!ids.length) return 100;
  const total = ids.reduce((sum, id) => {
    const player = playerById(db, id);
    const condition = state.conditions[id] ?? 100;
    const readiness = .62 + .38 * (condition / 100);
    return sum + (player?.currentAbility || 100) * readiness;
  }, 0);
  return total / ids.length;
}

function sidePower(state, db, side) {
  const tactics = tacticsFor(state, side);
  const profile = tacticalProfile(tactics);
  const clubId = side === 'home' ? state.homeClubId : state.awayClubId;
  const reputation = clamp(((club(db, clubId)?.reputation || 7000) - 7000) / 5000, -.15, .15);
  const ability = averageAbility(state, db, side) / 120 * (0.55 + 0.45 * lineupsFor(state,side).length/11);
  const home = side === 'home' ? .075 : 0;
  return {
    attack: Math.max(.45, ability * profile.attack + reputation + home),
    defense: Math.max(.45, ability * profile.defense + reputation + home * .35),
    control: Math.max(.45, ability * profile.control + reputation * .5 + home * .2),
    fatigue: profile.fatigue
  };
}

function weightedPlayer(ids, db, random, groups = null) {
  let pool = ids.map(id => playerById(db, id)).filter(Boolean);
  if (groups?.length) {
    const filtered = pool.filter(player => groups.includes(player.positionGroup));
    if (filtered.length) pool = filtered;
  }
  if (!pool.length) return null;
  const weighted = [];
  for (const player of pool) {
    const weight = player.positionGroup === 'ATT' ? 5 : player.positionGroup === 'MID' ? 4 : player.positionGroup === 'DEF' ? 2 : 1;
    for (let i = 0; i < weight; i += 1) weighted.push(player);
  }
  return weighted[Math.floor(random() * weighted.length)] || pool[0];
}

function goalkeeper(ids, db) {
  return ids.map(id => playerById(db, id)).find(player => player?.positionGroup === 'GK') || playerById(db, ids[0]);
}

function addRating(state, playerId, delta) {
  if (!playerId) return;
  state.ratings[playerId] = clamp((state.ratings[playerId] ?? 6.5) + delta, 4.0, 10.0);
}

function recordEvent(state, event) {
  const stored = {
    minute: state.minute,
    type: event.type || 'commentary',
    clubId: event.clubId || null,
    playerId: event.playerId || null,
    assistPlayerId: event.assistPlayerId || null,
    text: event.text || (event.lines || []).join(' '),
    lines: event.lines || (event.text ? [event.text] : [])
  };
  state.events.push(stored);
  return stored;
}

function possessionText(state, db, side, random) {
  const team = clubName(db, side === 'home' ? state.homeClubId : state.awayClubId);
  const opponent = clubName(db, side === 'home' ? state.awayClubId : state.homeClubId);
  const ids = lineupsFor(state, side);
  const passer = weightedPlayer(ids, db, random, ['DEF', 'MID']) || weightedPlayer(ids, db, random);
  const receiver = weightedPlayer(ids.filter(id => id !== passer?.id), db, random, ['MID', 'ATT']) || weightedPlayer(ids, db, random);
  const templates = [
    [`${passer?.name || team} takes a touch and looks up.`, `${team} keep the ball moving as ${receiver?.name || 'a teammate'} finds space between the lines.`],
    [`${passer?.name || team} switches play quickly.`, `${receiver?.name || team} brings it under control and ${opponent} drop back into shape.`],
    [`${team} recycle possession patiently.`, `${passer?.name || 'The midfielder'} steps forward with nobody closing him down.`],
    [`${passer?.name || team} wins the second ball.`, `${team} immediately look to turn defence into attack.`],
    [`${receiver?.name || team} drops into midfield to offer an option.`, `${team} are trying to pull ${opponent} out of their shape.`],
    [`${team} move it from side to side.`, `${opponent} are being made to work without the ball.`]
  ];
  return templates[Math.floor(random() * templates.length)];
}

function pressingText(state, db, side, random) {
  const team = clubName(db, side === 'home' ? state.homeClubId : state.awayClubId);
  const ids = lineupsFor(state, side);
  const player = weightedPlayer(ids, db, random, ['MID', 'ATT']) || weightedPlayer(ids, db, random);
  const templates = [
    `${player?.name || team} closes down aggressively and forces the hurried pass.`,
    `${team} squeeze the pitch and win possession high up the field.`,
    `${player?.name || team} snaps into the challenge and the crowd respond.`,
    `${team} press in numbers, refusing to let the opposition settle.`
  ];
  return [templates[Math.floor(random() * templates.length)]];
}

function attackSequence(state, db, side, random, attackPower, defensePower) {
  const opponentSide = otherSide(side);
  const teamId = side === 'home' ? state.homeClubId : state.awayClubId;
  const opponentId = opponentSide === 'home' ? state.homeClubId : state.awayClubId;
  const team = clubName(db, teamId);
  const opponent = clubName(db, opponentId);
  const ids = lineupsFor(state, side);
  const opponentIds = lineupsFor(state, opponentSide);
  const creator = weightedPlayer(ids, db, random, ['MID', 'ATT']) || weightedPlayer(ids, db, random);
  const shooter = weightedPlayer(ids.filter(id => id !== creator?.id), db, random, ['ATT', 'MID']) || weightedPlayer(ids, db, random);
  const keeper = goalkeeper(opponentIds, db);
  const quality = clamp((attackPower / Math.max(.4, defensePower)) * (.88 + random() * .28), .55, 1.55);
  const roll = random();

  state.stats[side].shots += 1;
  if (roll < .115 * quality) {
    state.stats[side].onTarget += 1;
    if (side === 'home') state.homeGoals += 1; else state.awayGoals += 1;
    addRating(state, shooter?.id, .82);
    addRating(state, creator?.id, .28);
    addRating(state, keeper?.id, -.12);
    for (const id of opponentIds) {
      if (playerById(db, id)?.positionGroup === 'DEF') addRating(state, id, -.04);
    }
    return recordEvent(state, {
      type: 'goal', clubId: teamId, playerId: shooter?.id, assistPlayerId: creator?.id,
      lines: [
        `${creator?.name || team} sees the run and threads the ball into space...`,
        `${shooter?.name || team} is in behind ${opponent}!`,
        `${shooter?.name || 'He'} SHOOTS!`,
        `GOAL! ${shooter?.name || team} scores for ${team}!`
      ]
    });
  }

  if (roll < .49) {
    state.stats[side].onTarget += 1;
    addRating(state, keeper?.id, .12);
    addRating(state, shooter?.id, .03);
    return recordEvent(state, {
      type: 'save', clubId: teamId, playerId: shooter?.id,
      lines: [
        `${creator?.name || team} opens up the defence with a clever pass.`,
        `${shooter?.name || team} gets the shot away...`,
        `${keeper?.name || 'The goalkeeper'} makes the save!`
      ]
    });
  }

  if (roll < .58) {
    addRating(state, shooter?.id, .04);
    return recordEvent(state, {
      type: 'woodwork', clubId: teamId, playerId: shooter?.id,
      lines: [
        `${shooter?.name || team} lets fly from the edge of the area...`,
        `OFF THE WOODWORK! ${opponent} survive.`
      ]
    });
  }

  if (roll < .76) {
    addRating(state, shooter?.id, -.03);
    return recordEvent(state, {
      type: 'miss', clubId: teamId, playerId: shooter?.id,
      lines: [
        `${creator?.name || team} finds ${shooter?.name || 'the forward'} in a pocket of space.`,
        `${shooter?.name || 'He'} drags the effort wide of the post.`
      ]
    });
  }

  state.stats[side].corners += 1;
  return recordEvent(state, {
    type: 'corner', clubId: teamId, playerId: shooter?.id,
    lines: [
      `${shooter?.name || team} drives toward goal but the shot is blocked.`,
      `${team} have a corner and the defenders come forward.`
    ]
  });
}

function foulSequence(state, db, side, random) {
  const offenderSide = otherSide(side);
  const attackingTeamId = side === 'home' ? state.homeClubId : state.awayClubId;
  const defendingTeamId = offenderSide === 'home' ? state.homeClubId : state.awayClubId;
  const attacker = weightedPlayer(lineupsFor(state, side), db, random, ['MID', 'ATT']) || weightedPlayer(lineupsFor(state, side), db, random);
  const offender = weightedPlayer(lineupsFor(state, offenderSide), db, random, ['DEF', 'MID']) || weightedPlayer(lineupsFor(state, offenderSide), db, random);
  state.stats[offenderSide].fouls += 1;
  const booking = random() < .18;
  if (booking) {
    state.stats[offenderSide].yellowCards += 1;
    addRating(state, offender?.id, -.12);
  }
  return recordEvent(state, {
    type: booking ? 'yellow' : 'foul', clubId: defendingTeamId, playerId: offender?.id,
    lines: booking
      ? [`${attacker?.name || clubName(db, attackingTeamId)} is caught late by ${offender?.name || 'the defender'}.`, `Yellow card for ${offender?.name || clubName(db, defendingTeamId)}.`]
      : [`${offender?.name || clubName(db, defendingTeamId)} stops ${attacker?.name || 'the attack'} with a foul. Free kick.`]
  });
}

function offsideSequence(state, db, side, random) {
  const teamId = side === 'home' ? state.homeClubId : state.awayClubId;
  const runner = weightedPlayer(lineupsFor(state, side), db, random, ['ATT']) || weightedPlayer(lineupsFor(state, side), db, random);
  return recordEvent(state, {
    type: 'offside', clubId: teamId, playerId: runner?.id,
    lines: [`${runner?.name || clubName(db, teamId)} darts beyond the back line...`, `The flag is up. Offside.`]
  });
}

function crossSequence(state, db, side, random) {
  const teamId = side === 'home' ? state.homeClubId : state.awayClubId;
  const team = clubName(db, teamId);
  const ids = lineupsFor(state, side);
  const wide = weightedPlayer(ids, db, random, ['MID', 'ATT']) || weightedPlayer(ids, db, random);
  const target = weightedPlayer(ids.filter(id => id !== wide?.id), db, random, ['ATT']) || weightedPlayer(ids, db, random);
  if (random() < .34) {
    state.stats[side].corners += 1;
    return recordEvent(state, { type: 'corner', clubId: teamId, lines: [`${wide?.name || team} swings a dangerous ball toward ${target?.name || 'the striker'}.`, `It is headed behind. Corner to ${team}.`] });
  }
  return recordEvent(state, { type: 'commentary', clubId: teamId, lines: [`${wide?.name || team} gets down the flank and crosses early.`, `${target?.name || 'The forward'} cannot quite get there and the danger passes.`] });
}

function fatigueMinute(state, db) {
  for (const side of ['home', 'away']) {
    const profile = sidePower(state, db, side);
    for (const id of lineupsFor(state, side)) {
      state.minutesPlayed[id] = (state.minutesPlayed[id] || 0) + 1;
      const baseLoss = .075 * profile.fatigue;
      state.conditions[id] = clamp((state.conditions[id] ?? 100) - baseLoss, 48, 100);
    }
  }
}

function possessionMinute(state, db, random) {
  const home = sidePower(state, db, 'home').control;
  const away = sidePower(state, db, 'away').control;
  const homeChance = home / (home + away);
  const side = random() < homeChance ? 'home' : 'away';
  state.stats[side].possessionTicks += 1;
  return side;
}

function createInteractiveMatch(career, db) {
  validateUserLineup(career, db);
  if (career.status === 'complete' || !career.fixtures?.[career.roundIndex]) throw new Error('This demo season is complete.');
  const fixture = career.fixtures[career.roundIndex].find(item => item.homeClubId === career.clubId || item.awayClubId === career.clubId);
  if (!fixture) throw new Error('Your next fixture could not be found.');

  const homeLineupIds = fixture.homeClubId === career.clubId ? [...career.lineupIds] : autoPickLineup(db.players, fixture.homeClubId);
  const awayLineupIds = fixture.awayClubId === career.clubId ? [...career.lineupIds] : autoPickLineup(db.players, fixture.awayClubId);
  const userSquad = squadFor(db, career.clubId).sort((a, b) => (b.currentAbility || 0) - (a.currentAbility || 0));
  const benchIds = userSquad.filter(player => !career.lineupIds.includes(player.id)).slice(0, 9).map(player => player.id);
  const allIds = [...new Set([...homeLineupIds, ...awayLineupIds, ...benchIds])];
  const conditions = {};
  const ratings = {};
  const minutesPlayed = {};
  for (const id of allIds) {
    const player = playerById(db, id);
    const status = career.playerStatus?.[id];
    conditions[id] = player?.clubId === career.clubId ? (status?.condition ?? 100) : 100;
    ratings[id] = 6.5;
    minutesPlayed[id] = 0;
  }

  return {
    version: LIVE_ENGINE_VERSION,
    fixtureId: fixture.id,
    round: fixture.round,
    minute: 0,
    homeClubId: fixture.homeClubId,
    awayClubId: fixture.awayClubId,
    userClubId: career.clubId,
    homeLineupIds,
    awayLineupIds,
    userBenchIds: benchIds,
    substitutions: [],
    subbedOffIds: [],
    tactics: normalizeTactics(career.tactics),
    homeGoals: 0,
    awayGoals: 0,
    stats: {
      home: { possessionTicks: 0, shots: 0, onTarget: 0, corners: 0, fouls: 0, yellowCards: 0 },
      away: { possessionTicks: 0, shots: 0, onTarget: 0, corners: 0, fouls: 0, yellowCards: 0 }
    },
    conditions,
    ratings,
    minutesPlayed,
    events: [],
    seed: String(career.seed)
  };
}

function advanceInteractiveMatch(inputState, career, db) {
  const state = clone(inputState);
  if (state.minute >= 90) return { state, events: [] };
  state.minute += 1;
  const random = seededRandom(`${state.seed}:${state.fixtureId}:minute:${state.minute}:${JSON.stringify(state.tactics)}:${state.substitutions.length}`);
  fatigueMinute(state, db);
  const possessionSide = possessionMinute(state, db, random);
  const generated = [];

  if (state.minute === 1) {
    generated.push(recordEvent(state, { type: 'marker', lines: ['KICK-OFF.'] }));
  }
  if (state.minute === 45) {
    generated.push(recordEvent(state, { type: 'marker', lines: ['HALF TIME.'] }));
  }
  if (state.minute === 46) {
    generated.push(recordEvent(state, { type: 'marker', lines: ['The second half is underway.'] }));
  }

  const eventChance = state.minute === 45 || state.minute === 46 ? .18 : .64;
  if (random() < eventChance) {
    const homePower = sidePower(state, db, 'home');
    const awayPower = sidePower(state, db, 'away');
    const attackingSide = random() < .68 ? possessionSide : otherSide(possessionSide);
    const attackPower = attackingSide === 'home' ? homePower.attack : awayPower.attack;
    const defensePower = attackingSide === 'home' ? awayPower.defense : homePower.defense;
    const roll = random();

    if (roll < .24) {
      generated.push(recordEvent(state, { type: 'commentary', clubId: attackingSide === 'home' ? state.homeClubId : state.awayClubId, lines: possessionText(state, db, attackingSide, random) }));
    } else if (roll < .34) {
      generated.push(recordEvent(state, { type: 'commentary', clubId: attackingSide === 'home' ? state.homeClubId : state.awayClubId, lines: pressingText(state, db, attackingSide, random) }));
    } else if (roll < .45) {
      generated.push(foulSequence(state, db, attackingSide, random));
    } else if (roll < .54) {
      generated.push(offsideSequence(state, db, attackingSide, random));
    } else if (roll < .68) {
      generated.push(crossSequence(state, db, attackingSide, random));
    } else {
      generated.push(attackSequence(state, db, attackingSide, random, attackPower, defensePower));
    }
  }

  if (state.minute === 90) {
    generated.push(recordEvent(state, { type: 'marker', lines: ['FULL TIME.'] }));
  }

  return { state, events: generated.filter(Boolean) };
}

function makeSubstitution(inputState, outId, inId, db) {
  const state = clone(inputState);
  if (state.minute >= 90) throw new Error('The match is already over.');
  if (state.substitutions.length >= MAX_SUBSTITUTIONS) throw new Error('You have used all five substitutions.');
  const side = userSide(state);
  const lineup = [...lineupsFor(state, side)];
  if (!lineup.includes(outId)) throw new Error('Choose a player currently on the pitch.');
  if (lineup.includes(inId)) throw new Error('That player is already on the pitch.');
  if (!state.userBenchIds.includes(inId)) throw new Error('Choose a player from your matchday bench.');
  if (state.subbedOffIds.includes(inId)) throw new Error('A substituted player cannot return to the match.');

  const nextLineup = lineup.map(id => id === outId ? inId : id);
  if (!nextLineup.some(id => playerById(db, id)?.positionGroup === 'GK')) throw new Error('Your team must keep a goalkeeper on the pitch.');
  setLineup(state, side, nextLineup);
  state.subbedOffIds.push(outId);
  state.substitutions.push({ minute: state.minute, outId, inId });
  if (state.conditions[inId] == null) state.conditions[inId] = 100;
  if (state.ratings[inId] == null) state.ratings[inId] = 6.5;
  if (state.minutesPlayed[inId] == null) state.minutesPlayed[inId] = 0;

  const outPlayer = playerById(db, outId);
  const inPlayer = playerById(db, inId);
  const event = recordEvent(state, {
    type: 'substitution', clubId: state.userClubId, playerId: inId,
    lines: [`${state.minute}' — ${clubName(db, state.userClubId)} make a change.`, `${inPlayer?.name || 'The substitute'} replaces ${outPlayer?.name || 'the outgoing player'}.`]
  });
  return { state, event };
}

function changeTactics(inputState, patch) {
  const state = clone(inputState);
  const next = { ...state.tactics };
  for (const [key, values] of Object.entries(TACTIC_OPTIONS)) {
    if (patch[key] != null && values.includes(patch[key])) next[key] = patch[key];
  }
  const changed = Object.keys(next).filter(key => next[key] !== state.tactics[key]);
  state.tactics = next;
  const summary = changed.length
    ? changed.map(key => `${key === 'defensiveLine' ? 'line' : key}: ${next[key]}`).join(' · ')
    : 'No tactical changes';
  const event = recordEvent(state, { type: 'tactical', clubId: state.userClubId, lines: [`Tactical change: ${summary}.`] });
  return { state, event };
}

function aiTeamStrength(db, clubId) {
  const lineup = autoPickLineup(db.players, clubId).map(id => playerById(db, id)).filter(Boolean);
  const ability = lineup.reduce((sum, player) => sum + (player.currentAbility || 100), 0) / Math.max(1, lineup.length);
  const reputation = clamp(((club(db, clubId)?.reputation || 7000) - 7000) / 350, -5, 5);
  return ability + reputation;
}

function aiScorer(db, clubId, random) {
  return weightedPlayer(autoPickLineup(db.players, clubId), db, random, ['ATT', 'MID']);
}

function simulateAIFixture(career, db, fixture) {
  const random = seededRandom(`${career.seed}:${fixture.id}:ai-v2`);
  const homeStrength = aiTeamStrength(db, fixture.homeClubId) + 2.2;
  const awayStrength = aiTeamStrength(db, fixture.awayClubId);
  const difference = clamp((homeStrength - awayStrength) / 28, -1.35, 1.35);
  const homeGoals = poisson(clamp(1.35 + difference, .25, 3.2), random);
  const awayGoals = poisson(clamp(1.1 - difference, .2, 3.0), random);
  const events = [];
  for (let i = 0; i < homeGoals; i += 1) {
    const scorer = aiScorer(db, fixture.homeClubId, random);
    events.push({ minute: 4 + Math.floor(random() * 86), type: 'goal', clubId: fixture.homeClubId, playerId: scorer?.id || null, text: `${scorer?.name || 'A player'} scores.` });
  }
  for (let i = 0; i < awayGoals; i += 1) {
    const scorer = aiScorer(db, fixture.awayClubId, random);
    events.push({ minute: 4 + Math.floor(random() * 86), type: 'goal', clubId: fixture.awayClubId, playerId: scorer?.id || null, text: `${scorer?.name || 'A player'} scores.` });
  }
  return { ...fixture, played: true, homeGoals, awayGoals, events: events.sort((a, b) => a.minute - b.minute) };
}

function applyResult(table, result) {
  const home = table.find(row => row.clubId === result.homeClubId);
  const away = table.find(row => row.clubId === result.awayClubId);
  home.played += 1;
  away.played += 1;
  home.goalsFor += result.homeGoals;
  home.goalsAgainst += result.awayGoals;
  away.goalsFor += result.awayGoals;
  away.goalsAgainst += result.homeGoals;
  if (result.homeGoals > result.awayGoals) {
    home.won += 1; home.points += 3; away.lost += 1;
  } else if (result.homeGoals < result.awayGoals) {
    away.won += 1; away.points += 3; home.lost += 1;
  } else {
    home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1;
  }
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;
}

function possessionPercent(stats) {
  const total = stats.home.possessionTicks + stats.away.possessionTicks;
  const home = total ? Math.round(stats.home.possessionTicks / total * 100) : 50;
  return { home, away: 100 - home };
}

function updateUserStatus(career, state, db, result) {
  const isHome = result.homeClubId === career.clubId;
  const goalsFor = isHome ? result.homeGoals : result.awayGoals;
  const goalsAgainst = isHome ? result.awayGoals : result.homeGoals;
  const morale = goalsFor > goalsAgainst ? 'Excellent' : goalsFor < goalsAgainst ? 'Okay' : 'Good';
  const squad = squadFor(db, career.clubId);
  const goalEvents = state.events.filter(event => event.type === 'goal' && event.clubId === career.clubId && event.playerId);

  for (const player of squad) {
    const status = career.playerStatus[player.id] || { condition: 100, sharpness: 88, morale: 'Good', appearances: 0, goals: 0 };
    const minutes = state.minutesPlayed[player.id] || 0;
    if (minutes > 0) {
      status.condition = Math.round(clamp(state.conditions[player.id] ?? status.condition, 48, 100));
      status.sharpness = clamp(status.sharpness + (minutes >= 45 ? 3 : 1), 1, 100);
      status.appearances += 1;
      status.morale = morale;
    } else {
      status.condition = clamp(status.condition + 4, 1, 100);
      status.sharpness = clamp(status.sharpness - 1, 1, 100);
    }
    status.goals += goalEvents.filter(event => event.playerId === player.id).length;
    career.playerStatus[player.id] = status;
  }
}

function completeInteractiveRound(career, inputState, db) {
  const state = clone(inputState);
  if (state.minute < 90) throw new Error('The live match has not reached full time.');
  const next = clone(career);
  const roundFixtures = next.fixtures[next.roundIndex];
  if (!roundFixtures) throw new Error('The current round could not be finalised.');
  const possession = possessionPercent(state.stats);
  const userResult = {
    ...roundFixtures.find(fixture => fixture.id === state.fixtureId),
    played: true,
    homeGoals: state.homeGoals,
    awayGoals: state.awayGoals,
    events: state.events,
    matchStats: {
      home: { ...state.stats.home, possession: possession.home },
      away: { ...state.stats.away, possession: possession.away }
    },
    playerRatings: state.ratings,
    playerConditions: state.conditions,
    substitutions: state.substitutions,
    tacticsAtFullTime: state.tactics
  };

  const results = roundFixtures.map(fixture => fixture.id === state.fixtureId ? userResult : simulateAIFixture(next, db, fixture));
  next.fixtures[next.roundIndex] = results;
  results.forEach(result => applyResult(next.table, result));
  updateUserStatus(next, state, db, userResult);
  next.tactics = { ...state.tactics };
  next.lastMatch = userResult;
  next.roundIndex += 1;
  if (next.roundIndex >= next.fixtures.length) next.status = 'complete';
  next.updatedAt = new Date().toISOString();
  return next;
}

return {LIVE_ENGINE_VERSION,MAX_SUBSTITUTIONS,FORMATION_OPTIONS,DEFAULT_LIVE_TACTICS,TACTIC_OPTIONS,createInteractiveMatch,advanceInteractiveMatch,makeSubstitution,changeTactics,completeInteractiveRound};})();
modules["matchday-engine-v042.js"]=(()=>{
const {
  MAX_SUBSTITUTIONS,
  TACTIC_OPTIONS,
  advanceInteractiveMatch:baseAdvanceInteractiveMatch,
  changeTactics:baseChangeTactics,
  completeInteractiveRound:baseCompleteInteractiveRound,
  createInteractiveMatch:baseCreateInteractiveMatch,
  makeSubstitution:baseMakeSubstitution
}=modules["matchday-engine-v041.js"];


const LIVE_ENGINE_VERSION = 3;
const PLAYER_DUTIES = ['Defend', 'Support', 'Attack'];

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function playerById(db, id) {
  return db.players.find(player => player.id === id);
}

function clubById(db, id) {
  return db.clubs.find(club => club.id === id);
}

function clubName(db, id) {
  return clubById(db, id)?.shortName || clubById(db, id)?.name || 'Unknown';
}

function userSide(state) {
  return state.userClubId === state.homeClubId ? 'home' : 'away';
}

function otherSide(side) {
  return side === 'home' ? 'away' : 'home';
}

function lineupFor(state, side) {
  return side === 'home' ? state.homeLineupIds : state.awayLineupIds;
}

function setLineup(state, side, ids) {
  if (side === 'home') state.homeLineupIds = ids;
  else state.awayLineupIds = ids;
}

function defaultDuty(player) {
  if (!player) return 'Support';
  if (player.positionGroup === 'GK' || player.positionGroup === 'DEF') return 'Defend';
  if (player.positionGroup === 'ATT') return 'Attack';
  return 'Support';
}

function ensureExtendedState(inputState, db) {
  const state = clone(inputState);
  state.liveEngineVersion = LIVE_ENGINE_VERSION;
  state.playerDuties ||= {};
  state.injuredIds ||= [];
  state.sentOffIds ||= [];
  state.yellowByPlayer ||= {};
  state.stats.home.redCards ??= 0;
  state.stats.away.redCards ??= 0;
  for (const id of [...state.homeLineupIds, ...state.awayLineupIds, ...(state.userBenchIds || [])]) {
    if (!state.playerDuties[id]) state.playerDuties[id] = defaultDuty(playerById(db, id));
  }
  return state;
}

function recordEvent(state, event) {
  const stored = {
    minute: state.minute,
    type: event.type || 'commentary',
    clubId: event.clubId || null,
    playerId: event.playerId || null,
    assistPlayerId: event.assistPlayerId || null,
    text: event.text || (event.lines || []).join(' '),
    lines: event.lines || (event.text ? [event.text] : [])
  };
  state.events.push(stored);
  return stored;
}

function choosePlayer(ids, db, random, groups = null) {
  let pool = ids.map(id => playerById(db, id)).filter(Boolean);
  if (groups?.length) {
    const filtered = pool.filter(player => groups.includes(player.positionGroup));
    if (filtered.length) pool = filtered;
  }
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)] || pool[0];
}

function aiTactics(state, side) {
  const goalsFor = side === 'home' ? state.homeGoals : state.awayGoals;
  const goalsAgainst = side === 'home' ? state.awayGoals : state.homeGoals;
  const trailing = goalsFor < goalsAgainst;
  const leading = goalsFor > goalsAgainst;
  const clubId = side === 'home' ? state.homeClubId : state.awayClubId;
  const baseFormation = hashString(clubId) % 2 ? '4-2-3-1' : '4-3-3';
  if (state.minute >= 68 && trailing) {
    return { formation: state.minute >= 80 ? '3-4-3' : baseFormation, mentality: 'Attacking', pressing: 'High', tempo: 'High', passing: 'Direct', width: 'Wide', defensiveLine: 'High' };
  }
  if (state.minute >= 74 && leading) {
    return { formation: '4-5-1', mentality: 'Defensive', pressing: 'Low', tempo: 'Slow', passing: 'Mixed', width: 'Narrow', defensiveLine: 'Low' };
  }
  return { formation: baseFormation, mentality: 'Balanced', pressing: 'Standard', tempo: 'Standard', passing: 'Mixed', width: 'Balanced', defensiveLine: 'Standard' };
}

function getOpponentSnapshot(inputState, db) {
  const state = ensureExtendedState(inputState, db);
  const side = otherSide(userSide(state));
  const clubId = side === 'home' ? state.homeClubId : state.awayClubId;
  return {
    side,
    clubId,
    clubName: clubName(db, clubId),
    tactics: aiTactics(state, side),
    lineupIds: [...lineupFor(state, side)],
    redCards: state.stats[side].redCards || 0
  };
}

function situationalEvent(state, db) {
  if (![15, 30, 40, 55, 65, 75, 82, 87].includes(state.minute)) return null;
  const side = userSide(state);
  const opponentSide = otherSide(side);
  const teamId = state.userClubId;
  const opponentId = opponentSide === 'home' ? state.homeClubId : state.awayClubId;
  const forGoals = side === 'home' ? state.homeGoals : state.awayGoals;
  const againstGoals = side === 'home' ? state.awayGoals : state.homeGoals;
  const tired = lineupFor(state, side)
    .map(id => ({ id, condition: state.conditions[id] ?? 100 }))
    .sort((a, b) => a.condition - b.condition)[0];
  const tiredPlayer = tired?.condition < 67 ? playerById(db, tired.id) : null;
  let text;

  if (state.minute >= 75 && forGoals > againstGoals) {
    text = `${clubName(db, teamId)} are protecting a ${forGoals - againstGoals}-goal advantage now. ${clubName(db, opponentId)} are committing more players forward.`;
  } else if (state.minute >= 65 && forGoals < againstGoals) {
    text = `${clubName(db, teamId)} need a response. The urgency is rising as they push higher up the pitch.`;
  } else if (state.tactics.mentality === 'Defensive') {
    text = `${clubName(db, teamId)} are sitting deeper in their ${state.tactics.formation}, keeping numbers behind the ball.`;
  } else if (state.tactics.mentality === 'Attacking') {
    text = `${clubName(db, teamId)} are taking risks now. The ${state.tactics.formation} is stretching the game in search of chances.`;
  } else {
    text = `${clubName(db, teamId)} are staying patient in their ${state.tactics.formation} while ${clubName(db, opponentId)} try to disrupt the rhythm.`;
  }

  if (tiredPlayer) text += ` ${tiredPlayer.name} is beginning to look tired at ${Math.round(tired.condition)}% condition.`;
  return recordEvent(state, { type: 'situation', clubId: teamId, lines: [text] });
}

function applyInstructionImpact(state, db, random) {
  const side = userSide(state);
  const lineup = lineupFor(state, side).filter(id => !state.sentOffIds.includes(id));
  if (!lineup.length || random() > .115) return null;
  const candidates = lineup.filter(id => playerById(db, id)?.positionGroup !== 'GK');
  const id = candidates[Math.floor(random() * candidates.length)];
  const player = playerById(db, id);
  if (!player) return null;
  const duty = state.playerDuties[id] || defaultDuty(player);
  const team = clubName(db, state.userClubId);
  const opponent = clubName(db, side === 'home' ? state.awayClubId : state.homeClubId);

  if (duty === 'Defend') {
    state.ratings[id] = clamp((state.ratings[id] ?? 6.5) + .025, 4, 10);
    return recordEvent(state, {
      type: 'instruction', clubId: state.userClubId, playerId: id,
      lines: [`${player.name} holds his position exactly as instructed and cuts out the danger before ${opponent} can break.`]
    });
  }

  if (duty === 'Support') {
    state.stats[side].possessionTicks += 1;
    state.ratings[id] = clamp((state.ratings[id] ?? 6.5) + .018, 4, 10);
    return recordEvent(state, {
      type: 'instruction', clubId: state.userClubId, playerId: id,
      lines: [`${player.name} drops into support, gives ${team} an extra passing option and helps recycle possession.`]
    });
  }

  if (random() < .38) {
    state.stats[side].shots += 1;
    const onTarget = random() < .48;
    if (onTarget) state.stats[side].onTarget += 1;
    const ability = (player.currentAbility || 100) / 120;
    const condition = (state.conditions[id] ?? 100) / 100;
    if (onTarget && random() < .055 * ability * condition) {
      if (side === 'home') state.homeGoals += 1; else state.awayGoals += 1;
      state.ratings[id] = clamp((state.ratings[id] ?? 6.5) + .7, 4, 10);
      return recordEvent(state, {
        type: 'goal', clubId: state.userClubId, playerId: id,
        lines: [`${player.name} attacks the space exactly as instructed...`, `${player.name} SHOOTS!`, `GOAL! The attacking duty pays off for ${team}!`]
      });
    }
    return recordEvent(state, {
      type: onTarget ? 'save' : 'miss', clubId: state.userClubId, playerId: id,
      lines: onTarget
        ? [`${player.name} breaks forward from his attacking duty and gets a shot away.`, `${opponent} survive as the goalkeeper makes the stop.`]
        : [`${player.name} drives forward on his attacking instruction but cannot keep the effort on target.`]
    });
  }

  return recordEvent(state, {
    type: 'instruction', clubId: state.userClubId, playerId: id,
    lines: [`${player.name} keeps pushing beyond his normal position, trying to turn the attacking instruction into an overload.`]
  });
}

function applyDiscipline(state, db, baseEvents, random) {
  const extra = [];
  for (const event of baseEvents) {
    if (event.type !== 'yellow' || !event.playerId) continue;
    state.yellowByPlayer[event.playerId] = (state.yellowByPlayer[event.playerId] || 0) + 1;
    if (state.yellowByPlayer[event.playerId] < 2 || state.sentOffIds.includes(event.playerId)) continue;
    const side = lineupFor(state, 'home').includes(event.playerId) ? 'home' : lineupFor(state, 'away').includes(event.playerId) ? 'away' : null;
    if (!side) continue;
    setLineup(state, side, lineupFor(state, side).filter(id => id !== event.playerId));
    state.sentOffIds.push(event.playerId);
    state.stats[side].redCards += 1;
    const p = playerById(db, event.playerId);
    extra.push(recordEvent(state, {
      type: 'red', clubId: side === 'home' ? state.homeClubId : state.awayClubId, playerId: event.playerId,
      lines: [`SECOND YELLOW! ${p?.name || 'The player'} is sent off.`, `${clubName(db, side === 'home' ? state.homeClubId : state.awayClubId)} will have to reorganise with ten men.`]
    }));
  }

  if (random() < .00065) {
    const side = random() < .5 ? 'home' : 'away';
    const available = lineupFor(state, side).filter(id => !state.sentOffIds.includes(id));
    const offender = choosePlayer(available, db, random, ['DEF', 'MID']);
    if (offender) {
      setLineup(state, side, lineupFor(state, side).filter(id => id !== offender.id));
      state.sentOffIds.push(offender.id);
      state.stats[side].redCards += 1;
      extra.push(recordEvent(state, {
        type: 'red', clubId: side === 'home' ? state.homeClubId : state.awayClubId, playerId: offender.id,
        lines: [`RED CARD! ${offender.name} is dismissed for a reckless challenge.`, `${clubName(db, side === 'home' ? state.homeClubId : state.awayClubId)} are down to ten.`]
      }));
    }
  }
  return extra;
}

function applyInjury(state, db, random) {
  if (random() > .0042) return null;
  const side = random() < .5 ? 'home' : 'away';
  const available = lineupFor(state, side).filter(id => !state.injuredIds.includes(id) && !state.sentOffIds.includes(id));
  const injured = choosePlayer(available, db, random);
  if (!injured) return null;
  state.injuredIds.push(injured.id);
  const serious = random() < .3;
  state.injurySeverity ||= {}; state.injurySeverity[injured.id] = serious ? 'serious' : 'knock';
  state.conditions[injured.id] = Math.min(state.conditions[injured.id] ?? 100, serious ? 38 : 55);
  state.ratings[injured.id] = clamp((state.ratings[injured.id] ?? 6.5) - .08, 4, 10);
  return recordEvent(state, {
    type: 'injury', clubId: side === 'home' ? state.homeClubId : state.awayClubId, playerId: injured.id,
    lines: serious
      ? [`${injured.name} has gone down and immediately signals to the bench.`, `This looks serious. ${clubName(db, side === 'home' ? state.homeClubId : state.awayClubId)} may need to make a change.`]
      : [`${injured.name} is moving gingerly after that challenge.`, `He is trying to continue, but his condition has clearly dropped.`]
  });
}

function createInteractiveMatch(career, db) {
  return ensureExtendedState(baseCreateInteractiveMatch(career, db), db);
}

function advanceInteractiveMatch(inputState, career, db) {
  const prepared = ensureExtendedState(inputState, db);
  const advanced = baseAdvanceInteractiveMatch(prepared, career, db);
  const state = ensureExtendedState(advanced.state, db);
  const random = seededRandom(`${state.seed}:${state.fixtureId}:extended:${state.minute}:${state.substitutions.length}`);
  const extras = [];

  extras.push(...applyDiscipline(state, db, advanced.events, random));
  const injury = applyInjury(state, db, random);
  if (injury) extras.push(injury);
  const instruction = applyInstructionImpact(state, db, random);
  if (instruction) extras.push(instruction);
  const situation = situationalEvent(state, db);
  if (situation) extras.push(situation);

  return { state, events: [...advanced.events, ...extras] };
}

function makeSubstitution(inputState, outId, inId, db) {
  const result = baseMakeSubstitution(ensureExtendedState(inputState, db), outId, inId, db);
  const state = ensureExtendedState(result.state, db);
  if (!state.playerDuties[inId]) state.playerDuties[inId] = defaultDuty(playerById(db, inId));
  return { state, event: result.event };
}

function changeTactics(inputState, patch) {
  return baseChangeTactics(inputState, patch);
}

function setPlayerDuty(inputState, playerId, duty, db) {
  const state = ensureExtendedState(inputState, db);
  if (!PLAYER_DUTIES.includes(duty)) throw new Error('Choose a valid player duty.');
  if (!lineupFor(state, userSide(state)).includes(playerId)) throw new Error('Player instructions can only be changed for players currently on the pitch.');
  const p = playerById(db, playerId);
  if (p?.positionGroup === 'GK' && duty !== 'Defend') throw new Error('Goalkeepers use the Defend duty in this match engine.');
  state.playerDuties[playerId] = duty;
  const event = recordEvent(state, {
    type: 'instruction-change', clubId: state.userClubId, playerId,
    lines: [`Player instruction: ${p?.name || 'Player'} — ${duty}.`]
  });
  return { state, event };
}

function completeInteractiveRound(career, inputState, db) {
  const state = ensureExtendedState(inputState, db);
  const finished = baseCompleteInteractiveRound(career, state, db);
  if (finished.lastMatch) {
    const fullHistory = clone(finished.lastMatch.events || []);
    const keyTypes = new Set(['goal', 'yellow', 'red', 'injury', 'substitution', 'tactical', 'instruction-change', 'woodwork', 'marker']);
    finished.lastMatch.commentaryHistory = fullHistory;
    finished.lastMatch.events = fullHistory.filter(event => keyTypes.has(event.type));
    finished.lastMatch.sentOffIds = [...state.sentOffIds];
    finished.lastMatch.injuredIds = [...state.injuredIds];
    finished.lastMatch.playerDuties = { ...state.playerDuties };
  }
  return finished;
}

return {LIVE_ENGINE_VERSION,PLAYER_DUTIES,getOpponentSnapshot,createInteractiveMatch,advanceInteractiveMatch,makeSubstitution,changeTactics,setPlayerDuty,completeInteractiveRound,MAX_SUBSTITUTIONS:MAX_SUBSTITUTIONS,TACTIC_OPTIONS:TACTIC_OPTIONS};})();
modules["matchday-engine-v043.js"]=(()=>{
const {
  MAX_SUBSTITUTIONS,
  TACTIC_OPTIONS,
  advanceInteractiveMatch:baseAdvanceInteractiveMatch,
  changeTactics:baseChangeTactics,
  completeInteractiveRound:baseCompleteInteractiveRound,
  createInteractiveMatch:baseCreateInteractiveMatch,
  getOpponentSnapshot:baseGetOpponentSnapshot,
  makeSubstitution:baseMakeSubstitution,
  setPlayerDuty:baseSetPlayerDuty
}=modules["matchday-engine-v042.js"];


const LIVE_ENGINE_VERSION = 4;

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ROLE_DEFINITIONS = {
  Goalkeeper: { duty: 'Defend', families: ['GK'], attack: 0, control: .02, defense: .08 },
  'Sweeper Keeper': { duty: 'Support', families: ['GK'], attack: .01, control: .05, defense: .04 },
  'Central Defender': { duty: 'Defend', families: ['CB'], attack: 0, control: .01, defense: .08 },
  'Ball Playing Defender': { duty: 'Support', families: ['CB'], attack: .01, control: .06, defense: .04 },
  'Full Back': { duty: 'Support', families: ['FB', 'WB'], attack: .03, control: .03, defense: .05 },
  'Wing Back': { duty: 'Attack', families: ['FB', 'WB'], attack: .07, control: .03, defense: .01 },
  Anchor: { duty: 'Defend', families: ['DM'], attack: 0, control: .04, defense: .09 },
  'Defensive Midfielder': { duty: 'Defend', families: ['DM', 'CM'], attack: .01, control: .05, defense: .07 },
  'Central Midfielder': { duty: 'Support', families: ['CM', 'DM'], attack: .03, control: .06, defense: .03 },
  'Box-to-Box Midfielder': { duty: 'Support', families: ['CM'], attack: .05, control: .05, defense: .04 },
  Playmaker: { duty: 'Support', families: ['CM', 'AM'], attack: .05, control: .09, defense: .01 },
  'Advanced Playmaker': { duty: 'Attack', families: ['AM', 'CM'], attack: .08, control: .08, defense: 0 },
  'Shadow Striker': { duty: 'Attack', families: ['AM'], attack: .11, control: .02, defense: 0 },
  Winger: { duty: 'Attack', families: ['W'], attack: .09, control: .04, defense: 0 },
  'Inside Forward': { duty: 'Attack', families: ['W'], attack: .11, control: .02, defense: 0 },
  'Wide Midfielder': { duty: 'Support', families: ['W', 'CM'], attack: .05, control: .05, defense: .03 },
  'Advanced Forward': { duty: 'Attack', families: ['ST'], attack: .12, control: .02, defense: 0 },
  Poacher: { duty: 'Attack', families: ['ST'], attack: .14, control: 0, defense: 0 },
  'Target Man': { duty: 'Support', families: ['ST'], attack: .08, control: .05, defense: .01 }
};

const S = (id, label, family, x, y, roles) => ({ id, label, family, x, y, roles });

const FORMATION_LAYOUTS = {
  '4-3-3': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RB','RB','FB',82,73,['Full Back','Wing Back']), S('RCB','RCB','CB',61,77,['Central Defender','Ball Playing Defender']),
    S('LCB','LCB','CB',39,77,['Central Defender','Ball Playing Defender']), S('LB','LB','FB',18,73,['Full Back','Wing Back']),
    S('RCM','RCM','CM',65,51,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('CM','CM','CM',50,57,['Central Midfielder','Box-to-Box Midfielder','Playmaker','Defensive Midfielder']), S('LCM','LCM','CM',35,51,['Central Midfielder','Box-to-Box Midfielder','Playmaker']),
    S('RW','RW','W',80,25,['Winger','Inside Forward','Wide Midfielder']), S('ST','ST','ST',50,17,['Advanced Forward','Poacher','Target Man']), S('LW','LW','W',20,25,['Winger','Inside Forward','Wide Midfielder'])
  ],
  '4-2-3-1': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RB','RB','FB',82,73,['Full Back','Wing Back']), S('RCB','RCB','CB',61,77,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',39,77,['Central Defender','Ball Playing Defender']), S('LB','LB','FB',18,73,['Full Back','Wing Back']),
    S('RDM','RDM','DM',61,58,['Defensive Midfielder','Anchor','Central Midfielder']), S('LDM','LDM','DM',39,58,['Defensive Midfielder','Anchor','Central Midfielder']),
    S('RAM','RAM','W',79,37,['Winger','Inside Forward','Wide Midfielder']), S('AM','AM','AM',50,34,['Advanced Playmaker','Shadow Striker','Playmaker']), S('LAM','LAM','W',21,37,['Winger','Inside Forward','Wide Midfielder']),
    S('ST','ST','ST',50,16,['Advanced Forward','Poacher','Target Man'])
  ],
  '4-4-2': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RB','RB','FB',82,73,['Full Back','Wing Back']), S('RCB','RCB','CB',61,77,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',39,77,['Central Defender','Ball Playing Defender']), S('LB','LB','FB',18,73,['Full Back','Wing Back']),
    S('RM','RM','W',80,48,['Wide Midfielder','Winger']), S('RCM','RCM','CM',61,52,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LCM','LCM','CM',39,52,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LM','LM','W',20,48,['Wide Midfielder','Winger']),
    S('RST','RST','ST',61,19,['Advanced Forward','Poacher','Target Man']), S('LST','LST','ST',39,19,['Advanced Forward','Poacher','Target Man'])
  ],
  '4-1-4-1': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RB','RB','FB',82,73,['Full Back','Wing Back']), S('RCB','RCB','CB',61,77,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',39,77,['Central Defender','Ball Playing Defender']), S('LB','LB','FB',18,73,['Full Back','Wing Back']),
    S('DM','DM','DM',50,62,['Anchor','Defensive Midfielder','Central Midfielder']),
    S('RM','RM','W',80,43,['Wide Midfielder','Winger']), S('RCM','RCM','CM',61,46,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LCM','LCM','CM',39,46,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LM','LM','W',20,43,['Wide Midfielder','Winger']),
    S('ST','ST','ST',50,17,['Advanced Forward','Poacher','Target Man'])
  ],
  '4-5-1': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RB','RB','FB',82,73,['Full Back','Wing Back']), S('RCB','RCB','CB',61,77,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',39,77,['Central Defender','Ball Playing Defender']), S('LB','LB','FB',18,73,['Full Back','Wing Back']),
    S('RM','RM','W',80,48,['Wide Midfielder','Winger']), S('RCM','RCM','CM',64,52,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('CM','CM','DM',50,57,['Defensive Midfielder','Anchor','Central Midfielder']), S('LCM','LCM','CM',36,52,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LM','LM','W',20,48,['Wide Midfielder','Winger']),
    S('ST','ST','ST',50,17,['Advanced Forward','Poacher','Target Man'])
  ],
  '3-5-2': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RCB','RCB','CB',69,75,['Central Defender','Ball Playing Defender']), S('CB','CB','CB',50,79,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',31,75,['Central Defender','Ball Playing Defender']),
    S('RWB','RWB','WB',87,52,['Wing Back','Full Back']), S('RCM','RCM','CM',63,51,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('CM','CM','DM',50,57,['Defensive Midfielder','Anchor','Central Midfielder']), S('LCM','LCM','CM',37,51,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LWB','LWB','WB',13,52,['Wing Back','Full Back']),
    S('RST','RST','ST',61,19,['Advanced Forward','Poacher','Target Man']), S('LST','LST','ST',39,19,['Advanced Forward','Poacher','Target Man'])
  ],
  '3-4-3': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RCB','RCB','CB',69,75,['Central Defender','Ball Playing Defender']), S('CB','CB','CB',50,79,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',31,75,['Central Defender','Ball Playing Defender']),
    S('RM','RM','WB',84,51,['Wing Back','Wide Midfielder']), S('RCM','RCM','CM',61,53,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LCM','LCM','CM',39,53,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('LM','LM','WB',16,51,['Wing Back','Wide Midfielder']),
    S('RW','RW','W',78,25,['Winger','Inside Forward']), S('ST','ST','ST',50,17,['Advanced Forward','Poacher','Target Man']), S('LW','LW','W',22,25,['Winger','Inside Forward'])
  ],
  '5-3-2': [
    S('GK','GK','GK',50,91,['Goalkeeper','Sweeper Keeper']),
    S('RWB','RWB','WB',88,65,['Wing Back','Full Back']), S('RCB','RCB','CB',68,76,['Central Defender','Ball Playing Defender']), S('CB','CB','CB',50,80,['Central Defender','Ball Playing Defender']), S('LCB','LCB','CB',32,76,['Central Defender','Ball Playing Defender']), S('LWB','LWB','WB',12,65,['Wing Back','Full Back']),
    S('RCM','RCM','CM',64,49,['Central Midfielder','Box-to-Box Midfielder','Playmaker']), S('CM','CM','DM',50,56,['Anchor','Defensive Midfielder','Central Midfielder']), S('LCM','LCM','CM',36,49,['Central Midfielder','Box-to-Box Midfielder','Playmaker']),
    S('RST','RST','ST',61,20,['Advanced Forward','Poacher','Target Man']), S('LST','LST','ST',39,20,['Advanced Forward','Poacher','Target Man'])
  ]
};

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; };
}
function playerById(db,id){ return db.players.find(player=>player.id===id); }
function userSide(state){ return state.userClubId===state.homeClubId?'home':'away'; }
function lineupFor(state,side){ return side==='home'?state.homeLineupIds:state.awayLineupIds; }

function positionCodes(player) {
  const raw = String(player?.primaryPosition || '').toUpperCase();
  return new Set(raw.split(/[^A-Z]+/).filter(Boolean));
}

function suitability(player, family) {
  if (!player) return -100;
  const codes = positionCodes(player);
  const group = player.positionGroup;
  let score = 0;
  if (family === 'GK') score = group === 'GK' ? 100 : -100;
  else if (family === 'CB') score = group === 'DEF' ? 45 : group === 'MID' ? 2 : -30;
  else if (family === 'FB' || family === 'WB') score = group === 'DEF' ? 38 : group === 'MID' ? 18 : -22;
  else if (family === 'DM') score = group === 'MID' ? 40 : group === 'DEF' ? 18 : -20;
  else if (family === 'CM') score = group === 'MID' ? 45 : group === 'ATT' ? 10 : group === 'DEF' ? 8 : -25;
  else if (family === 'AM') score = group === 'MID' ? 40 : group === 'ATT' ? 28 : -22;
  else if (family === 'W') score = group === 'ATT' ? 42 : group === 'MID' ? 34 : group === 'DEF' ? 4 : -25;
  else if (family === 'ST') score = group === 'ATT' ? 50 : group === 'MID' ? 8 : -30;

  const exact = {
    GK:['GK'], CB:['DC','CB'], FB:['DR','DL','RB','LB'], WB:['WBR','WBL','RWB','LWB','DR','DL'],
    DM:['DM','DMC'], CM:['MC','CM'], AM:['AMC','AM'], W:['AMR','AML','MR','ML','RW','LW'], ST:['ST','CF']
  }[family] || [];
  if (exact.some(code=>codes.has(code))) score += 32;
  return score + (player.currentAbility || 100) / 20;
}

function bestRole(slot, player) {
  if (slot.family === 'GK') return 'Goalkeeper';
  const roles = slot.roles || [];
  if (!roles.length) return 'Central Midfielder';
  const group = player?.positionGroup;
  if (group === 'ATT' && roles.includes('Poacher')) return 'Poacher';
  if (group === 'ATT' && roles.includes('Inside Forward')) return 'Inside Forward';
  if (group === 'DEF' && roles.includes('Central Defender')) return 'Central Defender';
  if (group === 'DEF' && roles.includes('Full Back')) return 'Full Back';
  return roles[0];
}

function assignPlayersToFormation(lineupIds, formation, db, previous = null) {
  const slots = clone(FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS['4-3-3']);
  const remaining = [...lineupIds];
  const assignments = [];
  const ordered = [...slots].sort((a,b)=>(a.family==='GK'?-1:b.family==='GK'?1:0));
  for (const slot of ordered) {
    let bestIndex = 0; let bestScore = -Infinity;
    remaining.forEach((id,index)=>{
      const score = suitability(playerById(db,id), slot.family);
      if (score > bestScore) { bestScore=score; bestIndex=index; }
    });
    const [playerId] = remaining.splice(bestIndex,1);
    const prevRole = previous?.assignments?.find(item=>item.playerId===playerId)?.role;
    const role = slot.roles.includes(prevRole) ? prevRole : bestRole(slot, playerById(db,playerId));
    assignments.push({ slotId:slot.id, playerId, role, suitability:Math.round(suitability(playerById(db,playerId),slot.family)) });
  }
  return { formation, assignments: slots.map(slot=>assignments.find(a=>a.slotId===slot.id)), slots };
}

function syncDutiesFromRoles(state) {
  state.playerDuties ||= {};
  for (const assignment of state.userShape?.assignments || []) {
    const role = ROLE_DEFINITIONS[assignment.role];
    if (role) state.playerDuties[assignment.playerId] = role.duty;
  }
  return state;
}

function ensureShape(inputState, career, db) {
  const state = clone(inputState);
  const side = userSide(state);
  const lineup = lineupFor(state, side);
  const formation = state.tactics?.formation || career.tactics?.formation || '4-3-3';
  const persisted = career.tacticalSetup?.formation === formation ? career.tacticalSetup : null;
  if (!state.userShape || state.userShape.formation !== formation || state.userShape.assignments?.filter(a=>lineup.includes(a.playerId)).length !== lineup.length) {
    state.userShape = assignPlayersToFormation(lineup, formation, db, state.userShape || persisted);
  }
  return syncDutiesFromRoles(state);
}

function getUserShape(inputState, career, db) {
  return ensureShape(inputState, career, db).userShape;
}

function createInteractiveMatch(career, db) {
  const state = baseCreateInteractiveMatch(career, db);
  return ensureShape(state, career, db);
}

function changeTactics(inputState, patch, career = {}, db = null) {
  const result = baseChangeTactics(inputState, patch);
  let state = result.state;
  if (db && patch.formation && patch.formation !== inputState.tactics?.formation) {
    const side = userSide(state);
    state.userShape = assignPlayersToFormation(lineupFor(state,side), state.tactics.formation, db, inputState.userShape);
    syncDutiesFromRoles(state);
    result.event.lines = [...(result.event.lines || []), `The players reorganise into a ${state.tactics.formation} shape.`];
    result.event.text = result.event.lines.join(' ');
  }
  return { state, event: result.event };
}

function makeSubstitution(inputState, outId, inId, db, career = {}) {
  const result = baseMakeSubstitution(inputState, outId, inId, db);
  let state = ensureShape(result.state, career, db);
  const assignment = state.userShape.assignments.find(item=>item.playerId===outId);
  if (assignment) {
    assignment.playerId = inId;
    const slot = state.userShape.slots.find(item=>item.id===assignment.slotId);
    assignment.role = slot.roles.includes(assignment.role) ? assignment.role : bestRole(slot, playerById(db,inId));
    assignment.suitability = Math.round(suitability(playerById(db,inId),slot.family));
  } else {
    state.userShape = assignPlayersToFormation(lineupFor(state,userSide(state)), state.tactics.formation, db, state.userShape);
  }
  syncDutiesFromRoles(state);
  return { state, event: result.event };
}

function setPlayerRole(inputState, slotId, role, career, db) {
  const state = ensureShape(inputState, career, db);
  const slot = state.userShape.slots.find(item=>item.id===slotId);
  if (!slot) throw new Error('Choose a valid tactical position.');
  if (!slot.roles.includes(role)) throw new Error(`${role} is not available for ${slot.label}.`);
  const assignment = state.userShape.assignments.find(item=>item.slotId===slotId);
  if (!assignment) throw new Error('That tactical position has no player assigned.');
  assignment.role = role;
  assignment.suitability = Math.round(suitability(playerById(db,assignment.playerId),slot.family));
  syncDutiesFromRoles(state);
  const p = playerById(db, assignment.playerId);
  const event = {
    minute:state.minute, type:'role-change', clubId:state.userClubId, playerId:assignment.playerId,
    text:`Role change: ${p?.name || 'Player'} — ${slot.label} / ${role}.`, lines:[`Role change: ${p?.name || 'Player'} — ${slot.label} / ${role}.`]
  };
  state.events.push(event);
  return { state, event };
}

function swapShapePlayers(inputState, firstSlotId, secondSlotId, career, db) {
  const state = ensureShape(inputState, career, db);
  const a = state.userShape.assignments.find(item=>item.slotId===firstSlotId);
  const b = state.userShape.assignments.find(item=>item.slotId===secondSlotId);
  if (!a || !b) throw new Error('Choose two occupied tactical positions.');
  [a.playerId,b.playerId] = [b.playerId,a.playerId];
  for (const assignment of [a,b]) {
    const slot = state.userShape.slots.find(item=>item.id===assignment.slotId);
    if (!slot.roles.includes(assignment.role)) assignment.role = bestRole(slot, playerById(db,assignment.playerId));
    assignment.suitability = Math.round(suitability(playerById(db,assignment.playerId),slot.family));
  }
  syncDutiesFromRoles(state);
  const event = { minute:state.minute,type:'shape-change',clubId:state.userClubId,text:`Positional switch: ${firstSlotId} ↔ ${secondSlotId}.`,lines:[`Positional switch: ${firstSlotId} ↔ ${secondSlotId}.`] };
  state.events.push(event);
  return {state,event};
}

function roleEvent(state, career, db) {
  if (!state.userShape?.assignments?.length) return null;
  const random = seededRandom(`${state.seed}:${state.fixtureId}:roles:${state.minute}:${JSON.stringify(state.userShape.assignments.map(a=>[a.slotId,a.playerId,a.role]))}`);
  if (random() > .12) return null;
  const candidates = state.userShape.assignments.filter(a=>!state.sentOffIds?.includes(a.playerId));
  const assignment = candidates[Math.floor(random()*candidates.length)];
  const slot = state.userShape.slots.find(item=>item.id===assignment.slotId);
  const p = playerById(db,assignment.playerId);
  const role = ROLE_DEFINITIONS[assignment.role] || ROLE_DEFINITIONS['Central Midfielder'];
  const side = userSide(state);
  const fit = suitability(p,slot.family);
  const fitFactor = clamp((fit+20)/90,.35,1.2);
  let lines=[]; let type='role';

  if (fit < 18 && random() < .45) {
    state.ratings[assignment.playerId] = clamp((state.ratings[assignment.playerId]||6.5)-.07,4,10);
    lines=[`${p?.name || 'The player'} looks uncomfortable at ${slot.label}. The positional mismatch leaves space for the opposition.`];
  } else if (role.duty === 'Defend') {
    state.ratings[assignment.playerId]=clamp((state.ratings[assignment.playerId]||6.5)+.035*fitFactor,4,10);
    lines=[`${p?.name || 'The defender'} reads the danger from ${slot.label} and holds the shape as a ${assignment.role}.`];
  } else if (role.duty === 'Support') {
    state.stats[side].possessionTicks += 1;
    state.ratings[assignment.playerId]=clamp((state.ratings[assignment.playerId]||6.5)+.03*fitFactor,4,10);
    lines=[`${p?.name || 'The midfielder'} finds space from ${slot.label}, linking the play in the ${assignment.role} role.`];
  } else {
    const chance = (.18 + role.attack) * fitFactor;
    if (random() < chance) {
      state.stats[side].shots += 1;
      const onTarget = random() < .48 * fitFactor;
      if (onTarget) state.stats[side].onTarget += 1;
      if (onTarget && random() < .055 * fitFactor) {
        if (side==='home') state.homeGoals += 1; else state.awayGoals += 1;
        state.ratings[assignment.playerId]=clamp((state.ratings[assignment.playerId]||6.5)+.75,4,10);
        type='goal';
        lines=[`${p?.name || 'The attacker'} attacks the space from ${slot.label}...`, `${assignment.role.toUpperCase()}! ${p?.name || 'He'} is through!`, `GOAL! The role and position combine perfectly.`];
      } else {
        lines=[`${p?.name || 'The attacker'} breaks from ${slot.label} in the ${assignment.role} role and gets into a dangerous area.`];
      }
    } else lines=[`${p?.name || 'The attacker'} keeps stretching the defence from ${slot.label} as a ${assignment.role}.`];
  }

  const event={minute:state.minute,type,clubId:state.userClubId,playerId:assignment.playerId,text:lines.join(' '),lines};
  state.events.push(event);
  return event;
}

function advanceInteractiveMatch(inputState, career, db) {
  const prepared = ensureShape(inputState, career, db);
  const advanced = baseAdvanceInteractiveMatch(prepared, career, db);
  let state = ensureShape(advanced.state, career, db);
  const role = roleEvent(state, career, db);
  return { state, events: role ? [...advanced.events, role] : advanced.events };
}

function setPlayerDuty(inputState, playerId, duty, db) {
  return baseSetPlayerDuty(inputState, playerId, duty, db);
}

function getOpponentSnapshot(inputState, db) {
  return baseGetOpponentSnapshot(inputState, db);
}

function completeInteractiveRound(career, inputState, db) {
  const state = ensureShape(inputState, career, db);
  const finished = baseCompleteInteractiveRound(career, state, db);
  finished.tacticalSetup = {
    formation: state.userShape.formation,
    assignments: state.userShape.assignments.map(({slotId,playerId,role})=>({slotId,playerId,role}))
  };
  if (finished.lastMatch) finished.lastMatch.tacticalSetup = clone(finished.tacticalSetup);
  return finished;
}

return {LIVE_ENGINE_VERSION,ROLE_DEFINITIONS,FORMATION_LAYOUTS,assignPlayersToFormation,getUserShape,createInteractiveMatch,changeTactics,makeSubstitution,setPlayerRole,swapShapePlayers,advanceInteractiveMatch,setPlayerDuty,getOpponentSnapshot,completeInteractiveRound,MAX_SUBSTITUTIONS:MAX_SUBSTITUTIONS,TACTIC_OPTIONS:TACTIC_OPTIONS};})();
modules["match-integrity-core-v067.js"]=(()=>{
const COMPETITIVE_SUBSTITUTION_LIMIT = 5;
const FRIENDLY_SUBSTITUTION_LIMIT = 9;

function isFriendlyFixture(fixture = {}) {
  const text = `${fixture.type || ''} ${fixture.competitionName || ''} ${fixture.name || ''}`.toLowerCase();
  return /friendly|pre[- ]?season/.test(text);
}

function substitutionLimitForFixture(fixture = {}) {
  return isFriendlyFixture(fixture) ? FRIENDLY_SUBSTITUTION_LIMIT : COMPETITIVE_SUBSTITUTION_LIMIT;
}

function scaledConditionAfterMinute(before, engineAfter, fixture = {}) {
  const start = Number(before);
  const after = Number(engineAfter);
  if (!Number.isFinite(start) || !Number.isFinite(after)) return engineAfter;
  const friendly = isFriendlyFixture(fixture);
  // Legacy engine clamps at 48. If a player has already reached that level,
  // continue natural fatigue rather than pinning or artificially restoring him.
  if (start <= 48.08 && after >= start) return Math.max(20, start - (friendly ? 0.045 : 0.075));
  const loss = Math.max(0, start - after);
  if (!friendly || loss <= 0) return after;
  return Math.max(20, start - loss * 0.65);
}

return {COMPETITIVE_SUBSTITUTION_LIMIT,FRIENDLY_SUBSTITUTION_LIMIT,isFriendlyFixture,substitutionLimitForFixture,scaledConditionAfterMinute};})();
modules["matchday-engine-v0431.js"]=(()=>{

const {
  ROLE_DEFINITIONS,
  advanceInteractiveMatch:baseAdvanceInteractiveMatch,
  completeInteractiveRound:baseCompleteInteractiveRound,
  createInteractiveMatch:baseCreateInteractiveMatch,
  getUserShape,
  makeSubstitution:baseMakeSubstitution
}=modules["matchday-engine-v043.js"];
const {
  COMPETITIVE_SUBSTITUTION_LIMIT,
  substitutionLimitForFixture,
  scaledConditionAfterMinute
}=modules["match-integrity-core-v067.js"];



const LIVE_ENGINE_VERSION = 10;
const XG_MODEL = Object.freeze({
  version: 1,
  method: 'shot-derived-contextual',
  spatial: false,
  bigChanceThreshold: 0.30
});

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const SHOT_TYPES = new Set(['goal', 'save', 'woodwork', 'miss', 'corner']);

function playerById(db, id) {
  return db.players.find(player => player.id === id);
}

function clubById(db,id){
  return db.clubs?.find(club => club.id === id) || null;
}

function fixtureForState(career,state){
  return (career?.fixtures || []).flat().find(fixture => fixture?.id === state?.fixtureId) || null;
}

function fixtureMeta(career,state){
  const fixture=fixtureForState(career,state);
  return fixture || {type:state?.fixtureType || '',competitionName:state?.competitionName || ''};
}

function positionCodes(player) {
  const raw = String(player?.primaryPosition || '').toUpperCase();
  return new Set(raw.split(/[^A-Z]+/).filter(Boolean));
}

function suitability(player, family) {
  if (!player) return -100;
  const codes = positionCodes(player);
  const group = player.positionGroup;
  let score = 0;
  if (family === 'GK') score = group === 'GK' ? 100 : -100;
  else if (family === 'CB') score = group === 'DEF' ? 45 : group === 'MID' ? 2 : -30;
  else if (family === 'FB' || family === 'WB') score = group === 'DEF' ? 38 : group === 'MID' ? 18 : -22;
  else if (family === 'DM') score = group === 'MID' ? 40 : group === 'DEF' ? 18 : -20;
  else if (family === 'CM') score = group === 'MID' ? 45 : group === 'ATT' ? 10 : group === 'DEF' ? 8 : -25;
  else if (family === 'AM') score = group === 'MID' ? 40 : group === 'ATT' ? 28 : -22;
  else if (family === 'W') score = group === 'ATT' ? 42 : group === 'MID' ? 34 : group === 'DEF' ? 4 : -25;
  else if (family === 'ST') score = group === 'ATT' ? 50 : group === 'MID' ? 8 : -30;

  const exact = {
    GK: ['GK'],
    CB: ['DC', 'CB'],
    FB: ['DR', 'DL', 'RB', 'LB'],
    WB: ['WBR', 'WBL', 'RWB', 'LWB', 'DR', 'DL'],
    DM: ['DM', 'DMC'],
    CM: ['MC', 'CM'],
    AM: ['AMC', 'AM'],
    W: ['AMR', 'AML', 'MR', 'ML', 'RW', 'LW'],
    ST: ['ST', 'CF']
  }[family] || [];

  if (exact.some(code => codes.has(code))) score += 32;
  return Math.round(score + (player.currentAbility || 100) / 20);
}

function readinessFor(career) {
  const ids = career.lineupIds || [];
  const statuses = ids.map(id => career.playerStatus?.[id]).filter(Boolean);
  const sharpness = statuses.length
    ? statuses.reduce((sum, status) => sum + (status.sharpness ?? 88), 0) / statuses.length
    : 88;
  const familiarity = career.preseason?.tacticalFamiliarity ?? 90;
  const factor = clamp(0.90 + sharpness / 1800 + familiarity / 1800, 0.95, 1.02);
  return { sharpness: Math.round(sharpness), familiarity: Math.round(familiarity), factor };
}

function adjustedDatabase(db, userClubId, factor) {
  if (Math.abs(factor - 1) < 0.001) return db;
  return {
    ...db,
    players: db.players.map(player => player.clubId === userClubId
      ? { ...player, currentAbility: (player.currentAbility || 100) * factor }
      : player)
  };
}

function ensureXgState(state) {
  if (!state?.stats) return state;
  for (const side of ['home', 'away']) {
    state.stats[side] ||= {};
    if (!Number.isFinite(state.stats[side].xG)) state.stats[side].xG = 0;
    if (!Number.isFinite(state.stats[side].bigChances)) state.stats[side].bigChances = 0;
    if (!Number.isFinite(state.stats[side].xgShots)) state.stats[side].xgShots = 0;
  }
  state.xgModel ||= {
    version: XG_MODEL.version,
    method: XG_MODEL.method,
    spatial: XG_MODEL.spatial,
    note: 'Shot coordinates are not yet simulated; xG is derived from generated chance context.'
  };
  return state;
}

function exposeXg(state) {
  if (true || !state?.stats) return;
  window.__flmLiveXg = {
    fixtureId: state.fixtureId,
    minute: state.minute,
    home: round2(state.stats.home.xG),
    away: round2(state.stats.away.xG),
    homeBigChances: state.stats.home.bigChances || 0,
    awayBigChances: state.stats.away.bigChances || 0,
    model: state.xgModel
  };
  window.dispatchEvent(new CustomEvent('flm:live-xg', { detail: window.__flmLiveXg }));
}

function chanceText(event) {
  return `${event?.text || ''} ${(event?.lines || []).join(' ')}`.toLowerCase();
}

function contextualXg(event) {
  const text = chanceText(event);
  if (/penalt/.test(text)) return 0.76;
  if (/six[- ]yard|open goal|tap[- ]?in/.test(text)) return 0.58;
  if (/in behind|is through|one[- ]on[- ]one|clear through/.test(text)) return 0.34;
  if (/close range|point[- ]blank/.test(text)) return 0.31;
  if (/header|headed|cross/.test(text)) return 0.13;
  if (/edge of the area|edge of area|lets fly|long range|distance/.test(text)) return 0.06;
  if (/blocked|drives toward goal/.test(text)) return 0.055;
  if (/pocket of space|clever pass|attacks the space|breaks forward/.test(text)) return 0.12;
  return 0.10;
}

function attachEventXg(state, event, value) {
  event.xg = round2(value);
  const stored = [...(state.events || [])].reverse().find(item =>
    item.minute === event.minute && item.type === event.type &&
    item.clubId === event.clubId && item.playerId === event.playerId &&
    !Number.isFinite(item.xg)
  );
  if (stored) stored.xg = event.xg;
}

function annotateNewShots(state, events, beforeShots) {
  for (const side of ['home', 'away']) {
    const after = Number(state.stats[side].shots || 0);
    let remaining = Math.max(0, after - Number(beforeShots[side] || 0));
    if (!remaining) continue;

    const clubId = side === 'home' ? state.homeClubId : state.awayClubId;
    const candidates = (events || []).filter(event => event.clubId === clubId && SHOT_TYPES.has(event.type));
    for (const event of candidates) {
      if (!remaining) break;
      const xg = contextualXg(event);
      state.stats[side].xG = round2(state.stats[side].xG + xg);
      state.stats[side].xgShots += 1;
      if (xg >= XG_MODEL.bigChanceThreshold) state.stats[side].bigChances += 1;
      attachEventXg(state, event, xg);
      remaining -= 1;
    }

    while (remaining > 0) {
      state.stats[side].xG = round2(state.stats[side].xG + 0.08);
      state.stats[side].xgShots += 1;
      remaining -= 1;
    }
  }
}

function improveInjuryAndOwnership(state,events,db){
  for(const event of events || []){
    const person=event.playerId ? playerById(db,event.playerId) : null;
    if(person?.clubId===state.homeClubId || person?.clubId===state.awayClubId) event.clubId=person.clubId;
    if(event.type!=='injury' || !person)continue;
    const team=clubById(db,event.clubId)?.shortName || clubById(db,event.clubId)?.name || 'the team';
    event.lines=(event.lines || [event.text]).filter(Boolean).map((line,index)=>{
      if(index>0 && !String(line).includes(person.name)) return `${person.name} looks in real trouble. ${team} may need to make a change.`;
      return line;
    });
    event.text=event.lines.join(' ');
    const stored=[...(state.events || [])].reverse().find(item=>item.minute===event.minute&&item.type==='injury'&&item.playerId===event.playerId);
    if(stored){stored.clubId=event.clubId;stored.lines=[...event.lines];stored.text=event.text;}
  }
}

function applyConditionIntegrity(prepared,state,career){
  const fixture=fixtureMeta(career,prepared);
  state.fixtureType=fixture.type || prepared.fixtureType || '';
  state.competitionName=fixture.competitionName || prepared.competitionName || '';
  state.substitutionLimit=substitutionLimitForFixture(fixture);
  for(const [id,before] of Object.entries(prepared.conditions || {})){
    if(!Number.isFinite(Number(state.conditions?.[id])))continue;
    state.conditions[id]=round2(scaledConditionAfterMinute(before,state.conditions[id],fixture));
  }
}

function createInteractiveMatch(career, db) {
  const state = ensureXgState(baseCreateInteractiveMatch(career, db));
  const fixture=fixtureForState(career,state) || {};
  state.liveEngineVersion = LIVE_ENGINE_VERSION;
  state.userReadiness = readinessFor(career);
  state.fixtureType=fixture.type || '';
  state.competitionName=fixture.competitionName || '';
  state.substitutionLimit=substitutionLimitForFixture(fixture);
  exposeXg(state);
  return state;
}

function advanceInteractiveMatch(inputState, career, db) {
  const prepared = ensureXgState(clone(inputState));
  const beforeShots = {
    home: Number(prepared.stats.home.shots || 0),
    away: Number(prepared.stats.away.shots || 0)
  };
  const factor = prepared.userReadiness?.factor ?? readinessFor(career).factor;
  const result = baseAdvanceInteractiveMatch(prepared, career, adjustedDatabase(db, prepared.userClubId || career.clubId, factor));
  const state = ensureXgState(result.state);
  state.liveEngineVersion = LIVE_ENGINE_VERSION;
  state.userReadiness = prepared.userReadiness || readinessFor(career);
  applyConditionIntegrity(prepared,state,career);
  improveInjuryAndOwnership(state,result.events,db);
  annotateNewShots(state, result.events, beforeShots);
  exposeXg(state);
  return { state, events: result.events };
}

function completeInteractiveRound(career, inputState, db) {
  const state = ensureXgState(clone(inputState));
  exposeXg(state);
  return baseCompleteInteractiveRound(career, state, db);
}

function extendedSubstitution(inputState,outId,inId,db){
  const state=clone(inputState);const limit=Number(state.substitutionLimit)||COMPETITIVE_SUBSTITUTION_LIMIT;
  if(state.minute>=90)throw new Error('The match is already over.');
  if((state.substitutions||[]).length>=limit)throw new Error(`You have used all ${limit} substitutions.`);
  const side=state.userClubId===state.homeClubId?'home':'away';
  const lineup=[...(side==='home'?state.homeLineupIds:state.awayLineupIds)];
  if((state.sentOffIds||[]).includes(outId))throw new Error('A sent-off player cannot be substituted.');
  if(!lineup.includes(outId))throw new Error('Choose a player currently on the pitch.');
  if(lineup.includes(inId))throw new Error('That player is already on the pitch.');
  if(!(state.userBenchIds||[]).includes(inId))throw new Error('Choose a player from your matchday bench.');
  if((state.subbedOffIds||[]).includes(inId))throw new Error('A substituted player cannot return to the match.');
  const next=lineup.map(id=>id===outId?inId:id);
  if(!next.some(id=>playerById(db,id)?.positionGroup==='GK'))throw new Error('Your team must keep a goalkeeper on the pitch.');
  if(side==='home')state.homeLineupIds=next;else state.awayLineupIds=next;
  state.subbedOffIds ||= [];state.substitutions ||= [];state.events ||= [];
  state.subbedOffIds.push(outId);state.substitutions.push({minute:state.minute,outId,inId});
  if(state.conditions[inId]==null)state.conditions[inId]=100;if(state.ratings[inId]==null)state.ratings[inId]=6.5;if(state.minutesPlayed[inId]==null)state.minutesPlayed[inId]=0;
  const incoming=playerById(db,inId),outgoing=playerById(db,outId),team=clubById(db,state.userClubId)?.shortName||clubById(db,state.userClubId)?.name||'The team';
  const event={minute:state.minute,type:'substitution',clubId:state.userClubId,playerId:inId,assistPlayerId:null,lines:[`${state.minute}' — ${team} make a change.`,`${incoming?.name||'The substitute'} replaces ${outgoing?.name||'the outgoing player'}.`]};
  event.text=event.lines.join(' ');state.events.push(clone(event));return{state,event};
}

function makeSubstitution(inputState, outId, inId, db, career = {}) {
  const beforeShape = clone(getUserShape(inputState, career, db));
  const vacated = beforeShape.assignments.find(item => item.playerId === outId);
  const limit=Number(inputState.substitutionLimit)||COMPETITIVE_SUBSTITUTION_LIMIT;
  const result = (inputState.substitutions || []).length < COMPETITIVE_SUBSTITUTION_LIMIT
    ? baseMakeSubstitution(inputState, outId, inId, db, career)
    : limit > COMPETITIVE_SUBSTITUTION_LIMIT
      ? extendedSubstitution(inputState,outId,inId,db)
      : baseMakeSubstitution(inputState, outId, inId, db, career);

  if (!vacated) return result;

  const state = ensureXgState(result.state);
  state.substitutionLimit=limit;
  const slot = beforeShape.slots.find(item => item.id === vacated.slotId);
  const nextShape = clone(beforeShape);
  const assignment = nextShape.assignments.find(item => item.slotId === vacated.slotId);
  assignment.playerId = inId;
  assignment.suitability = suitability(playerById(db, inId), slot.family);

  state.userShape = nextShape;
  state.playerDuties ||= {};
  state.playerDuties[inId] = ROLE_DEFINITIONS[assignment.role]?.duty || 'Support';

  result.event.lines = [
    ...(result.event.lines || []),
    `${playerById(db, inId)?.name || 'The substitute'} takes over at ${slot.label} as ${assignment.role}.`
  ];
  result.event.text = result.event.lines.join(' ');
  const stored=[...(state.events || [])].reverse().find(item=>item.minute===result.event.minute&&item.type==='substitution'&&item.playerId===inId);
  if(stored){stored.lines=[...result.event.lines];stored.text=result.event.text;}
  exposeXg(state);

  return { state, event: result.event };
}

return {FORMATION_LAYOUTS:modules["matchday-engine-v043.js"].FORMATION_LAYOUTS,MAX_SUBSTITUTIONS:modules["matchday-engine-v043.js"].MAX_SUBSTITUTIONS,ROLE_DEFINITIONS:modules["matchday-engine-v043.js"].ROLE_DEFINITIONS,TACTIC_OPTIONS:modules["matchday-engine-v043.js"].TACTIC_OPTIONS,assignPlayersToFormation:modules["matchday-engine-v043.js"].assignPlayersToFormation,changeTactics:modules["matchday-engine-v043.js"].changeTactics,getOpponentSnapshot:modules["matchday-engine-v043.js"].getOpponentSnapshot,getUserShape:modules["matchday-engine-v043.js"].getUserShape,setPlayerDuty:modules["matchday-engine-v043.js"].setPlayerDuty,setPlayerRole:modules["matchday-engine-v043.js"].setPlayerRole,swapShapePlayers:modules["matchday-engine-v043.js"].swapShapePlayers,LIVE_ENGINE_VERSION,XG_MODEL,createInteractiveMatch,advanceInteractiveMatch,completeInteractiveRound,makeSubstitution};})();
modules["matchday-structured-attacks-v1.js"]=(()=>{
const {
  advanceInteractiveMatch:baseAdvanceInteractiveMatch,
  completeInteractiveRound:baseCompleteInteractiveRound,
  createInteractiveMatch:baseCreateInteractiveMatch,
  makeSubstitution:baseMakeSubstitution
}=modules["matchday-engine-v0431.js"];



const STRUCTURED_ATTACK_VERSION = '1.0.0';
const STRUCTURED_XG_MODEL = Object.freeze({
  version: 2,
  method: 'structured-shot-context',
  spatial: 'coarse-zones',
  bigChanceThreshold: 0.30
});

const SHOT_EVENT_TYPES = new Set(['goal', 'save', 'woodwork', 'miss']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const clone = value => JSON.parse(JSON.stringify(value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function playerById(db, id) {
  return db?.players?.find(player => player.id === id) || null;
}

function clubById(db, id) {
  return db?.clubs?.find(club => club.id === id) || null;
}

function clubName(db, id) {
  const club = clubById(db, id);
  return club?.shortName || club?.name || 'The team';
}

function opponentClubId(state, clubId) {
  return clubId === state.homeClubId ? state.awayClubId : state.homeClubId;
}

function opponentLineup(state, clubId) {
  const opponent = opponentClubId(state, clubId);
  return opponent === state.homeClubId ? (state.homeLineupIds || []) : (state.awayLineupIds || []);
}

function goalkeeperId(state, db, clubId) {
  const ids = opponentLineup(state, clubId);
  return ids.find(id => playerById(db, id)?.positionGroup === 'GK') || ids[0] || null;
}

function scoreForState(state) {
  return { home: Number(state.homeGoals || 0), away: Number(state.awayGoals || 0) };
}

function scoreBeforeEvent(state, event) {
  const after = scoreForState(state);
  const before = { ...after };
  if (event.type === 'goal') {
    if (event.clubId === state.homeClubId) before.home = Math.max(0, before.home - 1);
    if (event.clubId === state.awayClubId) before.away = Math.max(0, before.away - 1);
  }
  return before;
}

function chanceBand(event) {
  const xg = Number(event?.xg);
  if (Number.isFinite(xg)) {
    if (xg >= 0.30) return 'big';
    if (xg <= 0.08) return 'long';
    return 'normal';
  }
  return event?.type === 'goal' ? 'normal' : 'normal';
}

function distanceFor(random, band) {
  if (band === 'big') return 6 + Math.floor(random() * 8);
  if (band === 'long') return 19 + Math.floor(random() * 10);
  return 11 + Math.floor(random() * 9);
}

function shotSubtypeFor(random, band, eventType) {
  const roll = random();
  if (band === 'big') {
    if (roll < 0.22) return 'first_time';
    if (roll < 0.38) return 'header';
    if (roll < 0.47 && eventType === 'goal') return 'chip';
    return roll < 0.72 ? 'placed' : 'drive';
  }
  if (band === 'long') {
    if (roll < 0.14) return 'volley';
    if (roll < 0.55) return 'long_range_drive';
    return 'curler';
  }
  if (roll < 0.16) return 'first_time';
  if (roll < 0.29) return 'header';
  if (roll < 0.39) return 'volley';
  if (roll < 0.70) return 'placed';
  return 'drive';
}

function deliveryFor(random, subtype, band) {
  if (subtype === 'header') return pick(random, ['high_cross', 'far_post_cross', 'near_post_cross']);
  if (subtype === 'first_time') return pick(random, ['low_cross', 'cutback', 'through_ball']);
  if (band === 'long') return pick(random, ['central_combination', 'layoff', 'second_ball']);
  return pick(random, ['through_ball', 'low_cross', 'cutback', 'one_two', 'switch_then_cross', 'central_combination']);
}

function sideForDelivery(random, delivery) {
  if (['low_cross', 'cutback', 'high_cross', 'far_post_cross', 'near_post_cross', 'switch_then_cross'].includes(delivery)) {
    return random() < 0.5 ? 'left' : 'right';
  }
  return 'centre';
}

function angleFor(side, random) {
  if (side === 'centre') return random() < 0.72 ? 'central' : pick(random, ['left_half', 'right_half']);
  return side === 'left' ? pick(random, ['left_half', 'wide_left']) : pick(random, ['right_half', 'wide_right']);
}

function zoneFor(distance, side) {
  if (distance <= 7) return 'six_yard_box';
  if (distance <= 14) return side === 'centre' ? 'central_box' : `${side}_box`;
  if (distance <= 19) return side === 'centre' ? 'edge_of_box' : `${side}_channel`;
  return 'long_range';
}

function pressureFor(random, band) {
  const roll = random();
  if (band === 'big') return roll < 0.28 ? 'none' : roll < 0.66 ? 'low' : 'medium';
  if (band === 'long') return roll < 0.18 ? 'low' : roll < 0.70 ? 'medium' : 'high';
  return roll < 0.12 ? 'none' : roll < 0.38 ? 'low' : roll < 0.80 ? 'medium' : 'high';
}

function outcomeFor(random, eventType) {
  if (eventType === 'goal') return 'goal';
  if (eventType === 'save') return pick(random, ['saved_held', 'saved_parried', 'saved_tipped', 'saved_blocked', 'saved_smothered']);
  if (eventType === 'woodwork') return random() < 0.58 ? 'post' : 'crossbar';
  if (eventType === 'miss') return random() < 0.68 ? 'wide' : 'over';
  return 'unknown';
}

function heightFor(subtype, delivery) {
  if (subtype === 'header' || ['high_cross', 'far_post_cross', 'near_post_cross'].includes(delivery)) return 'high';
  if (['low_cross', 'cutback'].includes(delivery)) return 'ground';
  return 'mid';
}

function finishTypeFor(subtype, distance) {
  if (subtype === 'volley') return 'volley';
  if (subtype === 'chip') return 'chip';
  if (subtype === 'long_range_drive' && distance >= 22) return 'screamer';
  return 'normal';
}

function structuredXgFor(facts = {}) {
  const distance = Number(facts.distance || 18);
  let value = distance <= 6 ? 0.48
    : distance <= 10 ? 0.34
      : distance <= 14 ? 0.21
        : distance <= 18 ? 0.12
          : distance <= 22 ? 0.075
            : 0.045;

  const angleMultiplier = {
    central: 1,
    left_half: 0.90,
    right_half: 0.90,
    wide_left: 0.70,
    wide_right: 0.70
  }[facts.angle] ?? 0.9;
  const pressureMultiplier = { none: 1.13, low: 1.04, medium: 0.91, high: 0.77 }[facts.pressure] ?? 0.91;
  const techniqueMultiplier = {
    placed: 1.05,
    drive: 0.96,
    first_time: 0.94,
    header: 0.78,
    volley: 0.78,
    chip: 0.82,
    long_range_drive: 0.90,
    curler: 0.88
  }[facts.subtype] ?? 1;

  return round2(clamp(value * angleMultiplier * pressureMultiplier * techniqueMultiplier, 0.03, 0.62));
}

function attemptDescription(subtype, shooter) {
  if (subtype === 'first_time') return `${shooter} meets it first time—`;
  if (subtype === 'header') return `${shooter} attacks it in the air—`;
  if (subtype === 'volley') return `${shooter} hits the volley—`;
  if (subtype === 'chip') return `${shooter} tries to lift it over the goalkeeper—`;
  if (subtype === 'long_range_drive') return `${shooter} drives one from distance—`;
  if (subtype === 'curler') return `${shooter} tries to bend it towards the far corner—`;
  if (subtype === 'placed') return `${shooter} opens up and places the shot—`;
  return `${shooter} drives the shot goalwards—`;
}

function buildupDescription(facts, team, creator, shooter) {
  const actor = creator || team;
  if (facts.delivery === 'through_ball') return `${actor} spots the run and slides the ball in behind...`;
  if (facts.delivery === 'low_cross') return `${team} work it down the ${facts.side} and fire a low ball across the area...`;
  if (facts.delivery === 'cutback') return `${team} reach the byline on the ${facts.side} and cut it back into danger...`;
  if (facts.delivery === 'high_cross') return `${team} lift a high cross into the box...`;
  if (facts.delivery === 'near_post_cross') return `${team} whip the delivery towards the near post...`;
  if (facts.delivery === 'far_post_cross') return `${team} hang the cross towards the far post...`;
  if (facts.delivery === 'one_two') return `${actor} exchange a sharp one-two and open a lane through the defence...`;
  if (facts.delivery === 'switch_then_cross') return `${team} switch play quickly before delivering from the ${facts.side}...`;
  if (facts.delivery === 'layoff') return `${shooter} receives a neat layoff outside the area...`;
  if (facts.delivery === 'second_ball') return `${team} recover the second ball and ${shooter} has a sight of goal...`;
  return `${team} combine through the middle and create a shooting lane...`;
}

function outcomeDescription(facts, team, opponent, keeper) {
  if (facts.outcome === 'goal') return `GOAL! ${team} finish the move!`;
  if (facts.outcome === 'saved_held') return `${keeper} gets behind it and holds on.`;
  if (facts.outcome === 'saved_parried') return `${keeper} can only parry it, but ${opponent} react first to the loose ball.`;
  if (facts.outcome === 'saved_tipped') return `${keeper} gets fingertips to it and turns it away.`;
  if (facts.outcome === 'saved_blocked') return `${keeper} makes himself big and blocks the effort.`;
  if (facts.outcome === 'saved_smothered') return `${keeper} is quickly down to smother the shot.`;
  if (facts.outcome === 'post') return `OFF THE POST! ${opponent} survive.`;
  if (facts.outcome === 'crossbar') return `OFF THE BAR! ${opponent} survive.`;
  if (facts.outcome === 'over') return `It climbs over the crossbar.`;
  if (facts.outcome === 'wide') return `It flashes wide of the post.`;
  return `${opponent} deal with the danger.`;
}

function renderStructuredAttackLines(event, facts, db) {
  const team = clubName(db, event.clubId);
  const opponent = clubName(db, facts.opponentClubId);
  const shooter = playerById(db, event.playerId)?.name || 'The attacker';
  const creator = playerById(db, event.assistPlayerId)?.name || '';
  const keeper = playerById(db, facts.opponentPlayerId)?.name || 'The goalkeeper';
  return [
    buildupDescription(facts, team, creator, shooter),
    facts.pressure === 'high' ? `${shooter} has a defender tight to him.` : `${shooter} finds the shooting window.`,
    attemptDescription(facts.subtype, shooter),
    outcomeDescription(facts, team, opponent, keeper)
  ];
}

function buildBeats(event, facts) {
  return [
    {
      phase: 'buildup',
      action: ['low_cross', 'cutback', 'high_cross', 'near_post_cross', 'far_post_cross', 'switch_then_cross'].includes(facts.delivery) ? 'cross' : 'pass',
      subtype: facts.delivery,
      playerId: event.assistPlayerId || null,
      targetPlayerId: event.playerId || null,
      side: facts.side,
      height: facts.height
    },
    {
      phase: 'penetration',
      action: 'movement',
      subtype: facts.delivery === 'through_ball' ? 'run_in_behind' : 'attack_space',
      playerId: event.playerId || null,
      zoneTo: facts.zoneFrom,
      pressure: facts.pressure
    },
    {
      phase: 'attempt',
      action: 'shot',
      subtype: facts.subtype,
      playerId: event.playerId || null,
      opponentPlayerId: facts.opponentPlayerId,
      bodyPart: facts.bodyPart,
      firstTime: facts.firstTime,
      distance: facts.distance,
      angle: facts.angle,
      pressure: facts.pressure
    },
    {
      phase: 'outcome',
      action: facts.outcome.startsWith('saved_') ? 'save' : 'shot_outcome',
      subtype: facts.outcome,
      playerId: facts.outcome.startsWith('saved_') ? facts.opponentPlayerId : event.playerId || null
    }
  ];
}

function deriveStructuredAttackFacts(state, event, db, serial = 0) {
  if (!SHOT_EVENT_TYPES.has(event?.type)) return null;
  const random = seededRandom(`${state.seed}:${state.fixtureId}:${event.minute}:${event.clubId}:${event.playerId}:${event.type}:${serial}:structured-attack-v1`);
  const band = chanceBand(event);
  const distance = distanceFor(random, band);
  const subtype = shotSubtypeFor(random, band, event.type);
  const delivery = deliveryFor(random, subtype, band);
  const side = sideForDelivery(random, delivery);
  const angle = angleFor(side, random);
  const pressure = pressureFor(random, band);
  const outcome = outcomeFor(random, event.type);
  const opponentId = opponentClubId(state, event.clubId);
  const keeper = goalkeeperId(state, db, event.clubId);
  const bodyPart = subtype === 'header' ? 'head' : (random() < 0.22 ? 'left_foot' : 'right_foot');
  const facts = {
    version: STRUCTURED_ATTACK_VERSION,
    sequenceId: `${state.fixtureId}:${event.minute}:${event.clubId}:${serial}`,
    phase: 'outcome',
    action: 'shot',
    subtype,
    delivery,
    teamId: event.clubId,
    playerId: event.playerId || null,
    targetPlayerId: event.playerId || null,
    opponentClubId: opponentId,
    opponentPlayerId: keeper,
    zoneFrom: zoneFor(distance, side),
    zoneTo: 'goal',
    side,
    height: heightFor(subtype, delivery),
    firstTime: ['first_time', 'volley', 'header'].includes(subtype),
    bodyPart,
    pressure,
    distance,
    angle,
    outcome,
    scoreBefore: scoreBeforeEvent(state, event),
    scoreAfter: scoreForState(state),
    contextTags: [],
    legacyXg: Number.isFinite(Number(event.xg)) ? Number(event.xg) : null
  };
  facts.xg = structuredXgFor(facts);
  facts.beats = buildBeats(event, facts);
  return facts;
}

function mirrorIntoStoredEvent(state, event) {
  const stored = [...(state.events || [])].reverse().find(item =>
    item.minute === event.minute && item.type === event.type && item.clubId === event.clubId &&
    item.playerId === event.playerId && !item.attack
  );
  if (!stored) return;
  for (const key of ['sequenceId', 'phase', 'action', 'subtype', 'outcome', 'finishType', 'xg', 'lines', 'text']) {
    if (event[key] !== undefined) stored[key] = clone(event[key]);
  }
  stored.attack = clone(event.attack);
}

function applyStructuredXg(state, event, oldXg, newXg) {
  if (!Number.isFinite(oldXg) || !Number.isFinite(newXg)) return;
  const side = event.clubId === state.homeClubId ? 'home' : event.clubId === state.awayClubId ? 'away' : null;
  if (!side || !state.stats?.[side]) return;
  state.stats[side].xG = round2(Math.max(0, Number(state.stats[side].xG || 0) - oldXg + newXg));
  const threshold = STRUCTURED_XG_MODEL.bigChanceThreshold;
  if (oldXg >= threshold && newXg < threshold) state.stats[side].bigChances = Math.max(0, Number(state.stats[side].bigChances || 0) - 1);
  if (oldXg < threshold && newXg >= threshold) state.stats[side].bigChances = Number(state.stats[side].bigChances || 0) + 1;
}

function annotateStructuredAttackEvents(state, events, db) {
  let serial = Number(state.structuredAttackSerial || 0);
  for (const event of events || []) {
    if (!SHOT_EVENT_TYPES.has(event?.type)) continue;
    const oldXg = Number(event.xg);
    const facts = deriveStructuredAttackFacts(state, event, db, serial);
    serial += 1;
    if (!facts) continue;
    event.attack = facts;
    event.sequenceId = facts.sequenceId;
    event.phase = facts.phase;
    event.action = facts.action;
    event.subtype = facts.subtype;
    event.outcome = facts.outcome;
    event.finishType = finishTypeFor(facts.subtype, facts.distance);
    event.xg = facts.xg;
    event.lines = renderStructuredAttackLines(event, facts, db);
    event.text = event.lines.join(' ');
    if (Number.isFinite(oldXg)) applyStructuredXg(state, event, oldXg, facts.xg);
    mirrorIntoStoredEvent(state, event);
  }
  state.structuredAttackSerial = serial;
  state.structuredAttackVersion = STRUCTURED_ATTACK_VERSION;
  if (state.xgModel) state.xgModel = { ...state.xgModel, ...STRUCTURED_XG_MODEL };
  return { state, events };
}

function createInteractiveMatch(career, db) {
  const state = baseCreateInteractiveMatch(career, db);
  state.structuredAttackSerial = 0;
  state.structuredAttackVersion = STRUCTURED_ATTACK_VERSION;
  if (state.xgModel) state.xgModel = { ...state.xgModel, ...STRUCTURED_XG_MODEL };
  return state;
}

function advanceInteractiveMatch(inputState, career, db) {
  const result = baseAdvanceInteractiveMatch(inputState, career, db);
  return annotateStructuredAttackEvents(result.state, result.events, db);
}

function completeInteractiveRound(career, inputState, db) {
  return baseCompleteInteractiveRound(career, inputState, db);
}

function makeSubstitution(inputState, outId, inId, db, career = {}) {
  return baseMakeSubstitution(inputState, outId, inId, db, career);
}

return {FORMATION_LAYOUTS:modules["matchday-engine-v0431.js"].FORMATION_LAYOUTS,MAX_SUBSTITUTIONS:modules["matchday-engine-v0431.js"].MAX_SUBSTITUTIONS,ROLE_DEFINITIONS:modules["matchday-engine-v0431.js"].ROLE_DEFINITIONS,TACTIC_OPTIONS:modules["matchday-engine-v0431.js"].TACTIC_OPTIONS,assignPlayersToFormation:modules["matchday-engine-v0431.js"].assignPlayersToFormation,changeTactics:modules["matchday-engine-v0431.js"].changeTactics,getOpponentSnapshot:modules["matchday-engine-v0431.js"].getOpponentSnapshot,getUserShape:modules["matchday-engine-v0431.js"].getUserShape,setPlayerDuty:modules["matchday-engine-v0431.js"].setPlayerDuty,setPlayerRole:modules["matchday-engine-v0431.js"].setPlayerRole,swapShapePlayers:modules["matchday-engine-v0431.js"].swapShapePlayers,STRUCTURED_ATTACK_VERSION,STRUCTURED_XG_MODEL,structuredXgFor,renderStructuredAttackLines,deriveStructuredAttackFacts,annotateStructuredAttackEvents,createInteractiveMatch,advanceInteractiveMatch,completeInteractiveRound,makeSubstitution};})();
modules["matchday-structured-flow-v1.js"]=(()=>{
const {
  advanceInteractiveMatch:baseAdvanceInteractiveMatch,
  completeInteractiveRound:baseCompleteInteractiveRound,
  createInteractiveMatch:baseCreateInteractiveMatch,
  makeSubstitution:baseMakeSubstitution
}=modules["matchday-structured-attacks-v1.js"];



const STRUCTURED_FLOW_VERSION = '1.0.0';
const STRUCTURED_FLOW_TYPES = Object.freeze([
  'interception',
  'standing_tackle',
  'sliding_tackle',
  'poor_touch',
  'overhit_pass',
  'forced_back',
  'second_ball_win',
  'blocked_cross',
  'defensive_header',
  'keeper_claim',
  'overhit_cross',
  'press_regain',
  'offside_trap',
  'defensive_header_corner',
  'blocked_cross_corner',
  'last_ditch_block_corner'
]);

const ELIGIBLE_TYPES = new Set(['commentary', 'corner', 'offside', 'instruction']);
const clone = value => JSON.parse(JSON.stringify(value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function playerById(db, id) {
  return db?.players?.find(player => player.id === id) || null;
}

function clubById(db, id) {
  return db?.clubs?.find(club => club.id === id) || null;
}

function clubName(db, id) {
  const club = clubById(db, id);
  return club?.shortName || club?.name || 'The team';
}

function opponentClubId(state, clubId) {
  return clubId === state.homeClubId ? state.awayClubId : state.homeClubId;
}

function lineupForClub(state, clubId) {
  if (clubId === state.homeClubId) return state.homeLineupIds || [];
  if (clubId === state.awayClubId) return state.awayLineupIds || [];
  return [];
}

function choosePlayer(ids, db, random, groups = null, excluded = new Set()) {
  let pool = (ids || []).map(id => playerById(db, id)).filter(player => player && !excluded.has(player.id));
  if (groups?.length) {
    const positional = pool.filter(player => groups.includes(player.positionGroup));
    if (positional.length) pool = positional;
  }
  if (!pool.length) return null;
  const weighted = [];
  for (const player of pool) {
    const weight = player.positionGroup === 'DEF' ? 5 : player.positionGroup === 'MID' ? 4 : player.positionGroup === 'ATT' ? 3 : 1;
    for (let index = 0; index < weight; index += 1) weighted.push(player);
  }
  return weighted[Math.floor(random() * weighted.length)] || pool[0];
}

function goalkeeperFor(state, db, clubId) {
  const ids = lineupForClub(state, clubId);
  return ids.map(id => playerById(db, id)).find(player => player?.positionGroup === 'GK') || null;
}

function scoreMargin(state, clubId) {
  if (clubId === state.homeClubId) return Number(state.homeGoals || 0) - Number(state.awayGoals || 0);
  if (clubId === state.awayClubId) return Number(state.awayGoals || 0) - Number(state.homeGoals || 0);
  return 0;
}

function sourceText(event) {
  return `${event?.text || ''} ${(event?.lines || []).join(' ')}`.toLowerCase();
}

function isPressRegainText(text) {
  return /press|closes down|squeeze the pitch|win possession high|snaps into the challenge|wins the second ball/.test(text);
}

function isWideText(text) {
  return /flank|cross|wide|byline|wing/.test(text);
}

function subtypeFor(event, random) {
  const text = sourceText(event);
  if (event.type === 'offside') return 'offside_trap';
  if (event.type === 'corner') {
    if (/headed behind|heads? behind/.test(text)) return 'defensive_header_corner';
    if (/shot is blocked|blocked/.test(text)) return 'last_ditch_block_corner';
    return 'blocked_cross_corner';
  }
  if (isPressRegainText(text)) return /second ball/.test(text) ? 'second_ball_win' : 'press_regain';
  if (isWideText(text)) return pick(random, ['blocked_cross', 'defensive_header', 'keeper_claim', 'overhit_cross']);
  return pick(random, [
    'interception', 'interception', 'standing_tackle', 'standing_tackle',
    'sliding_tackle', 'poor_touch', 'overhit_pass', 'forced_back', 'second_ball_win'
  ]);
}

function rolesForSubtype(subtype, eventClubId, state) {
  if (['press_regain', 'second_ball_win'].includes(subtype)) {
    return {
      attackingClubId: opponentClubId(state, eventClubId),
      defendingClubId: eventClubId,
      possessionClubId: eventClubId
    };
  }
  const attackingClubId = eventClubId;
  const defendingClubId = opponentClubId(state, eventClubId);
  const attackingKeepsBall = subtype === 'forced_back';
  return {
    attackingClubId,
    defendingClubId,
    possessionClubId: attackingKeepsBall ? attackingClubId : defendingClubId
  };
}

function sideForSubtype(subtype, random) {
  if (['blocked_cross', 'defensive_header', 'keeper_claim', 'overhit_cross', 'blocked_cross_corner', 'defensive_header_corner'].includes(subtype)) {
    return random() < 0.5 ? 'left' : 'right';
  }
  const roll = random();
  return roll < 0.28 ? 'left' : roll < 0.56 ? 'right' : 'centre';
}

function zoneForSubtype(subtype, side) {
  if (['keeper_claim', 'defensive_header', 'defensive_header_corner', 'last_ditch_block_corner'].includes(subtype)) return 'penalty_area';
  if (['blocked_cross', 'overhit_cross', 'blocked_cross_corner'].includes(subtype)) return side === 'left' ? 'left_channel' : 'right_channel';
  if (subtype === 'offside_trap') return 'final_third';
  if (subtype === 'press_regain') return 'middle_third';
  return 'final_third';
}

function actionForSubtype(subtype) {
  if (subtype === 'interception') return 'interception';
  if (['standing_tackle', 'sliding_tackle', 'last_ditch_block_corner'].includes(subtype)) return 'tackle';
  if (['defensive_header', 'defensive_header_corner'].includes(subtype)) return 'aerial_duel';
  if (['keeper_claim'].includes(subtype)) return 'goalkeeper_claim';
  if (['blocked_cross', 'blocked_cross_corner'].includes(subtype)) return 'block';
  if (subtype === 'offside_trap') return 'offside';
  if (subtype === 'second_ball_win') return 'second_ball';
  if (subtype === 'press_regain') return 'press_turnover';
  if (subtype === 'forced_back') return 'recycle';
  return 'turnover';
}

function outcomeForSubtype(subtype) {
  if (['defensive_header_corner', 'blocked_cross_corner', 'last_ditch_block_corner'].includes(subtype)) return 'corner_conceded';
  if (subtype === 'keeper_claim') return 'keeper_possession';
  if (subtype === 'offside_trap') return 'offside';
  if (subtype === 'forced_back') return 'recycled';
  if (subtype === 'overhit_cross' || subtype === 'overhit_pass') return 'ball_runs_safe';
  if (subtype === 'second_ball_win' || subtype === 'press_regain') return 'possession_won';
  return 'attack_stopped';
}

function pressureFor(random, subtype) {
  if (['last_ditch_block_corner', 'sliding_tackle'].includes(subtype)) return 'high';
  if (['keeper_claim', 'forced_back', 'overhit_pass'].includes(subtype)) return random() < 0.5 ? 'low' : 'medium';
  return random() < 0.25 ? 'low' : random() < 0.78 ? 'medium' : 'high';
}

function contextTagsFor(state, roles, subtype, memory, defenderId) {
  const tags = [];
  const minute = Number(state.minute || 0);
  if (minute >= 75 && scoreMargin(state, roles.defendingClubId) > 0) tags.push('protecting-lead');
  if (minute >= 75 && scoreMargin(state, roles.attackingClubId) < 0) tags.push('chasing-game');
  if (subtype === 'press_regain') tags.push('high-regain');
  if (['sliding_tackle', 'last_ditch_block_corner'].includes(subtype)) tags.push('last-ditch');
  const defenderWins = Number(memory?.defenderActions?.[defenderId] || 0);
  if (defenderId && defenderWins >= 1) tags.push('repeat-defender');
  const breakdowns = Number(memory?.teamBreakdowns?.[roles.attackingClubId] || 0);
  if (breakdowns >= 2) tags.push('attack-frustration');
  const recent = (memory?.history || []).filter(item => item.attackingClubId === roles.attackingClubId && minute - Number(item.minute || 0) <= 8);
  if (recent.length >= 2) tags.push('pressure-resisted');
  return [...new Set(tags)];
}

function buildBeats(facts) {
  const developmentAction = ['blocked_cross', 'defensive_header', 'keeper_claim', 'overhit_cross', 'blocked_cross_corner', 'defensive_header_corner'].includes(facts.subtype)
    ? 'cross'
    : ['offside_trap', 'overhit_pass', 'interception'].includes(facts.subtype) ? 'pass' : 'carry';
  return [
    {
      phase: 'development',
      action: developmentAction,
      playerId: facts.attackerId,
      targetPlayerId: facts.targetPlayerId,
      zone: facts.zone,
      side: facts.side
    },
    {
      phase: 'duel',
      action: facts.action,
      playerId: facts.defenderId || facts.keeperId,
      opponentPlayerId: facts.attackerId,
      pressure: facts.pressure
    },
    {
      phase: 'resolution',
      action: 'possession_outcome',
      subtype: facts.outcome,
      teamId: facts.possessionClubId
    }
  ];
}

function fallbackFlowLines(event, facts, db) {
  const attacking = clubName(db, facts.attackingClubId);
  const defending = clubName(db, facts.defendingClubId);
  const attacker = playerById(db, facts.attackerId)?.name || 'The attacker';
  const defender = playerById(db, facts.defenderId)?.name || 'The defender';
  const keeper = playerById(db, facts.keeperId)?.name || 'The goalkeeper';
  switch (facts.subtype) {
    case 'interception': return [`${attacking} try to play through the final third.`, `${defender} reads it early and steps across ${attacker}.`, `${defending} have the ball back.`];
    case 'standing_tackle': return [`${attacker} tries to drive into the final third.`, `${defender} stands him up and wins the challenge cleanly.`, `${defending} turn possession over.`];
    case 'sliding_tackle': return [`${attacker} pushes the ball into space.`, `${defender} commits to the slide and times it perfectly.`, `The danger is cleared for ${defending}.`];
    case 'poor_touch': return [`${attacker} receives between the lines.`, `The first touch gets away from him and ${defender} pounces.`, `${defending} recover possession.`];
    case 'overhit_pass': return [`${attacking} look for the runner beyond the back line.`, `The pass has too much on it.`, `${keeper} watches it run safely through.`];
    case 'forced_back': return [`${attacker} tries to advance down the ${facts.side}.`, `${defender} shuts the route forward.`, `${attacking} are forced to recycle possession.`];
    case 'second_ball_win': return [`The loose ball drops in midfield.`, `${defender} reacts first and wins the second ball.`, `${defending} can build again.`];
    case 'press_regain': return [`${attacking} try to play through the press.`, `${defender} closes the space and forces the turnover.`, `${defending} win it high up the pitch.`];
    case 'blocked_cross': return [`${attacker} reaches crossing range on the ${facts.side}.`, `${defender} gets out quickly and blocks the delivery.`, `${attacking}'s move stalls.`];
    case 'defensive_header': return [`The cross is sent into the ${defending} area.`, `${defender} attacks it first and heads clear.`, `${defending} survive the delivery.`];
    case 'keeper_claim': return [`${attacking} send the ball into the box.`, `${keeper} comes through traffic and claims it cleanly.`, `${defending} can reset.`];
    case 'overhit_cross': return [`${attacker} tries to deliver from the ${facts.side}.`, `The cross is overhit and carries beyond everybody.`, `${defending} let the danger run out.`];
    case 'offside_trap': return [`${attacking} try to release ${attacker} behind the line.`, `${defending} step together and catch the run.`, `The flag goes up for offside.`];
    case 'defensive_header_corner': return [`${attacking} put the delivery into a dangerous area.`, `${defender} gets there first and heads behind.`, `Corner to ${attacking}.`];
    case 'blocked_cross_corner': return [`${attacker} tries to force a cross into the area.`, `${defender} blocks it at close range.`, `It spins behind for a ${attacking} corner.`];
    case 'last_ditch_block_corner': return [`${attacker} finds a sight of the penalty area.`, `${defender} throws himself across the danger.`, `The block takes it behind for a corner.`];
    default: return [`${attacking} try to work an opening.`, `${defending} read the danger.`, `The attack breaks down.`];
  }
}

function deriveStructuredFlowFacts(state, event, db, serial = 0, memory = {}) {
  if (!event || event.attack || !ELIGIBLE_TYPES.has(event.type) || !event.clubId) return null;
  const random = seededRandom(`${state.seed}:${state.fixtureId}:${event.minute}:${event.clubId}:${event.type}:${serial}:structured-flow-v1`);
  const subtype = subtypeFor(event, random);
  const roles = rolesForSubtype(subtype, event.clubId, state);
  const attackingIds = lineupForClub(state, roles.attackingClubId);
  const defendingIds = lineupForClub(state, roles.defendingClubId);
  const eventPlayer = playerById(db, event.playerId);
  const attacker = eventPlayer?.clubId === roles.attackingClubId
    ? eventPlayer
    : choosePlayer(attackingIds, db, random, ['ATT', 'MID']);
  const creator = choosePlayer(attackingIds, db, random, ['MID', 'DEF'], new Set(attacker ? [attacker.id] : []));
  const keeper = goalkeeperFor(state, db, roles.defendingClubId);
  const defenderGroups = subtype === 'press_regain' || subtype === 'second_ball_win' ? ['MID', 'DEF'] : ['DEF', 'MID'];
  const defender = choosePlayer(defendingIds, db, random, defenderGroups, new Set(keeper ? [keeper.id] : []));
  const side = sideForSubtype(subtype, random);
  const zone = zoneForSubtype(subtype, side);
  const facts = {
    version: STRUCTURED_FLOW_VERSION,
    sequenceId: `${state.fixtureId}:${event.minute}:${event.clubId}:flow:${serial}`,
    sourceEventType: event.type,
    category: ['press_regain', 'second_ball_win'].includes(subtype) ? 'turnover' : ['forced_back'].includes(subtype) ? 'recycle' : 'broken_attack',
    phase: 'resolution',
    action: actionForSubtype(subtype),
    subtype,
    attackingClubId: roles.attackingClubId,
    defendingClubId: roles.defendingClubId,
    possessionClubId: roles.possessionClubId,
    attackerId: attacker?.id || null,
    creatorId: creator?.id || null,
    targetPlayerId: attacker?.id || null,
    defenderId: defender?.id || null,
    keeperId: keeper?.id || null,
    side,
    zone,
    pressure: pressureFor(random, subtype),
    outcome: outcomeForSubtype(subtype),
    contextTags: contextTagsFor(state, roles, subtype, memory, defender?.id || null)
  };
  facts.beats = buildBeats(facts);
  return facts;
}

function ensureMemory(state) {
  state.structuredFlowMemory ||= { version: STRUCTURED_FLOW_VERSION, defenderActions: {}, teamBreakdowns: {}, history: [] };
  state.structuredFlowMemory.version = STRUCTURED_FLOW_VERSION;
  state.structuredFlowMemory.defenderActions ||= {};
  state.structuredFlowMemory.teamBreakdowns ||= {};
  state.structuredFlowMemory.history ||= [];
  return state.structuredFlowMemory;
}

function updateMemory(memory, facts, minute) {
  if (facts.defenderId && facts.outcome !== 'recycled') {
    memory.defenderActions[facts.defenderId] = Number(memory.defenderActions[facts.defenderId] || 0) + 1;
  }
  if (facts.attackingClubId && facts.outcome !== 'recycled') {
    memory.teamBreakdowns[facts.attackingClubId] = Number(memory.teamBreakdowns[facts.attackingClubId] || 0) + 1;
  }
  memory.history.push({ minute, attackingClubId: facts.attackingClubId, defendingClubId: facts.defendingClubId, defenderId: facts.defenderId, subtype: facts.subtype });
  if (memory.history.length > 24) memory.history.splice(0, memory.history.length - 24);
}

function mirrorIntoStoredEvent(state, event) {
  const stored = [...(state.events || [])].reverse().find(item =>
    item.minute === event.minute && item.type === event.type && item.clubId === event.clubId &&
    item.playerId === event.playerId && !item.flow && !item.attack
  );
  if (!stored) return;
  for (const key of ['sequenceId', 'phase', 'action', 'subtype', 'outcome', 'lines', 'text']) {
    if (event[key] !== undefined) stored[key] = clone(event[key]);
  }
  stored.flow = clone(event.flow);
}

function annotateStructuredFlowEvents(state, events, db) {
  const memory = ensureMemory(state);
  let serial = Number(state.structuredFlowSerial || 0);
  for (const event of events || []) {
    if (event?.attack || !ELIGIBLE_TYPES.has(event?.type) || !event?.clubId) continue;
    const facts = deriveStructuredFlowFacts(state, event, db, serial, memory);
    serial += 1;
    if (!facts) continue;
    event.flow = facts;
    event.sequenceId = facts.sequenceId;
    event.phase = facts.phase;
    event.action = facts.action;
    event.subtype = facts.subtype;
    event.outcome = facts.outcome;
    event.lines = fallbackFlowLines(event, facts, db);
    event.text = event.lines.join(' ');
    updateMemory(memory, facts, event.minute);
    mirrorIntoStoredEvent(state, event);
  }
  state.structuredFlowSerial = serial;
  state.structuredFlowVersion = STRUCTURED_FLOW_VERSION;
  return { state, events };
}

function createInteractiveMatch(career, db) {
  const state = baseCreateInteractiveMatch(career, db);
  state.structuredFlowSerial = 0;
  state.structuredFlowVersion = STRUCTURED_FLOW_VERSION;
  ensureMemory(state);
  return state;
}

function advanceInteractiveMatch(inputState, career, db) {
  const result = baseAdvanceInteractiveMatch(inputState, career, db);
  return annotateStructuredFlowEvents(result.state, result.events, db);
}

function completeInteractiveRound(career, inputState, db) {
  return baseCompleteInteractiveRound(career, inputState, db);
}

function makeSubstitution(inputState, outId, inId, db, career = {}) {
  return baseMakeSubstitution(inputState, outId, inId, db, career);
}

return {FORMATION_LAYOUTS:modules["matchday-structured-attacks-v1.js"].FORMATION_LAYOUTS,MAX_SUBSTITUTIONS:modules["matchday-structured-attacks-v1.js"].MAX_SUBSTITUTIONS,ROLE_DEFINITIONS:modules["matchday-structured-attacks-v1.js"].ROLE_DEFINITIONS,STRUCTURED_ATTACK_VERSION:modules["matchday-structured-attacks-v1.js"].STRUCTURED_ATTACK_VERSION,STRUCTURED_XG_MODEL:modules["matchday-structured-attacks-v1.js"].STRUCTURED_XG_MODEL,TACTIC_OPTIONS:modules["matchday-structured-attacks-v1.js"].TACTIC_OPTIONS,assignPlayersToFormation:modules["matchday-structured-attacks-v1.js"].assignPlayersToFormation,changeTactics:modules["matchday-structured-attacks-v1.js"].changeTactics,getOpponentSnapshot:modules["matchday-structured-attacks-v1.js"].getOpponentSnapshot,getUserShape:modules["matchday-structured-attacks-v1.js"].getUserShape,setPlayerDuty:modules["matchday-structured-attacks-v1.js"].setPlayerDuty,setPlayerRole:modules["matchday-structured-attacks-v1.js"].setPlayerRole,structuredXgFor:modules["matchday-structured-attacks-v1.js"].structuredXgFor,swapShapePlayers:modules["matchday-structured-attacks-v1.js"].swapShapePlayers,STRUCTURED_FLOW_VERSION,STRUCTURED_FLOW_TYPES,deriveStructuredFlowFacts,annotateStructuredFlowEvents,createInteractiveMatch,advanceInteractiveMatch,completeInteractiveRound,makeSubstitution};})();
modules["match-drama-v3.js"]=(()=>{
const MATCH_DRAMA_VERSION='3.0.0';

const DRAMA_RATES=Object.freeze({
  penaltySituation:0.0050,
  dangerousFreeKick:0.0120,
  disallowedGoal:0.0014,
  lastManChallenge:0.0009,
  simulation:0.0010
});

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const round2=v=>Math.round(Number(v||0)*100)/100;

function hashString(value){
  let hash=2166136261;
  for(const character of String(value||'')){
    hash^=character.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function seededRandom(seed){
  let state=hashString(seed)||1;
  return()=>{
    state+=0x6D2B79F5;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return((value^(value>>>14))>>>0)/4294967296;
  };
}

function deterministicUnit(seed){return seededRandom(seed)();}

function player(db,id){return db?.players?.find(item=>item.id===id)||null;}
function club(db,id){return db?.clubs?.find(item=>item.id===id)||null;}
function clubName(db,id){const item=club(db,id);return item?.shortName||item?.name||'the team';}
function lineup(state,side){return side==='home'?state.homeLineupIds:state.awayLineupIds;}
function clubId(state,side){return side==='home'?state.homeClubId:state.awayClubId;}
function otherSide(side){return side==='home'?'away':'home';}
function activeIds(state,side){return(lineup(state,side)||[]).filter(id=>!(state.sentOffIds||[]).includes(id));}
function playerAbility(p){return Number(p?.currentAbility||120);}

function choosePlayer(state,db,side,random,groups=null){
  let pool=activeIds(state,side).map(id=>player(db,id)).filter(Boolean);
  if(groups?.length){const filtered=pool.filter(p=>groups.includes(p.positionGroup));if(filtered.length)pool=filtered;}
  if(!pool.length)return null;
  const weighted=[];
  for(const p of pool){
    const weight=p.positionGroup==='ATT'?5:p.positionGroup==='MID'?4:p.positionGroup==='DEF'?2:1;
    for(let i=0;i<weight;i+=1)weighted.push(p);
  }
  return weighted[Math.floor(random()*weighted.length)]||pool[0];
}

function chooseSetPieceTaker(state,db,side,random){
  const pool=activeIds(state,side).map(id=>player(db,id)).filter(p=>p&&p.positionGroup!=='GK');
  if(!pool.length)return null;
  const ranked=pool.map(p=>({p,score:playerAbility(p)+(p.positionGroup==='MID'?12:p.positionGroup==='ATT'?7:0)})).sort((a,b)=>b.score-a.score);
  const shortlist=ranked.slice(0,Math.min(4,ranked.length));
  const weights=[7,4,2,1];
  const bag=[];
  shortlist.forEach((entry,index)=>{for(let i=0;i<(weights[index]||1);i+=1)bag.push(entry.p);});
  return bag[Math.floor(random()*bag.length)]||shortlist[0]?.p||pool[0];
}

function goalkeeper(state,db,side){return activeIds(state,side).map(id=>player(db,id)).find(p=>p?.positionGroup==='GK')||player(db,activeIds(state,side)[0]);}

function ensureState(state){
  state.events||=[];
  state.sentOffIds||=[];
  state.yellowByPlayer||={};
  state.ratings||={};
  state.stats||={home:{},away:{}};
  for(const side of ['home','away']){
    state.stats[side]||={};
    state.stats[side].shots=Number(state.stats[side].shots||0);
    state.stats[side].onTarget=Number(state.stats[side].onTarget||0);
    state.stats[side].fouls=Number(state.stats[side].fouls||0);
    state.stats[side].yellowCards=Number(state.stats[side].yellowCards||0);
    state.stats[side].redCards=Number(state.stats[side].redCards||0);
    state.stats[side].xG=Number(state.stats[side].xG||0);
    state.stats[side].xgShots=Number(state.stats[side].xgShots||0);
    state.stats[side].bigChances=Number(state.stats[side].bigChances||0);
    state.stats[side].penalties=Number(state.stats[side].penalties||0);
  }
  state.matchDrama||={version:MATCH_DRAMA_VERSION,serial:0,counts:{},atmosphere:[]};
  state.matchDrama.version=MATCH_DRAMA_VERSION;
  state.matchDrama.counts||={};
  state.matchDrama.atmosphere||=[];
  return state;
}

function eventId(state,family){
  state.matchDrama.serial=Number(state.matchDrama.serial||0)+1;
  return`${state.fixtureId||'match'}:${state.minute}:${family}:${state.matchDrama.serial}`;
}

function record(state,event){
  const stored={
    minute:Number(state.minute)||0,
    type:event.type||'commentary',
    clubId:event.clubId||null,
    playerId:event.playerId||null,
    assistPlayerId:event.assistPlayerId||null,
    text:event.text||(event.lines||[]).join(' '),
    lines:[...(event.lines|| (event.text?[event.text]:[]))],
    incidentId:event.incidentId||null,
    incidentType:event.incidentType||null,
    source:event.source||null,
    reason:event.reason||null,
    decision:event.decision||null,
    reviewOutcome:event.reviewOutcome||null,
    distance:Number.isFinite(Number(event.distance))?Number(event.distance):null,
    disallowed:Boolean(event.disallowed),
    xg:Number.isFinite(Number(event.xg))?round2(event.xg):null
  };
  state.events.push(stored);
  return stored;
}

function addRating(state,id,delta){if(id)state.ratings[id]=clamp(Number(state.ratings[id]??6.5)+delta,4,10);}
function incrementCount(state,key){state.matchDrama.counts[key]=Number(state.matchDrama.counts[key]||0)+1;}
function underCap(state,key,max){return Number(state.matchDrama.counts[key]||0)<max;}

function addShot(state,side,{onTarget=false,xg=0.1,bigChance=false}={}){
  state.stats[side].shots+=1;
  if(onTarget)state.stats[side].onTarget+=1;
  state.stats[side].xG=round2(state.stats[side].xG+xg);
  state.stats[side].xgShots+=1;
  if(bigChance||xg>=0.30)state.stats[side].bigChances+=1;
}

function addGoal(state,side,scorer,xg,source,lines,incidentId){
  if(side==='home')state.homeGoals=Number(state.homeGoals||0)+1;
  else state.awayGoals=Number(state.awayGoals||0)+1;
  addRating(state,scorer?.id,.72);
  return record(state,{type:'goal',clubId:clubId(state,side),playerId:scorer?.id||null,source,incidentType:source,incidentId,xg,lines});
}

function removeFromPitch(state,side,id){
  if(side==='home')state.homeLineupIds=(state.homeLineupIds||[]).filter(item=>item!==id);
  else state.awayLineupIds=(state.awayLineupIds||[]).filter(item=>item!==id);
}

function sendOff(state,db,side,offender,{lines,incidentId,source='discipline',reason=''}={}){
  if(!offender||state.sentOffIds.includes(offender.id))return null;
  removeFromPitch(state,side,offender.id);
  state.sentOffIds.push(offender.id);
  state.stats[side].redCards+=1;
  addRating(state,offender.id,-.65);
  return record(state,{type:'red',clubId:clubId(state,side),playerId:offender.id,incidentId,incidentType:'red-card',source,reason,decision:'red',lines:lines||[`RED CARD! ${offender.name} is sent off.`]});
}

function bookPlayer(state,db,side,offender,{lines,incidentId,source='discipline',reason=''}={}){
  if(!offender)return null;
  state.yellowByPlayer[offender.id]=Number(state.yellowByPlayer[offender.id]||0)+1;
  state.stats[side].yellowCards+=1;
  addRating(state,offender.id,-.08);
  if(state.yellowByPlayer[offender.id]>=2){
    const second=[...(lines||[]),`SECOND YELLOW! ${offender.name} is still off — that booking ends his match.`];
    return sendOff(state,db,side,offender,{lines:second,incidentId,source,reason:'second-yellow'});
  }
  return record(state,{type:'yellow',clubId:clubId(state,side),playerId:offender.id,incidentId,incidentType:'yellow-card',source,reason,decision:'yellow',lines:lines||[`YELLOW CARD! ${offender.name} is booked.`]});
}

function resolvePenaltyOutcome({roll,takerAbility=130,keeperAbility=130}){
  const edge=clamp((Number(takerAbility)-Number(keeperAbility))/500,-.06,.06);
  const goalCut=clamp(.755+edge,.68,.82);
  const saveCut=clamp(goalCut+.155-edge*.35,goalCut+.10,.93);
  const woodworkCut=Math.min(.965,saveCut+.035);
  if(roll<goalCut)return'goal';
  if(roll<saveCut)return'save';
  if(roll<woodworkCut)return'woodwork';
  return'miss';
}

function resolveFreeKickOutcome({roll,takerAbility=130,keeperAbility=130}){
  const edge=clamp((Number(takerAbility)-Number(keeperAbility))/650,-.035,.035);
  const goalCut=.055+edge;
  const saveCut=goalCut+.285;
  const woodworkCut=saveCut+.055;
  const wallCut=woodworkCut+.285;
  if(roll<goalCut)return'goal';
  if(roll<saveCut)return'save';
  if(roll<woodworkCut)return'woodwork';
  if(roll<wallCut)return'wall';
  return'miss';
}

function resolveDogsoDecision({decisionRoll,varRoll,alreadyBooked=false}){
  const provisional=decisionRoll<.58?'red':'yellow';
  const review=provisional==='red'&&varRoll<.34;
  const overturned=review&&varRoll<.055;
  const final=overturned?'yellow':provisional;
  return{provisional,review,overturned,final,stillSentOff:final==='yellow'&&alreadyBooked};
}

function descriptor(p){
  const ability=playerAbility(p);
  if(ability>=160&&p?.positionGroup==='MID')return'the playmaker';
  if(ability>=160&&p?.positionGroup==='ATT')return'the talisman';
  if(ability>=150)return'the set-piece specialist';
  return'';
}

function penaltySituation(state,db,random){
  const attack=random()<.52?'home':'away',defend=otherSide(attack);
  const team=clubName(db,clubId(state,attack)),defTeam=clubName(db,clubId(state,defend));
  const attacker=choosePlayer(state,db,attack,random,['ATT','MID']);
  const defender=choosePlayer(state,db,defend,random,['DEF','MID']);
  const taker=chooseSetPieceTaker(state,db,attack,random)||attacker;
  const keeper=goalkeeper(state,db,defend);
  if(!attacker||!taker)return[];
  const incidentId=eventId(state,'penalty');
  incrementCount(state,'penaltySituation');
  state.stats[defend].fouls+=1;
  const handball=random()<.22;
  const initialPenalty=random()<.52;
  const reviewChance=initialPenalty?.30:.24;
  const reviewed=random()<reviewChance;
  const overturned=reviewed&&random()<(initialPenalty?.075:.12);
  const finalPenalty=overturned?!initialPenalty:initialPenalty;
  const lines=[];
  lines.push(handball
    ?`${team} fire the ball into the box — huge appeals for handball!`
    :`${attacker.name} drives into the ${defTeam} penalty area and goes down under the challenge!`);
  if(initialPenalty)lines.push(`PENALTY TO ${team.toUpperCase()}! The referee points straight to the spot.`);
  else lines.push(`The referee waves play on. ${team} are demanding a penalty.`);
  if(reviewed){
    lines.push(`VAR CHECK — they are looking closely at ${handball?'the defender\'s arm':'the contact inside the area'}...`);
    if(overturned)lines.push(initialPenalty?`DECISION OVERTURNED — NO PENALTY!`:`THE REFEREE CHANGES HIS MIND — PENALTY!`);
    else lines.push(initialPenalty?`VAR CHECK COMPLETE — THE PENALTY STANDS.`:`VAR CHECK COMPLETE — NO PENALTY.`);
  }
  if(!finalPenalty){
    return[record(state,{type:'var',clubId:clubId(state,attack),playerId:attacker.id,incidentId,incidentType:'penalty-appeal',source:'var',reason:handball?'handball':'foul',decision:'no-penalty',reviewOutcome:reviewed?(overturned?'overturned':'confirmed'):'none',lines})];
  }
  state.stats[attack].penalties+=1;
  const label=descriptor(taker);
  lines.push(`${taker.name} places the ball on the spot${label?` — ${label} has the responsibility`:''}.`);
  lines.push(`${taker.name.toUpperCase()} STEPS UP—`);
  const outcome=resolvePenaltyOutcome({roll:random(),takerAbility:playerAbility(taker),keeperAbility:playerAbility(keeper)});
  addShot(state,attack,{onTarget:outcome==='goal'||outcome==='save',xg:.76,bigChance:true});
  if(outcome==='goal'){
    lines.push(`GOAL! ${taker.name} scores for ${team}!`);
    return[addGoal(state,attack,taker,.76,'penalty',lines,incidentId)];
  }
  if(outcome==='save'){
    addRating(state,keeper?.id,.32);addRating(state,taker.id,-.18);
    lines.push(`SAVED! ${keeper?.name||'The goalkeeper'} guesses correctly and keeps it out!`);
  }else if(outcome==='woodwork'){
    addRating(state,taker.id,-.10);
    lines.push(`OFF THE POST! ${taker.name} sends the keeper the wrong way but hits the woodwork!`);
  }else{
    addRating(state,taker.id,-.16);
    lines.push(`MISSED! ${taker.name} sends it wide of the target!`);
  }
  return[record(state,{type:outcome==='save'?'save':outcome==='woodwork'?'woodwork':'miss',clubId:clubId(state,attack),playerId:taker.id,incidentId,incidentType:'penalty',source:'penalty',reason:handball?'handball':'foul',decision:'penalty',reviewOutcome:reviewed?(overturned?'overturned':'confirmed'):'none',xg:.76,lines})];
}

function dangerousFreeKick(state,db,random){
  const attack=random()<.52?'home':'away',defend=otherSide(attack);
  const team=clubName(db,clubId(state,attack)),defTeam=clubName(db,clubId(state,defend));
  const taker=chooseSetPieceTaker(state,db,attack,random);
  const offender=choosePlayer(state,db,defend,random,['DEF','MID']);
  const keeper=goalkeeper(state,db,defend);
  if(!taker)return[];
  const incidentId=eventId(state,'free-kick'),distance=18+Math.floor(random()*10),label=descriptor(taker);
  incrementCount(state,'dangerousFreeKick');state.stats[defend].fouls+=1;
  const setups=[
    `${team} have a free-kick ${distance} yards from goal. This is a dangerous position.`,
    `Free-kick to ${team}, ${distance} yards out — close enough to go straight for goal.`,
    `${offender?.name||defTeam} concedes the foul. ${team} have a free-kick just ${distance} yards out.`
  ];
  const lines=[setups[Math.floor(random()*setups.length)]];
  lines.push(label?`${taker.name} stands over it. ${label.charAt(0).toUpperCase()+label.slice(1)} is eyeing the top corner.`:`${taker.name} stands over it. The wall is set.`);
  const strikes=[`${taker.name.toUpperCase()} CURLS IT OVER THE WALL—`,`${taker.name.toUpperCase()} GOES FOR GOAL—`,`${taker.name.toUpperCase()} STRIKES IT CLEANLY—`];
  lines.push(strikes[Math.floor(random()*strikes.length)]);
  const outcome=resolveFreeKickOutcome({roll:random(),takerAbility:playerAbility(taker),keeperAbility:playerAbility(keeper)});
  addShot(state,attack,{onTarget:outcome==='goal'||outcome==='save',xg:.06});
  if(outcome==='goal'){
    lines.push(`GOAL! ${taker.name} scores for ${team}!`);
    addRating(state,taker.id,.15);
    return[addGoal(state,attack,taker,.06,'free-kick',lines,incidentId)];
  }
  if(outcome==='save'){
    addRating(state,keeper?.id,.12);lines.push(`SUPERB SAVE! ${keeper?.name||'The goalkeeper'} gets across and turns it away!`);
  }else if(outcome==='woodwork'){
    lines.push(`OFF THE BAR! ${taker.name} had the goalkeeper beaten — inches from a brilliant free-kick.`);
  }else if(outcome==='wall'){
    lines.push(`It smashes into the wall and ${defTeam} scramble the danger away.`);
  }else lines.push(`Just over! ${taker.name} was trying to find the top corner.`);
  return[record(state,{type:outcome==='save'?'save':outcome==='woodwork'?'woodwork':'free-kick',clubId:clubId(state,attack),playerId:taker.id,incidentId,incidentType:'dangerous-free-kick',source:'free-kick',distance,xg:.06,lines})];
}

function disallowedGoal(state,db,random){
  const attack=random()<.52?'home':'away';
  const team=clubName(db,clubId(state,attack));
  const scorer=choosePlayer(state,db,attack,random,['ATT','MID']);
  if(!scorer)return[];
  const incidentId=eventId(state,'disallowed-goal');
  incrementCount(state,'disallowedGoal');
  const reason=['offside','foul in the build-up','handball'][Math.floor(random()*3)];
  const close=random()<.78;
  const lines=[
    `GOAL! ${scorer.name} has the ball in the net for ${team}!`,
    `But wait — VAR are checking the goal...`,
    reason==='offside'?`They are drawing the lines. This is extremely tight.`:reason==='handball'?`VAR are checking for a possible handball in the build-up.`:`VAR are looking at a possible foul before the finish.`
  ];
  lines.push(close?`NO GOAL! VAR overturn it for ${reason}.`:`NO GOAL! The review confirms ${reason}.`);
  return[record(state,{type:'var',clubId:clubId(state,attack),playerId:scorer.id,incidentId,incidentType:'disallowed-goal',source:'var',reason,decision:'no-goal',reviewOutcome:'overturned',disallowed:true,lines})];
}

function lastManChallenge(state,db,random){
  const attack=random()<.52?'home':'away',defend=otherSide(attack);
  const team=clubName(db,clubId(state,attack)),defTeam=clubName(db,clubId(state,defend));
  const attacker=choosePlayer(state,db,attack,random,['ATT','MID']);
  const offender=choosePlayer(state,db,defend,random,['DEF','MID']);
  if(!attacker||!offender)return[];
  const incidentId=eventId(state,'dogso');
  incrementCount(state,'lastManChallenge');state.stats[defend].fouls+=1;
  const alreadyBooked=Number(state.yellowByPlayer[offender.id]||0)>0;
  const decision=resolveDogsoDecision({decisionRoll:random(),varRoll:random(),alreadyBooked});
  const crowd=attack==='home'?`THE CROWD ARE SCREAMING FOR A RED CARD!`:`${team} players surround the referee — they want a red card.`;
  const baseLines=[`${attacker.name} is clean through on goal — ${offender.name} is the last defender!`,`${offender.name} brings him down just outside the area!`,crowd];
  if(decision.provisional==='red'){
    if(decision.overturned){
      const lines=[...baseLines,`RED CARD! ${offender.name} is sent off!`,`VAR are checking whether this really denied a clear goal-scoring opportunity...`,`The referee goes to the monitor...`,`DECISION OVERTURNED — YELLOW CARD!`];
      if(attack==='home')lines.push(`The home crowd are furious with that decision.`);
      if(alreadyBooked)lines.push(`${offender.name} was already booked, though — this will still be a second yellow.`);
      return[bookPlayer(state,db,defend,offender,{lines,incidentId,source:'var-dogso',reason:'denial-of-goal-scoring-opportunity'})].filter(Boolean);
    }
    const lines=[...baseLines,`RED CARD! ${offender.name} IS OFF!`];
    if(decision.review)lines.push(`VAR CHECK COMPLETE — RED CARD CONFIRMED.`);
    lines.push(`${defTeam} are down to ten men.`);
    return[sendOff(state,db,defend,offender,{lines,incidentId,source:'dogso',reason:'denial-of-goal-scoring-opportunity'})].filter(Boolean);
  }
  const lines=[...baseLines,`YELLOW CARD! ${offender.name} is only booked.`];
  if(attack==='home')lines.push(`The home crowd cannot believe it — they wanted a dismissal.`);
  return[bookPlayer(state,db,defend,offender,{lines,incidentId,source:'dogso',reason:'last-man-challenge'})].filter(Boolean);
}

function simulationIncident(state,db,random){
  const attack=random()<.52?'home':'away';
  const team=clubName(db,clubId(state,attack));
  const attacker=choosePlayer(state,db,attack,random,['ATT','MID']);
  if(!attacker)return[];
  const incidentId=eventId(state,'simulation');
  incrementCount(state,'simulation');
  const lines=[`${attacker.name} darts into the penalty area and goes down!`,`${team} appeal for a penalty...`,`The referee waves the appeals away.`,`YELLOW CARD! ${attacker.name} is booked for simulation — the referee says he dived.`];
  return[bookPlayer(state,db,attack,attacker,{lines,incidentId,source:'simulation',reason:'diving'})].filter(Boolean);
}

const VENUES={
  arsenal:'the Emirates',
  liverpool:'Anfield',
  'manchester united':'Old Trafford',
  'man united':'Old Trafford',
  'manchester city':'the Etihad',
  'man city':'the Etihad',
  chelsea:'Stamford Bridge',
  'tottenham hotspur':'the Tottenham Hotspur Stadium',
  tottenham:'the Tottenham Hotspur Stadium',
  newcastle:'St James\' Park',
  'newcastle united':'St James\' Park'
};
function venueFor(name){const key=String(name||'').toLowerCase();return Object.entries(VENUES).find(([clubKey])=>key.includes(clubKey))?.[1]||'the stadium';}

function crowdNarrativeFor({minute,homeGoals,awayGoals,homeName='the home side',awayName='the visitors',seen=[]}){
  const gap=Number(awayGoals||0)-Number(homeGoals||0),venue=venueFor(homeName),used=new Set(seen||[]);
  if(minute>=76&&gap>=4&&!used.has('mass-exit'))return{key:'mass-exit',tone:'leaving',lines:[`Large sections of the home support have seen enough. Streams of fans are heading for the exits at ${venue}.`]};
  if(minute>=39&&minute<=45&&gap>=3&&!used.has('early-exit'))return{key:'early-exit',tone:'hostile',lines:[`Boos are starting to ring around ${venue}.`,`Some of the ${homeName} supporters have had enough of this performance and are already heading for the exits.`]};
  if(minute>=60&&gap>=3&&!used.has('humiliation'))return{key:'humiliation',tone:'hostile',lines:[`${homeName} are being jeered by sections of their own support. This is becoming a miserable afternoon at ${venue}.`]};
  if(minute>=70&&gap===2&&!used.has('restless'))return{key:'restless',tone:'restless',lines:[`The mood inside ${venue} is turning. The home crowd are growing increasingly frustrated.`]};
  if(minute>=82&&gap<0&&Math.abs(gap)===1&&!used.has('protect-lead'))return{key:'protect-lead',tone:'tense',lines:[`Every clearance is being cheered now. ${homeName} are trying to drag this lead over the line.`]};
  if(minute>=82&&gap===0&&!used.has('late-tension'))return{key:'late-tension',tone:'tense',lines:[`The noise rises around ${venue}. One moment could decide this match now.`]};
  if(minute>=40&&minute<=45&&gap<=-3&&!used.has('home-party'))return{key:'home-party',tone:'jubilant',lines:[`${venue} is bouncing. ${homeName} are giving their supporters a first-half performance to remember.`]};
  return null;
}

function atmosphereEvent(state,db){
  const homeName=clubName(db,state.homeClubId),awayName=clubName(db,state.awayClubId);
  const story=crowdNarrativeFor({minute:Number(state.minute),homeGoals:state.homeGoals,awayGoals:state.awayGoals,homeName,awayName,seen:state.matchDrama.atmosphere});
  if(!story)return[];
  state.matchDrama.atmosphere.push(story.key);
  return[record(state,{type:'atmosphere',clubId:state.homeClubId,incidentId:eventId(state,`crowd-${story.key}`),incidentType:'crowd',source:'atmosphere',decision:story.tone,lines:story.lines})];
}

function applyMatchDrama(inputState,db,baseEvents=[]){
  const state=ensureState(inputState);
  const minute=Number(state.minute)||0;
  if(minute<5||minute>89)return{state,events:[]};
  const major=(baseEvents||[]).some(event=>['goal','red','injury'].includes(event?.type));
  if(major)return{state,events:atmosphereEvent(state,db)};
  const random=seededRandom(`${state.seed||'seed'}:${state.fixtureId||'fixture'}:match-drama-v3:${minute}`);
  const roll=random();
  let cursor=0;
  let events=[];
  if(roll<(cursor+=DRAMA_RATES.penaltySituation)&&underCap(state,'penaltySituation',2))events=penaltySituation(state,db,random);
  else if(roll<(cursor+=DRAMA_RATES.dangerousFreeKick)&&underCap(state,'dangerousFreeKick',3))events=dangerousFreeKick(state,db,random);
  else if(roll<(cursor+=DRAMA_RATES.disallowedGoal)&&underCap(state,'disallowedGoal',1))events=disallowedGoal(state,db,random);
  else if(roll<(cursor+=DRAMA_RATES.lastManChallenge)&&underCap(state,'lastManChallenge',1))events=lastManChallenge(state,db,random);
  else if(roll<(cursor+=DRAMA_RATES.simulation)&&underCap(state,'simulation',1))events=simulationIncident(state,db,random);
  if(!events.length)events=atmosphereEvent(state,db);
  return{state,events};
}

return {MATCH_DRAMA_VERSION,DRAMA_RATES,deterministicUnit,resolvePenaltyOutcome,resolveFreeKickOutcome,resolveDogsoDecision,crowdNarrativeFor,applyMatchDrama};})();
modules["matchday-engine-v069.js"]=(()=>{
const base=modules["matchday-structured-flow-v1.js"];
const { applyMatchDrama, MATCH_DRAMA_VERSION }=modules["match-drama-v3.js"];



const MATCH_RULES_VERSION = '0.7.3';
const MATCH_DRAMA_ENGINE_VERSION = MATCH_DRAMA_VERSION;
const MATCH_STRUCTURED_ATTACK_VERSION = base.STRUCTURED_ATTACK_VERSION;
const MATCH_STRUCTURED_FLOW_VERSION = base.STRUCTURED_FLOW_VERSION;
const PREMIER_LEAGUE_BENCH_LIMIT = 9;
const PREMIER_LEAGUE_SUBSTITUTION_LIMIT = 5;
const PREMIER_LEAGUE_WINDOW_LIMIT = 3;
const FRIENDLY_SUBSTITUTION_LIMIT = 11;

const clone = value => JSON.parse(JSON.stringify(value));
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const liveStructuredHistory = new Map();
const liveInitialLineups = new Map();

function fixtureForState(career = {}, state = {}) {
  const fixture = (career.fixtures || []).flat().find(item => item?.id === state.fixtureId);
  return fixture || {
    id: state.fixtureId,
    type: state.fixtureType || '',
    competitionName: state.competitionName || career.competitionName || ''
  };
}

function isFriendlyMatch(fixture = {}) {
  const text = `${fixture.type || ''} ${fixture.competitionName || ''} ${fixture.name || ''}`.toLowerCase();
  return /friendly|pre[- ]?season/.test(text);
}

function substitutionRulesForFixture(fixture = {}) {
  if (isFriendlyMatch(fixture)) {
    return Object.freeze({
      kind: 'friendly',
      benchLimit: null,
      maxSubstitutions: FRIENDLY_SUBSTITUTION_LIMIT,
      maxInPlayWindows: null,
      halfTimeUsesWindow: false,
      reentryAllowed: false
    });
  }
  return Object.freeze({
    kind: 'competitive',
    benchLimit: PREMIER_LEAGUE_BENCH_LIMIT,
    maxSubstitutions: PREMIER_LEAGUE_SUBSTITUTION_LIMIT,
    maxInPlayWindows: PREMIER_LEAGUE_WINDOW_LIMIT,
    halfTimeUsesWindow: false,
    reentryAllowed: false
  });
}

function userLineup(state) {
  return state.userClubId === state.homeClubId ? state.homeLineupIds : state.awayLineupIds;
}

function availableUserSquad(career, db, state) {
  const lineup = new Set(userLineup(state) || []);
  return (db.players || [])
    .filter(player => player.clubId === state.userClubId && !player.isPlaceholder && !lineup.has(player.id))
    .sort((a, b) => (b.currentAbility || 0) - (a.currentAbility || 0));
}

function initialiseBenchPlayer(state, career, id) {
  state.conditions ||= {};
  state.ratings ||= {};
  state.minutesPlayed ||= {};
  if (!Number.isFinite(Number(state.conditions[id]))) state.conditions[id] = career.playerStatus?.[id]?.condition ?? 100;
  if (!Number.isFinite(Number(state.ratings[id]))) state.ratings[id] = 6.5;
  if (!Number.isFinite(Number(state.minutesPlayed[id]))) state.minutesPlayed[id] = 0;
}

function applyRules(inputState, career, db) {
  const state = inputState;
  const fixture = fixtureForState(career, state);
  const rules = substitutionRulesForFixture(fixture);
  state.fixtureType = fixture.type || state.fixtureType || '';
  state.competitionName = fixture.competitionName || state.competitionName || '';
  state.matchRulesVersion = MATCH_RULES_VERSION;
  state.matchDramaVersion = MATCH_DRAMA_ENGINE_VERSION;
  state.matchRulesKind = rules.kind;
  state.substitutionLimit = rules.maxSubstitutions;
  state.substitutionWindowLimit = rules.maxInPlayWindows;
  state.substitutionWindowMinutes ||= [];

  if (rules.kind === 'friendly') {
    state.userBenchIds = availableUserSquad(career, db, state).map(player => player.id);
  } else {
    state.userBenchIds = [...(state.userBenchIds || [])].slice(0, rules.benchLimit);
  }
  for (const id of state.userBenchIds || []) initialiseBenchPlayer(state, career, id);
  return state;
}

function publishLiveXg(state) {
  if (true || !state?.stats?.home || !state?.stats?.away) return;
  window.__flmLiveXg = {
    fixtureId: state.fixtureId,
    minute: state.minute,
    home: round2(state.stats.home.xG),
    away: round2(state.stats.away.xG),
    homeBigChances: Number(state.stats.home.bigChances || 0),
    awayBigChances: Number(state.stats.away.bigChances || 0),
    model: state.xgModel || { version: 1, method: 'shot-derived-contextual', spatial: false }
  };
  try { window.dispatchEvent(new CustomEvent('flm:live-xg', { detail: window.__flmLiveXg })); } catch (_) {}
}

function cloneStructuredAttack(attack) {
  if (!attack || typeof attack !== 'object') return null;
  return {
    ...attack,
    scoreBefore: attack.scoreBefore ? { ...attack.scoreBefore } : null,
    scoreAfter: attack.scoreAfter ? { ...attack.scoreAfter } : null,
    contextTags: [...(attack.contextTags || [])],
    beats: (attack.beats || []).map(beat => ({ ...beat }))
  };
}

function cloneStructuredFlow(flow) {
  if (!flow || typeof flow !== 'object') return null;
  return {
    ...flow,
    contextTags: [...(flow.contextTags || [])],
    beats: (flow.beats || []).map(beat => ({ ...beat }))
  };
}

function cloneStructuredEvent(event) {
  return {
    liveEventId: event.liveEventId,
    minute: event.minute,
    type: event.type,
    clubId: event.clubId,
    playerId: event.playerId,
    assistPlayerId: event.assistPlayerId,
    sequenceId: event.sequenceId,
    phase: event.phase,
    action: event.action,
    subtype: event.subtype,
    outcome: event.outcome,
    finishType: event.finishType,
    xg: event.xg,
    text: event.text,
    lines: Array.isArray(event.lines) ? [...event.lines] : undefined,
    attack: cloneStructuredAttack(event.attack),
    flow: cloneStructuredFlow(event.flow)
  };
}

function eventStorageKey(event) {
  if (event?.liveEventId) return `event:${event.liveEventId}`;
  if (event?.attack?.sequenceId) return `attack:${event.attack.sequenceId}`;
  if (event?.flow?.sequenceId) return `flow:${event.flow.sequenceId}`;
  return null;
}

function resetLiveFixtureHistory(state) {
  liveStructuredHistory.set(state.fixtureId, []);
  liveInitialLineups.set(state.fixtureId, {
    home: [...(state.homeLineupIds || [])],
    away: [...(state.awayLineupIds || [])]
  });
  if (liveStructuredHistory.size > 8) {
    const oldest = liveStructuredHistory.keys().next().value;
    liveStructuredHistory.delete(oldest);
    liveInitialLineups.delete(oldest);
  }
}

function clearLiveFixtureHistory(fixtureId) {
  if (!fixtureId) return;
  liveStructuredHistory.delete(fixtureId);
  liveInitialLineups.delete(fixtureId);
}

function publishLiveState(state, emittedEvents = []) {
  if (true || !state?.fixtureId) return;
  if (!liveStructuredHistory.has(state.fixtureId)) resetLiveFixtureHistory(state);

  const history = liveStructuredHistory.get(state.fixtureId);
  const seen = new Set(history.map(eventStorageKey).filter(Boolean));
  for (const event of emittedEvents || []) {
    const structuredKey = eventStorageKey(event);
    if (structuredKey && seen.has(structuredKey)) continue;
    const stored = cloneStructuredEvent(event);
    if (!structuredKey) stored.liveEventId = `${state.fixtureId}:${history.length + 1}`;
    history.push(stored);
    const storedKey = eventStorageKey(stored);
    if (storedKey) seen.add(storedKey);
  }

  const initial = liveInitialLineups.get(state.fixtureId) || {
    home: [...(state.homeLineupIds || [])],
    away: [...(state.awayLineupIds || [])]
  };
  const snapshot = {
    fixtureId: state.fixtureId,
    minute: Number(state.minute || 0),
    homeClubId: state.homeClubId,
    awayClubId: state.awayClubId,
    userClubId: state.userClubId,
    homeGoals: Number(state.homeGoals || 0),
    awayGoals: Number(state.awayGoals || 0),
    homeLineupIds: [...(state.homeLineupIds || [])],
    awayLineupIds: [...(state.awayLineupIds || [])],
    initialHomeLineupIds: [...initial.home],
    initialAwayLineupIds: [...initial.away],
    ratings: { ...(state.ratings || {}) },
    conditions: { ...(state.conditions || {}) },
    minutesPlayed: { ...(state.minutesPlayed || {}) },
    subbedOffIds: [...(state.subbedOffIds || [])],
    events: history.map(cloneStructuredEvent),
    structuredCommentarySnapshotVersion: '3.0.0',
    source: 'matchday-engine-v069'
  };
  window.__flmLiveStateV332 = snapshot;
  window.__flmStructuredCommentaryV2 = snapshot;
  window.__flmStructuredCommentaryV3 = snapshot;
  try { window.dispatchEvent(new CustomEvent('flm:live-state-v332', { detail: snapshot })); } catch (_) {}
}

function isHalfTimeSubstitution(state) {
  return Number(state.minute) === 45;
}

function windowKey(state) {
  return Math.max(0, Math.floor(Number(state.minute) || 0));
}

function assertWindowAvailable(state, rules) {
  if (rules.kind !== 'competitive' || isHalfTimeSubstitution(state)) return;
  const key = windowKey(state);
  const used = [...new Set(state.substitutionWindowMinutes || [])];
  if (used.includes(key)) return;
  if (used.length >= rules.maxInPlayWindows) {
    throw new Error('You have used all three in-play substitution windows. Half-time changes do not use a window.');
  }
}

function recordWindow(state, rules) {
  if (rules.kind !== 'competitive' || isHalfTimeSubstitution(state)) return;
  const key = windowKey(state);
  state.substitutionWindowMinutes ||= [];
  if (!state.substitutionWindowMinutes.includes(key)) state.substitutionWindowMinutes.push(key);
}

function createInteractiveMatch(career, db) {
  const state = applyRules(base.createInteractiveMatch(career, db), career, db);
  state.matchDrama ||= { version: MATCH_DRAMA_ENGINE_VERSION, serial: 0, counts: {}, atmosphere: [] };
  state.matchDrama.version = MATCH_DRAMA_ENGINE_VERSION;
  publishLiveXg(state);
  publishLiveState(state, []);
  return state;
}

function advanceInteractiveMatch(inputState, career, db) {
  const result = base.advanceInteractiveMatch(inputState, career, db);
  let state = applyRules(result.state, career, db);
  const drama = applyMatchDrama(state, db, result.events);
  state = applyRules(drama.state, career, db);
  const events = [...(result.events || []), ...(drama.events || [])];
  publishLiveXg(state);
  publishLiveState(state, events);
  return { ...result, state, events };
}

function completeInteractiveRound(career, inputState, db) {
  const result = base.completeInteractiveRound(career, inputState, db);
  const fixtureId = inputState?.fixtureId;
  clearLiveFixtureHistory(fixtureId);
  if (false && fixtureId) {
    try { window.dispatchEvent(new CustomEvent('flm:live-state-complete', { detail: { fixtureId } })); } catch (_) {}
  }
  return result;
}

function makeSubstitution(inputState, outId, inId, db, career = {}) {
  const state = applyRules(clone(inputState), career, db);
  const fixture = fixtureForState(career, state);
  const rules = substitutionRulesForFixture(fixture);
  if ((state.subbedOffIds || []).includes(inId)) throw new Error('A substituted player cannot return to the match.');
  assertWindowAvailable(state, rules);
  const result = base.makeSubstitution(state, outId, inId, db, career);
  const next = applyRules(result.state, career, db);
  recordWindow(next, rules);
  publishLiveXg(next);
  publishLiveState(next, []);
  return { ...result, state: next };
}
return {FORMATION_LAYOUTS:modules["matchday-structured-flow-v1.js"].FORMATION_LAYOUTS,MAX_SUBSTITUTIONS:modules["matchday-structured-flow-v1.js"].MAX_SUBSTITUTIONS,ROLE_DEFINITIONS:modules["matchday-structured-flow-v1.js"].ROLE_DEFINITIONS,STRUCTURED_ATTACK_VERSION:modules["matchday-structured-flow-v1.js"].STRUCTURED_ATTACK_VERSION,STRUCTURED_FLOW_TYPES:modules["matchday-structured-flow-v1.js"].STRUCTURED_FLOW_TYPES,STRUCTURED_FLOW_VERSION:modules["matchday-structured-flow-v1.js"].STRUCTURED_FLOW_VERSION,STRUCTURED_XG_MODEL:modules["matchday-structured-flow-v1.js"].STRUCTURED_XG_MODEL,TACTIC_OPTIONS:modules["matchday-structured-flow-v1.js"].TACTIC_OPTIONS,assignPlayersToFormation:modules["matchday-structured-flow-v1.js"].assignPlayersToFormation,changeTactics:modules["matchday-structured-flow-v1.js"].changeTactics,getOpponentSnapshot:modules["matchday-structured-flow-v1.js"].getOpponentSnapshot,getUserShape:modules["matchday-structured-flow-v1.js"].getUserShape,setPlayerDuty:modules["matchday-structured-flow-v1.js"].setPlayerDuty,setPlayerRole:modules["matchday-structured-flow-v1.js"].setPlayerRole,swapShapePlayers:modules["matchday-structured-flow-v1.js"].swapShapePlayers,MATCH_RULES_VERSION,MATCH_DRAMA_ENGINE_VERSION,MATCH_STRUCTURED_ATTACK_VERSION,MATCH_STRUCTURED_FLOW_VERSION,PREMIER_LEAGUE_BENCH_LIMIT,PREMIER_LEAGUE_SUBSTITUTION_LIMIT,PREMIER_LEAGUE_WINDOW_LIMIT,FRIENDLY_SUBSTITUTION_LIMIT,isFriendlyMatch,substitutionRulesForFixture,createInteractiveMatch,advanceInteractiveMatch,completeInteractiveRound,makeSubstitution};})();
return modules["matchday-engine-v069.js"];})();
