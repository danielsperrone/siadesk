# Simulador de display remoto

No aplicativo desktop SIADESK, abra as configurações de um **Display de mensagens** instalado em um poste. Informe o IP e a porta e clique em **Iniciar display**. O SIADESK cria um servidor TCP independente para esse display; o OWL se conecta a ele e controla o texto na cena 3D e na prévia das configurações.

## Endereços no OWL

| Uso | IP de exemplo | Porta |
| --- | --- | --- |
| Display 1, OWL em modo simulado | 127.0.0.1 | 30056 |
| Display 2, OWL em modo simulado | 127.0.0.1 | 30057 |
| Display 1, OWL em modo normal | 127.0.0.2 | 2101 |
| Display 2, OWL em modo normal | 127.0.0.3 | 2101 |

Configure os mesmos endereços no OWL. Dois displays não podem usar simultaneamente o mesmo par IP/porta. Os endereços 127.x.x.x servem para OWL e SIADESK no mesmo computador. Para acesso por outro computador, o IP deve estar atribuído à máquina do SIADESK e a conexão TCP deve estar permitida na rede. Preencher um IP arbitrário não cria um endereço na placa de rede; nesse caso, a configuração mostra o erro.

**Aplicar conexão** atualiza o endereço. **Parar display** libera a porta e volta ao texto manual. IP, porta e estado ativado são salvos junto com o projeto. Fechar o projeto, desativar o poste ou remover o display encerra seu servidor. Reabrir o projeto inicia os displays que estavam ativados. A mensagem recebida é transitória e começa apagada até o OWL enviar um comando; desconectar o OWL preserva o último texto recebido.

No navegador é possível salvar a configuração e usar o texto manual, mas o recebimento TCP exige o aplicativo desktop.

Em **Velocidade do texto**, ajuste a rolagem de cada display de **0,25×** a **3×**. O padrão **1×** mantém a velocidade original. O ajuste é imediato, vale para o texto manual e para as mensagens recebidas do OWL, e fica salvo no projeto sem interromper a conexão TCP.

## Compatibilidade

A implementação usa como referência `D:\Projetos\OWL\Software\Blibliotecas Feitas\uSIADisplaySpider.pas`. O OWL normal conecta na porta 2101 (`uFrmControleBalanca.pas`); o modo simulado Schneider substitui as portas por 30056 e 30057 (`uAutomacaoSIAMACOWL_SCH.pas`). Nenhum arquivo do OWL foi alterado.

O receptor interpreta o cabeçalho binário Spider, o comprimento, o terminador e o CRC-16, além do mapa de acentos específico do OWL. Aceita fragmentação/concatenação TCP, as mensagens predefinidas, `Envia`, texto manual, apagar painel, data e relógio. Pacotes com CRC incorreto são ignorados e contabilizados. Os comandos de efeito são reconhecidos e removidos do texto; a apresentação mantém a rolagem do letreiro 3D existente, sem reproduzir exatamente a temporização dos efeitos do painel físico.

## Validação

- `node --test tests/simulator/display.test.cjs`: pacotes literais extraídos do OWL, fragmentação em todas as posições, CRC, acentos, mensagens longas, dois IPs na mesma porta, reconexão, conflitos e liberação das portas.
- `node tools/test-display-electron.mjs http://127.0.0.1:5198`: com Vite nessa porta, testa a interface Electron, recebimento TCP, textura 3D, apagar, parar e reabrir o projeto. Usa perfil temporário separado.

Os testes de protocolo usam os CRCs originais dos 13 comandos fixos do OWL, preservados em `tests/fixtures/display-owl.json`. A validação não depende de abrir uma operação real de pesagem no OWL.
