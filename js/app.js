const DATA = window.VYBET_DATA;
const sports = DATA.sports;
const teams = DATA.teams;
const matches = DATA.matches;
const live = DATA.live;

const sportsList = document.getElementById('sports-list');
const matchesBox = document.getElementById('matches');
const liveBox = document.getElementById('live-games');
const slipBox = document.getElementById('bet-slip');
const searchInput = document.querySelector('.search input');

function team(name, mini = false) {
  const t = teams[name];
  const cls = mini ? 'team-logo mini' : 'team-logo';
  return `<img class="${cls}" src="${t?.logo || ''}" alt="${name}" title="${name}" onerror="this.style.visibility='hidden'">`;
}

sports.forEach(s => {
  const a = document.createElement('a');
  a.className = 'sport-side';
  a.href = '#esportes';
  a.dataset.sport = s.id;
  a.innerHTML = `<span><img class="ui-icon" src="assets/icons/${s.id}.svg" alt=""></span><label>${s.name}</label><b>${s.count}</b>`;
  sportsList.appendChild(a);
});

function renderMatches(list = matches) {
  matchesBox.innerHTML = '';
  if (!list.length) {
    matchesBox.innerHTML = `<div class="empty-state">Nenhuma partida encontrada.</div>`;
    return;
  }
  list.forEach(m => {
    const el = document.createElement('div');
    el.className = 'match';
    el.dataset.matchId = m.id;
    el.innerHTML = `
      <div class="time">${m.day}<br><b>${m.time}</b></div>
      <div class="teams">
        <div class="league"><span class="league-dot"></span>${m.league}</div>
        <div class="team-line">${team(m.home)}<span>${m.home}</span></div>
        <div class="team-line">${team(m.away)}<span>${m.away}</span></div>
      </div>
      <div class="trend">▥<br><span>${m.extra}</span></div>
      <button class="odds" data-match-id="${m.id}" data-market="Resultado Final" data-selection="${m.home}" data-odd="${m.odds.home}"><span class="odd-label">1</span>${m.odds.home}</button>
      <button class="odds" data-match-id="${m.id}" data-market="Resultado Final" data-selection="Empate" data-odd="${m.odds.draw}"><span class="odd-label">X</span>${m.odds.draw}</button>
      <button class="odds" data-match-id="${m.id}" data-market="Resultado Final" data-selection="${m.away}" data-odd="${m.odds.away}"><span class="odd-label">2</span>${m.odds.away}</button>
      <button class="star" aria-label="Favoritar partida">☆</button>`;
    matchesBox.appendChild(el);
  });
}

function renderLive(list = live) {
  liveBox.innerHTML = '';
  list.forEach(m => {
    const el = document.createElement('div');
    el.className = 'live-game';
    el.innerHTML = `
      <div class="live-meta"><span>${m.clock}</span><span>▥ ${m.extra}</span></div>
      <div class="live-team"><span>${team(m.home, true)}${m.home}</span><b class="live-score">${m.scoreHome}</b></div>
      <div class="live-team"><span>${team(m.away, true)}${m.away}</span><b class="live-score">${m.scoreAway}</b></div>
      <div class="mini-odds"><button data-live-id="${m.id}" data-selection="${m.home}" data-odd="${m.odds[0]}">${m.odds[0]}</button><button data-live-id="${m.id}" data-selection="Empate" data-odd="${m.odds[1]}">${m.odds[1]}</button><button data-live-id="${m.id}" data-selection="${m.away}" data-odd="${m.odds[2]}">${m.odds[2] || '—'}</button></div>`;
    liveBox.appendChild(el);
  });
}

let slip = [
  {matchId:'mci-ars', selection:'Manchester City', market:'Resultado Final', event:'Man City x Arsenal', odd:1.85},
  {matchId:'rma-bar', selection:'Real Madrid', market:'Resultado Final', event:'Real Madrid x Barcelona', odd:2.10},
  {matchId:'fla-pal', selection:'Mais de 2.5', market:'Total de Gols', event:'Flamengo x Palmeiras', odd:1.80}
];
let betMode = 'multiple';

function renderSlip() {
  slipBox.innerHTML = '';
  if (!slip.length) {
    slipBox.innerHTML = `<div class="slip-empty"><b>Seu cupom está vazio</b><span>Clique em uma odd para adicionar uma seleção.</span></div>`;
  } else {
    slip.forEach((b, i) => {
      const el = document.createElement('div');
      el.className = 'bet-item';
      el.innerHTML = `<div class="bet-item-top"><b>⚽ ${b.selection}</b><span class="bet-odd">${b.odd.toFixed(2)}</span><button class="remove" data-i="${i}" aria-label="Remover">×</button></div><small>${b.market}<br>${b.event}</small>`;
      slipBox.appendChild(el);
    });
  }
  document.getElementById('bet-count').textContent = slip.length;
  recalc();
}

