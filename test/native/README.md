# Testes nativos com API e PostgreSQL reais

Esta suíte abre o aplicativo compilado no iOS Simulator ou no Android Emulator e
executa os fluxos pela interface com Maestro **2.11.0**. A CLI é uma ferramenta
externa de desenvolvimento; não é uma dependência de runtime do aplicativo.

O sucesso de um build não significa que os fluxos passaram. Os resultados de uma
execução são os relatórios do Maestro, as capturas, os vídeos e as verificações do
servidor geradas pelo runner. Este documento descreve como reproduzi-los, sem
declarar aprovação de uma execução específica.

## Preparar as ferramentas

- Node **22**, selecionado com `nvm use` nas pastas da API e do app, e as dependências
  dos dois projetos instaladas pelo lockfile. A suíte SQLite usa módulos nativos;
  não execute com outro major de Node.
- Maestro CLI **2.11.0** instalado separadamente. Confira com `maestro --version`.
  Se estiver fora do `PATH`, use `--maestro /caminho/absoluto/bin/maestro` ou a
  variável `MAESTRO_BIN`.
- Xcode, runtime do iOS Simulator e CocoaPods para iOS; Android SDK, platform-tools,
  emulador **arm64** e JDK **17** para Android. `JAVA_HOME` pode selecionar o JDK.
- Projetos nativos `ios/` e `android/` preparados pelo fluxo Expo do repositório.
  O iOS precisa de `SimpleSST.xcworkspace` e `Pods/Manifest.lock`. Os helpers não
  executam prebuild nem instalam Pods; não use `prebuild --clean` sobre alterações
  locais que precise preservar.
- PostgreSQL 17 em `/opt/homebrew/opt/postgresql@17/bin` para o modo local abaixo.
  O runner da API também admite o modo Docker ao omitir `--local-postgres`.

Use simuladores/emuladores dedicados. O primeiro fluxo limpa os dados do app no
dispositivo escolhido. Os helpers recusam iPhone físico e IDs de Android que não
sejam de emulador.

## 1. Iniciar o backend descartável

Na pasta `sst-project-api`, em um terminal separado:

```sh
nvm use
node test/api/run.cjs --native-mobile --local-postgres
```

Espere a linha `NATIVE_FIXTURE_READY`, que informa o caminho absoluto de
`native/fixture.json`. Mantenha o processo aberto durante os testes. Ele cria um
cluster PostgreSQL exclusivo, aplica as migrations, compila a API e carrega dados
sintéticos. Não recebe URL de banco da equipe e não usa certificados, eSocial
oficial ou AWS reais. O armazenamento privado é um servidor HTTPS local que recebe
e verifica os bytes.

O manifesto tem `contract: "simplesst.native.e2e"`, `version: 1` e
`disposable: true`. Contém as credenciais sintéticas e o token temporário dos
controles de falha; fica nos artefatos ignorados, fora do Git. O tenant principal
não tem envio aceito. `protectedFixture` identifica outro tenant, com uma declaração
aceita por transporte SOAP sintético, para cenários de riscos já enviados. Não
substitua esses dados por credenciais ou certificados reais.

A API usa `127.0.0.1:39871` por padrão; `E2E_NATIVE_API_PORT` altera somente a porta
do runner. O manifesto também informa a porta aleatória do armazenamento. O runner
segura o lock do build/Prisma até encerrar: não rode outra suíte da API nesse checkout
ao mesmo tempo.

O armazenamento usa uma CA pública de teste nova a cada execução. O manifesto
informa `storageURL` em HTTPS, `storageCaPath` (certificado PEM da CA),
`storageCertificatePath` (certificado do servidor) e `storageCaSha256`. Os
certificados têm validade curta e SAN para `127.0.0.1` e `localhost`. As chaves
usadas para gerar a cadeia não ficam nos artefatos; a chave do servidor permanece
apenas na memória do processo de teste. O app continua exigindo HTTPS e validando
certificados: não existe exceção no JavaScript de produção.

Opcionalmente, antes da navegação, execute na API:

```sh
node test/native/fixture-smoke.cjs /caminho/absoluto/native/fixture.json
```

Essa prova autentica os dois tenants, consulta os vínculos, edita e restaura uma
descrição, provoca uma falha do download e verifica a exigência de decisão para um
risco aceito. O resultado é `native/fixture-smoke.json`; continua sendo uma prova
HTTP, sem navegação nativa.

Para conferir também o caminho HTTP → SQLite, execute **na pasta do app**:

```sh
node test/native/pull-smoke.cjs /caminho/absoluto/native/fixture.json
```

