/* =============================================
   UNDERCUT — F1 2026 — app.js
   ============================================= */

// ─── State ───────────────────────────────────
let DATA = null;
let currentLang = 'en';
let currentFilter = 'all';
let currentModalRace = null;
let currentModalTab = 'sessions';

// ─── Translations ────────────────────────────
const T = {
  en: {
    round: 'Round',
    sessions: 'Sessions',
    raceResult: 'Race Result',
    sprintResult: 'Sprint Result',
    fp1: 'Free Practice 1',
    fp2: 'Free Practice 2',
    fp3: 'Free Practice 3',
    qualifying: 'Qualifying',
    sprintQualifying: 'Sprint Qualifying',
    sprint: 'Sprint',
    race: 'Race',
    pos: 'POS',
    driver: 'Driver',
    team: 'Team',
    points: 'PTS',
    gap: 'Gap',
    status: 'Status',
    no_results: 'Results not yet available.',
    cancelled_banner: '🚫 This race has been CANCELLED',
    postponed_banner: '⏳ This race has been POSTPONED',
    dnf: 'DNF',
    dns: 'DNS',
    finished: 'Finished',
    next_race: 'NEXT RACE',
    sprint_weekend: 'Sprint Weekend',
    completed: 'Completed',
    upcoming: 'Upcoming',
    cancelled: 'Cancelled',
    postponed: 'Postponed',
    podium: 'Podium',
    wins: 'Wins',
    podiums: 'Podiums',
    nationality: 'Nationality',
    drivers_champ: "Drivers' Championship",
    constructors_champ: "Constructors' Championship",
    top10_chart: 'Top 10 — Points',
    fan_made: 'Fan-made. Not affiliated with Formula 1.',
    result_points: 'pts',
  },
  es: {
    round: 'Ronda',
    sessions: 'Sesiones',
    raceResult: 'Resultado Carrera',
    sprintResult: 'Resultado Sprint',
    fp1: 'Práctica Libre 1',
    fp2: 'Práctica Libre 2',
    fp3: 'Práctica Libre 3',
    qualifying: 'Clasificación',
    sprintQualifying: 'Clasificación Sprint',
    sprint: 'Sprint',
    race: 'Carrera',
    pos: 'POS',
    driver: 'Piloto',
    team: 'Equipo',
    points: 'PTS',
    gap: 'Dif',
    status: 'Estado',
    no_results: 'Resultados aún no disponibles.',
    cancelled_banner: '🚫 Esta carrera ha sido CANCELADA',
    postponed_banner: '⏳ Esta carrera ha sido APLAZADA',
    dnf: 'DNF',
    dns: 'DNS',
    finished: 'Finalizado',
    next_race: 'PRÓXIMA CARRERA',
    sprint_weekend: 'Fin de Semana Sprint',
    completed: 'Disputada',
    upcoming: 'Próxima',
    cancelled: 'Cancelada',
    postponed: 'Aplazada',
    podium: 'Podio',
    wins: 'Victorias',
    podiums: 'Podios',
    nationality: 'Nacionalidad',
    drivers_champ: 'Campeonato de Pilotos',
    constructors_champ: 'Campeonato de Constructores',
    top10_chart: 'Top 10 — Puntos',
    fan_made: 'Hecho por fans. No afiliado con la Fórmula 1.',
    result_points: 'pts',
  }
};

function t(key) {
  return T[currentLang][key] || T['en'][key] || key;
}

// ─── Points system ────────────────────────────
const RACE_POINTS  = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

function getPoints(position, type) {
  const arr = type === 'sprint' ? SPRINT_POINTS : RACE_POINTS;
  if (position >= 1 && position <= arr.length) return arr[position - 1];
  return 0;
}

// ─── Init ─────────────────────────────────────
async function init() {
  try {
    const res = await fetch('data.json');
    DATA = await res.json();
    buildTicker();
    renderCalendar();
    renderDriverStandings();
    renderConstructorStandings();
    bindNav();
    bindLang();
    bindFilter();
    bindModal();
  } catch(e) {
    console.error('Failed to load data.json', e);
    document.body.innerHTML = '<div style="padding:40px;color:#fff;font-family:monospace">Error loading data.json. Please run via a local server.</div>';
  }
}

// ─── Ticker ──────────────────────────────────
function buildTicker() {
  const standings = calcDriverStandings();
  const items = standings.slice(0, 10).map(s => {
    const d = DATA.drivers.find(dr => dr.id === s.driverId);
    return `<span class="ticker-item">${d.shortName} — ${s.points} PTS</span>`;
  });
  // duplicate for seamless loop
  const all = [...items, ...items].join('');
  document.getElementById('tickerTrack').innerHTML = all;
}

