# TODO - Esqueci Senha (email alternativo)

- [x] Atualizar `api/forgot-password.ts` para aceitar `emailAccount` e `emailToReceive` e enviar o e-mail para `emailToReceive`.
- [x] Atualizar `src/store/useAuthStore.ts` para chamar `/api/forgot-password` passando ambos os emails.
- [x] Atualizar `src/pages/ForgotPassword.tsx` para adicionar 2 campos (conta e destino) e enviar para o store.
- [x] Rodar build/TypeScript para validar.

(Concluído.)




