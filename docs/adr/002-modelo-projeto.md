# ADR-002 — Modelo do projeto

- **Status:** aceita
- **Data:** 19/10/2026
- **Código:** `packages/project-model`, `packages/netlist`, `packages/component-catalog`

## Decisão

Um documento JSON versionado (`schemaVersion: 2` desde a fase 5) validado por zod, com **conectividade separada do posicionamento**:

| Parte | Conteúdo | Unidade |
|---|---|---|
| `components[]` | id estável, `definitionId` + `definitionVersion`, refDes, parâmetros, footprint escolhido | — |
| `connections[]` | pares de terminais `{componentId, pinId}`; `kind: "wire"` (jumper) ou `"contact"` (perna encaixada num furo) | — |
| `breadboard` | posições e cores/trajetos dos fios | px CSS a 96 dpi (0,1 in = 9,6 px) |
| `schematic` | posições opcionais (ausente = auto-layout) | unidade do esquemático |
| `pcb` | contorno, 2 camadas, posições, furos de montagem | mm, origem no centro, +Y para cima |
| `firmware` | FQBN, core fixado, arquivos, bibliotecas fixadas | — |
| `enclosure` | gabinete: parâmetros, recortes manuais, chave da PCB usada (ou `null`); ver ADR-004 | mm |
| `artifacts` | resultados derivados com `inputsKey` e `sourceRevision` | — |

## Regras (seção 5.2 do plano) e onde estão implementadas

1. **Conectividade ≠ visual:** mover peça não altera `connections`; o encaixe na protoboard vira `contact` explícito (regra única em `breadboardContacts`, usada pelo editor e pelas fixtures).
2. **IDs estáveis** com prefixo (`prj_`, `cmp_`, `conn_`), gerados uma vez. Nets **não** são persistidas: são derivadas (`buildNetlist`) com nomes determinísticos (GND, 5V, D13, N1…), testados contra a ordem das conexões.
3. **Unidades explícitas** em cada layout (campo `unit` literal).
4. **Toda exportação carrega a revisão:** cada comando incrementa `revision`; undo/redo **também** avançam o contador (uma revisão = um estado). Gerbers, BOM, PnP, LEIA-ME e o nome do zip trazem a revisão.
5. **Alterar o circuito invalida, não sobrescreve:** firmware e EDA guardam `inputsKey` (hash só das entradas relevantes). Mover peça na protoboard não invalida o esquemático; editar o código não invalida a PCB. A UI mostra "desatualizado" e só regenera quando pedido.
6. **Conversão em uma direção** (projeto → Circuit JSON). Edições na PCB voltam como `moveComponent` explícito, nunca por sincronização bidirecional.
7. **Capacidades no catálogo:** `drawable`, `simulable`, `fabricable`, `model3d`; peça não fabricável fica fora da PCB com aviso.
8. **Versões fixas:** core `arduino:avr@1.8.8` validado pelo compilador; dependências npm com versão exata (`.npmrc save-exact`).
9. **Credenciais:** nenhum campo de segredo no modelo (IoT na fase 6 usará referências).
10. **Proveniência:** cada definição do catálogo registra origem do visual/footprint e licença.

## Persistência

`node:sqlite` (embutido no Node 24, sem dependência nativa) guarda o documento; ao salvar, uma revisão **mais antiga** que a armazenada é rejeitada com 409 (duas abas no mesmo projeto). Binários de firmware ficam em `data/compile-cache/<sha256>.hex`. Banco relacional dedicado + armazenamento de objetos ficam para quando houver múltiplos usuários.

## Migrações

`migrate()` aceita qualquer documento armazenado/importado, recusa versões futuras e aplica `migrations[n]` (n → n+1). Primeira migração: 1 → 2 acrescenta `enclosure: null` (ADR-004), testada com um documento v1 em `packages/project-model/test/model.test.ts`.