Essa prova autentica os dois perfis e faz somente consultas aos cadastros. Em um
SQLite temporário por perfil, executa o catálogo repetido, o pull, a abertura e o
salvamento inalterado do formulário, a reabertura do banco e a exportação bruta.
Confere as respostas reais do EPI na tabela de vínculos, inclusive `false`, além
da identidade numérica do empregado da API convertida para ID textual no app.
Exige zero alterações artificiais no journal. O resultado fica em
`native/http-sqlite-pull-smoke.json`; os bancos temporários são removidos. Execute
com os controles de falha em modo normal e sem outra fase nativa em andamento.
Isso complementa as regressões de `npm run test:sync`, sem substituir os testes
da interface nos dois sistemas.

## 2. Compilar e instalar o app de teste

Na pasta `sst-project-app`, selecione Node 22 e defina caminhos absolutos da sua
execução. Os exemplos usam variáveis específicas da tarefa:

```sh
nvm use
native_fixture="/caminho/absoluto/native/fixture.json"
native_evidence="/caminho/absoluto/evidencias-nativas"
```

Os helpers usam `EXPO_PUBLIC_API_URL` explicitamente para o backend local e
`EXPO_NO_DOTENV=1` para o bundle de teste. Não é necessário modificar o `.env`
normal. O JavaScript fica embutido no binário para reiniciar o app sem Metro.

### iOS Simulator

Inicie um simulador dedicado e obtenha o UUID com
`xcrun simctl list devices available`. Depois:

```sh
ios_device_uuid="UUID-DO-SIMULADOR"
node test/native/build-ios.cjs --fixture "$native_fixture" \
  --device "$ios_device_uuid" --output "$native_evidence/ios-build"
xcrun simctl install "$ios_device_uuid" \
  "$native_evidence/ios-build/DerivedData/Build/Products/Debug-iphonesimulator/SimpleSST.app"
xcrun simctl launch "$ios_device_uuid" com.simplesst.app
```

O helper compila `Debug` para simulator, sem assinatura de distribuição, com bundle
embutido e JavaScript sem modo de desenvolvimento. Valida a presença do bundle e,
quando aplicável, do runtime React. As alterações temporárias em `AppDelegate.swift`
e `.xcode.env.local` são restauradas ao terminar. O helper também admite
`--api-url http://127.0.0.1:39871`, mas o manifesto é a opção indicada para manter
build e execução vinculados ao mesmo ambiente.

Quando a fixture informa `storageCaPath`, o helper confia nessa CA somente no
keychain do simulador dedicado, usando `xcrun simctl keychain <UUID> add-root-cert`.
O simulador precisa estar iniciado. Se o binário já estiver preparado para a mesma
API e precisar apenas confiar em uma CA nova, o comando equivalente é:

```sh
native_storage_ca="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).storageCaPath' "$native_fixture")"
xcrun simctl keychain "$ios_device_uuid" add-root-cert "$native_storage_ca"
```

Não importe essa CA no keychain do Mac nem em aparelho físico. Ela é exclusiva do
simulador de teste e não altera a confiança usada pelo app distribuído.

### Android Emulator

Inicie um emulador arm64 dedicado, aguarde terminar o boot e confira o ID com
`adb devices`:

```sh
android_device_id="emulator-5554"
node test/native/build-android.cjs --fixture "$native_fixture" \
  --device "$android_device_id" --output "$native_evidence/android-build"
```

O helper compila o APK standalone com chave debug, configura `adb reverse` para as
portas da API e do armazenamento, instala e abre o app. Admite `--sdk` para um SDK
fora do caminho padrão, `--build-only` para não instalar e `--no-launch` para
instalar sem abrir. Os ajustes temporários de Gradle, `local.properties` e manifesto
HTTP local são restaurados depois do build. Nenhuma publicação é realizada.

