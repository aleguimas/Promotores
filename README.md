# GM PROMO - Marketplace de Promotores

Sistema para encontrar e contratar promotores para lojas.

## Configuração Inicial

### 1. Instalar dependências

\`\`\`bash
npm install
# ou
yarn install
\`\`\`

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e `.env.local`:

\`\`\`bash
cp .env.example .env
cp .env.example .env.local
\`\`\`

Edite os arquivos `.env` e `.env.local` com suas configurações:

\`\`\`
# Banco de dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco?schema=public"

# Autenticação
JWT_SECRET="sua_chave_secreta_aqui"
\`\`\`

### 3. Configurar o banco de dados

Execute o script para criar as tabelas necessárias:

\`\`\`bash
npm run setup-db
# ou
yarn setup-db
\`\`\`

### 4. Gerar o cliente Prisma

\`\`\`bash
npx prisma generate
\`\`\`

### 5. Iniciar o servidor de desenvolvimento

\`\`\`bash
npm run dev
# ou
yarn dev
\`\`\`

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## Dependências do Projeto

### Dependências Principais
- `next`: ^14.0.0 - Framework React para produção
- `react`: ^18.2.0 - Biblioteca JavaScript para interfaces de usuário
- `react-dom`: ^18.2.0 - Renderizador do React para o DOM
- `typescript`: ^5.0.0 - Superset tipado de JavaScript

### Banco de Dados
- `@prisma/client`: ^5.0.0 - Cliente Prisma para acesso ao banco de dados
- `prisma`: ^5.0.0 - ORM para TypeScript e Node.js

### UI e Estilização
- `tailwindcss`: ^3.3.0 - Framework CSS utilitário
- `postcss`: ^8.4.0 - Ferramenta para transformar CSS com plugins
- `autoprefixer`: ^10.4.0 - Plugin PostCSS para adicionar prefixos de vendor
- `class-variance-authority`: ^0.7.0 - Utilitário para criar variantes de componentes
- `clsx`: ^2.0.0 - Utilitário para construir nomes de classes condicionalmente
- `tailwind-merge`: ^2.0.0 - Utilitário para mesclar classes Tailwind

### Componentes UI
- `@radix-ui/react-dialog`: ^1.0.0 - Componente de diálogo acessível
- `@radix-ui/react-dropdown-menu`: ^2.0.0 - Componente de menu dropdown
- `@radix-ui/react-slot`: ^1.0.0 - Componente para renderização polimórfica
- `@radix-ui/react-tabs`: ^1.0.0 - Componente de abas
- `@radix-ui/react-toast`: ^1.0.0 - Componente de notificação toast
- `lucide-react`: ^0.300.0 - Ícones para React

### Formulários e Validação
- `react-hook-form`: ^7.49.0 - Biblioteca para gerenciamento de formulários
- `zod`: ^3.22.0 - Biblioteca de validação de esquema TypeScript
- `@hookform/resolvers`: ^3.3.0 - Resolvedores para React Hook Form

### Autenticação e Segurança
- `bcryptjs`: ^2.4.3 - Biblioteca para hash de senhas
- `jsonwebtoken`: ^9.0.0 - Implementação de JSON Web Tokens
- `@types/bcryptjs`: ^2.4.0 - Tipos TypeScript para bcryptjs
- `@types/jsonwebtoken`: ^9.0.0 - Tipos TypeScript para jsonwebtoken

### Utilitários
- `date-fns`: ^2.30.0 - Biblioteca para manipulação de datas
- `uuid`: ^9.0.0 - Geração de UUIDs
- `@types/uuid`: ^9.0.0 - Tipos TypeScript para uuid

## Scripts Disponíveis

- `dev`: Inicia o servidor de desenvolvimento
- `build`: Compila o aplicativo para produção
- `start`: Inicia o servidor de produção
- `lint`: Executa o linter para verificar problemas de código
- `setup-db`: Configura o banco de dados inicial
- `seed-db`: Popula o banco de dados com dados iniciais

## Funcionalidades

- Busca de promotores por localização
- Filtros por bandeira e loja
- Seleção de dias e horários para contratação
- Carrinho de compras
- Sistema de autenticação de usuários
- Perfil do usuário com gerenciamento de dados pessoais
- Histórico de pedidos
- Checkout e finalização de pedidos

## Tecnologias

- Next.js
- React
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- shadcn/ui

## Estrutura de Diretórios

- `/app`: Rotas e páginas da aplicação (App Router do Next.js)
- `/components`: Componentes React reutilizáveis
- `/lib`: Funções utilitárias e lógica de negócios
- `/prisma`: Schema do Prisma e migrações
- `/public`: Arquivos estáticos
- `/scripts`: Scripts para configuração e manutenção
- `/styles`: Estilos globais e configurações do Tailwind
- `/types`: Definições de tipos TypeScript

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
