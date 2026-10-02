window.VYBET_DATA = {
  sports: [
    { id: 'football', name: 'Futebol', count: '1.245' }
  ],
  teams: {
    'Manchester City': { id:'mci', sport:'football', league:'Premier League', logo:'assets/teams/football/manchester-city.svg' },
    'Arsenal': { id:'ars', sport:'football', league:'Premier League', logo:'assets/teams/football/arsenal.svg' },
    'Real Madrid': { id:'rma', sport:'football', league:'La Liga', logo:'assets/teams/football/real-madrid.svg' },
    'Barcelona': { id:'bar', sport:'football', league:'La Liga', logo:'assets/teams/football/barcelona.svg' },
    'Flamengo': { id:'fla', sport:'football', league:'Série A', logo:'assets/teams/football/flamengo.svg' },
    'Palmeiras': { id:'pal', sport:'football', league:'Série A', logo:'assets/teams/football/palmeiras.svg' },
    'River Plate': { id:'riv', sport:'football', league:'Copa Libertadores', logo:'assets/teams/football/river-plate.svg' },
    'Boca Juniors': { id:'boc', sport:'football', league:'Copa Libertadores', logo:'assets/teams/football/boca-juniors.svg' },
    'Liverpool': { id:'liv', sport:'football', league:'Premier League', logo:'assets/teams/football/liverpool.svg' },
    'Newcastle': { id:'new', sport:'football', league:'Premier League', logo:'assets/teams/football/newcastle.svg' },
    'Juventus': { id:'juv', sport:'football', league:'Serie A', logo:'assets/teams/football/juventus.svg' },
    'Inter de Milão': { id:'int', sport:'football', league:'Serie A', logo:'assets/teams/football/inter-milao.svg' },
    'Atlético-MG': { id:'cam', sport:'football', league:'Série A', logo:'assets/teams/football/atletico-mg.svg' },
    'Corinthians': { id:'cor', sport:'football', league:'Série A', logo:'assets/teams/football/corinthians.svg' }
  },
  matches: [
    {id:'mci-ars', sport:'football', day:'Hoje', time:'16:00', league:'Premier League', home:'Manchester City', away:'Arsenal', odds:{home:'1.85',draw:'3.60',away:'4.20'}, extra:'+320'},
    {id:'rma-bar', sport:'football', day:'Hoje', time:'18:30', league:'La Liga', home:'Real Madrid', away:'Barcelona', odds:{home:'2.10',draw:'3.50',away:'3.10'}, extra:'+412'},
    {id:'fla-pal', sport:'football', day:'Hoje', time:'21:00', league:'Série A', home:'Flamengo', away:'Palmeiras', odds:{home:'2.45',draw:'3.20',away:'2.90'}, extra:'+287'},
    {id:'riv-boc', sport:'football', day:'Hoje', time:'21:30', league:'Copa Libertadores', home:'River Plate', away:'Boca Juniors', odds:{home:'2.15',draw:'3.10',away:'3.45'}, extra:'+301'}
  ],
  live: [
    {id:'liv-new', sport:'football', clock:"45'", home:'Liverpool', away:'Newcastle', scoreHome:'1', scoreAway:'0', odds:['1.40','4.20','7.50'], extra:'+120'},
    {id:'juv-int', sport:'football', clock:"67'", home:'Juventus', away:'Inter de Milão', scoreHome:'1', scoreAway:'1', odds:['2.80','2.10','3.20'], extra:'+98'},
    {id:'cam-cor', sport:'football', clock:'2º T', home:'Atlético-MG', away:'Corinthians', scoreHome:'1', scoreAway:'1', odds:['2.30','3.10','3.00'], extra:'+76'}
  ]
};
