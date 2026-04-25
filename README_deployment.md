# Guia de Implantação Nexus Finance (Vercel)

Esta aplicação foi preparada para ser implantada na Vercel com banco de dados PostgreSQL (recomenda-se Supabase).

## Passos para Implantação

1.  **Configurar Banco de Dados:**
    -   Crie um projeto no Supabase ou use qualquer banco PostgreSQL.
    -   Obtenha a `DATABASE_URL` (Direct Connection ou Transaction Pooler).
    -   Se usar Supabase, use o **Transaction Pooler (Port 6543)** para `DATABASE_URL` e a **Direct Connection (Port 5432)** para `DIRECT_URL`.

2.  **Configurar Variáveis de Ambiente na Vercel:**
    -   No Dashboard da Vercel, vá em **Settings > Environment Variables**.
    -   Adicione as seguintes variáveis:
        -   `DATABASE_URL`: A string de conexão do seu banco.
        -   `DIRECT_URL`: A string de conexão direta do seu banco (para migrations).
        -   `JWT_SECRET`: Uma string longa e aleatória (mínimo 64 caracteres).
        -   `NODE_ENV`: Defina como `production`.
        -   `GEMINI_API_KEY`: Sua chave da API do Google Gemini (se for usar IA).

3.  **Conexão Vercel + Repositório:**
    -   Basta conectar seu repositório GitHub à Vercel.
    -   A Vercel detectará automaticamente as configurações no `vercel.json` e executará o build.

## Estrutura do Projeto
-   `/api/server.ts`: Wrapper para as Serverless Functions da Vercel.
-   `/server.ts`: Código unificado da API Express (usado tanto em dev quanto em prod).
-   `/dist`: Pasta onde o Vite gera os arquivos estáticos do frontend.

## Comandos Úteis
-   `npm run build`: Gera o cliente Prisma e o build do frontend.
-   `npx prisma db push`: Sincroniza o schema com o banco de dados (execute localmente antes do primeiro deploy se necessário).
