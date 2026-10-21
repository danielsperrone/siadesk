# Caminhão com contêiner SIAMAC — 0.2.6

Na aba **Equipamentos**, em **Opções de Visualização**, marque **Mostrar caminhão ilustrativo** e escolha **Caminhão com contêiner SIAMAC** em **Modelo do caminhão**. A opção **Caminhão padrão** continua disponível. A escolha é salva na configuração do projeto (`modeloVeiculo`); projetos antigos usam o modelo padrão.

As setas movimentam o veículo e a tecla **V** inverte o sentido, como no caminhão original. As dez rodas conservam os mesmos pivôs, raios e geometrias. O giro usa distância percorrida / raio, inclusive em marcha a ré. Placas, RFID, OCR, pesagem, calibração, apresentação e vistas da documentação continuam vinculados à peça `veiculo`.

O modelo mantém a cabine, o chassi e os materiais do original. O contêiner tem chapas trapezoidais em relevo, teto nervurado, respiros, corner castings, apoios twist-lock, portas com vedações, dobradiças, quatro barras com guias e alavancas, refletores e a logo SIAMAC original nos dois lados.

Na revisão 0.2.6, as portas recebem contraface contínua e vedação central sobreposta, fechando a fresta. Barras, guias, reforços e marcações ocupam regiões separadas: identificação, tipo, pesos, logo e placa CSC ficam legíveis na chapa. Os valores da tabela são alinhados em duas colunas, sem depender de espaços que possam empurrar o texto para fora da porta.

A distribuição das marcações segue a referência visual do BIC: identificação e tipo nas duas laterais, frente, teto e portas; pesos e capacidade na porta direita; placa combinada CSC na parte inferior da porta esquerda. Este é um modelo de demonstração: identificação, inspeção e placa não representam registro ou certificação de equipamento real. A identificação ilustrativa `SIAU 634601 2` tem dígito verificador calculado. É um contêiner padrão de 8 pés e 6 polegadas, tipo `42G1`; não recebe avisos de high cube ou de escada que não correspondam à geometria.

Referência: https://www.bic-code.org/marking-of-containers/

O corpo usa as proporções nominais de um contêiner padrão de 40 pés (12,192 × 2,438 × 2,591 m) com escala uniforme de 0,86 para caber no caminhão ilustrativo existente. O conjunto mede aproximadamente 13,853 × 2,280 × 3,191 m (comprimento × largura × altura); comprimento e largura coincidem com o original, e a diferença de altura é de 14 mm. Não é um modelo CAD para fabricação.

## Reprodução e evidências

- Gerar o GLB: `npm run modelos:container`.
- Arquivo entregue: `public/models/veiculo-container.glb` (independente de `veiculo.glb`).
- Testes do modelo e da interface compilada: `node tools/test-container-truck.mjs` (após `npm run build`). Servidor de arquivos de teste restrito a 127.0.0.1:5195; autenticação simulada, sem servidor externo.
- Testes existentes: `node --test tests/simulator/*.test.cjs tests/simulator/*.test.mjs`.
- Teste do executável instalado: `node tools/smoke-container-packaged.mjs`.
- Medições e capturas atuais: `reports/container-truck/`.

O GLB é gerado offline com dependências locais e incorpora materiais e geometrias. O executável funciona sem buscar o modelo na internet.
