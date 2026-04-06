# Deploy em Vercel - Hologram Video Projector

Este guia explica como fazer deploy da aplicação em Vercel.

## Pré-requisitos

1. Conta no Vercel (https://vercel.com)
2. Git configurado e repositório criado
3. Variáveis de ambiente necessárias

## Passo 1: Preparar o Repositório

```bash
# Inicializar git (se ainda não estiver)
git init
git add .
git commit -m "Initial commit"

# Criar repositório no GitHub (ou GitLab/Bitbucket)
# Fazer push do código
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git branch -M main
git push -u origin main
```

## Passo 2: Conectar ao Vercel

1. Acesse https://vercel.com/new
2. Selecione "Import Git Repository"
3. Conecte sua conta GitHub/GitLab/Bitbucket
4. Selecione o repositório `hologram_video_projector`
5. Clique em "Import"

## Passo 3: Configurar Variáveis de Ambiente

Na página de configuração do Vercel, adicione as seguintes variáveis de ambiente:

```
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=seu-jwt-secret-aleatorio
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=seu-owner-id
OWNER_NAME=seu-nome
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-api-key
VITE_FRONTEND_FORGE_API_KEY=sua-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
```

## Passo 4: Configurar Banco de Dados

Se estiver usando um banco de dados externo (MySQL/TiDB):

1. Configure o banco de dados em um serviço como:
   - PlanetScale (MySQL)
   - Railway
   - Supabase
   - Ou qualquer outro provedor MySQL

2. Obtenha a string de conexão `DATABASE_URL`

3. Adicione a variável de ambiente no Vercel

## Passo 5: Deploy

1. Após configurar as variáveis, clique em "Deploy"
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Acesse a URL gerada pelo Vercel

## Estrutura do Projeto para Vercel

```
hologram_video_projector/
├── client/              # Frontend React
├── server/              # Backend Express
├── drizzle/             # Migrations do banco de dados
├── dist/                # Build output (gerado)
├── vercel.json          # Configuração do Vercel
├── .vercelignore        # Arquivos a ignorar
├── package.json         # Dependências
└── vite.config.ts       # Configuração do Vite
```

## Troubleshooting

### Build falha com erro de dependências

```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro de banco de dados

- Verifique se a `DATABASE_URL` está correta
- Certifique-se de que o banco de dados está acessível da internet
- Verifique firewall/whitelist de IPs

### Erro de autenticação OAuth

- Verifique se `VITE_APP_ID` e `OAUTH_SERVER_URL` estão corretos
- Certifique-se de que os URLs de callback estão registrados no Manus

## Monitoramento

Após o deploy:

1. Acesse o dashboard do Vercel
2. Monitore logs em "Deployments" → "Logs"
3. Configure alertas de erro em "Settings" → "Monitoring"

## Atualizações Futuras

Para fazer deploy de novas versões:

```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

O Vercel fará deploy automaticamente quando detectar mudanças no branch main.

## Suporte

Para mais informações sobre deploy em Vercel, consulte:
- https://vercel.com/docs
- https://vercel.com/docs/concepts/deployments/overview
