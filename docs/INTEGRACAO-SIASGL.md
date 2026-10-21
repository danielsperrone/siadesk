# SIADESK 0.2.1 — Integração com SIASGL

## Uso

Abra `SIADESK.exe` ou `executar.bat` na pasta da versão extraída. A versão 0.2.1 está em `releases/SIADESK-0.2.1-Windows/`. A distribuição inclui o runtime do Electron e não exige instalação de Node.js.

Entre com o mesmo e-mail e senha do SIASGL. Se a conta usa autenticação em duas etapas, informe também o código. O primeiro acesso exige conexão. Depois, a última conta autenticada pode abrir este computador offline, com seu projeto e configurações locais. Sair remove a sessão offline; trocar a senha invalida a sessão quando o servidor for consultado novamente.

A área de trabalho abre com o cache enquanto a sincronização ocorre em segundo plano. O SIADESK consulta `https://siasgl.siamac.com.br/api/siadesk`. O token fica protegido pelo `safeStorage` do Electron/Windows. A senha não é gravada. Tokens duram 90 dias online; o uso offline continua possível até a próxima validação online ou saída explícita.

## Projetos e salvamento

- Arquivo → Salvar projeto (Ctrl+S) pergunta o destino: nuvem, arquivo local ou ambos. Ambos é o padrão. Somente local não envia essa versão ao SIASGL; somente nuvem não gera arquivo. Cancelar o seletor local não confirma o salvamento. O cache offline permanece disponível em todos os modos.
- Arquivo → Novo projeto (Ctrl+N) cria um projeto. Arquivo → Abrir projeto (Ctrl+O) permite escolher um JSON local ou buscar um projeto do SIASGL. Cópias da nuvem já carregadas podem ser abertas offline.
- A sincronização funciona silenciosamente em segundo plano, sem faixa superior. Conta → Sincronização mostra pendências e permite tratar conflitos quando necessário.
- Sem conexão, a fila permanece neste computador, separada por conta e empresa. O aplicativo tenta novamente ao reconectar, a cada minuto e pelo botão Sincronizar.
- A lista de projetos do SIASGL é carregada no início. Os projetos são compartilhados entre usuários da mesma empresa, sem associação automática com licenças.
- A revisão do documento e a versão de sincronização são independentes. Um UUID identifica cada projeto, mesmo após renomeá-lo.
- Alterações locais ainda não enviadas não são substituídas pelo carregamento da nuvem. Se dois computadores salvarem versões diferentes, o aplicativo oferece enviar o conteúdo local como outro projeto, preservando ambas as versões.

## Calibrações, posições e cenas

- Apenas usuários com papel Admin, admin, Administrador ou superadmin podem alterar padrões. A API verifica o papel atual em cada publicação; administradores autenticados anteriormente também podem editar offline. Os rascunhos são enviados quando a conexão voltar, com nova validação de permissão no servidor.
- No primeiro acesso de um administrador, as calibrações existentes na instalação e os padrões iniciais são publicados se a empresa ainda não tiver configurações na nuvem.
- Alterações de calibração, padrões de periféricos e cenas globais são sincronizadas automaticamente após uma breve pausa na edição.
- Em Conta, **Usar projeto atual como padrão** estabelece as posições e os equipamentos para novos projetos. Dados do cliente, identificação do projeto, cenas específicas e credenciais das etiquetas não entram nesse modelo global.
- Em Cenas, escolha **Somente neste projeto** ou **Global — todos os projetos da empresa**. Cenas antigas continuam específicas do projeto. Cenas globais aparecem junto das cenas locais, identificadas como Global.
- Se houver conflito entre alterações de padrões, o rascunho local é preservado. Conta → Sincronização permite tentar novamente ou descartar o rascunho com confirmação e carregar a versão da nuvem. Se não houver conexão, o rascunho é mantido.

## SIASGL publicado

Menu SIADESK:

- `/admin/siadesk-projects`: consulta e download dos projetos da empresa.
- `/admin/siadesk-settings`: informações e download das configurações da empresa. Edição visual feita pelo SIADESK.

Tabelas próprias: `siadesk_tokens`, `siadesk_settings` e `siadesk_projects`. As tabelas de licenças não são alteradas por esta integração. A sessão também é invalidada online se o usuário trocar de empresa, for excluído ou a empresa ficar inativa.

## Validação e publicação

- `npm run test:cloud`: login, cache offline/reinício, reconexão, permissões, cenas, conflitos, etiquetas, troca de conta e recuperação de rascunhos.
- `node tools/smoke-siadesk-electron.mjs`: armazenamento criptografado real do Windows, reinício, modo offline, lista de endpoints permitidos e logout.
- `npm run package`: compilação TypeScript/Vite e empacotamento Windows.
- `node tools/smoke-siadesk-packaged.mjs`: menu nativo Arquivo, criação, escolha de ambos por padrão, gravação real de JSON, envio à API simulada e abertura de projeto na nuvem pelo executável empacotado.
- SIASGL: `tests/Feature/SiadeskIntegrationTest.php`, executado em cópia isolada da aplicação com SQLite em memória. Cobertura de autenticação, troca de senha, 2FA, empresa inativa, logout, autorização de padrões, isolamento entre empresas, versões e repetição idempotente de salvamento.

Publicação realizada pelo comando `f` do `publi_app.py`, com adaptação da conexão para a chave SSH já existente, sem gravar segredos no projeto. `tools/publish-siadesk-server.py` e `tools/siadesk-server-manifest.json` registram o procedimento e os arquivos. O script cria backup, aplica somente a migração desta integração, publica os arquivos e compara SHA-256 remoto/local.

Backups remotos iniciais, anteriores à integração: `/home/siasgl/siadesk-release-20260914T042315Z` e `/home/siasgl/siadesk-release-20260914T042326Z`. O arquivo `manifest.json` de cada backup distingue arquivos anteriores de novos arquivos. Reverter a aplicação requer restaurar as rotas anteriores e retirar os arquivos novos indicados no manifesto, preservando as tabelas e seus dados. Não executar rollback das tabelas depois de usuários salvarem projetos.

As alterações anteriores existentes nos dois repositórios foram preservadas. O teste em produção confirmou proteção das novas rotas sem usar nem alterar credenciais de um usuário real.
