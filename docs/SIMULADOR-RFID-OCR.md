# Simulação RFID e OCR

Clique no veículo para abrir o ajuste de peso. Use “Ajustar placas e tags” para abrir a identificação, já na parte clicada: cabine para cavalo, baú ou traseira para reboque. As abas permitem alternar entre ambos. Cada parte tem uma placa independente, exibida no 3D, e uma lista de tags. Pesquise pelo número de 1 a 100 ou cole os 24 dígitos, de `000000000000000000000001` a `000000000000000000000100`. Adicione pelo botão ou com Enter. Não é possível duplicar uma tag na mesma parte. “Voltar ao peso do conjunto” retorna ao ajuste de peso.

Na configuração dos periféricos de cada poste, use a engrenagem do RFID ou da câmera OCR. Ative o simulador, configure IP/porta e aplique a conexão. Ajuste o alcance (1–30 m). No RFID, a abertura total (5–120°) define um cone circular. Na OCR, o campo retangular acompanha a lente, a resolução e a inclinação configuradas na seção da câmera, inclusive o perfil Intelbras VIP 5460 LPR IA. A visualização do campo é invisível por padrão e ajuda a posicionar o equipamento. A leitura usa a posição mundial da face emissora, considerando sua âncora, giro e inclinação; o alcance é medido ao longo do eixo óptico. Consulte [Câmeras RTSP e perfil Intelbras](SIMULADOR-CAMERAS-RTSP.md).

- RFID: servidor TCP no IP local escolhido. O OWL se conecta a esse IP e porta. Cada tag é enviada como 24 dígitos seguidos de CRLF.
- OCR direto: cliente TCP conectado ao IP do OWL. Formato `*ABC1D23!` seguido de LF, com reconexão automática.
- OCR HTTP LPR: servidor HTTP no IP local escolhido, compatível com o stream multipart `myboundary` e o campo escapado `PlateNumber` do simulador de referência.

Use portas distintas para servidores no mesmo IP. Um IP de escuta precisa existir nesta máquina; `127.0.0.1` atende o OWL local e `0.0.0.0` escuta todas as interfaces. No modo OCR direto, informe o endereço do computador que executa o OWL. O modo navegador permite conferir o cenário; os sockets funcionam no aplicativo Electron.

RFID detecta o centro do para-brisa e o centro da traseira do baú. OCR detecta os pontos das placas dianteira e traseira. Esses pontos acompanham o caminhão, inclusive sua altura calibrada. Leituras presentes são enviadas uma vez por segundo; ao sair do campo, deixam de ser enviadas. O detector geométrico não executa OCR nos pixels nem garante a leitura do contêiner por uma câmera real. Se a cena parar de atualizar, as leituras expiram em 1,5 segundo. Sem cliente conectado, não há envio acumulado. Placas incompletas não são transmitidas.

Identidades, tags, alcance, abertura e conexões são salvos na configuração do projeto. Fechar o projeto, desativar o equipamento ou entrar na calibração encerra as conexões correspondentes. O status mostra conexões, envios e erros de rede.

Validação: `node tools/test-leitores.cjs` verifica os protocolos contra sockets reais. `node tools/test-leitura-ui.mjs` verifica interface, persistência e geometria na cena. A referência consultada foi `D:/Projetos/OWL/Lab/Simuladores Oficiais/Simulador RFID OCR/simulador.py`.
