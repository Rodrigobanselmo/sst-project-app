# Testes de sincronização de visitas

Use o Node de `.nvmrc` (Node 22) e instale as dependências com `yarn install --frozen-lockfile`.

```sh
yarn test:sync
```

O comando executa o código TypeScript real do diário, motor, planejador, gerenciador de sessão e repositories do app. O banco local dos testes é um arquivo SQLite temporário. O adaptador de produção do diário também é exercitado com WatermelonDB e seu dispatcher Node, usando `better-sqlite3` somente como dependência de desenvolvimento. O banco padrão do aplicativo e os dados do desenvolvedor não são abertos.

O harness de modelos usa os decorators legados do Babel, como o bundle Metro. Uma composição de teste fornece aos repositories um `Database` Watermelon descartável; os repositories e suas transações não são substituídos.

## O que precisa continuar passando

- Encerrar um subprocesso com `SIGKILL` após o commit e reabrir o mesmo arquivo conserva coleta, identificadores e pendências.
- Atualizar um banco com schema 44 para 45 conserva integralmente caracterizações, fotos, riscos, EPI e os campos internos de mudanças pendentes.
- Uma versão antiga sem caminho de migration conhecido recusa a inicialização sem apagar a base. Downgrade do aplicativo não faz parte dessa garantia.
- Salvar novamente ou repetir uma sincronização conserva o identificador da operação original; conteúdo novo cria uma revisão separada.
- Uma confirmação da revisão anterior não confirma uma edição feita enquanto o upload estava em andamento.
- Uma exclusão remota do pai não esconde risco filho criado ou editado durante o pull; a conferência da árvore acontece dentro da transação SQLite, mantendo o cadastro visível e a coleta exportável.
- Falha de conexão, item inválido, dependência pendente ou foto ausente não impedem o progresso dos itens independentes.
- Operações e confirmações são atômicas no SQLite; falha real de batch e exclusão com tombstone não podem esconder dados sem preservar sua operação.
- O planejador preserva campos vazios e zero, mantém atividades e não inventa respostas de EPI que o app não conhece.
- A renovação de sessão mantém `FormData`, JSON e identificadores intactos; falha de rede no refresh não encerra a sessão, e troca de usuário impede replay da coleta anterior.
- O backup conserva payloads e recibos originais sem incluir tokens da sessão.
- Todos os lotes JSON são recebidos antes da aplicação das alterações. Fotos, áudio e vídeo tentam sair do aparelho antes das validações de domínio, com até dois uploads simultâneos e confirmação independente.
- O ZIP de recuperação inclui coleta e binários em blocos limitados; arquivo ausente fica explícito no manifesto, e falta de espaço não remove os originais. Há um caso de vídeo sintético de 101 MiB.
- O backup encontra também áudio e vídeo serializados no snapshot de um cadastro excluído. A confirmação tardia de upload não ressuscita mídia removida durante o envio.

## Decisões por visita e recuperação excepcional

A suíte também usa o SQLite real para conferir as preferências da visita, seleção de até 100 alterações, exceções por item e retomada depois de reiniciar o processo. Uma correção conserva o início do período de cada item; uma condição nova exige data explícita. O plano enviado é imutável: perder a resposta e tentar novamente conserva os mesmos identificadores. Uma nova leitura do cadastro não elimina a decisão já confirmada, e uma resposta duplicada ou incompleta não importa metade do lote.

A revisão atualizada mostra o cadastro e o contexto atuais sem substituir silenciosamente a base usada na coleta. As confirmações dos itens são gravadas no mesmo batch SQLite; uma falha injetada no segundo registro não deixa o primeiro avançado. Os testes da interface extraem somente os helpers puros de seleção e datas, incluindo calendário gregoriano e limite do lote.

O controlador de atualização da visita usa `database.localStorage` real. Fechar e reabrir o mesmo SQLite conserva a última atualização completa, isolada por usuário, empresa e unidade, sem alterar o cursor do pull, os cadastros existentes ou seus campos internos de mudanças pendentes. A data de sucesso só avança depois de catálogos e caracterizações concluídos. Offline, falha de rede, resposta parcial, falha ao gravar o status ou escolha de continuar conservam a última data válida; uma primeira visita offline continua disponível sem inventar uma cópia local ou uma data de atualização.

Os testes pausam a rede tanto nos catálogos como nas caracterizações. Continuar aborta a tentativa, espera somente as gravações locais já iniciadas e impede que uma resposta tardia escreva dados ou marque a visita como atualizada. Uma nova tentativa pode concluir antes da resposta antiga sem perder sua data de sucesso. O pull real também recebe uma resposta depois de editar a caracterização e seu risco no Watermelon: a coleta e suas bases originais permanecem intactas, com as duas revisões disponíveis no diário. Outro cenário cancela o pull e comprova que nem um cadastro novo e limpo da resposta antiga é importado. Falha de rede conserva o cadastro e o cursor; fechar e reabrir o SQLite conserva as edições e pendências.

Um snapshot completo que omite um risco editado localmente permanece parcial, tanto quando a edição já estava pendente quanto quando acontece durante o GET. O risco e a operação pendente continuam visíveis, e nem o cursor nem a última atualização completa avançam.

