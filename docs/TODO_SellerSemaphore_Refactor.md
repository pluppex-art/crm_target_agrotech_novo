# TODO - Refatoração SellerSemaphore para Gauge Chart

## Passos

- [x] 1. Criar estado `selectedSellerName` com `useState` para controle do select admin
- [x] 2. Implementar lógica de filtro: `isAdmin` mostra select + todos os vendedores; não-admin filtra por `currentSellerName`
- [x] 3. Criar componente Gauge Chart em SVG (semicírculo com arco dinâmico via path)
- [x] 4. Adicionar texto central: `pct%` em destaque + "META ALCANÇADA"
- [x] 5. Criar container de detalhes com borda: "META (R$)" e "RECEBIDO (R$)" lado a lado separados por linha vertical
- [x] 6. Manter rodapé de status com as 3 cores de referência (Vermelho, Laranja, Verde)
- [x] 7. Preservar estado vazio e validações
- [x] 8. Testar e validar

