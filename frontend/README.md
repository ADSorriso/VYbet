# VYBET — Protótipo funcional de interface

Protótipo estático de uma plataforma esportiva com dinheiro/odds fictícios. Não há pagamentos reais, saque, depósito ou integração com uma casa de apostas.

## O que foi implementado
- Layout desktop inspirado no conceito visual VYBET.
- Sistema de dados separado em `js/data.js`.
- Cadastro local de equipes com `id`, esporte, liga e escudo.
- Escudos estilizados locais para os times exibidos no protótipo.
- Partidas e jogos ao vivo modelados por IDs.
- Cupom funcional: adicionar, substituir seleção da mesma partida, remover e recalcular cota/retorno.
- Alternância Simples/Múltipla no protótipo.
- Filtros de esporte e busca por time/campeonato.
- Favoritos visuais.

## Próxima etapa
Substituir os dados fictícios por um backend próprio e uma fonte licenciada de dados esportivos. O TheSportsDB documenta endpoints para buscar equipes, listar equipes de uma liga e obter `strBadge`; a disponibilidade e os limites dependem do plano da API. Consulte a documentação oficial antes de usar em produção.

https://www.thesportsdb.com/documentation

## Observação sobre escudos
Os arquivos em `assets/teams/` desta versão são **escudos estilizados para protótipo**, não cópias oficiais dos emblemas. Para uma versão comercial, devemos integrar uma fonte de dados/artwork com direitos de uso adequados.

## Como testar
Abra `index.html` em um navegador. Para testar recursos que dependam de `fetch` no futuro, use um servidor local (por exemplo, Live Server).
