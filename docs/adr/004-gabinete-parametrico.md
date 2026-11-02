# ADR-004 — Gabinete paramétrico a partir da PCB (fase 5)

- **Status:** aceita
- **Data:** 19/10/2026
- **Código:** `packages/adapter-cad`, `packages/project-model` (entidade `Enclosure`, `schemaVersion` 2), `apps/web/src/cad/`, `apps/web/src/components/{EnclosureView,EnclosureViewer}.tsx`

## Decisão

- **Núcleo CAD:** [Replicad](https://replicad.xyz) 1.1.0 (MIT) sobre `replicad-opencascadejs` 1.1.0 (OpenCascade em WASM, LGPL-2.1). Sólidos B-rep com booleanas exatas e exportação STL pela própria biblioteca; STEP fica disponível para depois sem trocar de núcleo. OpenSCAD-wasm foi descartado pela licença (GPL-2); bibliotecas só de malha (JSCAD, manifold) não dão caminho para STEP.
- **Fora da thread da UI:** a geometria roda num Web Worker (`apps/web/src/cad/enclosure.worker.ts` → `startCadWorker`) com protocolo versionado (`v: 1`, `build` → `built` | `error`). Malhas e STLs voltam como `Transferable`. O `.wasm` (~22 MB) só é baixado na primeira geração; a aba "Gabinete" é carregada sob demanda (`React.lazy`), então three.js e React Three Fiber não entram no chunk principal.
- **Layout puro + geometria:** `enclosureLayout(pcb, enclosure)` calcula todas as cotas, suportes, ferramentas de corte e avisos sem o núcleo CAD (usado pela UI e pelos testes). `geometry.ts` só transforma esse layout em sólidos Replicad.
- **Visualização:** React Three Fiber 9.8.1 + three 0.179.1 (mesma versão que as dependências do tscircuit já içam para a raiz; `resolve.dedupe` no Vite garante uma só instância), `OrbitControls` do próprio three, renderização sob demanda.
- **Exportação:** STL binário da base e da tampa, com título e revisão no cabeçalho de 80 bytes e no nome do arquivo (`<projeto>-gabinete-{base|tampa}-rev<N>.stl`). A tampa sai virada (face externa para baixo), pronta para fatiar. Tesselação: desvio de 0,02 mm, no máximo 0,1 rad por segmento.

## Modelo do projeto (`schemaVersion` 2)

`project.enclosure` é `null` ou:

| Campo | Conteúdo |
|---|---|
| `params` | `wall` (paredes, fundo e tampa), `clearance` (PCB ↔ parede, por lado), `standoffHeight` (fundo → face de baixo da PCB), `headroom` (face de cima da PCB → tampa), `lipHeight` (aba da tampa, 0 = lisa), `fit` (aba ↔ parede, por lado). Todos em mm, com faixas validadas por zod. |
| `cutouts[]` | recortes manuais: `id` estável (`cut_`), nome, face (`front` −Y, `back` +Y, `left` −X, `right` +X, `lid`), `rect` ou `circle`, centro `x, y, z`, `width`, `height` (círculo: `width` = diâmetro). |
| `pcbInputsKey`, `sourceRevision` | de qual PCB/revisão a geometria foi gerada pela última vez. |

- `migrate()` ganhou a primeira migração: 1 → 2 acrescenta `enclosure: null`. Projetos e fixtures v1 continuam abrindo.
- A geometria **não** é persistida: é derivada dos parâmetros + PCB.
- Comandos (com revisão e undo/redo): `createEnclosure`, `removeEnclosure`, `setEnclosureParams`, `addCutout`, `updateCutout`, `removeCutout`. Também `setMountingHoles`, porque até aqui não havia como criar furos de montagem; a aba PCB ganhou o atalho "4 cantos (M3)" (furos de 3,2 mm a 3,5 mm das bordas), e os furos também vão para os Gerbers.

## Geometria

Milímetros, origem no centro da placa (o mesmo referencial de `project.pcb`), +Z para cima, z = 0 na face externa do fundo.

| Grandeza | Regra |
|---|---|
| Cavidade interna | placa + 2 × `clearance` |
| Dimensão externa | cavidade + 2 × `wall` |
| PCB | 1,6 mm (padrão do tscircuit; o modelo ainda não guarda espessura), apoiada a `wall + standoffHeight` |
| Altura da base | `wall + standoffHeight + 1,6 + headroom` |
| Suporte | cilindro em cada furo de `pcb.mountingHoles`, ⌀ externo = furo + 2 × `wall`, furo-piloto cego ⌀ = 80 % do furo arredondado a 0,1 mm (M3 3,2 → 2,6 mm), para parafuso autoatarraxante |
| Tampa | placa de `wall` apoiada nas paredes + aba (anel com parede `wall`) de `lipHeight`, com folga `fit` por lado |
| Recorte | atravessa a parede (ou tampa + aba) com 0,2 mm de sobra de cada lado; centro em coordenadas da placa, `z` medido a partir da face de cima da PCB |

O layout também gera avisos: furo fora da placa (suporte omitido), aba que alcançaria a PCB ou que não cabe (tampa sem aba), suporte encostado na parede (é fundido a ela), recorte que passa dos limites da face, PCB sem furos.

## Recortes são manuais

Recortes **não** são inferidos da aparência das peças. O catálogo não tem altura nem modelo 3D confiável dos conectores, e um recorte errado inutiliza a impressão. O usuário posiciona cada recorte em milímetros; se a PCB muda, o gabinete fica "desatualizado" justamente para forçar a conferência.

## Desatualizado (mesmo padrão de firmware/EDA)

- `enclosureInputsKey(project)` = hash de `project.pcb` (contorno, furos, posições na placa) + id/definição/footprint das peças. Protoboard, esquemático, fios e código não entram.
- Gerar a geometria grava essa chave e a revisão no `Enclosure` como dado derivado: sem nova revisão e sem passo de undo, como o firmware compilado.
- Se a chave atual difere, a aba mostra "Desatualizado: gerado na rev. N, a PCB mudou", **não** regenera sozinha e bloqueia a exportação até "Atualizar a partir da PCB".
- Editar parâmetros ou recortes não muda a PCB: a geometria é regenerada automaticamente (com 250 ms de espera entre edições).

## Verificado por testes

`packages/adapter-cad/test/enclosure.test.ts` (OpenCascade real, carregado no Node):

- Com dois conjuntos de parâmetros (padrão e personalizado), a caixa delimitadora do STL da base é exatamente a dimensão externa × altura calculadas a partir dos parâmetros no próprio teste; a da tampa é externa × (`wall` + `lipHeight`) com z mínimo 0 (virada para impressão).
- O volume do STL (teorema da divergência) é casca + suportes − furos-piloto, com tolerância de 0,5 % só das partes curvas (polígonos inscritos).
- **Suportes coincidem com os furos:** os vértices do topo de cada suporte são agrupados no STL e um círculo é ajustado por três pontos; o centro bate com o furo da PCB (< 0,001 mm), o raio externo com (furo + 2 × `wall`)/2 e o furo-piloto é concêntrico. Um quinto furo, menor e fora do centro, impede aprovar suportes espelhados. Teste de mutação: deslocar um suporte 0,01 mm faz o teste falhar.
- A extremidade da aba mede cavidade − 2 × `fit` (mutação de 0,05 mm detectada).
- Recortes removem exatamente área × espessura, e os cantos do recorte da frente aparecem na face externa na posição pedida.
- Avisos do layout, protocolo do worker (build → malhas + dois STLs) e cabeçalho com revisão.
- `packages/project-model/test/model.test.ts`: migração v1 → v2, ida e volta pelo JSON, comandos com validação e undo, e a chave de desatualização (PCB muda → desatualizado; protoboard, código e parâmetros do gabinete não).

Conferido no navegador: aba "Gabinete" gera em ~0,4–0,9 s, mostra base/tampa/PCB, recorte aparece na parede, mudar o tamanho da placa marca "Desatualizado" e "Atualizar a partir da PCB" volta ao normal; build de produção separa o worker (0,25 MB) e o `.wasm`.

## Limitações (não prometido)

- Só contorno retangular (a PCB só tem largura × altura). Sem cantos arredondados, nervuras, encaixe por pressão nem parafusos na tampa: a tampa encaixa só pela aba.
- As alturas das peças são desconhecidas: `headroom` é manual e não há verificação de colisão entre peças e tampa/paredes.
- PCB fixa em 1,6 mm. Recortes sempre retos e perpendiculares à face; sem recorte no fundo, chanfro ou escareado.
- Folgas e furo-piloto são valores típicos de FDM, não calibrados: imprima uma peça de teste.
- Sem STEP por enquanto (o núcleo suporta; falta UI e teste).
- A primeira geração depende do download do `.wasm` (~22 MB). A memória do OpenCascade é liberada pelo coletor do Replicad (FinalizationRegistry), sem limite explícito.
- LGPL-2.1 do OpenCascade: o `.wasm` é um arquivo separado, não modificado e carregado dinamicamente; ver pendência em `docs/licencas.md`.
