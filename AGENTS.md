# SIADESK — regras do projeto

## Entrega obrigatória do executável

Regra permanente do usuário: após qualquer alteração neste projeto, gerar uma nova versão do executável e atualizar a instalação utilizada pelo atalho da área de trabalho antes de considerar a tarefa concluída. Isso também se aplica a alterações de documentação e configuração.

- Atalho verificado: `C:\Users\danie\Desktop\SIADESK.lnk`.
- Destino do atalho: `D:\Projetos\siadesk\dist-packaged\win-unpacked\SIADESK.exe`.
- Conferir o destino real do atalho antes de cada entrega; se ele tiver mudado, atualizar a instalação apontada por ele.
- Executar `npm run build` e empacotar com Electron Builder para Windows. Apenas compilar o frontend não atende à regra.
- Atualizar o pacote completo no diretório do atalho, incluindo `resources/app.asar`, bibliotecas e demais arquivos necessários. Não entregar somente o `.exe` nem deixar a versão nova apenas em outra pasta.
- Preferir gerar o pacote em uma pasta temporária e depois copiar para o destino. Se a extração do Electron falhar por bloqueio de renomeação no Windows, usar `--config.electronDist=node_modules/electron/dist` no empacotamento.
- Preservar projetos, configurações e dados do usuário. Não encerrar à força uma sessão em uso para substituir arquivos; se ela impedir a atualização, informar o bloqueio e solicitar que o usuário salve o trabalho e feche o SIADESK.
- Conferir os arquivos atualizados e testar a inicialização do executável no destino final com um perfil de teste isolado. Só afirmar que a versão do atalho está atualizada depois da verificação; em caso de falha, informar claramente o que ficou pendente.

## Arquivos no Pipese

Antes de anexar qualquer arquivo no Pipese/Pipes, ler `C:/Users/danie/.codex/skills/anexar-arquivos-pipese/SKILL.md`. Usar exclusivamente Pacotes de Arquivos/Pacotes de Anexos vinculados ao registro correto. Nunca inserir arquivos soltos na descrição nem usar os anexos do editor como alternativa. Em migrações autorizadas, verificar primeiro o pacote salvo e só depois remover as incorporações, preservando o texto da descrição.
