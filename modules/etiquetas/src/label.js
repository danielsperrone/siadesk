import QRCode from 'qrcode';

const siamacLogo = new Image();
siamacLogo.src = `${import.meta.env.BASE_URL}siamac.webp`;
let logoReady = false;
try { await siamacLogo.decode(); logoReady = true; } catch { /* Cable printing reports a missing required logo below. */ }

export const DPI = 203;
export const HEAD_PIXELS = 384;
export const defaults = { layout: 'cable', title: 'Sensor emissor - Lado A', body: 'Fio 24v', fontSize: 14, align: 'left', qr: '', width: 50, height: 30, density: 3, paper: 1, image: '' };
export const mmToPixels = mm => Math.round(mm * DPI / 25.4);

export function validate(data) {
  if (data.layout !== undefined && !['normal','cable','equipment','cross','voltage','siamac','electrical'].includes(data.layout)) throw new Error('Formato de etiqueta inválido.');
  if(data.layout==='electrical'&&(typeof data.name!=='string'||!data.name.trim()||data.name.length>120||/[\r\n]/.test(data.name)))throw new Error('Preencha o nome do equipamento elétrico (até 120 caracteres).');
  if(data.voltageText && !['VERIFIQUE A CHAVE NA PLACA'].includes(data.voltageText))throw new Error('Aviso de tensão inválido.');
  if(data.layout==='equipment')for(const key of ['name','ip','username','password'])if(typeof data[key]!=='string'||((key==='name'||!data.allowEmptyAccess)&&!data[key].trim())||data[key].length>120||/[\r\n]/.test(data[key]))throw new Error('Confira os dados do equipamento: nome obrigatório, até 120 caracteres por campo e sem quebras de linha.');
  for (const [key, min, max] of [['width',20,50],['height',10,150],['fontSize',6,36],['density',1,5]]) {
    if (!Number.isFinite(data[key]) || data[key] < min || data[key] > max) throw new Error(`Confira ${ {width:'a largura (20 a 50 mm)',height:'a altura (10 a 150 mm)',fontSize:'o tamanho do texto (6 a 36 pt)',density:'a intensidade (1 a 5)'}[key] }.`);
  }
  if (!['left','center','right'].includes(data.align)) throw new Error('Alinhamento inválido.');
  if (![1,2,5].includes(data.paper)) throw new Error('Tipo de etiqueta inválido.');
  for (const [key,max] of [['title',160],['body',600],['qr',300]]) if (typeof data[key] !== 'string' || data[key].length > max) throw new Error('O modelo contém texto inválido ou muito longo.');
  if (typeof data.image !== 'string' || data.image.length > 1500000 || (data.image && !/^data:image\/(png|jpeg|webp);base64,/.test(data.image))) throw new Error('Imagem inválida no modelo.');
  return data;
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && ctx.measureText(line + ' ' + word).width > maxWidth) { lines.push(line); line = ''; }
      if (ctx.measureText(word).width > maxWidth) {
        for (const char of word) {
          if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = ''; }
          line += char;
        }
      } else line += (line ? ' ' : '') + word;
    }
    lines.push(line);
  }
  return lines;
}

