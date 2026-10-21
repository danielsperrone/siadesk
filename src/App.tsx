import { alturaPoste as obterAlturaPoste, itensAdicionaisFornecidos } from './layout/postes'
import { requestSave, confirmLeave, openLocalProject } from './projects/commands'
import { SiadeskBrand } from './components/SiadeskBrand'
import { useSession } from './cloud/session'
import { IndicadorPeso } from './simulator/InterfaceBalanca'
import { ModoApresentacao } from './simulator/ModoApresentacao'
import { useState, useRef, useEffect } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { Scene } from './components/Scene'
import { useProject } from './store/project'
import { DocumentoDocumentacao } from './components/DocumentoDocumentacao'
import ExcelJS from 'exceljs'
import { gerarLayout } from './layout/engine'
import { CATALOGO } from './catalog/pieces'
import type { ProjectConfig, PostePeriferico } from './types'
import { abrirEtiquetas, criarProjetoEtiquetas } from './labels/project-labels'

export default function App() {
  const canCalibrate = useSession(s => !!s.user?.admin)
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
  const [usarTemplate, setUsarTemplate] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const projetoAtivo = useProject((s) => s.projetoAtivo)
  const config = useProject((s) => s.config)
  const abaAtiva = useProject((s) => s.abaAtiva)
  const modoApresentacao = useProject(s => s.modoApresentacao)
  const setModoApresentacao = useProject(s => s.setModoApresentacao)
  const setAbaAtiva = useProject((s) => s.setAbaAtiva)
  const criarNovoProjeto = useProject((s) => s.criarNovoProjeto)
  const abrirProjeto = useProject((s) => s.abrirProjeto)
  const fecharProjeto = useProject((s) => s.fecharProjeto)
  const projetosRecentes = useProject((s) => s.projetosRecentes)
  const excluirProjetoRecente = useProject((s) => s.excluirProjetoRecente)
  const isDirty = useProject((s) => s.isDirty)

  // Estados para emissão do PDF
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [pdfData, setPdfData] = useState<{ dataEmissao: Date; codigoDocumento: string; tipoDocumento?: 'tecnico' | 'instalacao' | 'compra' | 'picklist' } | null>(null)
  const calibracoes = useProject((s) => s.calibracoes)
  const [dropdownAberto, setDropdownAberto] = useState(false)

  const handleEtiquetas = async () => {
    setDropdownAberto(false)
    try {
      await abrirEtiquetas(criarProjetoEtiquetas(config, gerarLayout(config, calibracoes)))
    } catch (error) { alert(error instanceof Error ? error.message : 'Não foi possível abrir as etiquetas.') }
  }


  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim() || !novoCliente.trim() || !novoCodigo.trim()) {
      alert('Por favor, preencha todos os campos para criar o projeto.')
      return
    }
    criarNovoProjeto(novoNome, novoCliente, novoCodigo, usarTemplate)
    // Limpa os campos do formulário
    setNovoNome('')
    setNovoCliente('')
    setNovoCodigo('')
    setUsarTemplate(false)
  }

  const handleImportarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.nomeProjeto !== undefined && parsed.cliente !== undefined) {
          openLocalProject(parsed)
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

  const handleSalvar = () => requestSave()

  const handleEmitirPDF = async () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir o PDF, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        if (!await handleSalvar()) return
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
      'painel-automacao',
      'painel-som',
      'balanca'
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
      const saved=config.etiquetas?.equipamentos.find(e=>e.id===p.id)
      const nome = saved?.nome || CATALOGO[p.tipo]?.nome || 'Equipamento'
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
        : p.tipo === 'painel-som' ? 'Painel de Som'
        : p.tipo === 'balanca' ? 'Balança rodoviária'
        : 'Equipamento'
        
      return [
        idx + 1,
        nome,
        desc,
        local,
        conexao,
        saved?.ip || '', // IP
        '', // Máscara
        '', // Gateway
        p.tipo==='balanca'?'não se aplica':saved?.username||'',
        p.tipo==='balanca'?'não se aplica':saved?.password||'',
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

    for (const poste of config.postesAdicionais ?? []) {
      drawSectionHeader(poste.nome)
      drawChecklistItem(poste.nome, `A estrutura está fixada ao chão, aprumada e com a altura prevista de ${poste.altura} m?`)
      for (const p of poste.perifericos) drawChecklistItem(poste.nome, `${CATALOGO[p.tipo].nome}: fixação, cabeamento, orientação e funcionamento conferidos a ${p.montagem === 'barra-superior' ? poste.altura : p.altura} m de altura?`)
    }

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

  const handleEmitirListaCompraXLSX = async () => {
    console.log('Emitindo Lista de Compra. Equipamentos adicionais no estado:', config.equipamentosAdicionais)
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Lista de Compra')
    
    // Título Principal
    worksheet.mergeCells('A1:G1')
    const titleRow = worksheet.getRow(1)
    titleRow.height = 40
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'SIAMAC OWL - LISTA DE COMPRA (SEPARAÇÃO E ESTOQUE)'
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Azul Siamac
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
      fgColor: { argb: 'FF172554' } // Azul mais escuro
    } as ExcelJS.Fill
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Linha em branco
    worksheet.getRow(3).height = 15

    // Cabeçalhos
    const headers = [
      'Item',
      'Equipamento / Ponto',
      'Descrição do Item a Fornecer',
      'Quantidade',
      'Tem em Estoque?',
      'Comprar?',
      'Observações / Ações Corretivas'
    ]
    const headerRow = worksheet.getRow(4)
    headerRow.height = 28
    headers.forEach((headerText, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = headerText
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
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

    // Obter itens de compra agrupados
    const obterItensCompra = () => {
      const itensAgrupados: Record<string, { ponto: string; pergunta: string; quantidade: number }> = {}

      const adicionarAoGrupo = (ponto: string, pergunta: string) => {
        if (itensAgrupados[ponto]) {
          itensAgrupados[ponto].quantidade += 1
        } else {
          itensAgrupados[ponto] = {
            ponto,
            pergunta,
            quantidade: 1
          }
        }
      }

      // 1. Painéis Centrais (Sempre da SIAMAC)
      if (config.painelAutomacao) {
        adicionarAoGrupo('Painel SIAMAC (Automação)', 'Painel concentrador de cabos e comando de automação')
      }
      if (config.painelSom) {
        adicionarAoGrupo('Painel de Som', 'Painel amplificador e reprodutor de áudio para pesagem')
      }

      // 2. Cancelas
      let cancelasSiamac = 0
      if (config.cancelaEntrada && config.fornecimentoSiamacCancelaEntrada !== false) {
        cancelasSiamac++
      }
      if (config.cancelaSaida && config.fornecimentoSiamacCancelaSaida !== false) {
        cancelasSiamac++
      }
      if (cancelasSiamac > 0) {
        for (let i = 0; i < cancelasSiamac; i++) {
          adicionarAoGrupo('Cancela Automática', 'Cancela automática e barreira de controle físico')
        }
      }

      // 3. Postes e seus periféricos
      const siapKeys = ['siap01', 'siap02', 'siap03', 'siap04', 'siap05', 'siap06', 'siap07', 'siap08', 'siap09']
      siapKeys.forEach((key) => {
        const siapNum = key.replace('siap', '')
        const isPosteAtivo = config[key as keyof ProjectConfig] === true
        const isPosteFornecido = config[`fornecimentoSiamacSiap${siapNum}` as keyof ProjectConfig] !== false

        // Poste em si
        if (isPosteAtivo && isPosteFornecido) {
          const alturaPoste = `${obterAlturaPoste(config, `siap${siapNum}`)}m`
          adicionarAoGrupo(`Poste SIAP (${alturaPoste})`, `Poste de sustentação metálico galvanizado de ${alturaPoste}`)
        }

        // Periféricos
        if (isPosteAtivo) {
          const perifKey = `perifericosSiap${siapNum}` as keyof ProjectConfig
          const perifericos = config[perifKey] as PostePeriferico[] | undefined
          if (perifericos && perifericos.length > 0) {
            perifericos.forEach((perif) => {
              if (perif.fornecimentoSiamac !== false) {
                const tipoReal = perif.tipo === 'camera-ip-baixo' ? 'camera-ip' : perif.tipo
                const nomePerif = CATALOGO[tipoReal]?.nome || 'Equipamento'
                const descPerif = CATALOGO[tipoReal]?.descricao || 'Equipamento periférico'
                adicionarAoGrupo(nomePerif, descPerif)
              }
            })
          }
        }
      })

      for (const item of itensAdicionaisFornecidos(config)) {
        const equipamento = Object.values(CATALOGO).find(p => p.id === item.nome)
        adicionarAoGrupo(equipamento?.nome ?? item.nome, equipamento?.descricao ?? item.descricao)
      }

      // 4. Equipamentos Adicionais
      if (config.equipamentosAdicionais && config.equipamentosAdicionais.length > 0) {
        config.equipamentosAdicionais.forEach((eq) => {
          if (eq.quantidade > 0) {
            const ponto = eq.nome
            const pergunta = 'Equipamento / material adicional do projeto'
            if (itensAgrupados[ponto]) {
              itensAgrupados[ponto].quantidade += eq.quantidade
            } else {
              itensAgrupados[ponto] = {
                ponto,
                pergunta,
                quantidade: eq.quantidade
              }
            }
          }
        })
      }

      return Object.values(itensAgrupados)
    }

    const itens = obterItensCompra()
    let currentRowNum = 5

    itens.forEach((item, idx) => {
      const row = worksheet.getRow(currentRowNum)
      row.height = 28
      
      const isEven = idx % 2 === 0
      const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'
      
      const cellItem = row.getCell(1)
      cellItem.value = idx + 1
      cellItem.alignment = { vertical: 'middle', horizontal: 'center' }
      
      const cellPonto = row.getCell(2)
      cellPonto.value = item.ponto
      cellPonto.font = { name: 'Segoe UI', bold: true, size: 9.5 }
      cellPonto.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const cellPergunta = row.getCell(3)
      cellPergunta.value = item.pergunta
      cellPergunta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const cellQtd = row.getCell(4)
      cellQtd.value = item.quantidade
      cellQtd.font = { name: 'Segoe UI', bold: true, size: 9.5, color: { argb: 'FF1E3A8A' } }
      cellQtd.alignment = { vertical: 'middle', horizontal: 'center' }

      // Células de entrada (Tem em Estoque / Comprar / Obs)
      const cellEst = row.getCell(5)
      cellEst.value = ''
      cellEst.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
      cellEst.alignment = { vertical: 'middle', horizontal: 'center' }

      const cellCom = row.getCell(6)
      cellCom.value = ''
      cellCom.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
      cellCom.alignment = { vertical: 'middle', horizontal: 'center' }

      const cellObs = row.getCell(7)
      cellObs.value = ''
      cellObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
      cellObs.alignment = { vertical: 'middle', horizontal: 'left' }

      // Aplicar fontes e bordas a todas
      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c)
        if (c <= 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } } as ExcelJS.Fill
        }
        cell.font = { name: 'Segoe UI', size: 9.5, bold: c === 2 || c === 4 }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      }

      currentRowNum++
    })

    // Assinaturas
    currentRowNum += 2
    worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`)
    worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`)
    
    worksheet.getCell(`A${currentRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
    worksheet.getCell(`E${currentRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }

    currentRowNum++
    const signLabelRow = worksheet.getRow(currentRowNum)
    signLabelRow.height = 20
    
    worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`)
    worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`)

    worksheet.getCell(`A${currentRowNum}`).value = 'Responsável pelo Estoque (Almoxarifado)'
    worksheet.getCell(`A${currentRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
    worksheet.getCell(`A${currentRowNum}`).alignment = { horizontal: 'center' }

    worksheet.getCell(`E${currentRowNum}`).value = 'Responsável Suprimentos (Compras)'
    worksheet.getCell(`E${currentRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
    worksheet.getCell(`E${currentRowNum}`).alignment = { horizontal: 'center' }

    // Ajustar largura das colunas
    worksheet.columns = [
      { key: 'item', width: 6 },
      { key: 'equipamento', width: 28 },
      { key: 'descricao', width: 50 },
      { key: 'quantidade', width: 14 },
      { key: 'estoque', width: 18 },
      { key: 'comprar', width: 18 },
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
    const filename = `lista-compra-${nomeProjetoSeguro}-${codPropostaSeguro}.xlsx`
    
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  const handleEmitirPicklistXLSX = async () => {
    console.log('Emitindo Picklist de Carga. Equipamentos adicionais no estado:', config.equipamentosAdicionais)
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Picklist de Carga')
    
    // Título Principal
    worksheet.mergeCells('A1:H1')
    const titleRow = worksheet.getRow(1)
    titleRow.height = 40
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'SIAMAC OWL - PICKLIST (CONFERÊNCIA DE CARGA)'
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' } // Verde Siamac Owl
    } as ExcelJS.Fill
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Subtítulo
    const dataHoje = new Date().toLocaleDateString('pt-BR')
    worksheet.mergeCells('A2:H2')
    const subRow = worksheet.getRow(2)
    subRow.height = 25
    const subCell = worksheet.getCell('A2')
    subCell.value = `Projeto: ${config.nomeProjeto || '-'}   |   Cliente: ${config.cliente || '-'}   |   Proposta/OS: ${config.codigoProposta || '-'}   |   Data: ${dataHoje}`
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFE2E8F0' } }
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14532D' } // Verde mais escuro
    } as ExcelJS.Fill
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Linha em branco
    worksheet.getRow(3).height = 15

    // Cabeçalhos
    const headers = [
      'Item',
      'Equipamento / Material',
      'Descrição',
      'Quantidade',
      'Em Estoque?',
      'Na Carga?',
      'Caixa Nº / Embalagem',
      'Observações'
    ]
    const headerRow = worksheet.getRow(4)
    headerRow.height = 28
    headers.forEach((headerText, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = headerText
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
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

    // Obter itens agrupados do Picklist
    const obterItensPicklist = () => {
      const itensAgrupados: Record<string, { ponto: string; pergunta: string; quantidade: number }> = {}

      const adicionarAoGrupo = (ponto: string, pergunta: string) => {
        if (itensAgrupados[ponto]) {
          itensAgrupados[ponto].quantidade += 1
        } else {
          itensAgrupados[ponto] = {
            ponto,
            pergunta,
            quantidade: 1
          }
        }
      }

      // 1. Painéis Centrais (Sempre da SIAMAC)
      if (config.painelAutomacao) {
        adicionarAoGrupo('Painel SIAMAC (Automação)', 'Painel concentrador de cabos e comando de automação')
      }
      if (config.painelSom) {
        adicionarAoGrupo('Painel de Som', 'Painel amplificador e reprodutor de áudio para pesagem')
      }

      // 2. Cancelas
      let cancelasSiamac = 0
      if (config.cancelaEntrada && config.fornecimentoSiamacCancelaEntrada !== false) {
        cancelasSiamac++
      }
      if (config.cancelaSaida && config.fornecimentoSiamacCancelaSaida !== false) {
        cancelasSiamac++
      }
      if (cancelasSiamac > 0) {
        for (let i = 0; i < cancelasSiamac; i++) {
          adicionarAoGrupo('Cancela Automática', 'Cancela automática e barreira de controle físico')
        }
      }

      // 3. Postes e seus periféricos
      const siapKeys = ['siap01', 'siap02', 'siap03', 'siap04', 'siap05', 'siap06', 'siap07', 'siap08', 'siap09']
      siapKeys.forEach((key) => {
        const siapNum = key.replace('siap', '')
        const isPosteAtivo = config[key as keyof ProjectConfig] === true
        const isPosteFornecido = config[`fornecimentoSiamacSiap${siapNum}` as keyof ProjectConfig] !== false

        // Poste em si
        if (isPosteAtivo && isPosteFornecido) {
          const alturaPoste = `${obterAlturaPoste(config, `siap${siapNum}`)}m`
          adicionarAoGrupo(`Poste SIAP (${alturaPoste})`, `Poste de sustentação metálico galvanizado de ${alturaPoste}`)
        }

        // Periféricos
        if (isPosteAtivo) {
          const perifKey = `perifericosSiap${siapNum}` as keyof ProjectConfig
          const perifericos = config[perifKey] as PostePeriferico[] | undefined
          if (perifericos && perifericos.length > 0) {
            perifericos.forEach((perif) => {
              if (perif.fornecimentoSiamac !== false) {
                const tipoReal = perif.tipo === 'camera-ip-baixo' ? 'camera-ip' : perif.tipo
                const nomePerif = CATALOGO[tipoReal]?.nome || 'Equipamento'
                const descPerif = CATALOGO[tipoReal]?.descricao || 'Equipamento periférico'
                adicionarAoGrupo(nomePerif, descPerif)
              }
            })
          }
        }
      })

      for (const item of itensAdicionaisFornecidos(config)) {
        const equipamento = Object.values(CATALOGO).find(p => p.id === item.nome)
        adicionarAoGrupo(equipamento?.nome ?? item.nome, equipamento?.descricao ?? item.descricao)
      }

      // 4. Equipamentos Adicionais
      if (config.equipamentosAdicionais && config.equipamentosAdicionais.length > 0) {
        config.equipamentosAdicionais.forEach((eq) => {
          if (eq.quantidade > 0) {
            const ponto = eq.nome
            const pergunta = 'Equipamento / material adicional do projeto'
            if (itensAgrupados[ponto]) {
              itensAgrupados[ponto].quantidade += eq.quantidade
            } else {
              itensAgrupados[ponto] = {
                ponto,
                pergunta,
                quantidade: eq.quantidade
              }
            }
          }
        })
      }

      return Object.values(itensAgrupados)
    }

    const itens = obterItensPicklist()
    let currentRowNum = 5

    itens.forEach((item, idx) => {
      const row = worksheet.getRow(currentRowNum)
      row.height = 28
      
      const isEven = idx % 2 === 0
      const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'
      
      const cellItem = row.getCell(1)
      cellItem.value = idx + 1
      cellItem.alignment = { vertical: 'middle', horizontal: 'center' }
      
      const cellPonto = row.getCell(2)
      cellPonto.value = item.ponto
      cellPonto.font = { name: 'Segoe UI', bold: true, size: 9.5 }
      cellPonto.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const cellPergunta = row.getCell(3)
      cellPergunta.value = item.pergunta
      cellPergunta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const cellQtd = row.getCell(4)
      cellQtd.value = item.quantidade
      cellQtd.font = { name: 'Segoe UI', bold: true, size: 9.5, color: { argb: 'FF16A34A' } }
      cellQtd.alignment = { vertical: 'middle', horizontal: 'center' }

      // Células de entrada (Estoque / Carga / Caixa / Obs)
      for (let c = 5; c <= 8; c++) {
        const cell = row.getCell(c)
        cell.value = ''
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
      }
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' }
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' }
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' }

      // Aplicar fontes e bordas a todas
      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c)
        if (c <= 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } } as ExcelJS.Fill
        }
        cell.font = { name: 'Segoe UI', size: 9.5, bold: c === 2 || c === 4 }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      }

      currentRowNum++
    })

    // Assinaturas
    currentRowNum += 2
    worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`)
    worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`)
    
    worksheet.getCell(`A${currentRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
    worksheet.getCell(`E${currentRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }

    currentRowNum++
    const signLabelRow = worksheet.getRow(currentRowNum)
    signLabelRow.height = 20
    
    worksheet.mergeCells(`A${currentRowNum}:C${currentRowNum}`)
    worksheet.mergeCells(`E${currentRowNum}:G${currentRowNum}`)

    worksheet.getCell(`A${currentRowNum}`).value = 'Responsável pela Separação (Conferência)'
    worksheet.getCell(`A${currentRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
    worksheet.getCell(`A${currentRowNum}`).alignment = { horizontal: 'center' }

    worksheet.getCell(`E${currentRowNum}`).value = 'Conferido por (Expedição / Motorista)'
    worksheet.getCell(`E${currentRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
    worksheet.getCell(`E${currentRowNum}`).alignment = { horizontal: 'center' }

    // Ajustar largura das colunas
    worksheet.columns = [
      { key: 'item', width: 6 },
      { key: 'equipamento', width: 28 },
      { key: 'descricao', width: 50 },
      { key: 'quantidade', width: 14 },
      { key: 'estoque', width: 16 },
      { key: 'carga', width: 16 },
      { key: 'caixa', width: 22 },
      { key: 'obs', width: 30 }
    ]


    // ----------------------------------------------------
    // ABA 2: CHECKLIST INTERNO DE TESTES
    // ----------------------------------------------------
    const obterInstanciasPeriferico = (tipo: string) => {
      const instancias: Array<{ tipo: string; poste: string; altura: number }> = []
      const siapKeys = ['siap01', 'siap02', 'siap03', 'siap04', 'siap05', 'siap06', 'siap07', 'siap08', 'siap09']
      siapKeys.forEach((key) => {
        const isPosteAtivo = config[key as keyof ProjectConfig] === true
        if (!isPosteAtivo) return
        const siapNum = (key as string).replace('siap', '')
        const perifKey = `perifericosSiap${siapNum}` as keyof ProjectConfig
        const perifericos = config[perifKey] as PostePeriferico[] | undefined
        perifericos?.forEach((p) => {
          if (p.tipo === tipo && p.fornecimentoSiamac !== false) {
            instancias.push({
              tipo: p.tipo,
              poste: `SIAP${siapNum}`,
              altura: p.altura
            })
          }
        })
      })
      for (const poste of config.postesAdicionais ?? []) for (const p of poste.perifericos) {
        if (p.tipo === tipo && p.fornecimentoSiamac !== false) instancias.push({ tipo: p.tipo, poste: poste.nome,
          altura: p.montagem === 'barra-superior' ? poste.altura : p.altura })
      }
      return instancias
    }

    const secoes = []

    // 1. Painel SIAMAC
    if (config.painelAutomacao) {
      secoes.push({
        titulo: 'Painel SIAMAC',
        perguntas: [
          { texto: 'Foi configurado o IP do CLP?', tipo: 'check' },
          { texto: 'A fonte foi configurada para 220v?', tipo: 'check' },
          { texto: 'O cabo de programação do CLP está presente dentro do painel?', tipo: 'check' },
          { texto: 'A chave de ativação do modo manual está dentro do painel?', tipo: 'check' },
          { texto: 'O painel está íntegro?', tipo: 'check' },
          { texto: 'A senha do CLP foi colocada no Pipese?', tipo: 'check' },
          { texto: 'Qual a senha do CLP?', tipo: 'texto' },
          { texto: 'O CLP está com o módulo de expansão conectado?', tipo: 'check' },
          { texto: 'Ao tentar abrir as cancelas, ele está chaveando os bornes de abrir da cancela A e B?', tipo: 'check' },
          { texto: 'Ao tentar fechar as cancelas, ele está chaveando os bornes de abrir da cancela A e B?', tipo: 'check' },
          { texto: 'Ao mudar o status dos semáforos no software, está chaveando os bornes correspondentes do painel?', tipo: 'check' },
          { texto: 'Quando o sensor está alinhado a luz do painel do sensor acende (para todos sensores)?', tipo: 'check' },
          { texto: 'Está saindo 24v nos pinos de saída de 24v?', tipo: 'check' },
          { texto: 'O painel está com a proteção nos sinaleiros?', tipo: 'check' }
        ]
      })
    }

    // 2. Cancela Automática
    const cancelas: string[] = []
    if (config.cancelaEntrada && config.fornecimentoSiamacCancelaEntrada !== false) cancelas.push('Entrada')
    if (config.cancelaSaida && config.fornecimentoSiamacCancelaSaida !== false) cancelas.push('Saída')

    if (cancelas.length > 1) {
      cancelas.forEach((cancela) => {
        secoes.push({
          titulo: `Para cancela automática (${cancela})`,
          perguntas: [
            { texto: `A cancela de ${cancela.toLowerCase()} encontra-se com todas as proteções da caixa?`, tipo: 'check' },
            { texto: `Essa cancela de ${cancela.toLowerCase()} foi testada?`, tipo: 'check' }
          ]
        })
      })
    } else if (cancelas.length === 1) {
      secoes.push({
        titulo: 'Para cancela automática',
        perguntas: [
          { texto: 'A cancela encontra-se com todas as proteções da caixa?', tipo: 'check' },
          { texto: 'Essa cancela foi testada?', tipo: 'check' }
        ]
      })
    }

    // 3. Leitor Antena RFID
    const rfids = obterInstanciasPeriferico('leitor-rfid')
    if (rfids.length > 1) {
      rfids.forEach((rfid) => {
        secoes.push({
          titulo: `Para Leitor Antena RFID (${rfid.poste})`,
          perguntas: [
            { texto: `Foi configurado o IP da antena do ${rfid.poste}?`, tipo: 'check' },
            { texto: `Foi configurado os parâmetros de leitura da antena do ${rfid.poste} conforme ensina em wiki.siamac.com.br?`, tipo: 'check' },
            { texto: `A antena do ${rfid.poste} bipa e pisca uma luz continuamente ao passar a TAG pela frente?`, tipo: 'check' },
            { texto: `É possível conectar a antena do ${rfid.poste} no OWL?`, tipo: 'check' },
            { texto: `A antena do ${rfid.poste} está embalada e protegida para transporte?`, tipo: 'check' }
          ]
        })
      })
    } else if (rfids.length === 1) {
      secoes.push({
        titulo: 'Para Leitor Antena RFID',
        perguntas: [
          { texto: 'Foi configurado o IP da antena?', tipo: 'check' },
          { texto: 'Foi configurado os parâmetros de leitura da antena conforme ensina em wiki.siamac.com.br?', tipo: 'check' },
          { texto: 'A antena bipa e pisca uma luz continuamente ao passar a TAG pela frente?', tipo: 'check' },
          { texto: 'É possível conectar a antena no OWL?', tipo: 'check' },
          { texto: 'A antena está embalada e protegida para transporte?', tipo: 'check' }
        ]
      })
    }

    // 4. Display de Mensagens
    const displays = obterInstanciasPeriferico('display-mensagens')
    if (displays.length > 1) {
      displays.forEach((disp) => {
        secoes.push({
          titulo: `Para Display de Mensagens (${disp.poste})`,
          perguntas: [
            { texto: `Foi configurado o IP do display do ${disp.poste}?`, tipo: 'check' },
            { texto: `Ao desligar, aguardar 60 segundos e ligar, aparece a mensagem SIAMAC .::. www.siamac.com.br no display do ${disp.poste}?`, tipo: 'check' },
            { texto: `Foi possível conectar o display do ${disp.poste} no OWL?`, tipo: 'check' }
          ]
        })
      })
    } else if (displays.length === 1) {
      secoes.push({
        titulo: 'Para Display de Mensagens',
        perguntas: [
          { texto: 'Foi configurado o IP?', tipo: 'check' },
          { texto: 'Ao desligar, aguardar 60 segundos e ligar, aparece a mensagem SIAMAC .::. www.siamac.com.br?', tipo: 'check' },
          { texto: 'Foi possível conectar o display no OWL?', tipo: 'check' }
        ]
      })
    }

    // 5. Semáforo
    const semaforos = obterInstanciasPeriferico('semaforo')
    if (semaforos.length > 1) {
      semaforos.forEach((sem) => {
        secoes.push({
          titulo: `Para o Semáforo (${sem.poste})`,
          perguntas: [
            { texto: `Foi feito o rabicho do conector do semáforo do ${sem.poste}?`, tipo: 'check' },
            { texto: `Foi testado todos os leds direto no rabicho do semáforo do ${sem.poste} usando 24v?`, tipo: 'check' },
            { texto: `O semáforo do ${sem.poste} está bem embalado para viagem?`, tipo: 'check' },
            { texto: `O semáforo do ${sem.poste} está íntegro e sem defeitos?`, tipo: 'check' }
          ]
        })
      })
    } else if (semaforos.length === 1) {
      secoes.push({
        titulo: 'Para o Semáforo',
        perguntas: [
          { texto: 'Foi feito o rabicho do conector?', tipo: 'check' },
          { texto: 'Foi testado todos os leds direto no rabicho usando 24v?', tipo: 'check' },
          { texto: 'Está bem embalado para viagem?', tipo: 'check' },
          { texto: 'Está íntegro e sem defeitos?', tipo: 'check' }
        ]
      })
    }

    // 6. Caixas de Som
    if (config.painelSom) {
      secoes.push({
        titulo: 'Para Caixas de som',
        perguntas: [
          { texto: 'Foi testado junto ao painel?', tipo: 'check' },
          { texto: 'Está bem embalada?', tipo: 'check' }
        ]
      })
    }

    // 7. Câmeras OCR
    const ocrs = obterInstanciasPeriferico('camera-ocr')
    if (ocrs.length > 1) {
      ocrs.forEach((ocr) => {
        secoes.push({
          titulo: `Para Câmeras OCR (${ocr.poste})`,
          perguntas: [
            { texto: `Foi configurado o IP da câmera OCR do ${ocr.poste}?`, tipo: 'check' },
            { texto: `Foi configurado o usuário e senha e foi adicionado no Pipese essa informação para o ${ocr.poste}?`, tipo: 'check' },
            { texto: `Qual a senha da câmera OCR do ${ocr.poste}?`, tipo: 'texto' },
            { texto: `Foi feito testes de leitura da câmera OCR do ${ocr.poste}?`, tipo: 'check' },
            { texto: `Foi possível conectar a câmera OCR do ${ocr.poste} no OWL?`, tipo: 'check' }
          ]
        })
      })
    } else if (ocrs.length === 1) {
      secoes.push({
        titulo: 'Para Câmeras OCR',
        perguntas: [
          { texto: 'Foi configurado o IP?', tipo: 'check' },
          { texto: 'Foi configurado o usuário e senha e foi adicionado no Pipese essa informação?', tipo: 'check' },
          { texto: 'Qual a senha da câmera OCR?', tipo: 'texto' },
          { texto: 'Foi feito testes de leitura?', tipo: 'check' },
          { texto: 'Foi possível conectar no OWL?', tipo: 'check' }
        ]
      })
    }

    // 8. Câmeras IP e Auditoria
    const ips = obterInstanciasPeriferico('camera-ip')
    const baixos = obterInstanciasPeriferico('camera-ip-baixo')
    const todasIps = [...ips, ...baixos]

    if (todasIps.length > 1) {
      todasIps.forEach((cam) => {
        const nomeCam = cam.tipo === 'camera-ip-baixo' ? 'Câmera IP Auditoria' : 'Câmera IP'
        secoes.push({
          titulo: `Para ${nomeCam} (${cam.poste})`,
          perguntas: [
            { texto: `Foi configurado o IP da ${nomeCam.toLowerCase()} do ${cam.poste}?`, tipo: 'check' },
            { texto: `Foi configurado o usuário e senha da ${nomeCam.toLowerCase()} do ${cam.poste}?`, tipo: 'check' },
            { texto: `Qual o usuário e senha da ${nomeCam.toLowerCase()} do ${cam.poste}?`, tipo: 'texto' },
            { texto: `Foi adicionado o usuário e senha no Pipese da ${nomeCam.toLowerCase()} do ${cam.poste}?`, tipo: 'check' },
            { texto: `Foi possível conectar a ${nomeCam.toLowerCase()} do ${cam.poste} no OWL?`, tipo: 'check' }
          ]
        })
      })
    } else if (todasIps.length === 1) {
      const cam = todasIps[0]
      const nomeCam = cam.tipo === 'camera-ip-baixo' ? 'Câmera IP de Auditoria de Carga Superior' : 'Câmera IP'
      secoes.push({
        titulo: `Para ${nomeCam}`,
        perguntas: [
          { texto: 'Foi configurado o IP?', tipo: 'check' },
          { texto: 'Foi configurado o usuário e senha?', tipo: 'check' },
          { texto: 'Qual o usuário e senha?', tipo: 'texto' },
          { texto: 'Foi adicionado o usuário e senha no Pipese?', tipo: 'check' },
          { texto: 'Foi possível conectar no OWL?', tipo: 'check' }
        ]
      })
    }

    if (secoes.length > 0) {
      const testWorksheet = workbook.addWorksheet('Testes Técnicos Internos')
      
      // Título da Aba de Testes
      testWorksheet.mergeCells('A1:D1')
      const testTitleRow = testWorksheet.getRow(1)
      testTitleRow.height = 40
      const testTitleCell = testWorksheet.getCell('A1')
      testTitleCell.value = 'SIAMAC OWL - CHECKLIST INTERNO DE TESTES E CONFIGURAÇÕES'
      testTitleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
      testTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' } // Azul escuro
      } as ExcelJS.Fill
      testTitleCell.alignment = { vertical: 'middle', horizontal: 'center' }

      // Subtítulo
      testWorksheet.mergeCells('A2:D2')
      const testSubRow = testWorksheet.getRow(2)
      testSubRow.height = 25
      const testSubCell = testWorksheet.getCell('A2')
      testSubCell.value = `Projeto: ${config.nomeProjeto || '-'}   |   Cliente: ${config.cliente || '-'}   |   Fábrica / Expedição`
      testSubCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFE2E8F0' } }
      testSubCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      } as ExcelJS.Fill
      testSubCell.alignment = { vertical: 'middle', horizontal: 'center' }

      // Linha em branco
      testWorksheet.getRow(3).height = 15

      // Cabeçalhos
      const tHeaders = ['Categoria / Equipamento', 'Item de Verificação (Checklist)', 'Status (SIM / NÃO)', 'Valores / Informações Preenchidas']
      const tHeaderRow = testWorksheet.getRow(4)
      tHeaderRow.height = 28
      tHeaders.forEach((text, i) => {
        const cell = tHeaderRow.getCell(i + 1)
        cell.value = text
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF475569' }
        } as ExcelJS.Fill
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF64748B' } },
          left: { style: 'thin', color: { argb: 'FF64748B' } },
          bottom: { style: 'medium', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF64748B' } }
        }
      })

      let tRowNum = 5
      secoes.forEach((secao) => {
        // Cabeçalho da Seção no Testes
        testWorksheet.mergeCells(`A${tRowNum}:D${tRowNum}`)
        const secRow = testWorksheet.getRow(tRowNum)
        secRow.height = 24
        const secCell = secRow.getCell(1)
        secCell.value = secao.titulo.toUpperCase()
        secCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } }
        
        for (let c = 1; c <= 4; c++) {
          const cCell = secRow.getCell(c)
          cCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } } as ExcelJS.Fill // Azul céu claro
          cCell.border = {
            top: { style: 'thin', color: { argb: 'FFBAE6FD' } },
            left: { style: 'thin', color: { argb: 'FFBAE6FD' } },
            bottom: { style: 'thin', color: { argb: 'FFBAE6FD' } },
            right: { style: 'thin', color: { argb: 'FFBAE6FD' } }
          }
        }
        secCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        tRowNum++

        secao.perguntas.forEach((perg, pIdx) => {
          const row = testWorksheet.getRow(tRowNum)
          row.height = 30
          
          const isEven = pIdx % 2 === 0
          const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

          // Coluna 1: Categoria
          const cellCat = row.getCell(1)
          cellCat.value = secao.titulo
          cellCat.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } }
          cellCat.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

          // Coluna 2: Texto da pergunta
          const cellText = row.getCell(2)
          cellText.value = perg.texto
          cellText.font = { name: 'Segoe UI', size: 9.5 }
          cellText.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

          // Coluna 3: Checkbox / Status
          const cellStatus = row.getCell(3)
          cellStatus.value = ''
          if (perg.tipo === 'check') {
            cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
          }
          cellStatus.alignment = { vertical: 'middle', horizontal: 'center' }

          // Coluna 4: Campo de texto livre
          const cellVal = row.getCell(4)
          cellVal.value = ''
          if (perg.tipo === 'texto') {
            cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } as ExcelJS.Fill
          }
          cellVal.alignment = { vertical: 'middle', horizontal: 'left' }

          for (let c = 1; c <= 4; c++) {
            const cell = row.getCell(c)
            if (c <= 2 || (c === 3 && perg.tipo !== 'check') || (c === 4 && perg.tipo !== 'texto')) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } } as ExcelJS.Fill
            }
            cell.font = { name: 'Segoe UI', size: 9.5, bold: c === 1 }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            }
          }
          tRowNum++
        })
      })

      // Assinatura na aba de testes
      tRowNum += 2
      testWorksheet.mergeCells(`A${tRowNum}:B${tRowNum}`)
      testWorksheet.mergeCells(`C${tRowNum}:D${tRowNum}`)
      testWorksheet.getCell(`A${tRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
      testWorksheet.getCell(`C${tRowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }

      tRowNum++
      testWorksheet.mergeCells(`A${tRowNum}:B${tRowNum}`)
      testWorksheet.mergeCells(`C${tRowNum}:D${tRowNum}`)
      testWorksheet.getCell(`A${tRowNum}`).value = 'Técnico de Configuração / Testes (SIAMAC)'
      testWorksheet.getCell(`A${tRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
      testWorksheet.getCell(`A${tRowNum}`).alignment = { horizontal: 'center' }
      
      testWorksheet.getCell(`C${tRowNum}`).value = 'Responsável pela Expedição (Conferência Final)'
      testWorksheet.getCell(`C${tRowNum}`).font = { name: 'Segoe UI', size: 9, bold: true }
      testWorksheet.getCell(`C${tRowNum}`).alignment = { horizontal: 'center' }

      testWorksheet.columns = [
        { key: 'categoria', width: 25 },
        { key: 'checklist', width: 68 },
        { key: 'status', width: 18 },
        { key: 'valores', width: 38 }
      ]
    }

    // Salvar o arquivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    const nomeProjetoSeguro = config.nomeProjeto.toLowerCase().replace(/\s+/g, '-') || 'projeto'
    const codPropostaSeguro = config.codigoProposta.toLowerCase().replace(/\s+/g, '-') || 'proposta'
    const filename = `picklist-carga-${nomeProjetoSeguro}-${codPropostaSeguro}.xlsx`
    
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  const iniciarFluxoPDF = (tipoDocumento: 'tecnico' | 'instalacao' | 'compra' | 'picklist' = 'tecnico') => {
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
      tipoDocumento
    })
    setGerandoPDF(true)
  }

  const handleEmitirChecklistPDF = async () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir o PDF do Checklist, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        if (!await handleSalvar()) return
        setTimeout(() => {
          iniciarFluxoPDF('instalacao')
        }, 800)
      }
    } else {
      iniciarFluxoPDF('instalacao')
    }
  }

  const handleEmitirListaCompraPDF = async () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir a Lista de Compra, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        if (!await handleSalvar()) return
        setTimeout(() => {
          iniciarFluxoPDF('compra')
        }, 800)
      }
    } else {
      iniciarFluxoPDF('compra')
    }
  }

  const handleEmitirPicklistPDF = async () => {
    if (isDirty) {
      const querSalvar = window.confirm(
        'Você possui alterações não salvas no projeto. Para emitir o Picklist, o projeto precisa ser salvo antes.\n\nDeseja salvar as alterações agora?'
      )
      if (querSalvar) {
        if (!await handleSalvar()) return
        setTimeout(() => {
          iniciarFluxoPDF('picklist')
        }, 800)
      }
    } else {
      iniciarFluxoPDF('picklist')
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
        tipoDocumento={pdfData.tipoDocumento}
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
          <h1><SiadeskBrand /></h1>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '13px', color: '#94a3b8', margin: '4px 0 16px 0' }}>
                <input
                  type="checkbox"
                  checked={usarTemplate}
                  onChange={(e) => setUsarTemplate(e.target.checked)}
                  style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                />
                Utilizar template padrão (Balança Completa)
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
    <div className={`app-container${modoApresentacao ? ' modo-apresentacao' : ''}`}>
      {/* Menu Superior Horizontal */}
      <header className="menu-superior">
        <div className="logo-superior">
          <h2><SiadeskBrand compact /></h2>
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
            disabled={!canCalibrate}
            title={canCalibrate ? 'Calibrar equipamentos' : 'Disponível para administradores do SIASGL'}
            className={abaAtiva === 'calibracao' ? 'active' : ''}
            onClick={() => setAbaAtiva('calibracao')}
          >
            ⚙️ Calibrar
          </button>
          <button
            className={abaAtiva === 'cenas' ? 'active' : ''}
            onClick={() => setAbaAtiva('cenas')}
          >
            🎬 Cenas
          </button>
          <button
            className={abaAtiva === 'funcoes_especiais' ? 'active' : ''}
            onClick={() => setAbaAtiva('funcoes_especiais')}
          >
            ✨ Funções Especiais
          </button>
        </nav>

        <div className="acoes-superiores">
          <button type="button" className="btn-apresentacao" title="Apresentar o 3D sem menus. R e V alternam vazio e carregado; Esc sai." onClick={() => { setDropdownAberto(false); setModoApresentacao(true) }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 4h18v12H3zM12 16v5M8 21h8" /><path d="m10 7 5 3-5 3z" /></svg>
            Modo de apresentação
          </button>
          <button 
            className="btn-principal" 
            style={{ padding: '7px 14px', fontSize: '12px', marginTop: 0 }}
            onClick={handleSalvar}
          >
            💾 Salvar Projeto
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
                  <button onClick={handleEtiquetas}>Etiquetas do projeto (NIIMBOT B1)</button>
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
                  <button onClick={() => { setDropdownAberto(false); handleEmitirListaCompraPDF(); }}>
                    📦 Lista de Compra (PDF)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirListaCompraXLSX(); }}>
                    📊 Lista de Compra (XLSX)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirPicklistPDF(); }}>
                    📋 Picklist de Carga (PDF)
                  </button>
                  <button onClick={() => { setDropdownAberto(false); handleEmitirPicklistXLSX(); }}>
                    📊 Picklist de Carga (XLSX)
                  </button>
                </div>
              </>
            )}
          </div>
          <button 
            className="btn-sair"
            onClick={async () => { if (await confirmLeave()) fecharProjeto() }}
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
            <IndicadorPeso />
          </div>
          <Scene
            mostrarRotulos={!modoApresentacao && mostrarRotulos}
            mostrarGrades={!modoApresentacao && mostrarGrades}
            mostrarPista={mostrarPista}
            mostrarGrama={mostrarGrama}
          />
          {modoApresentacao && <ModoApresentacao />}
        </main>
      </div>
    </div>
  )
}
