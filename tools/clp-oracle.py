"""Traço de referência do interpretador Python oficial para comparação com JS."""
import hashlib
import importlib.util
import json
from pathlib import Path
import random
import sys
sys.dont_write_bytecode = True

folder = Path(__file__).resolve().parents[1] / 'electron' / 'simulador' / 'firmware'
spec = importlib.util.spec_from_file_location('official', folder / 'firmware_schneider.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class Bank:
    def __init__(self): self.values = [False] * 65536
    def get_coils(self, address, number=1): return self.values[address:address+number]
    def set_coils(self, address, values):
        self.values[address:address+len(values)] = values
        return True
db = Bank()
plc = module.PLCSimulator(db, folder / 'Versão 5.0.6.smbp')
for i in range(4): plc.set_input(f'%I0.{i}', True)
random.seed(719)
actions = []
digest = hashlib.sha256()
for frame in range(19000):
    changes = []
    if frame < 14000 and frame % 80 == 0: changes.append(['M', 0, True])
    if frame >= 14000 and frame % 80 == 0: changes.append(['M', 1, True])
    if frame >= 14000 and frame % 7 == 0:
        changes.append(['M', random.randint(2, 9), bool(random.getrandbits(1))])
        changes.append(['I', random.randint(0, 13), bool(random.getrandbits(1))])
    for kind, address, value in changes:
        if kind == 'M': db.set_coils(address, [value])
        else: plc.set_input(f'%I0.{address}', value)
    if changes: actions.append([frame, changes])
    plc.step(10)
    digest.update(bytes(db.values[:256] + list(plc.inputs.values()) + list(plc.outputs.values())))
print(json.dumps(dict(frames=19000, actions=actions, sha256=digest.hexdigest())))