// ─── Calendar ────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const today = new Date();
  today.setHours(0,0,0,0);

  // Find next race
  let nextRaceId = null;
  for (const r of DATA.calendar) {
    if (r.status === 'upcoming') {
      const rd = new Date(r.sessions.race.date);
      if (rd >= today) { nextRaceId = r.id; break; }
    }
  }

  let races = DATA.calendar;
  if (currentFilter === 'completed') races = races.filter(r => r.status === 'completed');
  else if (currentFilter === 'upcoming') races = races.filter(r => r.status === 'upcoming' || r.status === 'cancelled' || r.status === 'postponed');
  else if (currentFilter === 'sprint') races = races.filter(r => r.hasSprint);

  if (races.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-state-icon">🏁</span>No races match this filter.</div>`;
    return;
  }

  grid.innerHTML = races.map(race => buildRaceCard(race, race.id === nextRaceId)).join('');

  // bind card clicks
  grid.querySelectorAll('.race-card').forEach(card => {
    card.addEventListener('click', () => openModal(parseInt(card.dataset.raceId)));
  });
}

function buildRaceCard(race, isNext) {
  const statusClass = `status-${race.status}`;
  const nextClass = isNext ? 'is-next' : '';
  const sprintClass = race.hasSprint ? 'has-sprint' : '';

  let badges = '';
  if (isNext) badges += `<span class="badge badge-next">${t('next_race')}</span>`;
  if (race.hasSprint) badges += `<span class="badge badge-sprint">${t('sprint_weekend')}</span>`;
  if (race.status === 'completed') badges += `<span class="badge badge-completed">${t('completed')}</span>`;
  else if (race.status === 'cancelled') badges += `<span class="badge badge-cancelled">${t('cancelled')}</span>`;
  else if (race.status === 'postponed') badges += `<span class="badge badge-postponed">${t('postponed')}</span>`;
  else if (!isNext) badges += `<span class="badge badge-upcoming">${t('upcoming')}</span>`;

  const raceName = currentLang === 'es' ? race.nameEs : race.name;

  const sessionRows = buildSessionRows(race);

  let podiumHTML = '';
  if (race.raceResult && race.status === 'completed') {
    const top3 = race.raceResult.slice(0, 3);
    podiumHTML = `<div class="card-podium">` + top3.map(r => {
      const drv = DATA.drivers.find(d => d.id === r.driver);
      const team = DATA.teams.find(t => t.id === drv.team);
      return `<div class="podium-item">
        <span class="podium-pos">${r.position}</span>
        <div class="podium-team-dot" style="background:${team.color}"></div>
        <span class="podium-driver">${drv.shortName}</span>
      </div>`;
    }).join('') + `</div>`;
  }

  return `
    <div class="race-card ${statusClass} ${nextClass} ${sprintClass}" data-race-id="${race.id}">
      <div class="card-stripe"></div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-round">${t('round')} ${String(race.round).padStart(2,'0')}</span>
          <div class="card-badges">${badges}</div>
        </div>
        <span class="card-flag">${race.flag}</span>
        <div class="card-name">${raceName}</div>
        <div class="card-circuit">${race.circuit} · ${race.location}</div>
        <div class="card-sessions">${sessionRows}</div>
        ${podiumHTML}
      </div>
    </div>`;
}

function buildSessionRows(race) {
  const sessionKeys = ['fp1','fp2','sprintQualifying','fp3','sprint','qualifying','race'];
  const labelMap = {
    fp1: t('fp1'), fp2: t('fp2'), fp3: t('fp3'),
    qualifying: t('qualifying'), sprintQualifying: t('sprintQualifying'),
    sprint: t('sprint'), race: t('race')
  };
  const classMap = {
    race: 'race', sprint: 'sprint-race', sprintQualifying: 'sprint-race'
  };

  return sessionKeys
    .filter(k => race.sessions[k])
    .map(k => {
      const s = race.sessions[k];
      const cls = classMap[k] || '';
      const dateStr = formatDate(s.date);
      return `<div class="session-row ${cls}">
        <span class="session-label">${labelMap[k]}</span>
        <span class="session-date">${dateStr} · ${s.time}</span>
      </div>`;
    }).join('');
}

// ─── Modal ───────────────────────────────────
function openModal(raceId) {
  currentModalRace = DATA.calendar.find(r => r.id === raceId);
  currentModalTab = 'sessions';
  renderModal();
  document.getElementById('raceModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('raceModal').classList.remove('open');
  document.body.style.overflow = '';
}

function bindModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('raceModal').addEventListener('click', e => {
    if (e.target === document.getElementById('raceModal')) closeModal();
  });
}

