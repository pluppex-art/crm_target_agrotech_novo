# TODO - Meta de Alunos (Produto & Turma)

## Objetivo
Transformar a configuração da meta de alunos em uma propriedade do **produto**, definida no modal de criação/edição (`UnifiedTurmaProductForm`), e exibi-la nas telas de Produtos e Turmas.

## Passos

### 1. Database Migration
- [x] Criar `add_product_student_goal.sql` - Adicionar coluna `student_goal` (integer) na tabela `products`

### 2. Services
- [x] Atualizar `src/services/productService.ts` - Adicionar `student_goal?: number` na interface `Product`
- [x] Atualizar `src/services/turmaService.ts` - Garantir que `meta` seja passado ao criar turma e buscar fallback do `products.student_goal`

### 3. Formulário (Modal)
- [x] Atualizar `src/components/forms/UnifiedTurmaProductForm.tsx` - Adicionar campo "Meta de Alunos" e enviar ao produto/turma

### 4. Tela de Produtos
- [x] Atualizar `src/pages/Products.tsx` - Adicionar coluna "Meta Alunos" na visualização em lista (tabela)
- [x] Atualizar `src/components/products/ProductCard.tsx` - Exibir meta de alunos no card

### 5. Tela de Turmas
- [x] Atualizar `src/components/turmas/TurmaCard.tsx` - Exibir "X confirmados / Y meta" e ajustar barra de progresso
- [x] Atualizar `src/components/turmas/TurmasRightPanel.tsx` - Exibir meta de alunos no painel de detalhes

### 6. Taxa de Ocupação (Dashboard)
- [x] Atualizar `src/services/turmaService.ts` - Fallback para `products.student_goal` quando `turmas.meta` é null
- [x] A função `getOccupancyData` em `src/lib/utils.ts` já busca do campo `meta` da turma, que agora é populado automaticamente

### 7. Remoção da Página Antiga
- [x] Remover import de `ManageTurmas` do `App.tsx`
- [x] Redirecionar rota `/settings/turmas` para `/products`
- [x] Remover link "Turmas" do menu de Settings (`SettingsLayout.tsx`)
