# Guia de montagem: suporte e luz do pregoscópio

Revisão 1 (02/11/2026). Gerado por `scripts/build-suporte.ts` e `scripts/build-eletronica.ts`; os parâmetros estão em `packages/adapter-cad/src/holder.ts`.

> **Status: projeto digital completo, nada impresso nem montado ainda.** Tudo o que não foi medido ou testado na bancada está na seção "O que ainda não foi verificado". Imprima antes os gabaritos de `CALIBRACAO.md` e depois a abraçadeira, antes das peças grandes.

## 1. O que é
Um suporte em C que segura o pregoscópio na vertical, com uma caixa luminosa na base. A lâmina desliza num canal no topo da caixa, sob a objetiva, e um LED branco ilumina por baixo. O pregoscópio (tubo telescópico com objetiva) é impresso à parte.

Duas versões, que dividem a abraçadeira e o difusor:
- **v1, pilha:** pilha de 9 V, interruptor e LED. Mais simples.
- **v2, fonte:** adaptador de tomada, interruptor e botão de brilho com corrente constante (sem PWM, para não dar faixas na câmera).

## 2. Arquivos
```
pacote-montagem/
  mecanica/
    comum/        abracadeira-tubo.stl, difusor.stl (+ versão em posição de impressão)
    v1-pilha/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    v2-fonte/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    calibracao/   calibracao-tubo.stl, calibracao-pecas.stl (ver CALIBRACAO.md)
    preview.png, preview-tampa.png
  eletronica/
    v1-pilha/         esquematico.svg, bom.csv, pick-and-place.csv, gerber/
    v2-fonte-dimmer/  esquematico.svg, bom.csv, pick-and-place.csv, gerber/
```
Os arquivos `*-impressao.stl` já estão deitados sobre a face de trás da coluna (90 × 210 mm de mesa, 115 mm de altura), o que cabe em mesa de 30 cm. Os demais ficam na posição de montagem (210,2 mm de altura) e servem para visualizar.

## 3. Medidas usadas
| Peça | Valor | Origem |
|---|---|---|
| Tubo externo | ⌀ 33,5 mm, 115 mm | paquímetro |
| Tubo interno (telescópico) | ⌀ 22,5 mm, curso de 40 mm, total 155 mm | paquímetro |
| Objetiva | ⌀ 20 mm, sai 35 mm do tubo interno | paquímetro |
| Parte visível do tubo interno, recolhido | 9 mm | fotos (regra de três) |
| Lâmina | 76 × 26 × 1 mm | padrão, **não medida** |
| Pilha 9 V | 48,5 × 26,5 × 17,5 mm | padrão |
| Interruptor de balancim (furo) | 19 × 13 mm | típico, **não medido** |

Alturas resultantes: lente frontal a 0,8 mm acima da lâmina, tubo externo de z = 95,2 a 210,2 mm, anel da abraçadeira (22 mm) no topo.

## 4. Lista de materiais
### Comum
| Qtd | Item |
|---|---|
| 1 | LED branco 5 mm de alto brilho (Vf ≈ 3,1 V, 20 mA) |
| 1 | Interruptor de balancim (painel, 2 pinos) |
| 4 | Parafuso M3 × 10 autoatarraxante (tampa de fundo) |
| 2 | Parafuso M3 × 16 autoatarraxante (abraçadeira) |
| — | Fio flexível fino, termorretrátil, fita dupla face ou cola quente |

### v1 (pilha)
| Qtd | Item |
|---|---|
| 1 | Pilha 9 V (6F22) com clipe de fios |
| 1 | Resistor 330 Ω, 1/4 W |

### v2 (fonte)
| Qtd | Item |
|---|---|
| 1 | Fonte 12 V, 500 mA, plugue P4 5,5 × 2,1 mm com centro positivo |
| 1 | Conector P4 fêmea de painel (furo de 11 mm) |
| 1 | LM317T (TO-220) |
| 1 | Resistor 47 Ω, 1/4 W |
| 1 | Potenciômetro linear 220 Ω com eixo de 6 mm, mais botão |
| 4 | Parafuso M3 × 8 autoatarraxante (placa do dimmer) |
| 1 | Placa 60 × 25 mm (Gerbers incluídos, ou placa perfurada com os mesmos furos) |

## 5. Eletrônica
### v1
Pilha 9 V → interruptor → resistor 330 Ω → LED → pilha. Esquemático em `eletronica/v1-pilha/esquematico.svg`.

