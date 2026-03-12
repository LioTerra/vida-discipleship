

# Ministério Vida — Plataforma de Discipulado Cristão

## Visão Geral
Uma plataforma web completa para discipulado e ensino de uma igreja no Brasil. Tema dark minimalista com identidade visual em teal (#0d9488). Toda a interface em Português Brasileiro.

---

## Fase 1: Configuração Supabase + Identidade Visual

### Conectar Supabase
- Conectar o projeto ao Supabase (Lovable Cloud ou projeto externo)
- Aplicar o schema completo via migrações: profiles, mentorships, cursos, modulos, aulas, progresso, avaliacoes
- Roles ficam na tabela profiles com RLS cuidadosa para impedir que usuários alterem seu próprio `role` ou status `ativo`
- Trigger automático para criar perfil no signup (com `ativo = false`)

### Tema Visual
- Background #0a0a0a, cards #111111, bordas #1f1f1f
- Cor de destaque: teal-600 (#0d9488)
- Tipografia limpa, texto branco sobre fundo escuro
- Estética minimalista em todas as páginas

---

## Fase 2: Sistema de Autenticação

### Página de Login (`/login`)
- Card centralizado sobre fundo escuro
- Logo: letra "V" grande em teal, "Ministério Vida" abaixo, subtítulo "Transformando Famílias, Formando Discípulos, Alcançando Nações."
- Campos de email e senha, botão teal
- Link para registro

### Página de Registro (`/registro`)
- Campos: nome, email, telefone, senha
- Após envio: mensagem "Cadastro realizado! Aguarde a liberação do seu acesso."
- Conta criada com `ativo = false` — requer ativação do admin

### Redirecionamento por role
- Após login, checar `ativo` — se falso, mostrar mensagem de acesso pendente
- Se ativo, redirecionar para `/app/inicio`

---

## Fase 3: Layout Protegido + Navegação

### Layout `/app` (rota protegida)
- Redireciona para `/login` se não autenticado
- Sidebar colapsável (responsiva em mobile)
- Header com nome do usuário e botão de logout

### Menu lateral por role
- **Usuário**: Início, Ensino, Discipulado
- **Staff**: Início, Ensino, Discipulado, Meus Discípulos
- **Admin**: Início, Ensino, Discipulado, Usuários, Configurações

---

## Fase 4: Páginas Principais

### Dashboard — Início (`/app/inicio`)
- Mensagem de boas-vindas com nome do usuário
- 3 cards de estatísticas:
  - Aulas concluídas
  - Semanas de discipulado
  - Próxima avaliação

### Gestão de Usuários (`/app/usuarios`) — Apenas Admin
- Tabela com todos os usuários: nome, email, role, status ativo
- Toggle para ativar/desativar contas
- Dropdown para alterar role do usuário

### Ensino (`/app/ensino`) — Página inicial
- Listagem de cursos disponíveis em cards
- Cada curso mostra título, descrição e progresso do usuário
- Ao clicar, abre os módulos e aulas do curso
- Marcar aulas como concluídas (salva no `progresso`)

### Discipulado (`/app/discipulado`)
- Visualização do mentor/mentorado atribuído
- Histórico de avaliações semanais
- Formulário para nova avaliação (5 critérios com nota 1-5 + observações)

### Meus Discípulos (`/app/meus-discipulos`) — Staff
- Lista dos mentorados atribuídos ao mentor
- Ver progresso e avaliações de cada mentorado

---

## Fase 5: Segurança (RLS)

- **profiles**: Usuário lê/atualiza apenas seus dados (sem alterar role/ativo); admin lê todos
- **progresso**: Usuário lê/escreve o próprio; staff/admin lê todos
- **avaliacoes**: Participantes da mentoria leem/escrevem; admin lê todos
- **cursos/modulos/aulas**: Todos autenticados leem; apenas staff/admin escrevem
- **mentorships**: Participantes leem os seus; staff/admin leem todos

