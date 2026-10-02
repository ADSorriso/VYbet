const sports = [
  ["football","Futebol","1.245"],["basketball","Basquete","342"],["tennis","Tênis","287"],["volleyball","Vôlei","156"],
  ["mma","MMA","94"],["esports","eSports","210"],["f1","F1","76"],["table-tennis","Tênis de Mesa","52"],
  ["more","Mais Esportes",""]
];

const teamLogos = {
  "Manchester City": "assets/teams/football/manchester-city.svg",
  "Arsenal": "assets/teams/football/arsenal.svg",
  "Real Madrid": "assets/teams/football/real-madrid.svg",
  "Barcelona": "assets/teams/football/barcelona.svg",
  "Flamengo": "assets/teams/football/flamengo.svg",
  "Palmeiras": "assets/teams/football/palmeiras.svg",
  "River Plate": "assets/teams/football/river-plate.svg",
  "Boca Juniors": "assets/teams/football/boca-juniors.svg",
  "Liverpool": "assets/teams/football/liverpool.svg",
  "Newcastle": "assets/teams/football/newcastle.svg",
  "Juventus": "assets/teams/football/juventus.svg",
  "Inter de Milão": "assets/teams/football/inter-milao.svg",
  "Atlético-MG": "assets/teams/football/atletico-mg.svg",
  "Corinthians": "assets/teams/football/corinthians.svg",
  "Los Angeles Lakers": "assets/teams/basketball/los-angeles-lakers.svg",
  "Boston Celtics": "assets/teams/basketball/boston-celtics.svg",
  "NAVI": "assets/teams/esports/navi.svg",
  "FURIA": "assets/teams/esports/furia.svg"
};

const matches = [
  ["Hoje","16:00","Premier League","Manchester City","Arsenal","1.85","3.60","4.20","+320"],
  ["Hoje","18:30","La Liga","Real Madrid","Barcelona","2.10","3.50","3.10","+412"],
  ["Hoje","21:00","Série A","Flamengo","Palmeiras","2.45","3.20","2.90","+287"],
  ["Hoje","21:30","Copa Libertadores","River Plate","Boca Juniors","2.15","3.10","3.45","+301"]
];

const live = [
  ["45'","Liverpool","Newcastle","1","0","1.40","4.20","7.50","+120"],
  ["67'","Juventus","Inter de Milão","1","1","2.80","2.10","3.20","+98"],
  ["32'","Los Angeles Lakers","Boston Celtics","48","52","2.05","-","1.75","+45"],
  ["2º T","Atlético-MG","Corinthians","1","1","2.30","3.10","3.00","+76"],
  ["15'","NAVI","FURIA","1","0","1.65","2.10","","+34"]
];

const sportsList = document.getElementById("sports-list");
sports.forEach(([icon,name,count])=>{
  const a=document.createElement("a");
  a.className="sport-side"; a.href="#esportes";
  a.innerHTML=`<span><img class="ui-icon" src="assets/icons/${icon}.svg" alt=""></span><label>${name}</label><b>${count}</b>`;
  sportsList.appendChild(a);
});

const matchesBox=document.getElementById("matches");
matches.forEach((m,i)=>{
  const el=document.createElement("div");
  el.className="match";
  el.innerHTML=`
    <div class="time">${m[0]}<br><b>${m[1]}</b></div>
    <div class="teams">
      <div class="league">${m[2]}</div>
      <div class="team-line"><img class="team-logo" src="${teamLogos[m[3]]}" alt="${m[3]}"><span>${m[3]}</span></div>
      <div class="team-line"><img class="team-logo" src="${teamLogos[m[4]]}" alt="${m[4]}"><span>${m[4]}</span></div>
    </div>
    <div class="trend">▥<br><span>${m[8]}</span></div>
    <button class="odds" data-team="${m[3]}"><span class="odd-label">1</span>${m[5]}</button>
    <button class="odds" data-team="${m[3]}"><span class="odd-label">X</span>${m[6]}</button>
    <button class="odds" data-team="${m[4]}"><span class="odd-label">2</span>${m[7]}</button>
    <div class="star">☆</div>`;
  matchesBox.appendChild(el);
});

const liveBox=document.getElementById("live-games");
live.forEach(m=>{
  const el=document.createElement("div"); el.className="live-game";
  el.innerHTML=`
    <div class="live-meta"><span>${m[0]}</span><span>▥ ${m[8]}</span></div>
    <div class="live-team"><span><img class="team-logo mini" src="${teamLogos[m[1]]||''}" alt="">${m[1]}</span><b class="live-score">${m[3]}</b></div>
    <div class="live-team"><span><img class="team-logo mini" src="${teamLogos[m[2]]||''}" alt="">${m[2]}</span><b class="live-score">${m[4]}</b></div>
    <div class="mini-odds"><span>${m[5]}</span><span>${m[6]}</span><span>${m[7]||"—"}</span></div>`;
  liveBox.appendChild(el);
});

let slip=[
  ["Manchester City","Resultado Final","Man City x Arsenal","1.85"],
  ["Real Madrid","Resultado Final","Real Madrid x Barcelona","2.10"],
  ["Mais de 2.5","Total de Gols","Flamengo x Palmeiras","1.80"]
];
const slipBox=document.getElementById("bet-slip");
function renderSlip(){
  slipBox.innerHTML="";
  slip.forEach((b,i)=>{
    const el=document.createElement("div");el.className="bet-item";
    el.innerHTML=`<div class="bet-item-top"><b>⚽ ${b[0]}</b><span class="bet-odd">${b[3]}</span><span class="remove" data-i="${i}">×</span></div><small>${b[1]}<br>${b[2]}</small>`;
    slipBox.appendChild(el);
  });
  document.getElementById("bet-count").textContent=slip.length;
}
renderSlip();

slipBox.addEventListener("click",e=>{
  if(e.target.classList.contains("remove")){
    slip.splice(Number(e.target.dataset.i),1); renderSlip(); recalc();
  }
});

function recalc(){
  const odds=slip.reduce((a,b)=>a*Number(b[3]),1);
  document.getElementById("total-odds").textContent=odds.toFixed(2);
  const stake=Number(document.getElementById("stake").value)||0;
  document.getElementById("return").textContent="R$ "+(stake*odds).toLocaleString("pt-BR",{minimumFractionDigits:2});
}
document.getElementById("stake").addEventListener("input",recalc);
document.querySelectorAll(".odds").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const odd=btn.textContent.trim();
    const team=btn.dataset.team;
    slip.push([team,"Resultado selecionado","Jogo em destaque",odd]);
    renderSlip();recalc();
    showToast("Seleção adicionada ao cupom");
  });
});

document.getElementById("place-bet").addEventListener("click",()=>{
  if(!slip.length){showToast("Adicione uma seleção ao cupom primeiro.");return}
  showToast("Protótipo: aposta simulada com sucesso.");
});
document.querySelectorAll(".primary,.deposit,.welcome-bonus button,.side-promo button").forEach(b=>{
  b.addEventListener("click",()=>showToast("Esta ação está disponível no protótipo."));
});
function showToast(msg){
  const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2600);
}
recalc();

document.querySelectorAll(".welcome-bonus,.side-promo,.casino-mini").forEach(card=>{
  card.addEventListener("click",()=>showToast("Área promocional do protótipo."));
});
