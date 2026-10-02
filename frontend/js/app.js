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
    const sport = filter === 'Todos' ? null : ({'Futebol':'football'}[filter]);
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


// ===== Contas e páginas do frontend (protótipo) =====
const pageOverlay = document.getElementById('page-overlay');
const pageContent = document.getElementById('page-content');
const pageClose = document.getElementById('page-close');

const demoBets = [
  {date:'02/10/2026 12:18', event:'Manchester City x Arsenal', selection:'Manchester City', odd:'1.85', status:'Aberta'},
  {date:'01/10/2026 20:41', event:'Real Madrid x Barcelona', selection:'Real Madrid', odd:'2.10', status:'Aberta'},
  {date:'29/09/2026 18:05', event:'Flamengo x Palmeiras', selection:'Mais de 2.5', odd:'1.80', status:'Encerrada'}
];

const API_BASE = (window.VYBET_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const AUTH_KEY = 'vybet_auth_session';
let authSession = (() => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; } })();
let authProfile = null;

function saveSession(session, user){
  authSession = session ? { ...session, user: user || session.user } : null;
  if(authSession) localStorage.setItem(AUTH_KEY, JSON.stringify(authSession));
  else localStorage.removeItem(AUTH_KEY);
  updateAuthHeader();
}
function currentUser(){ return authSession?.user || null; }
function accessToken(){ return authSession?.access_token || ''; }
function escapeHtml(value=''){ return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
async function apiRequest(path, options={}){
  const headers = {'Content-Type':'application/json', ...(options.headers||{})};
  if(accessToken()) headers.Authorization = `Bearer ${accessToken()}`;
  const response = await fetch(`${API_BASE}${path}`, {...options, headers});
  let data={}; try { data=await response.json(); } catch { data={ok:false,error:'Resposta inválida do servidor.'}; }
  if(!response.ok || data.ok===false) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}
function updateAuthHeader(){
  const top=document.querySelector('.top-actions'); if(!top)return;
  top.querySelectorAll('.auth-runtime').forEach(x=>x.remove());
  const loginBtn=top.querySelector('.login'); const signupBtn=top.querySelector('.deposit');
  const user=currentUser();
  if(!user){ if(loginBtn) loginBtn.style.display=''; if(signupBtn) signupBtn.style.display=''; return; }
  if(loginBtn) loginBtn.style.display='none'; if(signupBtn) signupBtn.style.display='none';
  const wrap=document.createElement('div'); wrap.className='auth-runtime';
  const name=user.user_metadata?.name || user.email?.split('@')[0] || 'Conta';
  wrap.innerHTML=`<button class="account-chip" type="button"><span class="account-dot"></span>${escapeHtml(name)}</button><button class="logout-btn" type="button">Sair</button>`;
  wrap.querySelector('.account-chip').onclick=()=>openPage('profile');
  wrap.querySelector('.logout-btn').onclick=logoutUser;
  top.appendChild(wrap);
}
async function logoutUser(){
  try { if(accessToken()) await apiRequest('/api/auth/logout',{method:'POST',body:'{}'}); } catch {}
  saveSession(null); authProfile=null; showToast('Sessão encerrada.'); closePage();
}
async function loadProfilePage(){
  if(!currentUser()){ openPage('login'); return; }
  pageContent.innerHTML='<div class="account-head"><span>MINHA CONTA</span><h1>Perfil</h1><p>Carregando seus dados...</p></div>';
  try{
    const data=await apiRequest('/api/profile'); authProfile=data.profile;
    const name=data.profile?.name || currentUser()?.user_metadata?.name || 'Usuário VYBET';
    const email=data.email || currentUser()?.email || '';
    const balance=Number(data.profile?.demo_balance || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const vip=(data.profile?.vip_level || 'bronze');
    pageContent.innerHTML=`<div class="account-head"><span>MINHA CONTA</span><h1>Perfil</h1><p>Dados reais da sua conta VYBET.</p></div>
      <div class="profile-grid"><div class="profile-card profile-main"><div class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div><div><b>${escapeHtml(name)}</b><span>${escapeHtml(email)}</span></div><button class="outline" id="profile-logout">Sair</button></div><div class="profile-card"><small>Saldo de demonstração</small><strong>${balance}</strong><span>Somente para testes do protótipo.</span></div><div class="profile-card"><small>Nível</small><strong>VIP ${escapeHtml(vip.charAt(0).toUpperCase()+vip.slice(1))}</strong><span>Conta autenticada no Supabase</span></div></div>
      <div class="settings-list"><button><span>🔒 Segurança</span><b>›</b></button><button><span>🔔 Notificações</span><b>›</b></button><button><span>🎯 Limites e preferências</span><b>›</b></button></div>`;
    pageContent.querySelector('#profile-logout')?.addEventListener('click',logoutUser);
  }catch(err){
    if(/Sessão inválida|Token ausente/i.test(err.message)){ saveSession(null); openPage('login'); return; }
    pageContent.innerHTML=`<div class="account-head"><span>MINHA CONTA</span><h1>Perfil</h1><p>${escapeHtml(err.message)}</p></div>`;
  }
}
async function handleAccountForm(form){
  const submit=form.querySelector('[type="submit"]'); const original=submit?.textContent;
  if(submit){submit.disabled=true;submit.textContent='Aguarde...';}
  try{
    if(form.dataset.form==='signup'){
      const inputs=form.querySelectorAll('input');
      const payload={name:inputs[0].value.trim(),birth_date:inputs[1].value,email:inputs[2].value.trim(),password:inputs[3].value};
      const data=await apiRequest('/api/auth/signup',{method:'POST',body:JSON.stringify(payload)});
      if(data.session){ saveSession(data.session,data.user); showToast('Conta criada e sessão iniciada.'); closePage(); }
      else { showToast('Conta criada. Verifique seu e-mail para entrar.'); openPage('login'); }
    } else if(form.dataset.form==='login'){
      const inputs=form.querySelectorAll('input');
      const data=await apiRequest('/api/auth/login',{method:'POST',body:JSON.stringify({email:inputs[0].value.trim(),password:inputs[1].value})});
      saveSession(data.session,data.user); showToast('Login realizado com sucesso.'); closePage();
    } else if(form.dataset.form==='recovery'){
      showToast('Recuperação de senha ainda não conectada ao backend.');
    }
  }catch(err){ showToast(err.message || 'Não foi possível concluir a operação.'); }
  finally{ if(submit){submit.disabled=false;submit.textContent=original;} }
}

function openPage(page){
  const pages = {
    login: `
      <div class="account-head"><span>VYBET</span><h1>Entrar na sua conta</h1><p>Acesse seu painel para acompanhar apostas e preferências.</p></div>
      <form class="account-form" data-form="login">
        <label>E-mail<input type="email" required placeholder="voce@email.com"></label>
        <label>Senha<input type="password" required placeholder="••••••••"></label>
        <div class="form-row"><label class="check"><input type="checkbox"> Lembrar de mim</label><a href="#" data-page="recovery">Esqueci minha senha</a></div>
        <button class="primary-action" type="submit">Entrar</button>
        <p class="account-foot">Ainda não tem conta? <a href="#" data-page="signup">Criar conta</a></p>
      </form>`,
    signup: `
      <div class="account-head"><span>VYBET</span><h1>Criar sua conta</h1><p>Monte seu perfil para continuar no protótipo.</p></div>
      <form class="account-form" data-form="signup">
        <div class="form-grid"><label>Nome<input required placeholder="Seu nome"></label><label>Data de nascimento<input type="date" required></label></div>
        <label>E-mail<input type="email" required placeholder="voce@email.com"></label>
        <label>Senha<input type="password" minlength="6" required placeholder="Mínimo de 6 caracteres"></label>
        <label class="check"><input type="checkbox" required> Li e aceito os termos do protótipo.</label>
        <button class="primary-action" type="submit">Criar conta</button>
        <p class="account-foot">Já possui conta? <a href="#" data-page="login">Entrar</a></p>
      </form>`,
    recovery: `
      <div class="account-head"><span>RECUPERAÇÃO</span><h1>Recuperar acesso</h1><p>Informe seu e-mail para simular o envio de recuperação.</p></div>
      <form class="account-form" data-form="recovery"><label>E-mail<input type="email" required placeholder="voce@email.com"></label><button class="primary-action" type="submit">Enviar link</button></form>`,
    profile: `
      <div class="account-head"><span>MINHA CONTA</span><h1>Perfil</h1><p>Carregando seus dados...</p></div>`,
    bets: `
      <div class="account-head"><span>HISTÓRICO</span><h1>Minhas apostas</h1><p>Acompanhe as apostas simuladas deste protótipo.</p></div>
      <div class="bet-history-tabs"><button class="active">Todas</button><button>Abertas</button><button>Encerradas</button></div>
      <div class="history-list"><div class="empty-state">Carregando suas apostas...</div></div>
      <div class="history-summary"><span>Total de apostas <b>0</b></span><span>Valor apostado <b>R$ 0,00</b></span><span>Retorno potencial <b>R$ 0,00</b></span></div>`,
    results: `
      <div class="account-head"><span>PLACARES</span><h1>Resultados</h1><p>Resultados de demonstração organizados por competição.</p></div>
      <div class="feature-tabs"><button class="active">Hoje</button><button>Ontem</button><button>Esta semana</button></div>
      <div class="feature-list">
        <div class="result-card"><small>Premier League · Encerrado</small><div><b>Manchester City</b><strong>2</strong></div><div><b>Arsenal</b><strong>1</strong></div></div>
        <div class="result-card"><small>La Liga · Encerrado</small><div><b>Real Madrid</b><strong>3</strong></div><div><b>Barcelona</b><strong>2</strong></div></div>
        <div class="result-card"><small>Série A · Encerrado</small><div><b>Flamengo</b><strong>1</strong></div><div><b>Palmeiras</b><strong>1</strong></div></div>
      </div>`,
    promotions: `
      <div class="account-head"><span>OFERTAS</span><h1>Promoções</h1><p>Área visual de promoções do protótipo VYBET.</p></div>
      <div class="promo-grid">
        <article><span>BOAS-VINDAS</span><h2>Bônus 100%</h2><p>Card demonstrativo para a primeira experiência no site.</p><button class="primary-action">Ver detalhes</button></article>
        <article><span>SEMANAL</span><h2>Cashback</h2><p>Área demonstrativa para campanhas e benefícios semanais.</p><button class="primary-action">Ver detalhes</button></article>
        <article><span>VIP</span><h2>Benefícios VIP</h2><p>Campanhas exclusivas apresentadas conforme o nível da conta.</p><button class="primary-action" data-page="vip">Conhecer VIP</button></article>
      </div>`,
    vip: `
      <div class="account-head"><span>VYBET VIP</span><h1>Clube VIP</h1><p>Progressão visual e benefícios de demonstração do programa VIP.</p></div>
      <div class="vip-hero"><img src="assets/icons/crown.svg" alt=""><div><small>NÍVEL ATUAL</small><h2>VIP Bronze</h2><p>0 / 1.000 pontos para o próximo nível</p><div class="vip-progress"><i></i></div></div></div>
      <div class="vip-levels"><div><b>Bronze</b><span>Nível inicial</span></div><div><b>Prata</b><span>1.000 pts</span></div><div><b>Ouro</b><span>5.000 pts</span></div><div><b>Diamante</b><span>15.000 pts</span></div></div>
      <div class="vip-benefits"><div><b>🎁 Campanhas</b><span>Benefícios demonstrativos por nível</span></div><div><b>⚡ Prioridade</b><span>Experiência diferenciada no protótipo</span></div><div><b>👑 Status</b><span>Progressão visual da conta</span></div></div>`,
    sport: `
      <div class="account-head"><span>ESPORTES</span><h1 id="sport-page-title">Futebol</h1><p>Competições, partidas e mercados disponíveis no protótipo.</p></div>
      <div class="league-grid"><button>Premier League <span>›</span></button><button>La Liga <span>›</span></button><button>Brasileirão <span>›</span></button><button>Champions League <span>›</span></button><button>Libertadores <span>›</span></button><button>Ver todas <span>›</span></button></div>
      <div class="sport-page-games"><h3>Próximas partidas</h3>${matches.slice(0,4).map(m=>`<div><span><small>${m.league}</small><b>${m.home} × ${m.away}</b></span><strong>${m.time}</strong></div>`).join('')}</div>`,
  };
  pageContent.innerHTML = pages[page] || pages.profile;
  pageOverlay.classList.add('open');
  pageOverlay.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  pageContent.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click', e=>{e.preventDefault();openPage(el.dataset.page)}));
  const form=pageContent.querySelector('form');
  if(form) form.addEventListener('submit', e=>{e.preventDefault();handleAccountForm(form);});
  if(page==='profile') loadProfilePage();
}
function closePage(){pageOverlay.classList.remove('open');pageOverlay.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
pageClose?.addEventListener('click',closePage);
pageOverlay?.addEventListener('click',e=>{if(e.target===pageOverlay)closePage()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pageOverlay?.classList.contains('open'))closePage()});
document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openPage(el.dataset.page)}));


