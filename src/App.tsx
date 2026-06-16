import { useState, useRef, useEffect } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { Scene } from './components/Scene'
import { useProject } from './store/project'
import { DocumentoDocumentacao } from './components/DocumentoDocumentacao'
import ExcelJS from 'exceljs'
import { gerarLayout } from './layout/engine'
import { CATALOGO } from './catalog/pieces'
import type { ProjectConfig, PostePeriferico } from './types'

export default function App() {
  const [mostrarRotulos, setMostrarRotulos] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-rotulos') !== 'false'
  })
  const [mostrarGrades, setMostrarGrades] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-grades') !== 'false'
  })
  const [mostrarPista, setMostrarPista] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-pista') !== 'false'
  })
  const [mostrarGrama, setMostrarGrama] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-grama') !== 'false'
  })

  // Efeitos para persistir os estados de visualização no localStorage
  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-rotulos', String(mostrarRotulos))
  }, [mostrarRotulos])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-grades', String(mostrarGrades))
  }, [mostrarGrades])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-pista', String(mostrarPista))
  }, [mostrarPista])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-grama', String(mostrarGrama))
  }, [mostrarGrama])
  
  // Estado para formulário de criação de projeto
  const [novoNome, setNovoNome] = useState('')
  const [novoCliente, setNovoCliente] = useState('')
  const [novoCodigo, setNovoCodigo] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const projetoAtivo = useProject((s) => s.projetoAtivo)
  const config = useProject((s) => s.config)
  const abaAtiva = useProject((s) => s.abaAtiva)
  const setAbaAtiva = useProject((s) => s.setAbaAtiva)
  const criarNovoProjeto = useProject((s) => s.criarNovoProjeto)
  const abrirProjeto = useProject((s) => s.abrirProjeto)
  const fecharProjeto = useProject((s) => s.fecharProjeto)
  const projetosRecentes = useProject((s) => s.projetosRecentes)
  const excluirProjetoRecente = useProject((s) => s.excluirProjetoRecente)
  const isDirty = useProject((s) => s.isDirty)
  const salvarConfig = useProject((s) => s.salvarConfig)

  // Estados para emissão do PDF
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [pdfData, setPdfData] = useState<{ dataEmissao: Date; codigoDocumento: string; apenasChecklist?: boolean } | null>(null)
  const calibracoes = useProject((s) => s.calibracoes)
  const [dropdownAberto, setDropdownAberto] = useState(false)


  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim() || !novoCliente.trim() || !novoCodigo.trim()) {
      alert('Por favor, preencha todos os campos para criar o projeto.')
      return
    }
    criarNovoProjeto(novoNome, novoCliente, novoCodigo)
    // Limpa os campos do formulário
    setNovoNome('')
    setNovoCliente('')
    setNovoCodigo('')
  }

  const handleImportarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.nomeProjeto !== undefined && parsed.cliente !== undefined) {
          abrirProjeto(parsed)
        } else {
          alert('Arquivo JSON inválido. Verifique se é um projeto SIADESK.')
        }
      } catch (err) {
        alert('Erro ao ler o arquivo JSON.')
      }
    }
    reader.readAsText(file)
    // Limpa o input para permitir importar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSalvar = () => {
    const configAtualizada = salvarConfig()
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configAtualizada, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    const filename = `${configAtualizada.nomeProjeto.toLowerCase().replace(/\s+/g, '-') || 'projeto'}-${configAtualizada.codigoProposta || 'proposta'}.json`
    downloadAnchor.setAttribute("download", filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleEmitirPDF = () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir o PDF, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        handleSalvar()
        setTimeout(() => {
          iniciarFluxoPDF()
        }, 800)
      }
    } else {
      iniciarFluxoPDF()
    }
  }

  const handleEmitirXLSX = async () => {
    // 1. Obter peças ativas que possuem interface de rede IP
    const pecas = gerarLayout(config, calibracoes)
    
    // Equipamentos IP que queremos listar
    const tiposEquipamentosIP = [
      'camera-ip',
      'camera-ip-baixo',
      'camera-ocr',
      'leitor-rfid',
      'display-mensagens',
      'painel-automacao'
    ]
    
    const pecasIP = pecas.filter(p => tiposEquipamentosIP.includes(p.tipo))
    
    if (pecasIP.length === 0) {
      alert('Nenhum equipamento IP configurado no projeto atual.')
      return
    }
    
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Configuração de IPs')

    // 2. Construir dados do topo da planilha (Metadados do Projeto)
    const dataHoje = new Date().toLocaleDateString('pt-BR')
    
    // Título Principal
    worksheet.mergeCells('A1:K1')
    const titleRow = worksheet.getRow(1)
    titleRow.height = 40
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'SIAMAC OWL - PLANO DE ENDEREÇAMENTO IP E CONFIGURAÇÕES DE REDE'
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B1A1A' } // Vinho institucional
    } as ExcelJS.Fill
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Subtítulo
    worksheet.mergeCells('A2:K2')
    const subRow = worksheet.getRow(2)
    subRow.height = 25
    const subCell = worksheet.getCell('A2')
    subCell.value = `Projeto: ${config.nomeProjeto || '-'}   |   Cliente: ${config.cliente || '-'}   |   Proposta/OS: ${config.codigoProposta || '-'}   |   Data: ${dataHoje}`
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFE2E8F0' } }
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF631212' } // Vinho mais escuro
    } as ExcelJS.Fill
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Linha em branco
    worksheet.getRow(3).height = 15

    // 3. Cabeçalhos da tabela principal
    const headers = [
      'Item',
      'Equipamento',
      'Descrição',
      'Local / Poste',
      'Conexão de Rede',
      'Endereço IP (Preencher)',
      'Máscara de Rede (Preencher)',
      'Gateway (Preencher)',
      'Usuário (Preencher)',
      'Senha (Preencher)',
      'Observações'
    ]

    const headerRow = worksheet.getRow(4)
    headerRow.height = 28
    headers.forEach((headerText, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = headerText
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' } // Cinza-azulado escuro
      } as ExcelJS.Fill
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      }
    })

    // 4. Linhas de dados (Display de mensagens é Ethernet RJ45, sem PoE)
    const rows: any[][] = pecasIP.map((p, idx) => {
      const nome = CATALOGO[p.tipo]?.nome || 'Equipamento'
      let local = 'Central de Comando'
      if (p.rotulo.includes(' — ')) {
        local = p.rotulo.split(' — ')[1]
      } else if (p.tipo === 'painel-automacao') {
        local = 'Central de Comando / Cabine'
      } else {
        local = 'Área da Balança'
      }
      
      const conexao = (p.tipo === 'camera-ip' || p.tipo === 'camera-ip-baixo' || p.tipo === 'camera-ocr') 
        ? 'Ethernet RJ45 (PoE)'
        : 'Ethernet RJ45'
        
      const desc = p.tipo === 'camera-ip' ? 'Câmera IP de monitoramento'
        : p.tipo === 'camera-ip-baixo' ? 'Câmera IP de Auditoria de Carga (Superior)'
        : p.tipo === 'camera-ocr' ? 'Câmera OCR leitura de placas'
        : p.tipo === 'leitor-rfid' ? 'Leitor de Antena RFID'
        : p.tipo === 'display-mensagens' ? 'Display de Mensagens de LED'
        : p.tipo === 'painel-automacao' ? 'Painel de Automação SIAMAC'
        : 'Equipamento'
        
      return [
        idx + 1,
        nome,
        desc,
        local,
        conexao,
        '', // IP
        '', // Máscara
        '', // Gateway
        '', // Usuário
        '', // Senha
        ''  // Observações
      ]
    })

    // Adiciona o Computador de Pesagem obrigatoriamente na tabela (Sempre terá)
    rows.push([
      rows.length + 1,
      'Computador',
      'Computador / Servidor de Pesagem',
      'Cabine de Pesagem / Central',
      'Ethernet RJ45',
      '', // IP
      '', // Máscara
      '', // Gateway
      '', // Usuário
      '', // Senha
      ''  // Observações
    ])

    // Adiciona a Impressora de Rede obrigatoriamente na tabela (Sempre terá)
    rows.push([
      rows.length + 1,
      'Impressora',
      'Impressora de Tickets / Relatórios',
      'Cabine de Pesagem / Central',
      'Ethernet RJ45',
      '', // IP
      '', // Máscara
      '', // Gateway
      '', // Usuário
      '', // Senha
      ''  // Observações
    ])

    // Renderizar as linhas de dados no ExcelJS
    rows.forEach((rowData, rIdx) => {
      const rowNum = rIdx + 5
      const dataRow = worksheet.getRow(rowNum)
      dataRow.height = 22
      
      const isEven = rIdx % 2 === 0
      const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'
      
      rowData.forEach((val, cIdx) => {
        const cell = dataRow.getCell(cIdx + 1)
        cell.value = val
        cell.font = { name: 'Segoe UI', size: 9.5 }
        
        // Define preenchimento da célula
        // Se for uma coluna de entrada do cliente (IP, Máscara, Gateway, Usuário, Senha, Observações), destacamos com um azul bem clarinho para sinalizar "preenchimento"
        const isClientInput = cIdx >= 5 && cIdx <= 10
        const bgHex = isClientInput ? 'FFEFF6FF' : defaultBg
        
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgHex }
        } as ExcelJS.Fill
        
        // Alinhamento
        if (cIdx === 0) { // Item
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else if (cIdx === 4) { // Conexão
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        }
        
        // Bordas finas
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      })
    })

    // 5. Adicionar cálculo de portas do switch
    const totalPortasNecessarias = pecasIP.length + 3
    
    let switchSugerido = 'Switch de 8 portas'
    if (totalPortasNecessarias <= 4) {
      switchSugerido = 'Switch de 4 portas'
    } else if (totalPortasNecessarias <= 8) {
      switchSugerido = 'Switch de 8 portas'
    } else if (totalPortasNecessarias <= 16) {
      switchSugerido = 'Switch de 16 portas'
    } else if (totalPortasNecessarias <= 24) {
      switchSugerido = 'Switch de 24 portas'
    } else {
      switchSugerido = 'Switch de 48 portas'
    }

    const startRow = rows.length + 7
    
    // Título do resumo (B a E mesclados)
    worksheet.mergeCells(`B${startRow}:E${startRow}`)
    const swTitleRow = worksheet.getRow(startRow)
    swTitleRow.height = 25
    const swTitleCell = worksheet.getCell(`B${startRow}`)
    swTitleCell.value = 'RESUMO DE PORTAS DO SWITCH / REDE'
    swTitleCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } }
    swTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' } // Cinza
    } as ExcelJS.Fill
    swTitleCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Bordas para o título do resumo
    for (let c = 2; c <= 5; c++) {
      swTitleRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      }
    }

    const switchItems = [
      ['Equipamentos IP de Campo Ativos:', `${pecasIP.length} dispositivo(s)`],
      ['Computador de Pesagem:', '1 dispositivo (obrigatório)'],
      ['Impressora de Rede:', '1 dispositivo (obrigatório)'],
      ['Porta de Uplink (Roteador/Rede Cliente):', '1 porta obrigatória'],
      ['Total de Portas Ocupadas/Necessárias:', `${totalPortasNecessarias} porta(s)`],
      ['Switch Recomendado (Capacidade Comercial):', switchSugerido]
    ]

    switchItems.forEach((item, idx) => {
      const swRowIndex = startRow + 1 + idx
      const swRow = worksheet.getRow(swRowIndex)
      swRow.height = 21
      
      // Mescla coluna B e C para a Métrica
      worksheet.mergeCells(`B${swRowIndex}:C${swRowIndex}`)
      // Mescla coluna D e E para o Valor
      worksheet.mergeCells(`D${swRowIndex}:E${swRowIndex}`)
      
      const isLast = idx === switchItems.length - 1
      const isTotal = idx === switchItems.length - 2
      
      const cellMetric = swRow.getCell(2)
      cellMetric.value = item[0]
      cellMetric.font = { name: 'Segoe UI', size: 9.5, bold: isTotal || isLast }
      
      const cellValue = swRow.getCell(4)
      cellValue.value = item[1]
      cellValue.font = { name: 'Segoe UI', size: 9.5, bold: isTotal || isLast }
      
      // Cores para as linhas de resumo
      let bgHex = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
      if (isLast) {
        bgHex = 'FFF0FDF4' // Verde claro para a recomendação
        cellMetric.font.color = { argb: 'FF166534' }
        cellValue.font.color = { argb: 'FF166534' }
      }
      
      const fillObj: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgHex }
      }
      
      cellMetric.fill = fillObj
      cellValue.fill = fillObj
      
      // Garante que as células mescladas também recebam cor e borda
      for (let c = 2; c <= 5; c++) {
        const cell = swRow.getCell(c)
        cell.fill = fillObj
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      }
      
      cellMetric.alignment = { vertical: 'middle', horizontal: 'left' }
      cellValue.alignment = { vertical: 'middle', horizontal: 'left' }
    })

    // 8. Ajustar largura das colunas
    worksheet.columns = [
      { key: 'item', width: 6 },
      { key: 'equipamento', width: 28 },
      { key: 'descricao', width: 34 },
      { key: 'local', width: 22 },
      { key: 'conexao', width: 20 },
      { key: 'ip', width: 25 },
      { key: 'mascara', width: 25 },
      { key: 'gateway', width: 25 },
      { key: 'usuario', width: 22 },
      { key: 'senha', width: 22 },
      { key: 'obs', width: 32 }
    ]

    // 9. Salvar o arquivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    const nomeProjetoSeguro = config.nomeProjeto.toLowerCase().replace(/\s+/g, '-') || 'projeto'
    const codPropostaSeguro = config.codigoProposta.toLowerCase().replace(/\s+/g, '-') || 'proposta'
    const filename = `plano-ips-${nomeProjetoSeguro}-${codPropostaSeguro}.xlsx`
    
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  const handleEmitirChecklistXLSX = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Checklist de Instalação')
    
    // Título Principal
    worksheet.mergeCells('A1:G1')
    const titleRow = worksheet.getRow(1)
    titleRow.height = 40
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'SIAMAC OWL - CHECKLIST DE COMISSIONAMENTO E INSTALAÇÃO FÍSICA'
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B1A1A' }
    } as ExcelJS.Fill
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Subtítulo
    const dataHoje = new Date().toLocaleDateString('pt-BR')
    worksheet.mergeCells('A2:G2')
    const subRow = worksheet.getRow(2)
    subRow.height = 25
    const subCell = worksheet.getCell('A2')
    subCell.value = `Projeto: ${config.nomeProjeto || '-'}   |   Cliente: ${config.cliente || '-'}   |   Proposta/OS: ${config.codigoProposta || '-'}   |   Data: ${dataHoje}`
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFE2E8F0' } }
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF631212' }
    } as ExcelJS.Fill
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Linha em branco
    worksheet.getRow(3).height = 15

    // Cabeçalhos
    const headers = [
      'Item',
      'Equipamento / Ponto',
      'Item de Verificação (Checklist)',
      'Status (C / NC / NA)',
      'Responsável',
      'Data',
      'Observações / Ações Corretivas'
    ]
    const headerRow = worksheet.getRow(4)
    headerRow.height = 28
    headers.forEach((headerText, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = headerText
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }
      } as ExcelJS.Fill
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      }
    })

    // Montar os itens de verificação agrupados por equipamento/ponto
    let itemIndex = 1
    let currentRowNum = 5

    // Função auxiliar para desenhar uma linha de seção/grupo
    const drawSectionHeader = (sectionName: string) => {
      worksheet.mergeCells(`A${currentRowNum}:G${currentRowNum}`)
      const row = worksheet.getRow(currentRowNum)
      row.height = 24
      const cell = row.getCell(1)
      cell.value = sectionName.toUpperCase()
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } }
      
      const fillObj = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' } // Cinza claro
      } as ExcelJS.Fill
      
      for (let c = 1; c <= 7; c++) {
        const cCell = row.getCell(c)
        cCell.fill = fillObj
        cCell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      currentRowNum++
    }

    // Função auxiliar para desenhar uma pergunta
    const drawChecklistItem = (pontoName: string, questionText: string) => {
      const row = worksheet.getRow(currentRowNum)
      row.height = 36 // Mais alta para caber o wrap text das perguntas
      
      const isEven = itemIndex % 2 === 0
      const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'
      
      // Colunas: Item, Equipamento, Pergunta
      const data = [
        itemIndex,
        pontoName,
        questionText,
        '', // Status
        '', // Responsável
        '', // Data
        ''  // Obs
      ]
      
      data.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1)
        cell.value = val
        cell.font = { name: 'Segoe UI', size: 9.5 }
        
        // As colunas de entrada do cliente recebem o preenchimento azul claro
        const isClientInput = cIdx >= 3 && cIdx <= 6
        const bgHex = isClientInput ? 'FFEFF6FF' : defaultBg
        
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgHex }
        } as ExcelJS.Fill
        
        if (cIdx === 0) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else if (cIdx === 3 || cIdx === 4 || cIdx === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        }
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      })
      
      itemIndex++
      currentRowNum++
    }

    // --- GRUPO 1: POSTES CIVIS E SEUS PERIFÉRICOS ---
    const siapKeys: Array<keyof ProjectConfig> = ['siap01', 'siap02', 'siap03', 'siap04', 'siap05', 'siap06', 'siap07', 'siap08', 'siap09']
    
    siapKeys.forEach((key) => {
      const isAct = config[key] === true
      if (isAct) {
        const siapNum = (key as string).replace('siap', '')
        const siapName = `POSTE SIAP${siapNum}`
        
        drawSectionHeader(siapName)
        
        // Perguntas gerais do poste
        drawChecklistItem(siapName, 'O poste foi instalado rigorosamente no nível da pista da balança (conforme aviso importante da Pág. 4)?')
        drawChecklistItem(siapName, 'O poste está perfeitamente aprumado (verticalidade verificada com nível/prumo)?')
        drawChecklistItem(siapName, 'A base de concreto está firme e o poste está rigidamente fixado com os chumbadores?')
        drawChecklistItem(siapName, 'O acabamento do material do poste (Aço Carbono Galvanizado com pintura eletrostática) está sem riscos ou danos?')

        // Adiciona perguntas para os periféricos do poste
        const siapNumPerif = (key as string).replace('siap', '')
        const perifKey = `perifericosSiap${siapNumPerif}` as keyof ProjectConfig
        const perifericos = config[perifKey] as PostePeriferico[] | undefined
        
        if (perifericos && perifericos.length > 0) {
          perifericos.forEach((perif) => {
            if (perif.tipo === 'semaforo') {
              drawChecklistItem(siapName, `Semáforo: Está fixado firmemente na altura correta (${perif.altura}m) e posicionado visivelmente para o motorista?`)
              drawChecklistItem(siapName, `Semáforo: Está conectado com cabo PP flexível de cobre, 3x2,5 mm², destinado ao acionamento dos semáforos pelo Painel SIAMAC?`)
              drawChecklistItem(siapName, 'Semáforo: As lentes indicadoras (verde e vermelha) acendem corretamente nos testes de comando?')
            } else if (perif.tipo === 'camera-ip' || perif.tipo === 'camera-ip-baixo' || perif.tipo === 'camera-ocr') {
              const labelCam = perif.tipo === 'camera-ocr' ? 'Câmera OCR' : 'Câmera IP'
              drawChecklistItem(siapName, `${labelCam}: Está fixada no suporte na altura recomendada (${perif.altura}m) e direcionada para a área de captura?`)
              drawChecklistItem(siapName, `${labelCam}: Está conectada com cabo de rede CAT6 blindado ou superior, conforme especificações de aterramento?`)
              drawChecklistItem(siapName, `${labelCam}: O prensa-cabo ou caixa de passagem técnica está hermeticamente fechado para evitar infiltração de chuva?`)
              drawChecklistItem(siapName, `${labelCam}: O foco, enquadramento e luminosidade de imagem estão operacionais no software de pesagem?`)
            } else if (perif.tipo === 'leitor-rfid') {
              drawChecklistItem(siapName, `RFID: A antena está fixada a ${perif.altura}m de altura e apontada no ângulo correto para leitura de TAG no para-brisa?`)
              drawChecklistItem(siapName, `RFID: Está conectada com cabo de rede CAT6 blindado ou superior e cabo de alimentação de cobre flexível 0,6/1 kV, 3G2,5 mm²?`)
              drawChecklistItem(siapName, 'RFID: Foi testado e verificado que não há obstáculos metálicos bloqueando a frente de leitura da antena?')
              drawChecklistItem(siapName, 'RFID: O leitor realiza a leitura de TAGs de teste com boa margem de sinal (RSSI)?')
            } else if (perif.tipo === 'display-mensagens') {
              drawChecklistItem(siapName, `Display: O painel de LED está fixado de forma segura no poste elevado de 6m?`)
              drawChecklistItem(siapName, `Display: Está alimentado via cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² e conectado à rede via cabo de rede CAT6 blindado ou superior?`)
              drawChecklistItem(siapName, 'Display: A isolação contra poeira e vedação contra chuva do gabinete do painel estão em conformidade?')
              drawChecklistItem(siapName, 'Display: As mensagens de peso e textos instrucionais são exibidos por completo sem falhas nos caracteres?')
            } else if (perif.tipo === 'sensor-emissor' || perif.tipo === 'sensor-receptor') {
              const labelSens = perif.tipo === 'sensor-emissor' ? 'Sensor Emissor' : 'Sensor Receptor'
              drawChecklistItem(siapName, `${labelSens}: Está fixado firmemente na altura regulamentada de 0,75m no poste?`)
              drawChecklistItem(siapName, `${labelSens}: Está conectado com cabo PP flexível de cobre, blindado, 4x1,5 mm² de sinal até o Painel SIAMAC?`)
              if (perif.tipo === 'sensor-receptor') {
                drawChecklistItem(siapName, 'Sensores de Barreira: O alinhamento óptico foi concluído com sucesso (LED indicador aceso no receptor)?')
                drawChecklistItem(siapName, 'Sensores de Barreira: O corte de sinal ocorre imediatamente quando o feixe é obstruído?')
              }
            } else if (perif.tipo === 'caixa-de-som') {
              drawChecklistItem(siapName, 'Caixa de Som: A corneta de som está fixada no suporte do poste e direcionada para a pista?')
              drawChecklistItem(siapName, 'Caixa de Som: Está conectada com cabo paralelo de som 2x2,5 mm² (cobre puro, não CCA) até o Painel de Som?')
              drawChecklistItem(siapName, 'Caixa de Som: A comunicação e avisos por áudio foram testados e estão claros e audíveis?')
            }
          })
        }
      }
    })

    // --- GRUPO 2: CANCELAS ---
    if (config.cancelaEntrada || config.cancelaSaida || config.rfidEntrada || config.rfidSaida) {
      if (config.cancelaEntrada) {
        drawSectionHeader('CANCELA DE ENTRADA')
        drawChecklistItem('Cancela Entrada', 'A base civil de concreto foi construída com altura de 20 cm acima do nível da pista da balança rodoviária?')
        drawChecklistItem('Cancela Entrada', 'A cancela está alimentada por cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² até o Quadro de Distribuição?')
        drawChecklistItem('Cancela Entrada', 'O cabo de comando PP flexível de cobre, blindado, 4x1,5 mm² está conectado da cancela ao Painel SIAMAC?')
        drawChecklistItem('Cancela Entrada', 'Os laços indutivos foram cortados e selados com resina na pista e conectados aos bornes detectores?')
        drawChecklistItem('Cancela Entrada', 'O braço da cancela está balanceado por mola e os interruptores de fim de curso estão calibrados?')
      }
      if (config.cancelaSaida) {
        drawSectionHeader('CANCELA DE SAÍDA')
        drawChecklistItem('Cancela Saída', 'A base civil de concreto foi construída com altura de 20 cm acima do nível da pista da balança rodoviária?')
        drawChecklistItem('Cancela Saída', 'A cancela está alimentada por cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² até o Quadro de Distribuição?')
        drawChecklistItem('Cancela Saída', 'O cabo de comando PP flexível de cobre, blindado, 4x1,5 mm² está conectado da cancela ao Painel SIAMAC?')
        drawChecklistItem('Cancela Saída', 'Os laços indutivos foram cortados e selados com resina na pista e conectados aos bornes detectores?')
        drawChecklistItem('Cancela Saída', 'O braço da cancela está balanceado por mola e os interruptores de fim de curso estão calibrados?')
      }
    }

    // --- GRUPO 3: PAINÉIS DE AUTOMAÇÃO E COMANDO ---
    if (config.painelAutomacao) {
      drawSectionHeader('PAINEL SIAMAC')
      drawChecklistItem('Painel SIAMAC', 'O painel está instalado em local seco, ventilado e devidamente protegido na sala técnica/cabine?')
      drawChecklistItem('Painel SIAMAC', 'A alimentação 220V via disjuntor com cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² está concluída?')
      drawChecklistItem('Painel SIAMAC', 'O aterramento de proteção (fio verde) está interligado ao barramento geral de terra da cabine?')
      drawChecklistItem('Painel SIAMAC', 'Todos os cabos de sinal provenientes dos sensores de barreira e cancelas estão devidamente anilhados e conectados?')
    }
    
    if (config.painelSom) {
      drawSectionHeader('PAINEL DE SOM')
      drawChecklistItem('Painel de Som', 'O painel/amplificador de som está fixado na sala técnica e alimentado via cabo de cobre flexível 0,6/1 kV, 3G2,5 mm²?')
      drawChecklistItem('Painel de Som', 'Os cabos das cornetas de áudio estão conectados e identificados nos canais correspondentes?')
    }

    // --- GRUPO 4: DISPOSITIVOS DA CABINE (COMPUTADOR E IMPRESSORA) ---
    drawSectionHeader('CENTRAL DE OPERAÇÃO (CABINE)')
    drawChecklistItem('Computador', 'O computador está ligado, conectado na rede IP e com comunicação estabelecida com o Painel SIAMAC?')
    drawChecklistItem('Computador', 'Os softwares de controle e pesagem (SIAMAC/OWL) estão instalados e licenciados?')
    drawChecklistItem('Impressora', 'A impressora de tickets de pesagem está instalada e os drivers configurados no computador de pesagem?')
    drawChecklistItem('Impressora', 'A impressão de teste de tickets foi realizada com sucesso e o corte de papel automático está funcional?')

    // --- 5. SEÇÃO DE ASSINATURAS NO FINAL ---
    const signRowStart = currentRowNum + 4
    worksheet.getRow(signRowStart).height = 18
    worksheet.mergeCells(`A${signRowStart}:C${signRowStart}`)
    worksheet.mergeCells(`E${signRowStart}:G${signRowStart}`)
    
    worksheet.getCell(`A${signRowStart}`).value = '________________________________________'
    worksheet.getCell(`E${signRowStart}`).value = '________________________________________'
    
    worksheet.getCell(`A${signRowStart}`).alignment = { horizontal: 'center' }
    worksheet.getCell(`E${signRowStart}`).alignment = { horizontal: 'center' }

    const signLabelRow = signRowStart + 1
    worksheet.getRow(signLabelRow).height = 18
    worksheet.mergeCells(`A${signLabelRow}:C${signLabelRow}`)
    worksheet.mergeCells(`E${signLabelRow}:G${signLabelRow}`)
    
    worksheet.getCell(`A${signLabelRow}`).value = 'Técnico Responsável pela Instalação'
    worksheet.getCell(`A${signLabelRow}`).font = { name: 'Segoe UI', size: 9.5, bold: true }
    worksheet.getCell(`A${signLabelRow}`).alignment = { horizontal: 'center' }

    worksheet.getCell(`E${signLabelRow}`).value = 'Representante / Cliente (Aceite Técnico)'
    worksheet.getCell(`E${signLabelRow}`).font = { name: 'Segoe UI', size: 9.5, bold: true }
    worksheet.getCell(`E${signLabelRow}`).alignment = { horizontal: 'center' }

    // Ajustar largura das colunas
    worksheet.columns = [
      { key: 'item', width: 6 },
      { key: 'equipamento', width: 28 },
      { key: 'pergunta', width: 75 },
      { key: 'status', width: 28 },
      { key: 'responsavel', width: 22 },
      { key: 'data', width: 15 },
      { key: 'obs', width: 35 }
    ]

    // Salvar o arquivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    const nomeProjetoSeguro = config.nomeProjeto.toLowerCase().replace(/\s+/g, '-') || 'projeto'
    const codPropostaSeguro = config.codigoProposta.toLowerCase().replace(/\s+/g, '-') || 'proposta'
    const filename = `checklist-instalacao-${nomeProjetoSeguro}-${codPropostaSeguro}.xlsx`
    
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  const iniciarFluxoPDF = (apenasChecklist: boolean = false) => {
    const agora = new Date()
    const dia = String(agora.getDate()).padStart(2, '0')
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = agora.getFullYear()
    const hora = String(agora.getHours()).padStart(2, '0')
    const minuto = String(agora.getMinutes()).padStart(2, '0')
    const segundo = String(agora.getSeconds()).padStart(2, '0')
    
    // O valor do store de config.revisao já está atualizado (pois ou salvamos ou já estava salvo)
    const codigoDoc = `${dia}${mes}${ano}${hora}${minuto}${segundo}-${config.revisao}`

    setPdfData({
      dataEmissao: agora,
      codigoDocumento: codigoDoc,
      apenasChecklist
    })
    setGerandoPDF(true)
  }

  const handleEmitirChecklistPDF = () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir o PDF do Checklist, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        handleSalvar()
        setTimeout(() => {
          iniciarFluxoPDF(true)
        }, 800)
      }
    } else {
      iniciarFluxoPDF(true)
    }
  }

  function handleDispararImpressao() {
    // @ts-ignore
    if (window.dimensionador && window.dimensionador.exportPdf) {
      // @ts-ignore
      return window.dimensionador.exportPdf().then((result: any) => {
        if (result && result.ok) {
          alert(`PDF exportado com sucesso para:\n${result.filePath}`)
        } else if (result && result.error && result.error !== 'cancelado') {
          alert(`Erro ao exportar PDF: ${result.error}`)
        }
        return result
      })
    } else {
      window.print()
      return Promise.resolve({ ok: true })
    }
  }

  if (gerandoPDF && pdfData) {
    return (
      <DocumentoDocumentacao
        config={config}
        dataEmissao={pdfData.dataEmissao}
        codigoDocumento={pdfData.codigoDocumento}
        apenasChecklist={pdfData.apenasChecklist}
        onFechar={() => {
          setGerandoPDF(false)
          setPdfData(null)
        }}
        onExportar={handleDispararImpressao}
      />
    )
  }

  // --- Renderização da Tela de Boas-vindas ---
  if (!projetoAtivo) {
    return (
      <div className="tela-inicio">
        <div className="inicio-header">
          <h1>SIADESK</h1>
          <p className="sub">Dimensionador de Automação de Balança Rodoviária</p>
        </div>

        <div className="inicio-grid">
          {/* Card: Criar Novo Projeto */}
          <div className="card-inicio">
            <h2>
              <span style={{ fontSize: '24px' }}>⚡</span> Criar Novo Projeto
            </h2>
            <form onSubmit={handleCriar} className="form-inicio">
              <label>
                Nome do Projeto
                <input
                  type="text"
                  placeholder="Ex: Balança Termoelétrica Sul"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </label>
              <label>
                Nome do Cliente
                <input
                  type="text"
                  placeholder="Ex: Lactalis Brasil"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                />
              </label>
              <label>
                Código da Proposta / OS
                <input
                  type="text"
                  placeholder="Ex: OWLAUT-220424"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-principal">
                Criar Projeto
              </button>
            </form>
          </div>

          {/* Card: Abrir Existente ou Recentes */}
          <div className="card-inicio">
            <h2>
              <span style={{ fontSize: '24px' }}>📂</span> Abrir Projeto
            </h2>
            
            <button 
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              Importar arquivo .json
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImportarJSON}
              accept=".json"
              style={{ display: 'none' }}
            />

            <h3 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
              Projetos Recentes
            </h3>

            <div className="recentes-lista">
              {projetosRecentes.length === 0 ? (
                <p className="sem-recentes">Nenhum projeto recente encontrado.</p>
              ) : (
                projetosRecentes.map((p) => (
                  <div key={p.id} className="recente-item" onClick={() => abrirProjeto(p.config)}>
                    <div className="recente-info">
                      <span className="recente-nome">{p.nomeProjeto}</span>
                      <span className="recente-detalhes">
                        {p.cliente} • {p.codigoProposta} • {p.dataCriacao}
                      </span>
                    </div>
                    <button 
                      className="btn-excluir-recente"
                      onClick={(e) => {
                        e.stopPropagation()
                        excluirProjetoRecente(p.id)
                      }}
                      title="Remover da lista"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Renderização da Interface Principal com Menu Superior ---
  return (
    <div className="app-container">
      {/* Menu Superior Horizontal */}
      <header className="menu-superior">
        <div className="logo-superior">
          <h2>SIADESK</h2>
          <span>{config.nomeProjeto}</span>
          {isDirty && <span className="status-dirty">Não Salvo</span>}
        </div>

        <nav className="abas-superiores">
          <button
            className={abaAtiva === 'projeto' ? 'active' : ''}
            onClick={() => setAbaAtiva('projeto')}
          >
            📋 Projeto
          </button>
          <button
            className={abaAtiva === 'postes' ? 'active' : ''}
            onClick={() => setAbaAtiva('postes')}
          >
            🛢️ Equipamentos
          </button>
          <button
            className={abaAtiva === 'calibracao' ? 'active' : ''}
            onClick={() => setAbaAtiva('calibracao')}
          >
            ⚙️ Calibrar
          </button>
        </nav>

        <div className="acoes-superiores">
          <button 
            className="btn-principal" 
            style={{ padding: '7px 14px', fontSize: '12px', marginTop: 0 }}
            onClick={handleSalvar}
          >
            💾 Salvar Projeto (.json)
          </button>
          <div className="dropdown-emitir" style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              className="btn-emitir-pdf"
              style={{ padding: '7px 14px', fontSize: '12px', marginTop: 0 }}
              onClick={() => setDropdownAberto(!dropdownAberto)}
            >
              📄 Emitir documentos ▾
            </button>
            {dropdownAberto && (
              <>
                <div 
                  className="dropdown-overlay" 
                  onClick={() => setDropdownAberto(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    background: 'transparent'
                  }}
                />
                <div className="dropdown-menu-emitir" style={{ zIndex: 1000 }}>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirPDF(); }}>
                    📄 Relatório Técnico (PDF)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirXLSX(); }}>
                    📊 Planilha de IPs (XLSX)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirChecklistPDF(); }}>
                    ✅ Checklist de Instalação (PDF)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirChecklistXLSX(); }}>
                    📊 Checklist de Instalação (XLSX)
                  </button>
                </div>
              </>
            )}
          </div>
          <button 
            className="btn-sair"
            onClick={fecharProjeto}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal (Painel Lateral + Cena 3D) */}
      <div className="conteudo-principal">
        <ConfigPanel />
        <main className="viewport" style={{ flex: 1, height: '100%', position: 'relative' }}>
          <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarRotulos}
                onChange={(e) => setMostrarRotulos(e.target.checked)}
              />
              Mostrar rótulos
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarGrades}
                onChange={(e) => setMostrarGrades(e.target.checked)}
              />
              Mostrar grades
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarPista}
                onChange={(e) => setMostrarPista(e.target.checked)}
              />
              Mostrar pista
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarGrama}
                onChange={(e) => setMostrarGrama(e.target.checked)}
              />
              Mostrar grama
            </label>
          </div>
          <Scene
            mostrarRotulos={mostrarRotulos}
            mostrarGrades={mostrarGrades}
            mostrarPista={mostrarPista}
            mostrarGrama={mostrarGrama}
          />
        </main>
      </div>
    </div>
  )
}
