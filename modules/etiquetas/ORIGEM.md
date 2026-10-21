# Nimbot — etiquetas para B1

Dê dois cliques em **Abrir Nimbot.vbs**, nesta pasta. O programa abre no Edge ou Chrome como uma janela própria. Requer o Node.js já instalado neste computador. O servidor atende apenas a este computador, na porta 5188; não é instalado como serviço nem inicia com o Windows.

1. Ligue a NIIMBOT B1 e coloque o rolo.
2. Desconecte a impressora do aplicativo no celular, se necessário.
3. Clique em **Conectar Bluetooth** e selecione a B1 no seletor do navegador.
4. Em **Configurar o rolo e a impressão**, informe largura e altura reais, em milímetros. O padrão provisório é **50 × 30 mm**.
5. Edite a etiqueta, confira a prévia e imprima uma cópia para validar posição e medida.

Há texto principal, informações adicionais, imagem, QR Code, intensidade, cópias, modelos salvos e exportação PNG. O software bloqueia conteúdo que não cabe. A prévia é ampliada, não tem tamanho físico garantido na tela. A cabeça da B1 tem 384 pontos; a prévia preserva margens laterais em rolos de 50 mm. A escala usa 203 dpi.

Modelos e rascunho ficam no armazenamento do navegador, vinculados a `http://127.0.0.1:5188`. Use **Exportar modelos** para guardar um backup. Limpar dados do navegador pode apagar modelos. Imagens, fontes e biblioteca ficam locais depois da instalação; nenhum conteúdo de etiqueta é enviado a serviços externos.

O programa foi direcionado à **B1 de 203 dpi**, não à B1 Pro. A implementação usa uma biblioteca comunitária: a compatibilidade física com sua unidade e firmware precisa ser confirmada na primeira impressão. Nenhuma impressão física foi realizada durante a criação. Se falhar, verifique se alguma etiqueta saiu antes de repetir; o programa não repete trabalhos automaticamente.

## Desenvolvimento

`npm install` instala as dependências. `npm run dev` inicia o modo de desenvolvimento. `npm run build` atualiza a versão usada pelo atalho. `npm start` inicia o servidor local. `npm test` roda os testes com Edge instalado.

## Dependências e créditos

- [niimbluelib](https://github.com/MultiMote/niimbluelib), MIT, versão fixada no package-lock.json. Protocolo Bluetooth e impressão.
- [node-qrcode](https://github.com/soldair/node-qrcode), MIT. Geração de QR Code.
- [Manrope](https://github.com/sharanda/manrope), SIL Open Font License. Fonte da interface.
- Vite para empacotamento; Playwright para testes. Licenças originais preservadas em node_modules.

## Etiqueta para fios
Selecione Para fios no campo Formato da etiqueta. Preencha Primeira linha e Segunda linha uma única vez: ambas são repetidas nas duas metades, separadas por traço horizontal impresso. A orientação é a mesma nas duas metades. A fonte se ajusta até 6 pt; se não couber, o programa pede para encurtar o texto. Imagem e QR Code ficam disponíveis no formato Etiqueta simples.

## Bluetooth pareado no Windows
Escolha Bluetooth do Windows no topo e selecione a porta da B1 (COM4 neste computador). Bluetooth LE é uma alternativa separada. Se a COM4 retornar tempo limite, desligue e ligue a impressora, desconecte o aplicativo no celular e tente novamente. O pareamento no Windows não comprova uma sessão de impressão ativa. O transporte foi testado com respostas de protocolo simuladas; a abertura física da COM4 nesta sessão retornou tempo limite.

## Tela inicial
Conecte a B1, escolha Fios, Equipamento ou X grande, preencha e imprima. Equipamento pede nome, IP, usuário e senha; esses dados não são salvos automaticamente. O X não exige preenchimento. A tela anterior continua no botão Editor livre · recurso extra. Medidas do rolo são compartilhadas e salvas. A impressão completa de uma instalação será uma etapa futura.
