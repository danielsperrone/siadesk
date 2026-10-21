import { ImageEncoder, PageColorType } from '@mmote/niimbluelib';
import { B1BluetoothClient, B1_SERVICE } from './bluetooth.js';
import { B1SerialClient } from './serial.js';
import { printCanvas } from './label.js';

export async function waitForCompletion(task, abstraction, timeoutMs) {
  let timer;
  try {
    await Promise.race([
      task.waitForFinished(),
      new Promise((_,reject)=>{timer=setTimeout(()=>{
        abstraction.cancelStatusPoll();
        reject(new Error('A B1 demorou demais para confirmar o término'));
      },timeoutMs);})
    ]);
  } finally { clearTimeout(timer); }
}

export class Printer {
  constructor(onStatus, onDisconnected, factory = () => new B1BluetoothClient()) {
    this.client = factory(); this.busy = false; this.onStatus = onStatus;
    this.onDisconnected = onDisconnected;
    this.client.on('disconnect', onDisconnected);
    this.client.on('printprogress', e => onStatus(`Imprimindo: etiqueta ${e.page} de ${e.pagesTotal}…`));
  }
  async connect(transport='ble') {
    // Request from the click handler; optionalServices makes service access explicit on Windows.
    let device,port;
    if(transport==='serial') {
      this.client.removeAllListeners();this.client=new B1SerialClient();
      this.client.on('disconnect',this.onDisconnected);
      this.client.on('printprogress',e=>this.onStatus(`Imprimindo: etiqueta ${e.page} de ${e.pagesTotal}…`));
      port=await navigator.serial.requestPort();
    } else {
      if(this.client instanceof B1SerialClient){this.client.removeAllListeners();this.client=new B1BluetoothClient();this.client.on('disconnect',this.onDisconnected);this.client.on('printprogress',e=>this.onStatus(`Imprimindo: etiqueta ${e.page} de ${e.pagesTotal}…`));}
      device=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'B1'}],optionalServices:[B1_SERVICE]});
    }
    try {
      this.onStatus(`Abrindo canal de impressão de ${device?.name || 'B1 pareada'}…`);
      const result = await this.client.connect({ authorizedDevice: device, authorizedPort: port });
      const model = this.client.getModelMetadata();
      if (!model || model.model !== 'B1' || model.dpi !== 203) throw new Error('Este programa está configurado para a B1 de 203 dpi. O dispositivo selecionado não foi identificado como esse modelo.');
      return result.deviceName || 'NIIMBOT B1';
    } catch(error) { await this.client.disconnect().catch(()=>{}); device?.gatt?.disconnect(); throw error; }
  }
  connected() { return this.client.isConnected(); }
  async disconnect() { await this.client.disconnect(); }
  async print(canvas, data, quantity) {
    if (this.busy) throw new Error('Já existe uma impressão em andamento.');
    if (!this.connected()) throw new Error('Conecte a B1 antes de imprimir.');
    if (!Number.isInteger(quantity) || quantity<1 || quantity>100) throw new Error('Escolha de 1 a 100 cópias.');
    const encoded = ImageEncoder.encodeCanvas(printCanvas(canvas),PageColorType.SingleColor,'top');
    const task = this.client.abstraction.newPrintTask('B1', {totalPages:quantity,density:data.density,labelType:data.paper,pageColor:PageColorType.SingleColor,statusPollIntervalMs:300,statusTimeoutMs:15000,pageTimeoutMs:30000});
    this.busy = true;
    let primaryError;
    try { await task.printInit(); await task.printPage(encoded,quantity); await task.waitForPageFinished(); await waitForCompletion(task,this.client.abstraction,30000+quantity*15000); }
    catch(error) { primaryError = error; throw error; }
    finally {
      try { if(await task.printEnd() === false && !primaryError) throw new Error('A B1 ainda não confirmou o encerramento do trabalho'); } catch(error) { if(!primaryError) throw error; }
      finally { this.busy = false; }
    }
  }
}
