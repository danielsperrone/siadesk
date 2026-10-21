# Simulação da automação no SIADESK

O simulador inicia com o aplicativo Electron, mesmo antes de abrir um projeto. Os controles ficam em **Funções Especiais → Simulador da automação**. Ele roda em uma thread independente da renderização e dispensa Python no computador do usuário.

## Configurar a cena

- Em **Equipamentos → Periféricos**, clique na **engrenagem do item**. O modal reúne estado, mensagem e vínculo de simulação conforme o equipamento. Vincule cada semáforo a AA (lado A, para fora), AB (lado A, para B), BA (lado B, para A) ou BB (lado B, para fora). **Figurante / controle manual** preserva a seleção manual de vermelho, verde ou desligado. Equipamentos sem vínculo salvo continuam manuais. O padrão é vermelho e o texto do display é SIAMAC.
- Nos sensores emissores ou receptores, escolha **A (entrada)**, **B (saída)** ou **Figurante**. O padrão é figurante. A presença ocorre quando o volume mundial do caminhão cruza a linha transversal na posição longitudinal e altura de montagem do sensor. Basta um dos sensores do canal detectar para obstruir a entrada correspondente.
- As cancelas da entrada e saída seguem respectivamente A e B por padrão. Altere o canal em Funções Especiais ou no menu do botão direito da cancela. Uma cancela figurante mantém o controle manual.
- Mova o caminhão com as setas esquerda/direita. O detector usa a posição animada, sem esperar salvar a posição no projeto. Ocultar o caminhão, fechar o projeto ou entrar em calibração libera os sensores da cena. Também é possível forçar sensor livre/ocupado no painel para testar.
- Canais, estados manuais, texto do letreiro, portas, modos dos sensores, preferências de semáforos/entradas do painel e painel recolhido são salvos no arquivo do projeto e na nuvem. O estado instantâneo do CLP não altera nem marca o projeto como modificado. O letreiro configurável continua independente do CLP.
- Clique no título **Simulador da automação** para recolher ou expandir os controles. A execução e a quantidade de conexões TCP continuam visíveis e o simulador continua funcionando.
- O botão com **ícone de monitor**, ao lado do título, abre o **Simulador CLP Modbus — Integração OWL** mesmo com o painel recolhido. O sinótico reproduz as duas pistas da interface oficial: cancelas, quatro semáforos, presença reconhecida pelo CLP, contadores de envios e log. Todos usam o mesmo simulador da cena; abrir ou fechar o monitor não cria outro servidor nem interrompe a simulação.
- No monitor, **Obstruir sensor** força a presença e **Liberar sensor** força a pista livre. **Voltar ao automático** devolve o sensor à detecção do caminhão. Fechar o monitor preserva o modo escolhido, também salvo no projeto. Os comandos de abertura/fechamento continuam respeitando o intertravamento. Alterar um sensor não substitui comandos de semáforo recebidos do OWL.
- A aba **Painel Detalhado (Modbus & CLP)** mostra entradas físicas, saídas do firmware, memórias das pistas e controles dos semáforos. Permite alterar entradas, parar/iniciar o simulador e limpar o log. As portas continuam configuráveis no painel de Funções Especiais.

Os comandos das cancelas pelo painel, botão direito ou atalhos Q/A e W/S passam pelo CLP quando vinculadas e o simulador está ligado. O firmware decide quando abre/fecha e mantém o bloqueio de fechamento por sensor. Com o simulador parado, vale o estado manual do projeto.

## OWL

O servidor fica em **127.0.0.1:502 (Modbus TCP)** e **127.0.0.1:30055 (protocolo auxiliar OWL)**. Portanto, OWL e SIADESK devem rodar no mesmo computador. As portas podem ser alteradas no painel e ficam salvas no projeto. A última porta usada também fica neste computador para o início automático antes de abrir um projeto. Outro simulador usando a mesma porta é reportado; o SIADESK não encerra processos externos. A lógica local continua rodando mesmo se uma porta não puder ser aberta.

O Modbus usa endereços base zero: endereço 0 é `%M0`. O protocolo auxiliar usa base um: `Write|1|1` escreve `%M0`. O firmware espera presença em `%M1`, como o simulador oficial: o SIADESK **não** converte `%M0` em `%M1` nem fabrica presença. O estado de conexão exibido vem de `%Q0.4`, distinguindo a fase inicial de dois segundos e o servidor apenas escutando.

O estado das cancelas é `%M12`/`%M17`; abrir/fechar usa `%M2`/`%M3` e `%M4`/`%M5`. Os semáforos seguem `%Q1.0` a `%Q1.7`, comandados por `%M6` a `%M9` e pela lógica interna. Sensor A/B livre corresponde a `%I0.0`/`%I0.1` ligado, ocupação a desligado. Entradas e saídas físicas não são aliases das memórias Modbus.

## Origem e fidelidade

### Balança TCP

