# Roadmap: suporte e luz do pregoscópio

Atualizado em 02/11/2026. Legenda: ✅ feito · 🟡 feito de forma provisória · ⏳ falta · ❓ depende de decisão.

## Decisões já tomadas
- Pregoscópio impresso à parte; o foco é o suporte e a luz.
- 1 LED. Versão 1 a **pilha**; versão 2 com **fonte e brilho ajustável**.
- Mesa da impressora de 30 cm.
- Lâmina padrão 76 × 26 mm (assumida, ainda não medida).
- O repositório do João (`pregoscopio-demo`) é um demo de teste com tubo genérico; não é o projeto final.

## Fase 0 — Alinhamento
- ✅ Medidas do pregoscópio por paquímetro e fotos (tubo 33,5 × 115 mm, tubo interno 22,5 mm com curso de 40 mm, objetiva 20 mm saindo 35 mm).
- ✅ Quantidade de LEDs e versões (pilha, depois fonte).
- ✅ Tamanho da mesa.
- ✅ Leitura do repositório do João.
- ⏳ Tipo de pilha e tensão (9 V, 2×AA, 18650?). Define o resistor e o compartimento.
- ⏳ Medir a lâmina real (largura, espessura) e o interruptor real (furo).

## Fase 1 — Elétrica da versão 1 (pilha)
- 🟡 Circuito provisório no simulador (Uno 5 V → 220 Ω → LED), com PCB e Gerbers gerados. Não serve como versão final: usa o Uno como fonte.
- ⏳ Circuito real: pilha → interruptor → resistor → LED, sem Arduino. A cópia local do simulador não tem bateria; o site tem o exemplo "pilha e LEDs".
- ⏳ Calcular o resistor para a tensão da pilha e a corrente do LED (referência do João: 100 Ω e 20 mA em 5 V).
- ❓ Decidir se a versão 1 precisa de PCB. Para um LED, interruptor e resistor, fiação soldada pode bastar.
- ⏳ Se houver PCB: conferir os Gerbers no KiCad GerbView antes de fabricar.

## Fase 2 — Mecânica da versão 1
- ✅ Suporte em C (caixa luminosa, coluna, braço), abraçadeira do tubo e tampa de fundo, gerados por código.
- ✅ Dimensões reais do pregoscópio, canal para a lâmina e janela do LED.
- ✅ Testes automáticos (7) e orientação de impressão para mesa de 30 cm.
- ⏳ Compartimento e contatos da pilha dentro da caixa.
- ⏳ Porta-LED e difusor sob a janela.
- ⏳ Recorte do interruptor com a medida real.
- ⏳ Opcional: esvaziar a coluna para economizar material.

## Fase 3 — Teste físico da versão 1
- ⏳ Imprimir só a abraçadeira e ajustar as folgas (furo de 33,7 mm, abertura de 0,6 mm).
- ⏳ Imprimir o suporte completo e encaixar o pregoscópio real.
- ⏳ Conferir a altura e o foco (`innerPull`, `workingDistance`, `focusOffset`) e regenerar os STLs.
- ⏳ Conferir a iluminação da lâmina.

## Fase 4 — Versão 2 (fonte e brilho ajustável)
- ⏳ Definir a fonte (USB 5 V ou adaptador) e como ajustar o brilho (potenciômetro com PWM, driver, microcontrolador).
- ⏳ Circuito no simulador, firmware se houver microcontrolador, PCB e Gerbers conferidos.
- ⏳ Nova caixa: recortes para o conector e o botão de brilho.
- ⏳ Teste físico da versão 2.

## Fase 5 — Pacote de montagem
- 🟡 Pasta `fabricacao/` com STLs do suporte, circuito provisório e Gerbers.
- ⏳ Reorganizar em `pcb/`, `mecanica/`, `firmware/` e `GUIA-DE-MONTAGEM.md` (lista de materiais, parafusos M3, ordem de montagem, orientação de impressão, limitações e o que foi testado).
- ⏳ Nomear os arquivos por revisão.

## Fase 6 — Fechamento
- ⏳ Revisão final com o João, versionamento no GitHub e entrega do pacote.
