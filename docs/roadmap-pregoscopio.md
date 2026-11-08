# Roadmap detalhado: suporte e luz do pregoscópio

Atualizado em 02/11/2026. Legenda: ✅ feito · 🟡 feito, mas só digital ou provisório · ⏳ falta · ❓ depende de decisão.

**Resumo:** o projeto digital das duas versões está completo (mecânica, esquemáticos, cálculos, simulação no simulador, página do site, guia e pacote). Nada foi impresso, medido na bancada ou montado. O que falta é físico (medir, imprimir, soldar, testar e ajustar) e três decisões: a pilha, a diferença entre o STEP e o paquímetro no tubo e onde hospedar a API de forma permanente.

## Decisões tomadas
| Decisão | Valor | Quem decidiu |
|---|---|---|
| LEDs | 1 LED branco de 5 mm | usuário |
| Versão 1 | pilha 9 V, interruptor, LM317 com R1 de 68 Ω (corrente constante) | usuário (9 V confirmada em 03/11/2026) |
| Versão 2 | fonte 12 V, interruptor, brilho ajustável por corrente constante (LM317) | usuário pediu brilho ajustável; o LM317 é escolha minha |
| Impressora | mesa de 30 cm | usuário |
| Pregoscópio | impresso à parte; o escopo é o suporte e a luz | usuário |
| Lâmina | 76 × 26 × 1 mm | padrão, ainda não medida |
| API do site | roda no PC do usuário, exposta por túnel ngrok | usuário (temporário) |

---

## Fase 0 — Alinhamento e medidas
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 0.1 | Medidas do pregoscópio (tubos, objetiva) | ✅ | valores no guia, seção 3 |
| 0.2 | Quantidade de LEDs e versões | ✅ | — |
| 0.3 | Mesa da impressora | ✅ | peças em orientação que cabe em 300 mm |
| 0.4 | Ler o demo do João | ✅ | é demo de teste, tubo genérico |
| 0.5 | Confirmar a pilha de 9 V | ✅ | confirmada pelo usuário em 03/11/2026; com o LM317 a pilha vale de 9 V até 6,35 V |
| 0.6 | Calibrar a lâmina (largura) | 🟡 | gabarito gerado (`calibracao-pecas.stl`); falta imprimir e provar; a espessura de 1 mm é padrão |
| 0.7 | Calibrar o furo do interruptor (KCD1-101, 21,2 × 15,0 mm pelo guia da LCSC) e do conector DC-022B (7,8 mm pelos anúncios) | 🟡 | séries `interruptor` e `conector-dc` do gabarito; falta imprimir e provar |
| 0.8 | Calibrar o tubo externo | 🟡 | gabarito `calibracao-tubo.stl`; falta imprimir e provar |
| 0.9 | Medir o quanto a objetiva sai do tubo interno recolhido | ⏳ | só com régua ou paquímetro; não cabe no gabarito |

## Fase 1 — Elétrica
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 1.1 | Esquemático e cálculo da v1 (9 V → chave → LM317 → R1 de 68 Ω → LED, 18,4 mA constantes até 6,35 V, cerca de 22 h) | ✅ | `eletronica/v1-pilha/`; corrige a queda de brilho da versão com resistor direto |
| 1.2 | Esquemático e cálculo da v2 (diodo 1N5819, LM317, R1 de 68 Ω e reostato de 220 Ω: 18,4 a 4,3 mA) | ✅ | `eletronica/v2-fonte-dimmer/`; entrada mínima de 6,75 V |
| 1.9 | Proteção contra plugue invertido (D2) e capacitor de 100 nF na entrada do LM317 (C1) | ✅ | no esquemático, no simulador, na calculadora e no 3D |
| 1.10 | Plano de teste com tensões e correntes esperadas | ✅ | no guia e na aba Eletrônica; os números vêm do mesmo código dos cálculos, com testes |
| 1.11 | Lista de compras com o que procurar na loja | ✅ | `lista-de-compras-v1.csv` e `v2.csv`, com o preço em branco (nenhum foi conferido) |
| 1.3 | PCB e Gerbers da v1 (40 × 25 mm) e da v2 (70 × 25 mm), opcionais | 🟡 | sem erro nas verificações do tscircuit; trilhas e máscara ainda não vistas num programa de PCB |
| 1.4 | Conferir os Gerbers com ferramenta independente | 🟡 | `scripts/verificar-gerber.py` (gerbonara): contorno, furos dentro da placa, furos de montagem em (±16,5; ±9) mm na v1 e (±31,5; ±9) mm na v2, e cobre a 3 mm da borda ou mais, nas duas placas. Falta abrir no KiCad GerbView para conferir trilhas e máscara |
| 1.5 | Montar a v1 e fazer o plano de teste | ⏳ | 18,4 mA (17,4 a 19,4) e as tensões da tabela do guia |
| 1.6 | Montar a v2 e fazer o plano de teste | ⏳ | 18,4 a 4,3 mA sem o LED piscar no mínimo |
| 1.7 | Conferir se o brilho ajustável não gera faixas na câmera | ⏳ | imagem estável em vídeo no celular |
| 1.8 | Simular no site | ✅ | peças novas (pilha 9 V, fonte 12 V, interruptor de balancim, LM317) e exemplos "SUPORTE do PREGOSCÓPIO v1 e v2"; 7 testes do laboratório |

