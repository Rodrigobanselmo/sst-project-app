# Sincronização e encerramento de cadastros declarados

O app mantém os cadastros e a coleta no aparelho. Sincronizar com o sistema e
transmitir ao eSocial continuam sendo ações separadas. Não há transmissão oficial
pelo botão de sincronização do app.

## Encerrar um ambiente depois de uma declaração

Uma remoção de ambiente já declarado é tratada como encerramento datado. Na
revisão da visita, a pessoa escolhe **Nova condição**, informa desde quando o
ambiente deixou de valer e explica o motivo. O servidor confirma a alteração e
preserva a identidade do cadastro e os períodos anteriores. A restauração abre
uma nova participação, em vez de reabrir o período encerrado.

O padrão da visita continua opcional e pode ser aplicado a várias alterações.
Se o padrão for **Corrigir informações** e a seleção incluir um encerramento de
ambiente, o app destaca esse item e pede uma escolha explícita de nova condição.
Ele não converte a intenção silenciosamente nem atribui a mesma data a uma
correção histórica. As escolhas dos outros itens e a coleta continuam salvas.
É possível ajustar esse item como exceção ou desmarcá-lo antes de confirmar o lote.

Antes do primeiro envio acompanhado, o cadastro normal não ganha uma aprovação
extra. Falhas de arquivo e conexão continuam com seu próprio tratamento e não
pedem uma vigência. Recebimento da coleta, aplicação ao cadastro e aceitação pelo
eSocial são estados distintos.

## Contratos atuais do app

- O componente `SInput` recebe as propriedades do `TextInput` em `inputProps`.
  Espaçamento externo pertence ao contêiner. Passar `placeholder`, `value` ou
  `onChangeText` diretamente ao wrapper não os encaminha ao campo nativo.
- Reanimated exporta `SharedValue` como tipo próprio. As refs dos handlers são
  iniciadas com `null`; o callback normal de gesto recebe o evento que contém
  `nativeEvent`.
- Operações legadas de arquivo usam `expo-file-system/legacy`. O perfil consulta
  o tamanho que já vem em `getInfoAsync`, sem a antiga opção `size`.
- O TypeScript herda o target do Expo SDK instalado. Metro continua responsável
  pelo JavaScript nativo; a checagem não emite arquivos.

Esses ajustes não adicionam dependências, variáveis de ambiente ou módulos
nativos. A publicação da API e da nova versão do app segue o processo normal da
equipe; alterar o código local não publica automaticamente.

## Validação reproduzível

Use Node22 e as dependências do lockfile:

```sh
nvm use
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run test:sync
```

A suíte de sincronização usa SQLite temporário e cobre o journal, reinício,
recebimentos, opções em lote, conflitos e preservação dos dados. O teste de
encerramento verifica que uma intenção inválida não chega à API, que a coleta
original sobrevive à reabertura do banco e que a escolha explícita usa uma nova
identidade de operação.

Esses comandos não comprovam navegação nativa, câmera física, microfone,
suspensão do processo pelo sistema ou falta de armazenamento. Para os fluxos da
interface em iOS/Android, consulte [o guia dos testes nativos](../test/native/README.md).
