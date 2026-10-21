import { NiimbotAbstractClient } from '@mmote/niimbluelib';

export const B1_SERVICE = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';

// The pinned npm release's Bluetooth client does not accept authorizedDevice.
// Own the GATT transport while retaining its packet codec and print protocol.
export class B1BluetoothClient extends NiimbotAbstractClient {
  constructor() { super(); this.device=null; this.channel=null; this.gatt=null; }
  async connect({authorizedDevice:device}) {
    await this.disconnect();
    if(!device?.gatt)throw new Error('O dispositivo selecionado não oferece Bluetooth LE');
    this.device=device;
    this.onLost=()=>this.clearConnection();
    device.addEventListener('gattserverdisconnected',this.onLost);
    try {
      this.gatt=await device.gatt.connect();
      const service=await this.gatt.getPrimaryService(B1_SERVICE);
      const characteristics=await service.getCharacteristics();
      this.channel=characteristics.find(c=>c.properties.notify&&(c.properties.writeWithoutResponse||c.properties.write));
      if(!this.channel)throw new Error('O serviço da B1 não expôs um canal de impressão compatível');
      this.onData=event=>this.processRawPacket(event.target.value);
      this.channel.addEventListener('characteristicvaluechanged',this.onData);
      await this.channel.startNotifications();
      await this.initialNegotiate();
      if(![1,2,3].includes(this.info.connectResult))throw new Error('A B1 recusou a abertura da sessão de impressão');
      // Only model identification is required to print; optional information
      // requests can time out on some firmware versions and delay connection.
      this.info.modelId=await this.abstraction.getPrinterModel();
      const result={deviceName:device.name,result:this.info.connectResult};
      this.emit('connect',result);
      return result;
    } catch(error) { await this.disconnect(); throw error; }
  }
  clearConnection() {
    const hadDevice=!!this.device;
    this.stopHeartbeat();this.abstraction.cancelStatusPoll();
    this.channel?.removeEventListener('characteristicvaluechanged',this.onData);
    this.device?.removeEventListener('gattserverdisconnected',this.onLost);
    this.channel=null;this.device=null;this.gatt=null;this.info={};
    if(hadDevice)this.emit('disconnect',{});
  }
  async disconnect() { const gatt=this.device?.gatt;this.clearConnection();gatt?.disconnect(); }
  isConnected() { return !!(this.gatt?.connected&&this.channel); }
  getType() { return 'bluetooth'; }
  async sendRaw(data,force=false) {
    const send=async()=>{
      if(!this.isConnected())throw new Error('A conexão Bluetooth foi encerrada');
      await new Promise(resolve=>setTimeout(resolve,this.packetIntervalMs));
      if(this.channel.properties.writeWithoutResponse)await this.channel.writeValueWithoutResponse(data);
      else await this.channel.writeValueWithResponse(data);
      this.emit('rawpacketsent',{data});
    };
    return force?send():this.mutex.runExclusive(send);
  }
}