A balança inicia junto com o Electron em **127.0.0.1:30005**, inclusive na tela de entrada. Em **Funções Especiais → Balança TCP**, altere a porta e a margem de contato. No OWL selecione **Líder via TCP**, com esse endereço e porta. O protocolo `LIDERIP` é diferente e não corresponde a este simulador.

Clique no título **Balança TCP** para recolher ou expandir. Recolhida, mantém execução, conexões, peso, estabilidade, porta e eventuais erros visíveis. O estado recolhido também é salvo no projeto, tanto no arquivo local como na nuvem.

Clique no caminhão para ajustar seu peso total pelo controle deslizante ou pelo campo em kg (0 a 120.000 kg, padrão 40.000 kg). **Mostrar peso**, abaixo dos controles de rótulos/grades, exibe a leitura da balança, estabilidade e quantidade de rodas. Ocultar esse indicador não interrompe a pesagem nem a transmissão.

O peso é dividido igualmente entre as rodas identificadas no modelo. A cena usa o centro real de cada roda projetado na plataforma. Cada parcela recebe um fator suave de contato: 100% totalmente apoiada, 50% no limite da borda e zero após sair da margem. O padrão da margem é 15 cm para cada lado da borda. Somam-se as parcelas, portanto cinco rodas totalmente apoiadas, de um total de dez, representam metade do peso. A distribuição é uma simulação por roda, sem modelar suspensão ou distribuição desigual de carga entre eixos.

Ao mover o caminhão há uma pequena oscilação; entrada/saída de rodas causa variação proporcional maior. A leitura estabiliza cerca de dois segundos após parar. Ocultar o caminhão, fechar o projeto ou entrar em calibração zera a pesagem. Peso total, visibilidade do indicador, margem e porta fazem parte do projeto local e da nuvem.

Referências locais verificadas: `D:\Projetos\OWL\Lab\SimuladorBalancaLider\Unit2.pas` e `D:\Projetos\OWL\Software\Blibliotecas Feitas\uSIAMACBalanca.pas`, rotina `AdicionaByteLIDER`. O pacote de 11 bytes é `SOH + 7 dígitos em kg + espaço + E/I + STX`, onde `E` indica estável e `I` indica instável. O SIADESK transmite a cada 200 ms e imediatamente ao conectar um cliente. O simulador Delphi original usa 800 ms. Comandos recebidos não alteram a carga; a cena determina o peso. Os fontes do OWL não foram alterados.

### CLP

Fonte: `D:\Projetos\OWL\Lab\Simuladores Oficiais\Simulador CLP` e firmware **Versão 5.0.6.smbp** de `OWL\Automação\Firmware\Firmware Schneider`.

O arquivo original e o interpretador de referência ficam em `electron/simulador/firmware`. A versão embarcada é fixa, permitindo builds reproduzíveis. `python tools/importar-firmware-clp.py` extrai as instruções após validá-las com o interpretador oficial. SHA-256: `619cae7624caad2231873be40fb8b6777e6f7ed488cb4e9bcf99d32acd6e04d1`.

O motor JavaScript executa as 5 POUs, 45 rungs e 12 temporizadores, em ordem, com varredura nominal de 10 ms e relógio monotônico. O teste compara 19.000 varreduras com o interpretador Python original. Trata-se da mesma simulação funcional, sem emular eletrônica, filtros ou tempo real do CLP físico.

## Verificação

- `node --test tests/simulator/*.test.cjs`: comparação com Python, intertravamentos, semáforos, transportes TCP reais, portas ocupadas, início/reinício e entradas automáticas/manuais. Python é necessário somente para o teste de referência.
- `node --test tests/simulator/balanca.test.mjs`: contato parcial, proporção de rodas, estabilidade, protocolo e TCP real, troca de porta e validação de amostras.
- Com Vite em `127.0.0.1:5189`, `node tools/test-simulador-electron.mjs`: aplicativo Electron com portas temporárias, engrenagens, comandos externos, sensores pelo movimento real no 3D, clique no veículo, peso, contato parcial e painel recolhido. Aceita outra URL como argumento.
- `node tools/test-simulador-asar.mjs`: executa ambos os simuladores dentro de `app.asar` temporário.
- Com Vite ativo, `node tools/test-monitor-electron.mjs URL`: testa os dois painéis recolhidos, monitor simplificado/detalhado, comandos externos preservados ao forçar sensores, intertravamento, retorno ao automático, entradas, semáforos, log e reinício. Inspeciona também o monitor em uma janela menor.
- `npx playwright test --config playwright.cloud.config.mjs -g "saves scale"`: verifica salvar e reabrir todas as novas configurações por arquivo local e nuvem usando transporte SIASGL simulado, sem publicar dados reais.
- `npm run build`: verificação TypeScript e geração do aplicativo. Todos os arquivos necessários ao simulador estão sob `electron/`, incluídos no empacotamento existente.