## Fase 2 — Mecânica
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 2.1 | Suporte em C (caixa, coluna, braço, anel) | ✅ | `mecanica/` |
| 2.2 | Abraçadeira do tubo com 2 parafusos M3 | ✅ | testada contra colisão com o tubo |
| 2.3 | Canal da lâmina e janela do LED | ✅ | — |
| 2.4 | Berço da pilha 9 V (v1) | ✅ | cabe na caixa e não encosta no porta-LED |
| 2.5 | Porta-LED na tampa e difusor | ✅ | LED abaixo do difusor |
| 2.6 | Variante v2 (conector de força, botão, placa de 70 × 25 mm em 4 suportes) | ✅ | — |
| 2.13 | Pernas e fios do LED saem pela fenda lateral do porta-LED, voltada para a placa (antes o furo atravessava a tampa e deixava os fios fora da caixa fechada) | ✅ | teste confere o sentido da fenda em cada versão e que a tampa fica fechada por baixo |
| 2.12 | Placa do driver da v1 (40 × 25 mm) em 4 suportes na tampa, na frente do LED | ✅ | verificado contra o porta-LED, o berço e o interruptor |
| 2.7 | Testes automáticos | ✅ | 26 testes do pacote CAD |
| 2.8 | Orientação de impressão para mesa de 30 cm | ✅ | arquivos `-impressao.stl` |
| 2.9 | Esvaziar a coluna para economizar material | ✅ | janela em estádio de 30 mm atravessando a coluna (saída vertical ao imprimir deitado) |
| 2.11 | Cantos arredondados, perfil da coluna com raios e arredondamento da borda superior | ✅ | cantos de 6 mm, borda de 2 mm, raios de 8 mm no perfil |
| 2.10 | Encaixe de pressão ou parafuso na tampa da caixa | ❓ | só se a tampa por 4 parafusos incomodar |

## Fase 3 — Teste físico
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 3.1 | Imprimir só a abraçadeira e provar no tubo | ⏳ | fecha sem forçar e segura o tubo; ajustar `boreClearance` e `clampGap` |
| 3.2 | Imprimir a tampa de fundo e provar o LED e a pilha ou placa | ⏳ | LED assenta no flange; pilha entra no berço |
| 3.3 | Imprimir o suporte completo | ⏳ | sem empenamento; cabe na mesa |
| 3.4 | Montar e conferir altura e foco com lâmina real | ⏳ | imagem nítida com o tubo interno entre 0 e 40 mm |
| 3.5 | Conferir a iluminação (uniformidade, brilho) | ⏳ | campo sem sombra do LED; ajustar `ledToCeiling` ou o difusor |
| 3.6 | Registrar os ajustes e regenerar os STLs | ⏳ | `holder.ts` atualizado, testes passando |

## Fase 4 — Pacote de montagem
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 4.1 | Estrutura `pacote-montagem/` (mecânica, eletrônica, guia) | ✅ | — |
| 4.2 | Guia de montagem com lista de materiais, ordem e limitações | ✅ | `GUIA-DE-MONTAGEM.md` |
| 4.3 | Atualizar o guia com os números medidos na Fase 3 | ⏳ | seção 8 do guia esvaziada |
| 4.4 | Fotos da montagem real | ⏳ | passo a passo ilustrado |
| 4.5 | Nomear os arquivos por revisão | ⏳ | `rev2` etc., depois dos primeiros ajustes |

