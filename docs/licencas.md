# Inventário de licenças e proveniência

Inventário técnico (seção 9 do plano), **não** é parecer jurídico. Versões são as fixadas no `package-lock.json` em 19/10/2026.

## Código incorporado ao produto (dependências npm)

| Projeto | Versão | Licença | Repositório | Uso |
|---|---|---|---|---|
| avr8js | 0.21.1 | MIT | github.com/wokwi/avr8js | emulação ATmega328P |
| @wokwi/elements | 1.9.2 | MIT | github.com/wokwi/wokwi-elements | visual de Uno, LED, resistor, botão, potenciômetro |
| lit | 3.3.3 | BSD-3-Clause | github.com/lit/lit | runtime dos elementos wokwi |
| @tscircuit/core | 0.0.2178 | MIT (arquivo LICENSE) | github.com/tscircuit/core | circuito → Circuit JSON, autorroteamento |
| @tscircuit/footprinter | 0.0.442 | ISC | github.com/tscircuit/footprinter | footprints |
| @tscircuit/capacity-autorouter | 0.0.988 | MIT (arquivo LICENSE) | github.com/tscircuit/tscircuit-autorouter | roteamento |
| schematic-symbols | 0.0.248 | MIT (arquivo LICENSE) | github.com/tscircuit/schematic-symbols | símbolos |
| circuit-json | 0.0.528 | ISC | github.com/tscircuit/circuit-json | formato intermediário |
| circuit-to-svg | 0.0.450 | ISC | github.com/tscircuit/circuit-to-svg | SVG do esquemático |
| @tscircuit/pcb-viewer | 1.11.429 | MIT | github.com/tscircuit/pcb-viewer | visualização/edição da PCB |
| circuit-json-to-gerber | 0.0.113 | MIT | github.com/tscircuit/circuit-json-to-gerber | Gerber + furação |
| circuit-json-to-bom-csv | 0.0.21 | MIT (arquivo LICENSE) | github.com/tscircuit/circuit-json-to-bom-csv | BOM |
| circuit-json-to-pnp-csv | 0.0.20 | MIT (arquivo LICENSE) | github.com/tscircuit/circuit-json-to-pnp-csv | pick-and-place |
| monaco-editor | 0.57.0 | MIT | github.com/microsoft/monaco-editor | editor de código (servido localmente, sem CDN) |
| @monaco-editor/react | 4.7.0 | MIT | github.com/suren-atoyan/monaco-react | integração React |
| react / react-dom | 19.1.0 | MIT | github.com/facebook/react | UI |
| zustand | 5.0.15 | MIT | github.com/pmndrs/zustand | estado da UI |
| fastify | 5.12.7 | MIT | github.com/fastify/fastify | API |
| fflate | 0.8.3 | MIT | github.com/101arrowz/fflate | zip de fabricação |
| zod | 4.x (modelo) / 3.25 (tscircuit) | MIT | github.com/colinhacks/zod | validação |
| nanoid | 5.1.16 | MIT | github.com/ai/nanoid | IDs |
| vite | 8.3.4 | MIT | github.com/vitejs/vite | build/dev |
| replicad | 1.1.0 | MIT | github.com/sgenoud/replicad | geometria do gabinete (B-rep), exportação STL |
| replicad-opencascadejs | 1.1.0 | **LGPL-2.1-only** | github.com/sgenoud/replicad | OpenCascade em WASM; `.wasm` separado, não modificado, carregado no Web Worker do gabinete |
| three | 0.179.1 | MIT | github.com/mrdoob/three.js | visualização 3D do gabinete |
| @react-three/fiber | 9.8.1 | MIT | github.com/pmndrs/react-three-fiber | integração React do three.js |

Alguns pacotes do tscircuit não declaram `license` no `package.json`; a licença foi conferida no arquivo `LICENSE` distribuído no pacote.

## Ferramentas externas (não distribuídas com o código)

| Ferramenta | Versão | Licença | Como entra |
|---|---|---|---|
| arduino-cli | 1.5.1 | GPL-3.0 | baixado por `npm run setup:arduino` para `tools/` (fora do git), SHA-256 conferido; executado como processo separado |
| core arduino:avr (avr-gcc 7.3.0, avr-libc, núcleo Arduino) | 1.8.8 | GPL/LGPL (núcleo Arduino LGPL-2.1) | instalado pelo arduino-cli; o `.hex` gerado linka o núcleo Arduino (LGPL) — avaliar obrigações se binários forem distribuídos |

## Bibliotecas Arduino (instaladas por `npm run setup:arduino`, linkadas ao `.hex`)

| Biblioteca | Versão | Licença |
|---|---|---|
| Servo | 1.3.0 | LGPL-2.1 |
| LiquidCrystal | 1.0.7 | LGPL-2.1 |
| DHT sensor library (Adafruit) | 1.4.7 | MIT |
| Adafruit Unified Sensor | 1.1.15 | Apache-2.0 |

Firmware que usa bibliotecas LGPL e for distribuído como binário precisa permitir relinkagem; avaliar caso a plataforma distribua `.hex`.
## Ativos de componentes

- Visuais: wokwi-elements (MIT). Protoboard e capacitor: desenhos próprios deste repositório (MIT).
- Footprints: gerados pelo `@tscircuit/footprinter` (ISC). **Nenhum** ativo das bibliotecas KiCad foi importado ainda.

## Descartado

- **Velxio** (AGPLv3): incompatível com a distribuição MIT pretendida; ver ADR-001.

## Pendências

- [ ] Definir a forma de distribuição do produto (SaaS, self-hosted, desktop) e reavaliar AGPL/GPL/LGPL nesse contexto.
- [ ] Gerar inventário automático (ex.: `license-checker`) no CI para dependências transitivas.
- [ ] OpenCascade (`replicad-opencascadejs`, LGPL-2.1): ao distribuir, manter o aviso de licença, oferecer o código-fonte correspondente e permitir trocar o `.wasm` (hoje já é um arquivo à parte, carregado dinamicamente).