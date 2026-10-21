import { renderLabel } from './label.js';

// Valida todo o lote antes de consumir papel e interrompe na primeira falha.
export async function printBatch(printer, jobs, { onConfirmed=()=>{}, shouldStop=()=>false }={}) {
  if(!jobs.length)throw new Error('Selecione pelo menos um equipamento.');
  const snapshot=jobs.map(job=>({id:job.id,name:job.data.name,data:{...job.data}}));
  for(const job of snapshot) {
    try { renderLabel(document.createElement('canvas'),job.data); }
    catch(error) { throw new Error(`${job.name}: ${error.message}`); }
  }
  let confirmed=0;
  for(const job of snapshot) {
    if(shouldStop())return {confirmed,total:snapshot.length,stopped:true};
    const canvas=document.createElement('canvas');renderLabel(canvas,job.data);
    try { await printer.print(canvas,job.data,1); }
    catch(error) { throw new Error(`${confirmed} de ${snapshot.length} confirmadas. Falha em “${job.name}”: ${error.message}. Confira se essa etiqueta saiu antes de repetir.`); }
    confirmed++;onConfirmed(job.id,confirmed,snapshot.length);
  }
  return {confirmed,total:snapshot.length,stopped:false};
}
