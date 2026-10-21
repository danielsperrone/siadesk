# Caminhão SIAMAC revisado — 14/09/2026

- **Caminhao SIAMAC - revisado.skp**: caminhão editável no SketchUp 2020, com nove sólidos por lateral. Letras e barras foram traçadas da imagem original da marca, incluindo os vazados das letras A. Relevo externo de 4 mm.
- **veiculo.glb**: modelo revisado usado pelo SIADESK. Conserva a geometria e as normais do caminhão atual, troca a textura das jantes por prata e aproxima a borracha traseira do tom usado na cabine. A logo é a geometria produzida no SketchUp, sem placa retangular.
- **previa-lado-esquerdo.png / previa-lado-direito.png**: conferência visual em Three.js, o mesmo motor usado pelo aplicativo.
- **backup-original/**: GLB e FBX anteriores à revisão, além do GLB anterior da pasta dist. O arquivo original da balança em SketchUp permanece intacto.

O arquivo revisado foi copiado para `public/models/veiculo.glb` e `dist/models/veiculo.glb`.

Para regenerar apenas este modelo, a partir da raiz do projeto:

```powershell
node tools/convert-models.mjs veiculo
```

`tools/pecas.json` referencia este GLB revisado para evitar que uma nova conversão restaure o FBX antigo. O FBX antigo foi preservado; a revisão editável é o SKP acima. Ao fazer novas alterações no SketchUp, atualize também este GLB canônico.

Validação: 18 grupos sólidos no SketchUp; dimensões externas preservadas (13,8528 × 3,2048 × 2,2803 m); leitura correta da marca nas duas laterais; prévias sem erros JavaScript; regeneração individual do modelo e igualdade dos arquivos em public, dist e nesta pasta conferidas.
