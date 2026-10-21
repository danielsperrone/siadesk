"""Gera as instruções embarcadas usando o interpretador oficial como validador."""
import importlib.util
import json
import sys
from pathlib import Path
sys.dont_write_bytecode = True

folder = Path(__file__).resolve().parents[1] / 'electron' / 'simulador' / 'firmware'
spec = importlib.util.spec_from_file_location('firmware', folder / 'firmware_schneider.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
plc = module.PLCSimulator(None, folder / 'Versão 5.0.6.smbp')
data = dict(version='5.0.6', sha256=plc.firmware_sha256, inputs=list(plc.inputs),
            outputs=list(plc.outputs), symbols=plc.symbols, pous=plc.pous,
            timers={k: v.preset_ms for k, v in plc.timers.items()})
(folder / 'programa.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Firmware {data["version"]}: {len(plc.pous)} POUs; SHA-256 {plc.firmware_sha256}')
