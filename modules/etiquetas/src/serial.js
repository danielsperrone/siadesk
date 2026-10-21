import { NiimbotAbstractClient } from '@mmote/niimbluelib';

export class B1SerialClient extends NiimbotAbstractClient {
  async connect({authorizedPort:port}) {
    this.port=port;
    try {
      await port.open({baudRate:115200});
      this.reader=port.readable.getReader();this.writer=port.writable.getWriter();
      this.readLoop=this.readIncoming();
      await this.initialNegotiate();
      if(![1,2,3].includes(this.info.connectResult))throw new Error('A B1 recusou a sessão de impressão');
      this.info.modelId=await this.abstraction.getPrinterModel();
      const result={deviceName:'B1 · Bluetooth do Windows',result:this.info.connectResult};
      this.emit('connect',result);return result;
    } catch(error){await this.disconnect();throw error;}
  }
  async readIncoming(){
    try{while(this.reader){const {value,done}=await this.reader.read();if(done)break;if(value)this.processRawPacket(value);}}
    catch{ /* Pending protocol requests report a timeout if the port disappears. */ }
    finally{if(this.reader){this.reader.releaseLock();this.reader=null;}this.stopHeartbeat();this.emit('disconnect',{});}
  }
  async disconnect(){
    this.stopHeartbeat();this.abstraction.cancelStatusPoll();
    if(this.reader)await this.reader.cancel().catch(()=>{});
    if(this.readLoop)await this.readLoop;
    if(this.writer){this.writer.releaseLock();this.writer=null;}
    if(this.port){await this.port.close().catch(()=>{});this.port=null;}
    this.info={};
  }
  isConnected(){return !!(this.port&&this.reader&&this.writer);}
  getType(){return 'serial';}
  async sendRaw(data,force=false){
    const send=async()=>{if(!this.isConnected())throw new Error('A porta Bluetooth foi desconectada');await new Promise(r=>setTimeout(r,this.packetIntervalMs));await this.writer.write(data);};
    return force?send():this.mutex.runExclusive(send);
  }
}