A recuperação excepcional exercita o motor real e o `createWatermelonRecoveryStore` de produção. Simula perda de respostas na criação, upload, confirmação e conclusão, reinicia o banco local e verifica a retomada dos arquivos restantes. Arquivo ausente, alterado, ilegível ou não confirmado mantém o pacote incompleto e não impede tentar os demais. O manifesto original e os arquivos permanecem preservados; preparar outro pacote conserva o anterior. O hash incremental de um arquivo sintético de 101 MiB é conferido em blocos de 64 KiB.

O coletor bruto mantém relações, campos desconhecidos, respostas de EPI, exclusões e mídia serializada dentro da empresa, autor e visita autorizados. Metadados de áudio truncados conservam a fonte original e os caminhos recuperáveis, mas impedem afirmar que todos os arquivos foram recuperados. O armazenamento de recuperação funciona mesmo antes da primeira sincronização normal ou quando o diário está danificado.

Os identificadores canônicos devolvidos depois de dividir um período atualizam somente o `apiId` local, conservando o ID SQLite e os vínculos de EPI. A visita seguinte usa a base correta. Se o servidor já criou o novo período e a resposta foi perdida, o pull mantém a alteração pendente e o cursor anterior, sem duplicar o risco local.

Os metadados de risco, EPI e medidas de controle preservados por avaliação são lidos da base do servidor já guardada no diário SQLite. Dois usos do mesmo catálogo podem mostrar nomes, CA e severidade diferentes, sem reescrever o catálogo global do aparelho. O formulário e a lista usam esses dados somente para apresentação; novas escolhas continuam consultando o catálogo atual, e o planejador nunca devolve `catalogSnapshot` ao servidor. A suíte confere essa distinção, a reabertura do SQLite e a ausência de operações fabricadas por uma leitura ou por salvar o formulário sem mudanças.

Um pull limpo atualiza nome e CA na mesma associação EPI, conservando todas as respostas e seu identificador. Com edição local pendente, preserva a associação, a coleta e a base anterior. O hash continua incluindo o snapshot bruto do catálogo: mesmo alocar um snapshot com valores equivalentes pode exigir revisão conservadora da coleta antiga. Essa proteção não é removida para aceitar automaticamente uma base diferente.

## App e API com os dois bancos reais

Na pasta da API, as dependências também precisam estar instaladas. Com Docker em execução:

```sh
yarn test:sync:api
```

Esse comando delega para `sst-project-api/test/api/run.cjs --mobile-sync-only`. Ele sobe um PostgreSQL 17.4 novo, aplica migrations, compila a API, autentica com JWT e faz chamadas HTTP usando dados sintéticos. Inclui um cenário com o diário/motor e Watermelon SQLite reais do app falando com essa API. O runner mantém um lock sobre o build compartilhado: não execute outra suíte da API ou do navegador no mesmo checkout simultaneamente.

No macOS com PostgreSQL 17 instalado pelo Homebrew, existe uma alternativa quando Docker não estiver disponível:

```sh
yarn test:sync:api --local-postgres
```

Esse modo usa os executáveis de `/opt/homebrew/opt/postgresql@17/bin` (validado com 17.5), cria um cluster temporário novo, isolado em loopback, e encerra somente esse cluster. Não conecta a bancos previamente existentes. Senha, diretório e porta são próprios de cada execução. `better-sqlite3` é uma dependência nativa de desenvolvimento: instale com o Node 22 antes de executar os testes.

A suíte provoca perda da resposta HTTP depois do commit, erro transacional PostgreSQL, conflito de versão, falha parcial e indisponibilidade do armazenamento de arquivos. O armazenamento externo é substituído exclusivamente na fronteira por arquivos temporários; upload multipart, permissões, recibos, validação, persistência e download autenticado continuam reais. Uma condição já aceita pelo worker S-2240 é alterada pelo contrato mobile para comprovar que falta de vigência mantém a coleta recebida, sem sobrescrever o período declarado.

Inclui planos de decisão após envio aceito, duas mudanças anuais sucessivas do mesmo risco e a recuperação excepcional do app conectada à API. Nesta última, o motor e o armazenamento Watermelon reais conversam com a API autenticada, PostgreSQL e um servidor HTTP de objetos temporários: criação e confirmação perdem a resposta, a retomada conserva os IDs e o mesmo arquivo não é reenviado desnecessariamente. Os testes também transferem 101 MiB diretamente, conferem SHA-256 e tamanho, impedem conclusão parcial e validam a consulta de suporte com auditoria. Nenhum dado bruto é aplicado automaticamente aos cadastros.

Para executar somente os contratos novos, na pasta da API use `node test/api/run.cjs --mobile-plans-only --local-postgres` ou `node test/api/run.cjs --mobile-recovery-only --local-postgres`. O comando `--mobile-sync-only` inclui ambos.

Os testes não acessam certificados reais, serviços de produção ou o eSocial governamental. A fronteira SOAP usa respostas sintéticas. Os bancos e diretórios temporários são removidos ao terminar.

## Limites da evidência

Estes testes comprovam a lógica compartilhada e a persistência SQLite/Watermelon no dispatcher Node. Não representam um teste da interface React Native nem da ponte nativa iOS/Android, câmera, permissões de galeria ou encerramento do app pelo sistema operacional. Esses pontos precisam da validação em simulador/aparelho; não devem ser anunciados como cobertos por esta suíte.

O Node 22 pode imprimir um aviso experimental para `node:sqlite`, utilizado pelo adaptador genérico de testes. O aplicativo não depende desse módulo: utiliza WatermelonDB/SQLite nativo.
