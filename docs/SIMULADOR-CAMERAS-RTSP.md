# Simulador de câmeras IP e OCR

No aplicativo desktop, abra um projeto e acesse **Funções Especiais → Câmeras IP e OCR · RTSP**. Ative **Ativar câmeras RTSP**. Cada câmera IP, IP voltada para baixo ou OCR instalada nos postes recebe um endereço próprio. Use **Copiar** para levar esse endereço ao OWL, VLC ou NVR, com transporte **RTSP sobre TCP**.

O endereço segue `rtsp://127.0.0.1:8554/camera/<identificador>`. O caminho é estável enquanto o identificador da câmera for preservado no projeto. A porta pode ser alterada. Para outro computador, selecione o IP de rede no painel e permita a porta escolhida no firewall do computador com SIADESK. A leitura dos streams não exige usuário ou senha; a publicação só é aceita no próprio computador.

**Ver imagem da câmera** mostra o enquadramento atual, mesmo com o RTSP desligado. A imagem respeita a lente do modelo, a âncora de calibração, a altura e o giro do equipamento na cena. A câmera superior acompanha a inclinação do seu modelo. Mover a visão geral com o mouse não altera as imagens RTSP. O campo de visão personalizado pode ser ajustado individualmente entre 20° e 110°. Na OCR, o volume de detecção é retangular e acompanha a mesma lente, resolução e inclinação da imagem. O envio das leituras continua com ativação própria.

O padrão é **640 × 360, 2 quadros/s**, em H.264. Também estão disponíveis 1 ou 5 quadros/s e as resoluções 960 × 540, 1920 × 1080 e **2688 × 1520** (4 MP do perfil Intelbras). A taxa é reduzida automaticamente e informada no painel. Há um orçamento total equivalente a 12 imagens de 640 × 360 por segundo, com até 32 câmeras simultâneas. Uma câmera em 4 MP recebe aproximadamente 0,676 quadro/s; este é um limite de desempenho do simulador, não da câmera real. É possível desmarcar câmeras individualmente para economizar recursos.

O simulador reaproveita a cena e o contexto gráfico existentes, renderiza em um alvo pequeno fora da tela e intercala as capturas. Não grava vídeo no disco nem mantém uma fila de quadros: existe somente um quadro em trânsito entre a cena e os codificadores. Cada codificador usa uma thread, e o servidor habilita apenas RTSP/TCP. A prévia é produzida somente para a câmera selecionada. Os limites reduzem o trabalho adicional, mas o consumo total também depende da complexidade do projeto e do computador.

A leitura de placas existente continua com ativação independente: transmitir a imagem não ativa ou desativa o envio das placas ao OWL. As placas visíveis no caminhão aparecem nas imagens. Desligar o RTSP, fechar o projeto ou fechar normalmente o aplicativo encerra os processos de vídeo. A calibração pausa as transmissões até voltar ao projeto. Alterar resolução, taxa, porta ou a seleção de câmeras reinicia os streams; o cliente pode precisar reconectar. Altura, giro, zoom e inclinação atualizam a imagem sem reiniciar os streams.

## OCR Intelbras VIP 5460 LPR IA · versão 0.2.7

Em **Equipamentos → Periféricos → engrenagem da Câmera OCR**, selecione o perfil Intelbras. Novas OCR já usam este perfil; configurações antigas com abertura explícita são preservadas como personalizadas. Ajuste a lente de **2,7 a 12 mm**, equivalente a aproximadamente **4,4×** de zoom óptico, e a inclinação vertical de **−45° a +45°**. O ângulo é absoluto: 0° nivela a direção óptica, valores negativos apontam para baixo. A articulação movimenta a cabeça e a lente; abraçadeiras e suporte permanecem fixos. Salve o projeto para conservar as opções.

