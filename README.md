# Pesquisa do TCC: anúncios com camisas de futebol

Questionário on-line do TCC de Rafael Di Lucca (Administração, FGV EBAPE), orientado pelo professor Daniel Kamlot.

## Como funciona

- O time informado define o grupo: Flamengo (FLA), Vasco da Gama (VAS) ou demais (SEL, camisas da Seleção).
- Dentro de cada grupo, o sorteio mostra a camisa A ou a camisa B, mantendo as duas com o mesmo número de exibições.
- O botão de avançar só libera 5 segundos depois de o anúncio aparecer.
- As respostas vão para uma planilha Google por meio do script em `apps-script/Codigo.gs`.
- Um mesmo navegador só consegue responder uma vez.

## Links úteis

- Link para divulgar: o endereço do site, sem nada no final.
- Modo teste (não conta no sorteio, fica marcado como teste e pode repetir): acrescente `?teste=1` ao endereço.
- Ver uma peça específica no modo teste: `?teste=1&peca=FLA-A` (ou FLA-B, VAS-A, VAS-B, SEL-A, SEL-B).

## Configuração

Só o arquivo `config.js` precisa ser editado: endereço do script do Google (`urlPlanilha`), e-mail de contato, nome da marca e versão do questionário.
