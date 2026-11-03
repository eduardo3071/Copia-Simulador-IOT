# API do Simulador IoT (Fastify + arduino-cli) para hospedar fora da Vercel, p.ex. num Hugging Face Space (Docker).
# O site (apps/web) vai para a Vercel e encaminha /api para este servidor (ver apps/web/vercel.json).
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates tar gzip \
 && rm -rf /var/lib/apt/lists/* \
 # uma dependência do tscircuit vem do GitHub por ssh; no build não há chave ssh
 && git config --system --add url."https://github.com/".insteadOf "ssh://git@github.com/" \
 && git config --system --add url."https://github.com/".insteadOf "git@github.com:" \
 # o Hugging Face roda o contêiner como usuário 1000 (o "node" desta imagem)
 && mkdir -p /app && chown node:node /app

USER node
WORKDIR /app
# o dono certo já na cópia: um "chown -R" depois duplicaria a camada inteira (centenas de MB)
COPY --chown=node:node . .
RUN npm ci
# baixa o arduino-cli fixado (SHA-256 conferido) e o core arduino:avr com as bibliotecas
RUN npm run setup:arduino && mkdir -p data

ENV HOST=0.0.0.0 PORT=7860
EXPOSE 7860
CMD ["npx", "tsx", "apps/api/src/main.ts"]