A [ficha oficial Intelbras V16](https://backend.intelbras.com/sites/default/files/2026-01/Datasheet%20-%20VIP%205460%20LPR%20IA%20-%20V16.pdf) informa H de 92° a 46,1° e V de 49° a 26°, além de resolução 2688 × 1520. Esses pares não correspondem exatamente à proporção do vídeo em uma projeção perspectiva sem distorção. O SIADESK usa os extremos horizontais publicados e deriva o campo vertical pela proporção da imagem, preservando a geometria. Os valores intermediários interpolam o logaritmo da focal e da tangente do semiângulo; são aproximações, não uma calibração de laboratório. Não são simulados distorção de lente, foco, exposição, infravermelho nem o algoritmo de reconhecimento da Intelbras.

**Ponto de partida para o caminhão contêiner atual:** lente a 2 m de altura, 6 m longitudinalmente após o plano das portas traseiras e 2,2 m lateralmente do eixo da pista (0,6 m além da borda de uma pista de 3,2 m). Mirar o centro das portas, começar em 8 mm e inclinação óptica +3°. A distância de 6 m é medida paralelamente à pista, não na diagonal nem a partir do centro do caminhão. As posições do poste dependem também da posição do veículo na pesagem.

O ensaio geométrico de 18/10/2026 inclui as quatro extremidades das portas e os cantos da placa do reboque, margem de 6% e o campo vertical mais restritivo entre a simulação e a ficha. Em 4 MP, a placa ocupa cerca de 202 pixels de largura, os caracteres do código 34 pixels de altura e as linhas de peso 16 pixels. A plaqueta CSC tem caracteres de apenas 8 pixels: estar no quadro não assegura sua leitura. Para essa letra pequena, use outra captura com mais aproximação ou uma câmera dedicada. A análise cobre as portas traseiras e a placa traseira; não inclui outras faces do contêiner.

O [guia de instalação Intelbras](https://backend.intelbras.com/sites/default/files/2025-02/Guia_VIP_5460_LPR_IA_Color_01-24_site.pdf) indica 4,5 a 8 m de captura para câmera a 2 m de altura e ângulos de até 30°. O cenário medido tem obliquidade horizontal de aproximadamente 20°. Validar a montagem real com o veículo, iluminação e imagem do equipamento.

Evidências atuais: `reports/ocr-5460/tests.json`, `distancias.json` e `enquadramento-6m-8mm.png`. Execute `node tools/test-ocr-5460.mjs` após compilar para verificar lente, articulação, campo OCR, persistência, prévia local e enquadramento medido. O teste `node tools/smoke-ocr-packaged.mjs [caminho-do-executavel]` verifica o aplicativo empacotado e decodifica uma imagem RTSP real em 4 MP com perfil isolado.

No primeiro uso, o aplicativo localiza MediaMTX e FFmpeg no pacote, no cache do usuário ou no PATH. Se faltar algum, baixa o componente para `%APPDATA%/dimensionador/bin`; essa preparação precisa de internet. Os usos seguintes utilizam o cache. A configuração exclusiva do servidor é salva em `%APPDATA%/dimensionador/cameras/mediamtx.yml`. A versão antiga que transmitia a tela inteira em `/camera3d` foi removida.

## Verificação

- `node --test tools/test-cameras.cjs`: validação, caminhos estáveis, orçamento de captura, isolamento de publicação, controle da fila e encerramento.
- Com Vite na porta 5198: `node tools/test-cameras-electron.mjs http://127.0.0.1:5198`. Abre uma sessão isolada, decodifica os três streams RTSP com FFmpeg, confere direção, prévia, seleção, resolução, conflito de porta e encerramento. As capturas ficam em `test-results/cameras/`.
- `npm run build`: compilação da aplicação.

Referências dos componentes: [publicação com FFmpeg no MediaMTX](https://mediamtx.org/docs/publish/ffmpeg) e [formatos de vídeo do FFmpeg](https://ffmpeg.org/ffmpeg-formats.html).
