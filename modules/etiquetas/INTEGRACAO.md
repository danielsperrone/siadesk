# Etiquetas de projeto no SIADESK

Abra um projeto e use **Emitir documentos → Etiquetas do projeto (NIIMBOT B1)**. A tela só abre quando solicitada.

1. Conecte a B1 pelo Bluetooth do Windows, escolhendo a porta de saída da impressora. Confira a medida do rolo (inicialmente 50 × 30 mm).
2. A relação usa os equipamentos e quantidades do projeto, incluindo os painéis de automação e de som. Postes, cabine e veículo ilustrativo não recebem etiquetas.
3. Preencha IP, usuário e senha nos equipamentos de rede. A balança usa “não se aplica” nos dois últimos campos. Equipamentos elétricos não exibem campos de acesso.
4. Em **Detalhar**, confira a prévia de cada cópia. Desmarque individualmente o que não deseja imprimir. A linha fica amarela e mostra “Conjunto alterado”.
5. **Salvar no projeto** abre a escolha do arquivo JSON e grava o projeto completo com nomes, acessos e cópias excluídas. Ao importar esse arquivo, os dados são recuperados. Cancelar mantém a edição na tela. Uma cópia é guardada na pasta Jsons alterados, junto do arquivo salvo.
6. **Imprimir selecionados** envia os conjuntos em sequência, com uma etiqueta Siamac · site entre equipamentos. Não há separadora antes do primeiro nem depois do último.

Quantidades padrão, antes de exclusões e separadoras:

| Equipamento | Etiquetas |
|---|---:|
| Balança rodoviária | 5 |
| Cada cancela | 17 |
| Cada câmera IP, superior ou OCR | 3 |
| Cada sensor | 11 |
| Cada painel de automação ou de som | 8 |
| Cada caixa de som | 5 |
| Cada display remoto ou leitor RFID | 5 |

O aviso da cancela diz “VERIFIQUE A CHAVE NA PLACA”, 110 V / 220 V, antes de ligar. O aviso individual de tensão mantém o texto da fonte. Nas câmeras, a identificação usa o nome da própria câmera. Equipamentos sem receita específica usam a identificação elétrica.

O lote inteiro é validado antes de imprimir. Cada cópia é confirmada individualmente pela B1. Em uma falha, confira se a última etiqueta saiu antes de repetir. As confirmadas não são reenviadas ao continuar. **Parar após a etiqueta atual** interrompe entre impressões. Para repetir todas as cópias selecionadas, use **Reiniciar lote**. O histórico de impressão é apenas da janela atual; não é salvo no projeto.

A relação representa o projeto no momento da abertura. Após alterar os equipamentos no Siadesk, feche essa janela e abra novamente. Ao salvar, as etiquetas são incorporadas à configuração atual; outras alterações do projeto são preservadas.

**Imprimir por modelo** oferece seis modelos: fios, equipamento, equipamento elétrico, aviso de tensão, Siamac com site/QR e X. O editor livre continua como recurso extra. Os dados de projeto só são gravados quando você usa Salvar; a medida do rolo e os modelos personalizados do editor têm seu salvamento local próprio.

## Desenvolvimento

`npm run build` compila o módulo e o Siadesk. `npm run test:etiquetas` verifica receitas, quantidades, separadoras, exclusões, renderização, QR e salvamento/reimportação no Electron usando perfil temporário. Execute o build antes do teste Electron. `npm run package` inclui tudo na distribuição Windows. Os testes não imprimem fisicamente.

Receitas: modules/etiquetas/src/recipes.js. Tela: modules/etiquetas/src/project.js. Salvamento: src/labels/save-labels.ts e electron/etiquetas.cjs. public/etiquetas e dist são saídas geradas.