// ===== Navegação de esportes e páginas complementares =====
document.querySelectorAll('.sport-side').forEach(el=>el.addEventListener('click',e=>{
  e.preventDefault(); openPage('sport');
  const title=pageContent.querySelector('#sport-page-title');
  if(title) title.textContent=el.querySelector('label')?.textContent || 'Esportes';
}));
document.querySelectorAll('.sport-tabs button').forEach(el=>el.addEventListener('dblclick',()=>{
  openPage('sport'); const title=pageContent.querySelector('#sport-page-title'); if(title) title.textContent=el.textContent.trim();
}));
document.querySelector('.results-placeholder .outline')?.addEventListener('click',()=>openPage('results'));
document.querySelector('.vip-badge')?.addEventListener('click',()=>openPage('vip'));

// ===== VYBET frontend funcional v2: páginas, filtros e persistência local =====
const DEMO_RESULTS = [
  {group:'Hoje', league:'Premier League', home:'Chelsea', away:'Tottenham', hs:2, as:1},
  {group:'Hoje', league:'La Liga', home:'Atlético de Madrid', away:'Sevilla', hs:1, as:1},
  {group:'Ontem', league:'Série A', home:'Flamengo', away:'Palmeiras', hs:2, as:0},
  {group:'Ontem', league:'Copa Libertadores', home:'River Plate', away:'Boca Juniors', hs:1, as:0},
  {group:'Esta semana', league:'Premier League', home:'Liverpool', away:'Newcastle', hs:3, as:1},
  {group:'Esta semana', league:'La Liga', home:'Real Madrid', away:'Barcelona', hs:2, as:2}
];
const CASINO_GAMES = [
  {name:'Neon Fortune', cat:'Slots', icon:'💎'}, {name:'Temple Gold', cat:'Slots', icon:'🏛️'},
  {name:'Wild Tiger', cat:'Slots', icon:'🐯'}, {name:'Candy Spin', cat:'Slots', icon:'🍭'},
  {name:'Roleta Neon', cat:'Mesa', icon:'🎯'}, {name:'Blackjack 21', cat:'Mesa', icon:'🂡'},
  {name:'Baccarat Club', cat:'Mesa', icon:'🃏'}, {name:'Lightning Roulette', cat:'Ao Vivo', icon:'⚡'},
  {name:'Live Blackjack', cat:'Ao Vivo', icon:'🎥'}, {name:'Dragon Table', cat:'Ao Vivo', icon:'🐉'}
];
const favCasino = new Set(JSON.parse(localStorage.getItem('vybet_casino_favs') || '[]'));