- Corrente: (9 − 3,1) / 330 ≈ **17,9 mA** com a pilha nova.
- Com a pilha fraca, a 7 V, cai para cerca de 12 mA: o brilho diminui aos poucos.
- Para 20 mA exatos o resistor seria 295 Ω; 330 Ω é o valor comercial seguro.
- A pilha 9 V alcalina dura cerca de 25 a 30 horas nessa corrente (estimativa).
- Para um LED só, uma PCB não é necessária: solde os fios direto. Os Gerbers são opcionais.

### v2
Fonte 12 V → LM317 como fonte de corrente → resistor fixo de 47 Ω e reostato de 220 Ω em série → LED. Esquemático em `eletronica/v2-fonte-dimmer/esquematico.svg`.

- Corrente = 1,25 V / (47 Ω + posição do reostato): de **26,6 mA** (botão no mínimo de resistência) a **4,7 mA** (máximo).
- Tensão de entrada mínima: 3,1 + 1,25 + 2 ≈ 6,3 V. A fonte de 12 V sobra.
- O LM317 dissipa até cerca de 0,2 W; não precisa de dissipador nessa corrente.
- O LM317 precisa de uma corrente mínima de uns 3,5 mA para regular; o piso de 4,7 mA fica logo acima. Se o LED piscar no mínimo, troque o reostato por um de 180 Ω.
- Brilho sem PWM de propósito: com a câmera do celular, PWM gera faixas na imagem.

## 6. Impressão
Material PLA, camada de 0,2 mm, 3 perímetros, enchimento de 20 a 30 %.

| Peça | Orientação | Suportes |
|---|---|---|
| Abraçadeira | arquivo `-impressao` (abre para cima) | não |
| Suporte base + coluna | arquivo `-impressao` (deitado nas costas) | sim, dentro da caixa (teto da caixa em ponte de 85 mm) |
| Tampa de fundo | já plana | não |
| Difusor | plano, em PLA natural ou branco, 1 a 2 camadas | não |

Cor escura nas paredes ajuda a evitar luz espalhada. Imprima na ordem do roteiro (seção 9).

## 7. Montagem
1. Imprima, remova suportes e limpe os furos com uma broca de 3 mm onde estiver rugoso.
2. Cole o difusor no encaixe do teto da caixa, por dentro.
3. Instale o interruptor no recorte da frente. Mantenha a rosca livre.
4. **v2:** instale o conector de força na lateral direita e o botão do reostato na frente.
5. Monte o circuito (seção 5). Solde e isole os fios.
6. Encaixe o LED no porta-LED da tampa, com o flange na sede e as pernas pelo furo. Passe os fios pelo furo da tampa.
   **v1:** coloque a pilha no berço da tampa. **v2:** parafuse a placa nos 4 suportes.
7. Feche a tampa com 4 parafusos M3 × 10. Cuide para não prender fio.
8. Encaixe o pregoscópio no anel da coluna: tire a metade da abraçadeira, encoste o tubo de lado, recoloque e aperte os 2 parafusos M3 × 16 sem forçar.
9. Foco: afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno do pregoscópio, até a imagem ficar nítida.

## 8. O que ainda não foi verificado
- **Nada foi impresso nem montado.** Todas as folgas (0,2 mm no furo do tubo, 0,6 mm de abertura da abraçadeira, 0,4 mm no difusor e no LED) são valores típicos de FDM.
- Medidas ainda por conferir: lâmina real, furo do interruptor, diâmetro do tubo externo com mais de um ponto de medição, quanto a objetiva sai do tubo.
- Distância de trabalho de 0,8 mm é um valor típico de objetiva 40x/0,65; confirme com a sua.
- O LED a cerca de 10 mm da janela pode iluminar de forma irregular; o difusor deve resolver, mas só o teste confirma.
- Os Gerbers saem do autorroteador do tscircuit e **não foram abertos num visualizador independente**; faça isso no KiCad GerbView antes de qualquer fabricação.
- O esquemático foi gerado e a conectividade checada pelo software, mas o circuito não foi medido com multímetro.
- O simulador desta cópia não tem pilha nem LM317, então os circuitos não foram simulados lá, só calculados.

## 9. Roteiro de teste
1. Imprimir só a abraçadeira e provar no tubo. Ajustar `boreClearance` e `clampGap` se estiver folgada ou apertada.
2. Imprimir a tampa de fundo e provar no LED, na pilha ou na placa.
3. Imprimir o suporte completo, montar e conferir altura e foco com a lâmina.
4. Medir a corrente do LED com multímetro e comparar com os números da seção 5.
5. Registrar os ajustes em `holder.ts` e regenerar com `npx tsx scripts/build-suporte.ts`.