## Fase 5 — Site e repositório
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 5.1 | Site publicado na Vercel | ✅ | `copia-simulador-iot.vercel.app` |
| 5.5 | Página "Suporte do Pregoscópio" no site (`#suporte`): 3D com identificador por peça, lista com o motivo de cada escolha, eletrônica com calculadora e gabaritos | ✅ | estática: não depende da API |
| 5.6 | Pregoscópio no 3D com a geometria do STEP V1 (8 sólidos, tubo interno móvel) | ✅ | cabeça, garras, manopla e tubos do STEP; o tubo externo do STEP (30 mm) difere do paquímetro (33,5 mm) |
| 5.7 | Circuito simulado na aba Protoboard | ✅ | executa sem microcontrolador; o interruptor liga e desliga o LED e o reostato muda a corrente (painel Laboratório). É corrente contínua com fonte ideal, não SPICE |
| 5.8 | Identificadores sem sobreposição no 3D e manopla esquerda (espelho da direita, porque o STEP só traz uma) | ✅ | P10 marcada como suposição |
| 5.9 | Visualizador do claude.ai com o pregoscópio do STEP | ✅ | |
| 5.10 | 3D com fios (W1), termorretrátil (W2), cola do difusor (W3) e detalhes das peças compradas (aleta e pernas do LM317, faixas do resistor, balancim e terminais do interruptor, porca e eixo do reostato, porca do conector, plugue e cabo da fonte, clipe da pilha) | ✅ | todas as peças compradas têm forma no 3D, algumas ainda simplificadas |
| 5.11 | Lista de projetos do simulador reorganizada: suporte v1 e v2 primeiro, depois os exemplos de Arduino numerados do mais simples ao mais completo; projetos salvos do mais recente ao mais antigo | ✅ | |
| 5.12 | Manual de construção (aba "Manual de construção"): planta-mãe com vistas superior, frontal e lateral e cotas, posição X/Y/Z de cada peça e de cada parafuso, lista de materiais com medidas padrão, montagem passo a passo com imagem 3D (peças aparecem na ordem de montagem), teste elétrico; português e chinês | ✅ | uma versão por pilha (v1) e uma por fonte e dimmer (v2); texto em chinês escrito sem tradutor técnico, pedir revisão de um falante nativo |
| 5.13 | PDF do manual de cada versão para enviar ao fabricante (`pacote-montagem/MANUAL-v1.pdf`, `MANUAL-v2.pdf`) | ✅ | gerado por `scripts/render-manual.ts` |
| 5.14 | Desenhos técnicos refeitos (9 folhas por versão, primeiro diedro) com verificador automático de colisões de texto e balões (`npx tsx scripts/check-desenhos.ts`): 0 colisões nas duas versões | ✅ | o verificador não pega linhas que cruzam texto nem erro de geometria: continua precisando de olho humano |
| 5.15 | Imagens dos passos com setas de encaixe, quantidade nos parafusos e rótulos maiores; o endereço guarda o passo (`#suporte/manual/v2/9`) | ✅ | |
| 5.16 | 3D com fiação real: fios roteados ao redor das peças (sem atravessar nenhuma), ligados aos pads da placa do Gerber (posições vindas do circuit.json) e testados contra a lista de ligações do esquemático; placa com trilhas e pads, TO-220, resistor com 5 faixas, diodo, capacitor, interruptor, conector, reostato com botão, pilha com clipe e fonte com plugue | ✅ | os modelos seguem as medidas de catálogo, não os CAD dos fabricantes |
| 5.17 | Manual em quatro edições: português com chinês, só português, só chinês, só inglês (`MANUAL-v?.pdf`, `-pt`, `-zh`, `-en`), com vista explodida; verificador de colisões roda nas oito edições | ✅ | chinês e inglês escritos sem tradutor técnico |
| 5.18 | Pregoscópio no 3D conforme as fotos: tubo externo ⌀ 33,5 × 115 mm, tubo interno ⌀ 22,5 mm que desliza 0 a 40 mm com escala em mm impressa, objetiva 40x/0,65 (38 mm de comprimento, 35 abaixo do tubo) rosqueada direto no tubo interno; P7 e P8 do STEP removidos (não aparecem nas fotos) | ✅ | cabeça, garras e manoplas continuam vindo do STEP |
| 5.19 | Rodada "melhorar 100%": lista de corte dos fios (v1 610 mm, v2 1265 mm), fios do 3D roteados sem colisão e testados contra o esquemático, seta FRENTE/FRONT na serigrafia, imagens das placas e conferência independente do cobre (sem abertos nem curtos), tabela de ajustes no DT-06, ficha de calibração, verificador de desenhos com regra de linha sobre texto (0 problemas nas 8 edições), glossário e planilha de revisão da tradução (435 textos) | ✅ | revisão por falante nativo, medidas físicas e modelos CAD do fabricante continuam pendentes |
| 5.20 | Pesquisa das peças reais (docs/pesquisa-pecas.md): óptica do tubo (160 mm, ocular WF10X de 23,2 mm só cabe no tubo externo, comprimento atual 134 mm e máximo 155 mm), painel de óptica e teste elétrico simulado com multímetro virtual, falhas injetáveis e peças sorteadas dentro das tolerâncias; faixas do teste corrigidas | ✅ | decisão de como chegar perto de 160 mm e medidas reais do pregoscópio pendentes |
| 5.21 | Cabeça do suporte subida 18 mm (innerPull 10 → 28): altura 228,2 mm, tubo interno com 37 mm de extensão na posição de trabalho e comprimento mecânico do tubo de 152 mm (era 134 mm; o ideal é 160 mm, o máximo possível com este tubo é 155 mm); STLs, desenhos e PDFs refeitos | ✅ | confirmar no pregoscópio real a distância do ombro da objetiva até onde o ocular apoia |
| 5.22 | Precificação do suporte e da eletrônica (sem o pregoscópio) no Brasil, em R$: preços de lojas lidos em 2026-11-07 com loja, endereço e confiança por linha; protótipo (compra de pacotes) e lote de 100; painel na aba Eletrônica e planilhas CUSTOS-*.csv; v1 ≈ R$ 64 por unidade em material usado, v2 ≈ R$ 88 | ✅ | fio 24 AWG sem preço; WH148 de 220 Ω não achado no Brasil (preço de 5 kΩ usado); conector DC-022B só por anúncio; atacado e placa fabricada não cotados |
| 5.23 | Estudo do 1000x (docs/projeto-1000x.md): modelo óptico 40x/100x no código (resolução, ampliação útil, campo, brilho do difusor), painel "Aumento, resolução e luz" na aba Eletrônica; a etapa 2 (suporte, condensador e LED de potência) depende da medida da 100x e do condensador | 🟡 | v1 (bateria) não serve para 1000x; tubo máximo de 155 mm |
| 5.24 | 3D da versão 1000x econômica: suporte mais alto (237,6 mm), objetiva 100x, tubo de luz com íris, LED de 3 W a 350 mA em dissipador, driver e placa; STLs em mecanica/v2-1000x; tabela de dimensões com a origem de cada medida; 4 testes novos de encaixe e colisão | 🟡 | medidas das peças compradas, fios, ocular, manual e teste elétrico da versão ainda não feitos |
| 5.25 | Custo da versão 1000x econômica no painel e em planilhas (v2 · 1000x: R$ 218,08 usado por unidade, R$ 337,05 para comprar tudo); inclui objetiva, óleo, LED de 3 W, filamento do tubo de luz | 🟡 | íris (R$ 287 em loja internacional) é o item mais caro e o mais incerto; driver e dissipador são preços de itens parecidos |
| 5.2 | API acessível pelo site | 🟡 | só funciona com o PC ligado, Docker e `ngrok http 7860` rodando |
| 5.3 | API permanente e gratuita | ❓ | Hugging Face exige PRO; Google Cloud Run pede cartão |
| 5.4 | Código no GitHub | 🟡 | `main` publicada; falta commitar o pacote atualizado |

