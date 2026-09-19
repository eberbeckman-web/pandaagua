# PandaÁgua v0.3

Primeira base implementável do PandaÁgua.

## O que já existe
- PWA básica
- Registro rápido de 200/300/500 ml ou valor personalizado
- Data e horário de cada registro
- Metas individuais
- Progresso de Juliana e Éber
- Persistência local no navegador com localStorage
- Manifest para instalação como app da web
- `schema.sql` com a estrutura inicial para Supabase

## Próxima etapa
Conectar o frontend ao Supabase:
1. criar projeto Supabase;
2. executar `schema.sql` no SQL Editor;
3. ativar autenticação;
4. substituir armazenamento local por Postgres;
5. criar convite de grupo;
6. ativar sincronização Realtime.

O banco e o Auth serão a fonte oficial dos dados. O armazenamento local poderá permanecer como cache/offline.