function renderModal() {
  const race = currentModalRace;
  const raceName = currentLang === 'es' ? race.nameEs : race.name;

  let badges = '';
  if (race.hasSprint) badges += `<span class="badge badge-sprint">${t('sprint_weekend')}</span>`;
  if (race.status === 'completed') badges += `<span class="badge badge-completed">${t('completed')}</span>`;
  else if (race.status === 'cancelled') badges += `<span class="badge badge-cancelled">${t('cancelled')}</span>`;
  else if (race.status === 'postponed') badges += `<span class="badge badge-postponed">${t('postponed')}</span>`;
  else badges += `<span class="badge badge-upcoming">${t('upcoming')}</span>`;

  // Build tabs
  const tabs = [{ id: 'sessions', label: t('sessions') }];
  if (race.status !== 'cancelled') {
    tabs.push({ id: 'race', label: t('raceResult') });
    if (race.hasSprint) tabs.push({ id: 'sprint', label: t('sprintResult') });
  }

  const tabsHTML = tabs.map(tab =>
    `<button class="modal-tab ${tab.id === currentModalTab ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`
  ).join('');

  // Build content per tab
  let tabContents = '';
  // Sessions tab
  let sessionCards = buildSessionCards(race);
  let statusBanner = '';
  if (race.status === 'cancelled') statusBanner = `<div class="status-banner cancelled">${t('cancelled_banner')}</div>`;
  if (race.status === 'postponed') statusBanner = `<div class="status-banner postponed">${t('postponed_banner')}</div>`;

  tabContents += `<div class="tab-content ${currentModalTab === 'sessions' ? 'active' : ''}" id="tab-sessions">
    ${statusBanner}
    <div class="sessions-grid">${sessionCards}</div>
  </div>`;

  // Race result tab
  tabContents += `<div class="tab-content ${currentModalTab === 'race' ? 'active' : ''}" id="tab-race">
    ${buildResultTable(race.raceResult, 'race')}
  </div>`;

  // Sprint tab
  if (race.hasSprint) {
    tabContents += `<div class="tab-content ${currentModalTab === 'sprint' ? 'active' : ''}" id="tab-sprint">
      ${buildResultTable(race.sprintResult, 'sprint')}
    </div>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-round">${t('round')} ${String(race.round).padStart(2,'0')} · ${race.location}</div>
      <span class="modal-flag">${race.flag}</span>
      <div class="modal-title">${raceName}</div>
      <div class="modal-location">${race.circuit}</div>
      <div class="modal-badges">${badges}</div>
    </div>
    <div class="modal-body">
      <div class="modal-tabs">${tabsHTML}</div>
      ${tabContents}
    </div>`;

  // Bind tabs
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentModalTab = btn.dataset.tab;
      document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${currentModalTab}`).classList.add('active');
    });
  });
}

function buildSessionCards(race) {
  const sessionKeys = ['fp1','fp2','sprintQualifying','fp3','sprint','qualifying','race'];
  const labelMap = {
    fp1: t('fp1'), fp2: t('fp2'), fp3: t('fp3'),
    qualifying: t('qualifying'), sprintQualifying: t('sprintQualifying'),
    sprint: t('sprint'), race: t('race')
  };
  return sessionKeys
    .filter(k => race.sessions[k])
    .map(k => {
      const s = race.sessions[k];
      const isRace = k === 'race';
      const isSprint = k === 'sprint' || k === 'sprintQualifying';
      const cls = isRace ? 'race-session' : isSprint ? 'sprint-session' : '';
      return `<div class="session-card ${cls}">
        <div class="session-card-label">${labelMap[k]}</div>
        <div class="session-card-date">${formatDateLong(s.date)}</div>
        <div class="session-card-time">${s.time} <span style="font-size:11px;color:var(--text-3)">CET</span></div>
      </div>`;
    }).join('');
}

function buildResultTable(results, type) {
  if (!results || results.length === 0) {
    return `<div class="no-results">${t('no_results')}</div>`;
  }
  const rows = results.map(r => {
    const drv = DATA.drivers.find(d => d.id === r.driver);
    const team = DATA.teams.find(t => t.id === drv.team);
    const pts = (r.status === 'finished') ? getPoints(r.position, type) :
                (r.status === 'DNF' || r.status === 'DNS') ? 0 : getPoints(r.position, type);
    const statusHTML = r.status === 'DNF'
      ? `<span class="status-dnf">${t('dnf')}</span>`
      : r.status === 'DNS'
        ? `<span class="status-dns">${t('dns')}</span>`
        : `<span class="status-finished">✓</span>`;
    const posClass = r.position <= 3 ? `pos-${r.position}` : '';
    return `<tr class="${posClass}">
      <td><span class="rt-pos">${r.position}</span></td>
      <td>
        <div class="rt-driver">
          <div class="rt-team-bar" style="background:${team.color}"></div>
          <div>
            <div class="rt-name">${drv.name}</div>
            <div class="rt-short">${drv.shortName} · ${drv.flag}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-2);font-size:12px">${team.name}</td>
      <td><span class="rt-pts">${pts > 0 ? pts : '—'}</span></td>
      <td>${statusHTML}</td>
    </tr>`;
  }).join('');
  return `<div class="result-table-wrap">
    <table class="result-table">
      <thead>
        <tr>
          <th>${t('pos')}</th>
          <th>${t('driver')}</th>
          <th>${t('team')}</th>
          <th>${t('points')}</th>
          <th>${t('status')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ─── Standings calculations ───────────────────
function calcDriverStandings() {
  const pts = {};
  DATA.drivers.forEach(d => { pts[d.id] = 0; });

  DATA.calendar.forEach(race => {
    if (race.status !== 'completed') return;
    if (race.raceResult) {
      race.raceResult.forEach(r => {
        if (r.status === 'finished') pts[r.driver] += getPoints(r.position, 'race');
      });
    }
    if (race.hasSprint && race.sprintResult) {
      race.sprintResult.forEach(r => {
        if (r.status === 'finished') pts[r.driver] += getPoints(r.position, 'sprint');
      });
    }
  });

  return DATA.drivers
    .map(d => ({ driverId: d.id, points: pts[d.id] }))
    .sort((a,b) => b.points - a.points);
}

function calcConstructorStandings() {
  const pts = {};
  DATA.teams.forEach(t => { pts[t.id] = 0; });

  DATA.calendar.forEach(race => {
    if (race.status !== 'completed') return;
    if (race.raceResult) {
      race.raceResult.forEach(r => {
        const drv = DATA.drivers.find(d => d.id === r.driver);
        if (r.status === 'finished') pts[drv.team] += getPoints(r.position, 'race');
      });
    }
    if (race.hasSprint && race.sprintResult) {
      race.sprintResult.forEach(r => {
        const drv = DATA.drivers.find(d => d.id === r.driver);
        if (r.status === 'finished') pts[drv.team] += getPoints(r.position, 'sprint');
      });
    }
  });

  return DATA.teams
    .map(t => ({ teamId: t.id, points: pts[t.id] }))
    .sort((a,b) => b.points - a.points);
}

// ─── Render Driver Standings ──────────────────
function renderDriverStandings() {
  const standings = calcDriverStandings();
  const maxPts = standings[0]?.points || 1;

  // Build race dot map
  const completedRaces = DATA.calendar.filter(r => r.status === 'completed');

  const rows = standings.map((s, idx) => {
    const drv = DATA.drivers.find(d => d.id === s.driverId);
    const team = DATA.teams.find(t => t.id === drv.team);
    const pos = idx + 1;
    const posClass = pos <= 3 ? `pos-${pos}` : '';
    const gap = idx === 0 ? '' : `− ${standings[0].points - s.points} pts`;

    const dots = completedRaces.map(race => {
      let p = null, isFinished = false;
      if (race.raceResult) {
        const r = race.raceResult.find(r => r.driver === drv.id);
        if (r) { p = r.position; isFinished = r.status === 'finished'; }
      }
      const color = isFinished ? posColor(p) : 'rgba(100,100,100,0.3)';
      const label = p ? (isFinished ? `P${p}` : (race.raceResult.find(r=>r.driver===drv.id)?.status || '?')) : '—';
      const raceName = currentLang === 'es' ? race.nameEs : race.name;
      return `<div class="race-dot" style="background:${color};color:${isFinished && p<=3?'#000':'#fff'}">
        ${label}
        <div class="race-dot-tooltip">${raceName}: ${label}</div>
      </div>`;
    }).join('');

    return `<tr class="${posClass}">
      <td><span class="st-pos">${pos}</span></td>
      <td>
        <div class="st-driver-wrap">
          <div class="st-team-bar" style="background:${team.color}"></div>
          <div class="st-num">${drv.number}</div>
          <div>
            <div class="st-name">${drv.flag} ${drv.name}</div>
            <div class="st-team">${team.name}</div>
          </div>
        </div>
      </td>
      <td class="st-race-dots">${dots}</td>
      <td>
        <div class="st-pts-big">${s.points}</div>
        <span class="st-pts-label">pts</span>
      </td>
      <td><span class="st-gap">${gap}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('driversTable').innerHTML = `
    <thead><tr>
      <th>${t('pos')}</th>
      <th>${t('driver')}</th>
      <th class="st-race-dots" style="min-width:120px">Results</th>
      <th style="text-align:right">${t('points')}</th>
      <th>${t('gap')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>`;

  // Chart
  const top10 = standings.slice(0, 10);
  renderBarChart('driversChart', top10.map(s => {
    const d = DATA.drivers.find(dr => dr.id === s.driverId);
    const team = DATA.teams.find(t => t.id === d.team);
    return { label: d.shortName, points: s.points, color: team.color };
  }), maxPts, t('top10_chart'));
}

// ─── Render Constructor Standings ─────────────
function renderConstructorStandings() {
  const standings = calcConstructorStandings();
  const maxPts = standings[0]?.points || 1;

  const rows = standings.map((s, idx) => {
    const team = DATA.teams.find(t => t.id === s.teamId);
    const pos = idx + 1;
    const posClass = pos <= 3 ? `pos-${pos}` : '';
    const gap = idx === 0 ? '' : `− ${standings[0].points - s.points} pts`;
    const teamDrivers = DATA.drivers.filter(d => d.team === team.id);
    const driverNames = teamDrivers.map(d => d.shortName).join(' · ');

    return `<tr class="${posClass}">
      <td><span class="st-pos">${pos}</span></td>
      <td>
        <div class="st-constructors-wrap">
          <div class="st-team-logo-bar" style="background:${team.color}"></div>
          <div>
            <div class="st-team-name">${team.name}</div>
            <div class="st-team-nat">${team.nationality}</div>
            <div class="st-team-drivers">${driverNames}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="st-pts-big">${s.points}</div>
        <span class="st-pts-label">pts</span>
      </td>
      <td><span class="st-gap">${gap}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('constructorsTable').innerHTML = `
    <thead><tr>
      <th>${t('pos')}</th>
      <th>${t('team')}</th>
      <th style="text-align:right">${t('points')}</th>
      <th>${t('gap')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>`;

  // Chart
  renderBarChart('constructorsChart', standings.map(s => {
    const team = DATA.teams.find(t => t.id === s.teamId);
    return { label: team.name.split(' ')[0], points: s.points, color: team.color };
  }), maxPts, t('constructors_champ'));
}

// ─── Bar Chart ────────────────────────────────
function renderBarChart(containerId, data, maxPts, title) {
  const bars = data.map(item => `
    <div class="chart-bar-row">
      <span class="chart-bar-label">${item.label}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${maxPts > 0 ? (item.points / maxPts * 100) : 0}%;background:${item.color}"></div>
      </div>
      <span class="chart-bar-pts">${item.points}</span>
    </div>`).join('');

  document.getElementById(containerId).innerHTML = `
    <div class="chart-title">${title}</div>
    <div class="chart-bars">${bars}</div>`;

  // animate after paint
  requestAnimationFrame(() => {
    const fills = document.querySelectorAll(`#${containerId} .chart-bar-fill`);
    fills.forEach(f => {
      const target = f.style.width;
      f.style.width = '0';
      requestAnimationFrame(() => { f.style.width = target; });
    });
  });
}

// ─── Nav ──────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const section = btn.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${section}`).classList.add('active');
    });
  });
}

// ─── Language ─────────────────────────────────
function bindLang() {
  document.getElementById('langToggle').addEventListener('click', e => {
    const opt = e.target.closest('.lang-option');
    if (!opt) return;
    currentLang = opt.dataset.lang;
    document.querySelectorAll('.lang-option').forEach(o => o.classList.toggle('active', o.dataset.lang === currentLang));
    applyLang();
    renderCalendar();
    renderDriverStandings();
    renderConstructorStandings();
    buildTicker();
    if (currentModalRace) renderModal();
  });
}

function applyLang() {
  // Update data-en / data-es elements
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.dataset[currentLang] || el.dataset.en;
  });
}

// ─── Filter ──────────────────────────────────
function bindFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCalendar();
    });
  });
}

// ─── Helpers ─────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function posColor(pos) {
  if (pos === 1) return '#f5c842';
  if (pos === 2) return '#b0b8c8';
  if (pos === 3) return '#cd7f32';
  if (pos <= 10) return 'rgba(34,204,122,0.6)';
  return 'rgba(80,80,100,0.5)';
}

// ─── Boot ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