## Fase 6 — Fechamento
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 6.1 | Revisão com o João | ⏳ | alinhar o circuito com o demo dele |
| 6.2 | Validação final com amostra real | ⏳ | lâmina de parasitologia vista no conjunto completo |
| 6.3 | Entrega do pacote | ⏳ | guia sem pendências |

---

## Ordem recomendada
1. **Hoje:** medições da Fase 0 (0.5 a 0.9), que ajustam os parâmetros.
2. **Em paralelo:** 1.5 e 1.6 na protoboard, e 3.1 (imprimir a abraçadeira).
3. **Depois:** 3.2 a 3.5, com os ajustes em 3.6.
4. **Por fim:** 4.3 a 4.5, 5.3, 6.1 a 6.3.

## Riscos
| Risco | Mitigação |
|---|---|
| Folgas de impressão erradas | imprimir peças de teste antes; parâmetros em `holder.ts` |
| Tubo medido com erro (33,5 mm) | paquímetro em vários pontos; clamp ajustável |
| Altura do foco | `focusOffset` e `innerPull` ajustam sem redesenhar |
| LM317 sem carga mínima no brilho mínimo | piso de 4,7 mA; trocar o reostato se piscar |
| Gerbers com erro | conferir no GerbView; as placas são opcionais |
| API só no PC | decidir hospedagem na 5.3 |
