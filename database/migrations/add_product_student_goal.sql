-- Adiciona coluna student_goal na tabela products
-- Representa a meta de alunos por turma definida no produto

ALTER TABLE products ADD COLUMN IF NOT EXISTS student_goal integer;

