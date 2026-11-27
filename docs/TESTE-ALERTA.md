# Teste repetível: como nasce um alerta de treino

O painel do profissional não usa IA para decidir quem está em **Precisam de atenção**.
As regras ficam em [`src/lib/alerts.ts`](../src/lib/alerts.ts) e a ficha do cliente mostra,
embaixo de cada alerta, a regra usada e as datas dos registros que a atingiram.

## A regra de treino

> 2 ou mais dias, nos 7 anteriores a hoje, registrados em **Rotina** com
> **"Tinha treino planejado?"** marcado e **"Treinei"** desmarcado.

- O dia de hoje não conta (o treino ainda pode acontecer).
- **Dia sem registro não é falta.** Sem registro não dá para saber se a pessoa treinou; esses
  casos aparecem em **Sem registro recente**, não como falta.
- Marcar exercícios em Plano › Treino não altera essa regra: ela lê só o registro diário da Rotina.

As outras regras (sono abaixo de 6h na última noite, água de ontem abaixo de 50% da meta,
2 dias ou mais sem registro) seguem o mesmo formato e estão no mesmo arquivo.

## Passo a passo

Use um perfil fictício separado, não o Lucas da demo, para não mexer no roteiro da gravação.

1. **Preparar.** Crie uma conta de pessoa nova e compartilhe a rotina com a Ana
   (`demo.nutri@skyro.app`). Para ver o Pedro como responsável, compartilhe também com o Pedro
   (`demo.catalogo.3@skyro.app`); só com a Ana, o responsável aparece como "Você".
2. **Anotar o estado inicial.** Na conta da Ana, abra Clientes e anote em qual grupo o perfil está
   e quais alertas aparecem na ficha. Um perfil novo aparece em **Sem registro recente**
   ("Nenhum registro ainda"), sem alerta de treino.
3. **Registrar.** Na conta do perfil, abra Rotina e, em **dois dias anteriores a hoje** (ex.: ontem
   e anteontem; a Rotina mostra só a semana atual, então não faça o teste numa segunda-feira), marque **"Tinha treino planejado?"**, deixe **"Treinei"**
   desmarcado e salve. Registre também hoje (qualquer valor) para o perfil sair de
   "Sem registro recente".
4. **Conferir.** Volte à conta da Ana e atualize Clientes. O perfil deve estar em
   **Precisam de atenção** com:
   - **Cliente:** o nome do perfil fictício;
   - **Motivo:** "Faltou a 2 treinos na semana";
   - **Responsável:** Pedro (personal), se ele estiver na equipe do perfil.
   Na ficha, embaixo do alerta, aparecem a regra e as duas datas registradas no passo 3.
5. **Contraprova.** Volte em um dos dois dias e marque **"Treinei"**. Com só 1 falta, o alerta
   some. Um dia da semana que ficou sem registro também não conta como falta.

O mesmo cenário roda como teste automático em
[`src/lib/alerts.test.ts`](../src/lib/alerts.test.ts) ("teste repetível: perfil limpo + 2
registros de falta fazem o alerta aparecer").

## Na demo do Lucas

O alerta de treino do Lucas vem dos registros do seed (`supabase/seed/01_contas_demo.sql`, `02_catalogo_demo.sql`
e `03_pacientes_demo.sql`). No vídeo, apresente-o como um exemplo que já estava na demo.
