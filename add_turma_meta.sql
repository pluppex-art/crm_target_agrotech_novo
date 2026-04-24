-- Adiciona coluna meta na tabela turmas
-- Representa a meta de alunos por turma (não um limite máximo)

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS meta integer;