export function renderLabel(canvas, data, image) {
  validate(data);
  canvas.width = mmToPixels(data.width); canvas.height = mmToPixels(data.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#000';
  const headMargin = Math.max(0, Math.ceil((canvas.width - HEAD_PIXELS) / 2));
  const margin = Math.max(12, headMargin + 5), availableWidth = canvas.width - 2*margin;
  const availableHeight = canvas.height - 24;
  if(data.layout==='voltage'||data.layout==='siamac') {
    drawReadyLabel(ctx,canvas,data.layout,margin,availableWidth,availableHeight,data.voltageText);monochrome(ctx,canvas);return;
  }
  if(data.layout==='electrical') {
    if(!logoReady)throw new Error('Atualize o programa para carregar a logo Siamac.');
    const w=availableWidth,h=availableHeight,x=margin,y=12;
    ctx.fillRect(x,y,w,Math.round(h*.23));ctx.fillStyle='white';ctx.textBaseline='middle';ctx.font=`700 ${Math.min(19,h*.09)}px Arial`;ctx.fillText('EQUIPAMENTO ELÉTRICO',x+12,y+h*.115);
    ctx.fillStyle='black';let size=Math.min(40,h*.20),lines=[];
    do{ctx.font=`700 ${size}px Arial`;lines=wrap(ctx,data.name.trim(),w-24);if(lines.length*size*1.13<=h*.43)break;size-=.5;}while(size>=17);
    if(size<17)throw new Error('Encurte o nome do equipamento elétrico ou aumente a etiqueta.');
    let yy=y+h*.48-(lines.length-1)*size*.565;for(const line of lines){ctx.fillText(line,x+12,yy);yy+=size*1.13;}
    ctx.fillRect(x,y+h*.76,w,2);const lw=Math.min(w*.43,h*.67),lh=lw*siamacLogo.naturalHeight/siamacLogo.naturalWidth;
    ctx.drawImage(siamacLogo,x+w-lw,y+h*.82,lw,lh);
    ctx.beginPath();ctx.moveTo(x+16,y+h*.80);ctx.lineTo(x+7,y+h*.92);ctx.lineTo(x+20,y+h*.90);ctx.lineTo(x+13,y+h*.99);ctx.lineTo(x+32,y+h*.85);ctx.lineTo(x+20,y+h*.87);ctx.closePath();ctx.fill();
    monochrome(ctx,canvas);return;
  }
  if(data.layout==='cross') {
    let size=canvas.height*2;
    while(size>1){ctx.font=`700 ${size}px Arial`;const m=ctx.measureText('X');if(m.width<=availableWidth&&m.actualBoundingBoxAscent+m.actualBoundingBoxDescent<=availableHeight)break;size--;}
    const m=ctx.measureText('X');ctx.textBaseline='alphabetic';
    ctx.fillText('X',(canvas.width-m.width)/2,(canvas.height+m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
    monochrome(ctx,canvas);return;
  }
  if(data.layout==='equipment') {
    if(!logoReady)throw new Error('Atualize o programa para carregar a logo Siamac.');
    const lines=[data.name,...[['IP',data.ip],['Usuário',data.username],['Senha',data.password]].filter(([,value])=>!data.allowEmptyAccess||value.trim()).map(([label,value])=>`${label}: ${value}`)];
    const logoHeight=availableHeight,logoWidth=logoHeight*siamacLogo.naturalHeight/siamacLogo.naturalWidth;
    const textWidth=availableWidth-logoWidth-12;
    let size=Math.min(32,availableHeight*.16);
    const fits=s=>{for(let i=0;i<lines.length;i++){ctx.font=`${i?400:700} ${s*(i?.85:1)}px Arial`;if(ctx.measureText(lines[i]).width>textWidth)return false;}return true;};
    while(size>6*DPI/72&&!fits(size))size=Math.max(6*DPI/72,size-.25);
    if(size<6*DPI/72||!fits(size))throw new Error('Os dados não cabem com texto legível. Encurte os campos ou aumente a etiqueta.');
    ctx.textBaseline='top';ctx.font=`700 ${size}px Arial`;ctx.fillText(lines[0],margin,12+availableHeight*.04);
    ctx.fillRect(margin,Math.round(12+availableHeight*.25),textWidth,1);
    for(let i=1;i<lines.length;i++){ctx.font=`400 ${size*.85}px Arial`;ctx.fillText(lines[i],margin,12+availableHeight*(.40+(i-1)*.22));}
    ctx.save();ctx.translate(canvas.width-margin-logoWidth/2,canvas.height/2);ctx.rotate(-Math.PI/2);ctx.drawImage(siamacLogo,-logoHeight/2,-logoWidth/2,logoHeight,logoWidth);ctx.restore();
    monochrome(ctx,canvas);return;
  }
  if (data.layout === 'cable') {
    drawCable(ctx, canvas, data, margin, availableWidth);
    monochrome(ctx,canvas);
    return;
  }
  let qrInfo, qrPixels = 0;
  if (data.qr.trim()) {
    qrInfo = QRCode.create(data.qr.trim(), { errorCorrectionLevel: 'M' });
    const maxQr = Math.min(availableHeight, Math.floor(availableWidth * .43));
    const moduleSize = Math.floor(maxQr / (qrInfo.modules.size + 8));
    if (moduleSize < 2) throw new Error('O QR Code ficou pequeno demais. Encurte o conteúdo ou aumente a etiqueta.');
    qrPixels = (qrInfo.modules.size + 8) * moduleSize;
  }
  const textWidth = availableWidth - (qrPixels ? qrPixels + 8 : 0);
  const blocks = [];
  if (image) {
    const scale = Math.min(textWidth / image.width, Math.min(availableHeight*.35,64)/image.height);
    blocks.push({type:'image',width:Math.round(image.width*scale),height:Math.round(image.height*scale)});
  }
  for (const [text,size,weight] of [[data.title.trim(),data.fontSize*DPI/72,700],[data.body.trim(),data.fontSize*DPI/72*.62,400]]) {
    if (!text) continue;
    ctx.font = `${weight} ${size}px Arial`;
    const lines = wrap(ctx,text,textWidth);
    blocks.push({type:'text',size,weight,lines,height:lines.length*size*1.2});
  }
  const gap = 7, totalHeight = blocks.reduce((sum,b)=>sum+b.height,0) + Math.max(0,blocks.length-1)*gap;
  if (totalHeight > availableHeight) throw new Error('O conteúdo não cabe na etiqueta. Reduza o texto ou a fonte, ou aumente a altura.');
  if (!blocks.length && !qrInfo) throw new Error('Adicione texto, imagem ou QR Code para imprimir.');
  let y = (canvas.height-totalHeight)/2;
  const alignX = width => data.align === 'left' ? margin : data.align === 'right' ? margin+textWidth-width : margin+(textWidth-width)/2;
  for (const block of blocks) {
    if (block.type === 'image') ctx.drawImage(image,alignX(block.width),y,block.width,block.height);
    else {
      ctx.font = `${block.weight} ${block.size}px Arial`; ctx.textBaseline = 'top';
      for (const line of block.lines) { ctx.fillText(line,alignX(ctx.measureText(line).width),y); y+=block.size*1.2; }
    }
    if (block.type === 'image') y+=block.height;
    y+=gap;
  }
  if (qrInfo) {
    const unit = qrPixels/(qrInfo.modules.size+8), x0 = canvas.width-margin-qrPixels, y0 = Math.floor((canvas.height-qrPixels)/2);
    for (let r=0;r<qrInfo.modules.size;r++) for(let c=0;c<qrInfo.modules.size;c++) if(qrInfo.modules.get(r,c)) ctx.fillRect(x0+(c+4)*unit,y0+(r+4)*unit,unit,unit);
  }
  monochrome(ctx,canvas);
}

function drawCable(ctx,canvas,data,margin,availableWidth) {
  if(!logoReady)throw new Error('Não foi possível carregar a logo Siamac. Atualize o programa antes de imprimir.');
  const lines=[data.title.trim(),data.body.trim()];
  if (!lines.some(Boolean)) throw new Error('Preencha a primeira ou a segunda linha da etiqueta para fios.');
  if (lines.some(line=>/[\r\n]/.test(line))) throw new Error('Use apenas uma linha em cada campo da etiqueta para fios.');
  const half=Math.floor(canvas.height/2), maxHeight=half-24;
  const logoLength=Math.min(88,half-28);
  const logoThickness=logoLength*siamacLogo.naturalHeight/siamacLogo.naturalWidth;
  const textWidth=availableWidth-Math.ceil(logoThickness)-12;
  let size=data.fontSize*DPI/72;
  const smallest=6*DPI/72;
  const fits=s=>{
    const heights=[];
    for(let i=0;i<2;i++)if(lines[i]){
      const font=s*(i===0?1:.75);ctx.font=`${i===0?700:400} ${font}px Arial`;
      if(ctx.measureText(lines[i]).width>textWidth)return false;
      heights.push(font*1.2);
    }
    return heights.reduce((a,b)=>a+b,0)+(heights.length-1)*s*.35<=maxHeight;
  };
  while(size>smallest&&!fits(size))size=Math.max(smallest,size-.25);
  if(!fits(size))throw new Error('O texto não cabe em cada metade com fonte legível. Encurte as linhas ou aumente a etiqueta.');
  // Draw once and copy the exact pixels: both sides have identical text and orientation.
  const panel=document.createElement('canvas');panel.width=canvas.width;panel.height=half;
  const p=panel.getContext('2d');p.fillStyle='white';p.fillRect(0,0,panel.width,panel.height);p.fillStyle='black';p.textBaseline='top';
  const heights=lines.map((line,i)=>line?size*(i===0?1:.75)*1.2:0);
  const gap=lines.every(Boolean)?size*.35:0;
  let y=Math.round((half-heights[0]-heights[1]-gap)/2);
  for(let i=0;i<2;i++)if(lines[i]){
    p.font=`${i===0?700:400} ${size*(i===0?1:.75)}px Arial`;
    p.fillText(lines[i],margin,y+(i===0?3:0));y+=heights[i]+gap;
  }
  p.save();
  p.translate(canvas.width-margin-logoThickness/2,half/2);
  p.rotate(-Math.PI/2);
  p.drawImage(siamacLogo,-logoLength/2,-logoThickness/2,logoLength,logoThickness);
  p.restore();
  ctx.drawImage(panel,0,0);ctx.drawImage(panel,0,canvas.height-half);
  ctx.fillStyle='black';ctx.fillRect(margin,half,availableWidth,1);
}

function drawReadyLabel(ctx,canvas,layout,margin,width,height,voltageText) {
  // Use the same physical margins as the other labels; designs keep their proportions.
  const scale=Math.min(width/374,height/216);
  if(scale<.7)throw new Error('Este modelo precisa de uma etiqueta maior para manter a leitura. Use 50 × 30 mm ou uma medida próxima.');
  ctx.save();ctx.translate(margin+(width-374*scale)/2,12+(height-216*scale)/2);ctx.scale(scale,scale);
  if(layout==='voltage') {
    ctx.fillStyle='black';ctx.fillRect(0,0,374,55);
    ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,43);ctx.lineTo(36,11);ctx.lineTo(54,43);ctx.closePath();ctx.stroke();
    ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 23px Arial';ctx.fillText('!',36,32);
    ctx.font='700 36px Arial';ctx.fillText('ATENÇÃO',219,29);
    ctx.fillStyle='black';ctx.font='700 20px Arial';ctx.fillText(voltageText||'VERIFIQUE A TENSÃO DA FONTE',187,78);
    ctx.font='900 51px Arial';ctx.fillText('110 V / 220 V',187,123);
    ctx.fillRect(0,160,374,3);
    ctx.font='700 27px Arial';ctx.fillText('ANTES DE LIGAR',187,190);
  } else {
    if(!logoReady){ctx.restore();throw new Error('Atualize o programa para carregar a logo Siamac.');}
    const logoW=180,logoH=logoW*siamacLogo.naturalHeight/siamacLogo.naturalWidth;
    ctx.drawImage(siamacLogo,0,78,logoW,logoH);
    const qr=QRCode.create('https://www.siamac.com.br',{errorCorrectionLevel:'M'}),unit=5,side=(qr.modules.size+8)*unit;
    const x=374-side,y=Math.round((216-side)/2);
    ctx.fillStyle='black';for(let r=0;r<qr.modules.size;r++)for(let c=0;c<qr.modules.size;c++)if(qr.modules.get(r,c))ctx.fillRect(x+(c+4)*unit,y+(r+4)*unit,unit,unit);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.font='400 18px Arial';ctx.fillText('www.siamac.com.br',0,122);
  }
  ctx.restore();
}

function monochrome(ctx,canvas) {
  const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4) {
    const luminance = .2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];
    const value = luminance < 160 ? 0 : 255;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value; pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
}

// Preserve physical scale: crop only the unprintable side margins, never squeeze 50 mm to 48 mm.
export function printCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(HEAD_PIXELS,source.width); canvas.height = source.height;
  canvas.getContext('2d').drawImage(source,Math.floor((source.width-canvas.width)/2),0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  return canvas;
}