function resultCards(group='Hoje'){
  return DEMO_RESULTS.filter(r=>group==='Todos'||r.group===group).map(r=>`<article class="result-card"><small>${r.league} · ${r.group}</small><div><b>${r.home}</b><strong>${r.hs}</strong></div><div><b>${r.away}</b><strong>${r.as}</strong></div></article>`).join('') || '<div class="empty-state">Nenhum resultado nesse período.</div>';
}
function casinoCards(cat='Todos', query=''){
  return CASINO_GAMES.filter(g=>(cat==='Todos'||g.cat===cat)&&g.name.toLowerCase().includes(query.toLowerCase())).map((g,i)=>`<article class="casino-game" data-game="${g.name}"><button class="casino-fav ${favCasino.has(g.name)?'on':''}" data-fav="${g.name}">${favCasino.has(g.name)?'★':'☆'}</button><div class="casino-art">${g.icon}</div><small>${g.cat}</small><b>${g.name}</b><button class="play-demo" data-game="${g.name}">Jogar demonstração</button></article>`).join('') || '<div class="empty-state">Nenhum jogo encontrado.</div>';
}
function casinoPage(liveOnly=false){
  const defaultCat=liveOnly?'Ao Vivo':'Todos';
  return `<div class="account-head"><span>CASSINO</span><h1>${liveOnly?'Cassino Ao Vivo':'Cassino VYBET'}</h1><p>Lobby demonstrativo. Os jogos abaixo são fictícios e servem para testar a navegação do frontend.</p></div>
  <div class="casino-tools"><input id="casino-search" placeholder="Buscar jogo..."><div class="casino-cats">${['Todos','Slots','Mesa','Ao Vivo','Favoritos'].map(c=>`<button class="${c===defaultCat?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div></div>
  <div class="casino-grid" id="casino-grid">${casinoCards(defaultCat)}</div>`;
}
function liveAllPage(){
  return `<div class="account-head"><span>AO VIVO</span><h1>Futebol ao vivo</h1><p>Partidas ao vivo do protótipo. As cotações e placares são demonstrativos.</p></div><div class="live-page-list">${live.map(m=>`<article><div><small>${m.clock} · Ao vivo</small><b>${team(m.home,true)} ${m.home} <strong>${m.scoreHome}</strong></b><b>${team(m.away,true)} ${m.away} <strong>${m.scoreAway}</strong></b></div><button data-live-open="${m.id}">Ver mercados</button></article>`).join('')}</div>`;
}
function leaguePage(league){
  const rows=matches.filter(m=>m.league===league || (league==='Libertadores'&&m.league.includes('Libertadores')));
  return `<div class="account-head"><span>CAMPEONATO</span><h1>${league}</h1><p>Partidas disponíveis no protótipo.</p></div><div class="sport-page-games">${rows.length?rows.map(m=>`<div><span><small>${m.day}</small><b>${m.home} × ${m.away}</b></span><strong>${m.time}</strong></div>`).join(''):'<div class="empty-state">Ainda não há partidas cadastradas para esta competição.</div>'}</div>`;
}

const oldOpenPage = openPage;
openPage = function(page){
  if(page==='casino' || page==='casino-live'){
    pageContent.innerHTML=casinoPage(page==='casino-live');
    pageOverlay.classList.add('open'); pageOverlay.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
    bindDynamicPage(); return;
  }
  if(page==='live-all'){
    pageContent.innerHTML=liveAllPage(); pageOverlay.classList.add('open'); pageOverlay.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); bindDynamicPage(); return;
  }
  oldOpenPage(page); bindDynamicPage();
  if(page==='results') enhanceResults();
  if(page==='bets') enhanceBetHistory();
};
function bindDynamicPage(){
  pageContent.querySelectorAll('[data-page]').forEach(el=>el.onclick=e=>{e.preventDefault();openPage(el.dataset.page)});
  pageContent.querySelectorAll('[data-cat]').forEach(btn=>btn.onclick=()=>{
    pageContent.querySelectorAll('[data-cat]').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
    const cat=btn.dataset.cat; document.getElementById('casino-grid').innerHTML=cat==='Favoritos'?casinoCards('Todos').replaceAll('casino-game','casino-game'):casinoCards(cat);
    if(cat==='Favoritos') [...document.querySelectorAll('#casino-grid .casino-game')].forEach(card=>{if(!favCasino.has(card.dataset.game)) card.remove()});
    bindDynamicPage();
  });
  const search=pageContent.querySelector('#casino-search'); if(search) search.oninput=()=>{const cat=pageContent.querySelector('[data-cat].active')?.dataset.cat||'Todos'; document.getElementById('casino-grid').innerHTML=casinoCards(cat==='Favoritos'?'Todos':cat,search.value); if(cat==='Favoritos') [...document.querySelectorAll('#casino-grid .casino-game')].forEach(card=>{if(!favCasino.has(card.dataset.game))card.remove()}); bindDynamicPage();};
  pageContent.querySelectorAll('[data-fav]').forEach(btn=>btn.onclick=e=>{e.stopPropagation(); const n=btn.dataset.fav; favCasino.has(n)?favCasino.delete(n):favCasino.add(n); localStorage.setItem('vybet_casino_favs',JSON.stringify([...favCasino])); btn.classList.toggle('on');btn.textContent=favCasino.has(n)?'★':'☆';});
  pageContent.querySelectorAll('.play-demo').forEach(btn=>btn.onclick=()=>showToast(`${btn.dataset.game}: modo demonstração aberto.`));
  pageContent.querySelectorAll('[data-live-open]').forEach(btn=>btn.onclick=()=>showToast('Mercados ao vivo disponíveis no cupom da página inicial.'));
}
function enhanceResults(){
  const list=pageContent.querySelector('.feature-list'); if(!list)return;
  list.innerHTML=resultCards('Hoje');
  pageContent.querySelectorAll('.feature-tabs button').forEach((btn,i)=>{btn.onclick=()=>{pageContent.querySelectorAll('.feature-tabs button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const labels=['Hoje','Ontem','Esta semana'];list.innerHTML=resultCards(labels[i]||'Hoje');}});
}
async function enhanceBetHistory(){
  const list=pageContent.querySelector('.history-list'); if(!list)return;
  if(!currentUser()){
    list.innerHTML='<div class="empty-state">Entre na sua conta para ver suas apostas.</div>';
    return;
  }
  list.innerHTML='<div class="empty-state">Carregando suas apostas...</div>';
  try{
    const data=await apiRequest('/api/bets');
    const bets=Array.isArray(data.bets)?data.bets:[];
    if(!bets.length){
      list.innerHTML='<div class="empty-state">Você ainda não fez nenhuma aposta de demonstração.</div>';
    }else{
      list.innerHTML=bets.map(b=>{
        const sels=(b.demo_bet_selections||[]);
        const selection=sels.map(s=>s.selection).join(' + ') || 'Aposta';
        const market=sels.map(s=>s.market).join(' + ');
        const status=b.status==='open'?'Aberta':(b.status==='won'?'Ganha':(b.status==='lost'?'Perdida':'Encerrada'));
        const date=new Date(b.created_at).toLocaleString('pt-BR');
        return `<div class="history-item"><div><small>${escapeHtml(date)}</small><b>${escapeHtml(selection)}</b><span>${escapeHtml(market)}</span><span>Valor: ${Number(b.stake).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · Retorno potencial: ${Number(b.potential_return).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div><div class="history-meta"><strong>${Number(b.total_odd).toFixed(2)}</strong><em class="${b.status==='open'?'open':''}">${escapeHtml(status)}</em></div></div>`;
      }).join('');
    }
    const summary=pageContent.querySelector('.history-summary');
    if(summary){
      const totalStake=bets.reduce((sum,b)=>sum+Number(b.stake||0),0);
      const totalPotential=bets.reduce((sum,b)=>sum+Number(b.potential_return||0),0);
      summary.innerHTML=`<span>Total de apostas <b>${bets.length}</b></span><span>Valor apostado <b>${totalStake.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</b></span><span>Retorno potencial <b>${totalPotential.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</b></span>`;
    }
  }catch(err){
    if(/Sessão inválida|Token ausente/i.test(err.message)){ saveSession(null); openPage('login'); return; }
    list.innerHTML=`<div class="empty-state">${escapeHtml(err.message||'Não foi possível carregar suas apostas.')}</div>`;
  }
}

// Persistir apostas de demonstração no Supabase, vinculadas ao usuário autenticado.
const placeBetBtn=document.getElementById('place-bet');
placeBetBtn.onclick=async()=>{
  if(!currentUser()){ showToast('Entre na sua conta para fazer uma aposta de demonstração.'); openPage('login'); return; }
  if(!slip.length)return showToast('Adicione uma seleção ao cupom primeiro.');
  const stake=Number(document.getElementById('stake').value)||0;
  if(stake<=0)return showToast('Informe um valor de demonstração maior que zero.');
  placeBetBtn.disabled=true;
  const original=placeBetBtn.textContent;
  placeBetBtn.textContent='Salvando...';
  try{
    const selections=slip.map(x=>({
      match_id:x.matchId,
      market:x.market,
      selection:x.selection,
      odd:Number(x.odd)
    }));
    await apiRequest('/api/bets',{method:'POST',body:JSON.stringify({stake,selections})});
    slip=[];
    renderSlip();
    showToast('Aposta de demonstração salva na sua conta.');
  }catch(err){
    if(/Sessão inválida|Token ausente/i.test(err.message)){ saveSession(null); openPage('login'); }
    showToast(err.message || 'Não foi possível salvar a aposta.');
  }finally{
    placeBetBtn.disabled=false;
    placeBetBtn.textContent=original;
  }
};

// Competições clicáveis e links completos.
document.querySelectorAll('.competition[data-league]').forEach(card=>card.addEventListener('click',()=>{pageContent.innerHTML=leaguePage(card.dataset.league);pageOverlay.classList.add('open');pageOverlay.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');}));
document.querySelectorAll('[data-page="live-all"],[data-page="casino"],[data-page="casino-live"]').forEach(el=>el.onclick=e=>{e.preventDefault();openPage(el.dataset.page)});

// Autenticação real integrada ao backend VYBET/Supabase.

// Inicializa o estado visual da autenticação ao carregar a página.
updateAuthHeader();
