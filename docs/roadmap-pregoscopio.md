# Roadmap detalhado: suporte e luz do pregoscópio

Atualizado em 02/11/2026. Legenda: ✅ feito · 🟡 feito, mas só digital ou provisório · ⏳ falta · ❓ depende de decisão.

**Resumo:** o projeto digital das duas versões está completo (mecânica, esquemáticos, cálculos, guia e pacote). Nada foi impresso, medido na bancada ou montado. Tudo o que falta é físico: medir, imprimir, soldar, testar e ajustar.

## Decisões tomadas
| Decisão | Valor | Quem decidiu |
|---|---|---|
| LEDs | 1 LED branco de 5 mm | usuário |
| Versão 1 | pilha 9 V, interruptor, resistor de 330 Ω | premissa minha (confirmar) |
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
| 0.5 | Confirmar pilha 9 V e a premissa de 330 Ω | ⏳ | usuário confirma ou troca a pilha |
| 0.6 | Medir a lâmina (largura e espessura) | ⏳ | paquímetro; atualizar `slideWidth` e `slideThickness` |
| 0.7 | Medir o furo do interruptor real | ⏳ | atualizar `switchCutout` |
| 0.8 | Medir o tubo externo em 2 pontos e 2 direções | ⏳ | atualizar `tubeDiameter` |
| 0.9 | Medir o quanto a objetiva sai do tubo interno recolhido | ⏳ | atualizar `sleeveLength` e `objectiveLength` |

## Fase 1 — Elétrica
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 1.1 | Esquemático e cálculo da v1 (9 V → chave → 330 Ω → LED, ≈ 17,9 mA) | ✅ | `eletronica/v1-pilha/` |
| 1.2 | Esquemático e cálculo da v2 (LM317, 4,7 a 26,6 mA) | ✅ | `eletronica/v2-fonte-dimmer/` |
| 1.3 | PCB e Gerbers da v1 e da v2 (opcionais) | 🟡 | gerados pelo autorroteador; **não conferidos** |
| 1.4 | Conferir os Gerbers no KiCad GerbView | ⏳ | sem erro visível; obrigatório antes de fabricar |
| 1.5 | Montar a v1 na protoboard e medir a corrente do LED | ⏳ | 15 a 20 mA com multímetro |
| 1.6 | Montar a v2 e medir o intervalo de corrente | ⏳ | ≈ 5 a 26 mA sem o LED piscar no mínimo |
| 1.7 | Conferir se o brilho ajustável não gera faixas na câmera | ⏳ | imagem estável em vídeo no celular |
| 1.8 | Simular no site | ❓ | o site do João tem pilha; esta cópia não tem pilha nem LM317 |

## Fase 2 — Mecânica
| # | Tarefa | Status | Critério de pronto |
|---|---|---|---|
| 2.1 | Suporte em C (caixa, coluna, braço, anel) | ✅ | `mecanica/` |
| 2.2 | Abraçadeira do tubo com 2 parafusos M3 | ✅ | testada contra colisão com o tubo |
| 2.3 | Canal da lâmina e janela do LED | ✅ | — |
| 2.4 | Berço da pilha 9 V (v1) | ✅ | cabe na caixa e não encosta no porta-LED |
| 2.5 | Porta-LED na tampa e difusor | ✅ | LED abaixo do difusor |
| 2.6 | Variante v2 (conector de força, botão, 4 suportes da placa) | ✅ | — |
| 2.7 | Testes automáticos | ✅ | 22 testes do pacote CAD |
| 2.8 | Orientação de impressão para mesa de 30 cm | ✅ | arquivos `-impressao.stl` |
| 2.9 | Esvaziar a coluna para economizar material | ⏳ | opcional |
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