function recalc() {
  const stake = Number(document.getElementById('stake').value) || 0;
  const odds = slip.reduce((a,b) => a * Number(b.odd), 1);
  const total = slip.length ? odds : 0;
  document.getElementById('total-odds').textContent = total.toFixed(2);
  const multiplier = document.querySelector('.toggle input')?.checked ? 1.05 : 1;
  const payout = betMode === 'multiple' ? stake * total * multiplier : slip.reduce((sum,b) => sum + (stake * Number(b.odd) * multiplier), 0);
  document.getElementById('return').textContent = 'R$ ' + payout.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function addSelection({matchId, selection, market='Resultado Final', event, odd}) {
  const numericOdd = Number(odd);
  if (!Number.isFinite(numericOdd) || numericOdd <= 0) {
    showToast('Essa seleção não está disponível.');
    return;
  }
  const existing = slip.findIndex(x => x.matchId === matchId);
  const item = {matchId, selection, market, event, odd:numericOdd};
  if (existing >= 0) slip.splice(existing, 1, item); else slip.push(item);
  renderSlip();
  showToast(existing >= 0 ? 'Seleção atualizada no cupom.' : 'Seleção adicionada ao cupom.');
}

matchesBox.addEventListener('click', e => {
  const btn = e.target.closest('.odds');
  if (!btn) return;
  const match = matches.find(m => m.id === btn.dataset.matchId);
  addSelection({
    matchId: match.id,
    selection: btn.dataset.selection,
    market: btn.dataset.market,
    event: `${match.home} x ${match.away}`,
    odd: btn.dataset.odd
  });
});

liveBox.addEventListener('click', e => {
  const btn = e.target.closest('[data-live-id]');
  if (!btn || btn.textContent.trim() === '—') return;
  const match = live.find(m => m.id === btn.dataset.liveId);
  addSelection({
    matchId: match.id,
    selection: btn.dataset.selection,
    market: 'Ao Vivo',
    event: `${match.home} x ${match.away}`,
    odd: btn.dataset.odd
  });
});

slipBox.addEventListener('click', e => {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  slip.splice(Number(btn.dataset.i),1);
  renderSlip();
  showToast('Seleção removida.');
});

document.getElementById('stake').addEventListener('input', recalc);
document.querySelector('.toggle input')?.addEventListener('change', recalc);

document.querySelectorAll('.bet-types button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bet-types button').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    betMode = btn.textContent.trim() === 'Múltipla' ? 'multiple' : 'single';
    recalc();
  });
});

document.getElementById('place-bet').addEventListener('click', () => {
  if (!slip.length) return showToast('Adicione uma seleção ao cupom primeiro.');
  showToast('Protótipo: aposta simulada com sucesso.');
});

// Filtros de esporte da área de destaque.
document.querySelectorAll('.filters button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');
    const filter = btn.textContent.trim();
    const sport = filter === 'Todos' ? null : ({'Futebol':'football','Basquete':'basketball','Tênis':'tennis','Vôlei':'volleyball','Mais':null}[filter]);
    renderMatches(sport ? matches.filter(m => m.sport === sport) : matches);
  });
});

// Busca simples por time/campeonato na página.
searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderMatches(matches);
  const filtered = matches.filter(m => [m.league,m.home,m.away].some(v => v.toLowerCase().includes(q)));
  renderMatches(filtered);
});

// Favoritos visuais.
matchesBox.addEventListener('click', e => {
  const star = e.target.closest('.star');
  if (!star) return;
  star.classList.toggle('favorite');
  star.textContent = star.classList.contains('favorite') ? '★' : '☆';
});

document.querySelectorAll('.topnav a, .side-link, .sport-side, .deposit, .login').forEach(el => {
  el.addEventListener('click', () => {
    if (el.classList.contains('deposit')) showToast('Cadastro do protótipo.');
    else if (el.classList.contains('login')) showToast('Login do protótipo.');
  });
});

document.querySelectorAll('.welcome-bonus,.side-promo,.casino-mini').forEach(card => {
  card.addEventListener('click', () => showToast('Área promocional do protótipo.'));
});

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}

renderMatches();
renderLive();
renderSlip();