O helper inclui a CA pública da fixture em recursos temporários do APK de teste e
aplica `network_security_config` apenas a `127.0.0.1` e `localhost`. Os recursos e o
manifesto nativo são restaurados depois do build. Isso não requer root no emulador
nem instalar uma CA no Android inteiro; não muda o runtime JavaScript nem a
configuração do app de produção. O mecanismo usa os
[trust anchors por domínio do Android](https://developer.android.com/privacy-and-security/security-config#CustomTrust).

O APK desse helper usa loopback com `adb reverse`. Embora o manifesto também
informe `10.0.2.2`, não misture os modos de conexão. Se reiniciar o runner da API,
o manifesto, a CA e a porta de armazenamento mudam: use a nova fixture e recompile
o APK pelo helper para incluir a CA nova e refazer o reverse. No iOS, confie na CA
nova no simulador e reinicie a sequência a partir da fase 01 com a fixture nova.

## 3. Rodar as fases pela interface

Ainda na pasta do app:

```sh
node test/native/run.cjs --fixture "$native_fixture" --platform ios \
  --profile normal --device "$ios_device_uuid"
node test/native/run.cjs --fixture "$native_fixture" --platform android \
  --profile normal --device "$android_device_id"
node test/native/run.cjs --fixture "$native_fixture" --platform ios \
  --profile protected --device "$ios_device_uuid"
node test/native/run.cjs --fixture "$native_fixture" --platform android \
  --profile protected --device "$android_device_id"
```

Execute as plataformas **em sequência**. Os controles de falha do backend são
compartilhados e uma execução paralela pode mudar a conectividade simulada da outra.

`--profile normal` é o padrão. Usa as credenciais do tenant sem envio e executa
01 → 02 → 03 → 04 → 05 → 06. `--profile protected` usa `protectedFixture` e executa
01 → 02 → 07 → 08 no tenant com envio aceito. Ao iniciar a fase 01 de outro perfil,
o app é limpo e o login desse perfil é feito pela interface.

Os oito arquivos de fluxo cobrem:

1. `01-login-download`: login normal, escolha de empresa/unidade e download da visita.
2. `02-default-date`: data e motivo comuns preservados depois de fechar e reabrir o app.
3. `03-continue-without-refresh`: download lento, confirmação para continuar com dados
   locais e edição da coleta.
4. `04-restart-unavailable`: edição local preservada após reinício com indisponibilidade.
5. `05-sync-pending`: envio da edição, seguido de conferência do valor no banco real.
6. `06-recovery`: uma nova edição não consegue sincronizar; a recuperação excepcional
   recebe a visita inteira, mantendo o cadastro aplicado anterior.
7. `07-protected-risks`: edita a probabilidade de dois riscos já declarados, tenta
   sincronizar e confere que as alterações aguardam decisão, sem mudar os períodos.
8. `08-batch-exception`: seleciona as duas alterações, usa a data comum da visita,
   define uma exceção para o segundo risco e confirma a sincronização; os períodos
   novos e anteriores são conferidos no banco.

A presença desses arquivos não significa que a execução nativa passou. Consulte
os resultados de cada fase e perfil. As datas comuns e de exceção são calculadas
pela suíte a partir das vigências existentes e guardadas no contexto da execução.

Cada execução do runner da **API** tem um banco novo. As fases de uma suíte usam esse
mesmo banco e preservam o SQLite entre reinícios: isso é necessário para comprovar
retomada e persistência. Não é criado um banco por tela ou por comando Maestro. As
duas plataformas podem usar o mesmo backend em sequência; para começar com servidor
zerado entre plataformas, encerre e inicie outro runner e passe o manifesto novo.

Para investigar uma fase, use o mesmo `--output` da fase inicial:

```sh
node test/native/run.cjs --fixture "$native_fixture" --platform ios \
  --profile normal --device "$ios_device_uuid" \
  --flow 01-login-download
node test/native/run.cjs --fixture "$native_fixture" --platform ios \
  --profile normal --device "$ios_device_uuid" \
  --flow 02-default-date
```

As fases seguintes dependem do estado das anteriores. `run-context.json` conserva
os nomes únicos dos rascunhos, as datas, os períodos protegidos iniciais e a fixture
usada; não troque banco, plataforma, perfil ou contexto no meio da sequência. Uma
fase protegida exige `--profile protected` e suas fases anteriores, incluindo 01 e
02. Rerodar a fase 01 inicia outro contexto e limpa o app.
`--maestro /caminho/absoluto/bin/maestro` seleciona explicitamente a CLI.

Sem `--output`, os resultados ficam ao lado do manifesto, em
`<diretório-da-fixture>/<ios|android>/<normal|protected>/`. Um `--output` explícito
é permitido para investigação, mas mantenha diretórios diferentes por plataforma
e perfil. Para retomar por `--flow`, use sempre o mesmo diretório. O gerador de
galeria abaixo procura a organização padrão, não diretórios arbitrários.

## Evidências e alcance

Cada fase salva log, JUnit, capturas/vídeo produzidos pelo Maestro e
`server-status.json`. O runner também salva `result.json` por fase e `summary.json`
por plataforma/perfil. Uma fase só é aprovada quando a automação da interface **e**
suas verificações do servidor passam; resultados de fases retomadas são atualizados
individualmente no resumo.

O envio normal exige que o nome único editado apareça no cadastro da API. A
recuperação exige uma tentativa normal com 503, preservação do cadastro anterior,
um pacote novo `COMPLETE`, os objetos de todos os itens do manifesto e o manifesto
final. O runner lê os arquivos do armazenamento privado local, compara tamanho e
SHA-256 e confirma na tabela de origem o rascunho que não pôde ser aplicado, as três
famílias de risco, a fonte geradora e os dez campos do EPI: nove respostas booleanas
e prazo de 180 dias, com valores explícitos esperados pela fixture. A presença do
vínculo sozinha não basta para aprovar o resgate.
Os cenários de risco conferem que a revisão não aplicou a probabilidade antes do
consentimento: as operações devem apontar para os IDs das avaliações baixadas,
e não para novas avaliações duplicadas pelo formulário. A confirmação deve criar
avaliações novas nas duas datas, mantendo
as linhas anteriores com probabilidade/início preservados e fim na fronteira
correta. O terceiro risco, que não foi selecionado, deve continuar inalterado.

Para reunir as evidências locais, na pasta do app:

```sh
node test/native/report.cjs "$native_fixture" \
  "$native_evidence/index.html"
```

O comando produz uma página HTML com logs, JUnit, estado do servidor, capturas e
vídeos encontrados nos diretórios padrão. A página usa arquivos locais e não
publica nem envia dados. Ela apenas apresenta resultados registrados: não executa
testes, não aprova fases ausentes e não substitui verificar se os dois perfis de
cada plataforma foram concluídos. Uma rodada completa tem seis fases normais e
quatro protegidas por plataforma, pois 01 e 02 são executadas nos dois perfis.

No Android, a fase de reinício também ativa modo avião; o runner tenta desativá-lo
no `finally`, inclusive se a fase falhar. Confira a conectividade do emulador após
uma interrupção forçada. No iOS Simulator, esse cenário usa resposta 503 da API:
ele comprova indisponibilidade do serviço, não modo avião físico.

Os fluxos 07 e 08 foram preparados para a revisão em lote de riscos; sua cobertura
nativa depende de esses resultados passarem em cada plataforma. O fluxo de
recuperação verifica os assets presentes no pacote, mas não comprova captura de
foto/áudio/vídeo se esses arquivos não foram criados no cenário. A suíte também não
comprova câmera, microfone, permissões, armazenamento cheio, suspensão em segundo
plano ou atualização sobre uma instalação antiga em aparelhos físicos. Esses pontos
exigem cenários próprios e validação em Android/iPhone reais. Não há publicação nem
envio oficial ao eSocial nessa suíte.

O backend mantém o bloqueio explícito de `CompanyCharacterization` após envio
aceito, `SST_POST_SEND_SOURCE_REVIEW_REQUIRED`, enquanto o mapeamento dessa origem
está pendente. A fixture protegida usa `RiskFactorData`, cuja exigência de correção
ou nova condição já é suportada; nenhum bloqueio é desligado para facilitar testes.

As verificações complementares usam a mesma fonte do aplicativo:

```sh
# Na pasta do app, com Node 22:
npm run test:sync
```

Depois de encerrar o backend nativo conforme a próxima seção, execute na pasta
`sst-project-api`, também com Node 22:

```sh
node test/api/run.cjs --mobile-sync-only --local-postgres
```

Esse segundo comando cria outro PostgreSQL descartável e testa os contratos HTTP
de sincronização e recuperação. Não o execute enquanto o backend nativo estiver
segurando o lock do build. Os testes de SQLite, HTTP e interface se complementam;
um resultado aprovado em uma dessas camadas não substitui as outras.

## 4. Encerrar e limpar o backend

Com a fixture da execução, envie o comando abaixo a partir da pasta do app:

```sh
node - "$native_fixture" <<'JS'
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const fixture = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert.equal(fixture.contract, 'simplesst.native.e2e');
  assert.equal(fixture.disposable, true);
  assert.equal(new URL(fixture.apiURL).hostname, '127.0.0.1');
  const response = await fetch(fixture.apiURL + '/__native_test/stop', {
    method: 'POST',
    headers: { 'x-native-test-token': fixture.controlToken },
  });
  assert.equal(response.status, 200);
  console.log('Encerramento solicitado; aguarde o runner da API terminar.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
JS
```

Esse endpoint existe somente no ambiente de teste. Salva `final-status.json` e
encerra a API; o runner remove o cluster temporário e libera o lock, preservando os
artefatos. Uma interrupção normal do runner também faz cleanup. O processo do app e
o simulador/emulador podem ser fechados depois; nenhuma limpeza é feita em banco
da equipe ou dispositivo físico.

## Contratos de sincronização e tipagem

A revisão em lote de um ambiente já declarado usa **Nova condição** para o
encerramento, com data e motivo explícitos. Uma opção comum de correção não é
convertida silenciosamente em encerramento. A coleta original e as escolhas dos
outros itens continuam preservadas, inclusive ao reiniciar o SQLite.

O guia [Sincronização e encerramento de cadastros declarados](../../docs/sync-historical-closure.md)
reúne esse comportamento, os contratos atuais de `SInput`, Reanimated e arquivos,
e os comandos de checagem de tipos e da suíte SQLite. Essas provas não substituem
uma nova execução da interface nos simuladores.
