# Deploy: site na Vercel, API no Hugging Face Space

O site (`apps/web`) é estático e vai para a Vercel. A API (`apps/api`) precisa de servidor com disco e do `arduino-cli`, então roda num Hugging Face Space (Docker, plano gratuito). A Vercel encaminha `/api/*` para o Space (`apps/web/vercel.json`), e por isso não há CORS a configurar.

## Atenção: Space com Docker exige o plano PRO
Em novembro de 2026 o Hugging Face pede o plano **PRO (cerca de US$ 9/mês)** para criar Space com SDK Docker, mesmo no hardware CPU basic. A seção 1 abaixo só vale com o PRO. Sem ele, veja as alternativas:

- **Google Cloud Run:** usa o mesmo `Dockerfile` (porta 7860, 2 GiB de memória). Pede cartão, mas o uso pequeno cabe na cota gratuita.
- **Túnel do seu PC:** `docker run -p 7860:7860 simiot-api` e um túnel (por exemplo Cloudflare Tunnel) com o endereço no `vercel.json`. Grátis e sem cartão, mas só funciona com o PC ligado.
- **Hospedagem gratuita de 512 MB (Render etc.):** não serve. Medido no contêiner: ~700 MiB parado e até ~950 MiB gerando esquemático e PCB.

## Limites do plano gratuito
- O disco do Space **não é persistente**: os projetos salvos na API (SQLite) somem quando o Space reinicia.
- O Space gratuito dorme quando fica sem uso; a primeira requisição depois disso demora.
- A Vercel Hobby é para uso não comercial.
- Esta cópia do simulador é mais antiga que o `simulador-iot-eight.vercel.app` (sem login do GitHub, ESP32, produto 3D).

## 1. API no Hugging Face
1. Crie uma conta em huggingface.co e um token em Settings → Access Tokens (permissão de escrita).
2. Em New Space: nome `simulador-iot-api`, SDK **Docker** (Blank), hardware **CPU basic (free)**, visibilidade **Public**.
3. No repositório, crie um branch só para o Space e troque o README pelo que tem o cabeçalho do Hugging Face:

```bash
git checkout -b hf-space
cp deploy/huggingface/README.md README.md
git add README.md
git commit -m "README do Hugging Face Space"
git remote add hf https://huggingface.co/spaces/SEU-USUARIO/simulador-iot-api
git push hf hf-space:main
```

Na senha, use o token. O build leva vários minutos (instala as dependências e baixa o `arduino-cli`).

4. Teste: abra `https://SEU-USUARIO-simulador-iot-api.hf.space/api/health`. Deve responder `{"ok":true,...}` com `available: true` na toolchain.

## 2. Site na Vercel
1. Edite `apps/web/vercel.json` e troque `SEU-USUARIO-NOME-DO-SPACE` pelo endereço do Space (por exemplo `joao-simulador-iot-api`).
2. Faça commit e push no GitHub (no branch `main`, não no `hf-space`).
3. Na Vercel, **Import single project** no card **web**. Root Directory `apps/web`, Framework Vite, Output `dist`, Node 22 ou mais novo, sem variáveis de ambiente.
4. Depois do deploy, abra o site e confira que os exemplos carregam (eles vêm de `/api/fixtures`).

## Problemas comuns
- Exemplos não carregam: o `destination` do `vercel.json` está errado ou o Space está dormindo.
- Compilar código dá erro: confira `/api/health`; se `available` for `false`, o `setup:arduino` falhou no build do Space (veja os logs).

## Atualizar a API depois de mudar o código ou os exemplos
A imagem copia o repositório inteiro, então mudar o catálogo de peças, o laboratório ou os `fixtures/` exige uma imagem nova (o `Dockerfile` copia já com o dono certo, o que deixa o build bem mais rápido):

```bash
docker build -t simiot-api .
docker rm -f simiot-api
docker run -d --name simiot-api --restart unless-stopped -p 7860:7860 simiot-api
```

Só para um exemplo novo, sem o catálogo, basta `docker cp fixtures/NOME simiot-api:/app/fixtures/` com o contêiner rodando. O esquemático e a PCB desse exemplo precisam da imagem nova se ele usa peças que a imagem antiga não conhece.
