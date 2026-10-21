"""Execução da lista de instruções dos projetos Schneider salvos no repositório.

%M mantém o endereço Modbus do CLP. %I e %Q são imagens de E/S locais,
sem sobrepor memórias (por exemplo, %M100 não é uma entrada física).
O interpretador suporta as instruções usadas pela versão 5.0.6; versões
com instruções diferentes são recusadas, nunca parcialmente executadas.
"""

import hashlib
from pathlib import Path
import re
import threading
import xml.etree.ElementTree as ET


FIRMWARE_DIR = Path(__file__).resolve().parents[3] / "Automação" / "Firmware" / "Firmware Schneider"
TIME_BASES = {"OneMilliSeconds": 1, "TenMilliSeconds": 10,
              "HundredMilliSeconds": 100, "OneSecond": 1000}


def latest_firmware():
    versions = []
    for path in FIRMWARE_DIR.glob("Versão *.smbp"):
        match = re.fullmatch(r"Versão (\d+(?:\.\d+)*)", path.stem)
        if match:
            versions.append((tuple(map(int, match[1].split("."))), path))
    if not versions:
        raise FileNotFoundError(f"Firmware Schneider não encontrado em {FIRMWARE_DIR}")
    return max(versions)[1]


class TON:
    def __init__(self, preset_ms):
        self.preset_ms = preset_ms
        self.elapsed_ms = 0.0
        self.q = False

    def update(self, in_state, tick_ms):
        if in_state:
            self.elapsed_ms = min(self.preset_ms, self.elapsed_ms + tick_ms)
            self.q = self.elapsed_ms >= self.preset_ms
        else:
            self.elapsed_ms = 0.0
            self.q = False
        return self.q


class PLCSimulator:
    """Executa todos os rungs, na ordem das POUs e instruções do .smbp."""

    OPS = {"LD", "LDN", "AND", "ANDN", "OR", "ORN", "OR(", "OR(N",
           ")", "ST", "STN", "S", "R", "BLK", "IN", "OUT_BLK", "END_BLK"}

    def __init__(self, db, firmware_path=None):
        self.db = db
        self.firmware_path = Path(firmware_path) if firmware_path else latest_firmware()
        data = self.firmware_path.read_bytes()
        self.firmware_sha256 = hashlib.sha256(data).hexdigest()
        root = ET.fromstring(data)
        self.lock = threading.RLock()
        self.elapsed_ms = 0.0
        self.inputs = {e.findtext("Address"): False for e in root.iter("DiscretInput")}
        self.outputs = {e.findtext("Address"): False for e in root.iter("DiscretOutput")}
        self.symbols = {e.findtext("Address"): e.findtext("Symbol")
                        for tag in ("MemoryBit", "DiscretInput", "DiscretOutput")
                        for e in root.iter(tag) if e.findtext("Symbol")}
        self.timers = {}
        for timer in root.iter("TimerTM"):
            base = timer.findtext("Base")
            timer_type = timer.findtext("Type", "TON")
            if base not in TIME_BASES or timer_type != "TON":
                raise ValueError(f"Temporizador não suportado: {ET.tostring(timer, encoding='unicode')}")
            address = timer.findtext("Address")
            self.timers[address] = TON(int(timer.findtext("Preset")) * TIME_BASES[base])
            setattr(self, address[1:].lower(), self.timers[address])
        self.pous = []
        for pou in root.findall(".//Pous/ProgramOrganizationUnits"):
            rungs = []
            for rung in pou.findall("./Rungs/RungEntity"):
                instructions = []
                depth = 0
                block = None
                for line in rung.findall("./InstructionLines/InstructionLineEntity/InstructionLine"):
                    fields = line.text.strip().split(maxsplit=1)
                    op, arg = fields[0], fields[1] if len(fields) == 2 else ""
                    if op not in self.OPS:
                        raise ValueError(f"Instrução não suportada: {line.text}")
                    if op == "BLK":
                        if block or arg not in self.timers:
                            raise ValueError(f"Bloco inválido: {line.text}")
                        block = arg
                    elif op == "END_BLK":
                        if not block:
                            raise ValueError("END_BLK sem temporizador")
                        block = None
                    elif op in ("IN", "OUT_BLK"):
                        if not block:
                            raise ValueError(f"{op} sem temporizador")
                    elif op == ")":
                        depth -= 1
                        if depth < 0:
                            raise ValueError("Parênteses inválidos")
                    else:
                        if arg == "Q":
                            if not block or op != "LD":
                                raise ValueError("Saída Q fora do bloco")
                        elif not self._valid_bit(arg):
                            raise ValueError(f"Endereço não suportado: {arg}")
                        if op in ("OR(", "OR(N"):
                            depth += 1
                    instructions.append((op, arg))
                if depth or block or not instructions:
                    raise ValueError("Rung incompleto no firmware")
                rungs.append(tuple(instructions))
            self.pous.append((pou.findtext("Name", "").strip(), tuple(rungs)))
        if not self.pous:
            raise ValueError("Firmware sem lista de instruções executável")

    def _valid_bit(self, address):
        return (bool(re.fullmatch(r"%M\d+", address))
                or address in self.inputs or address in self.outputs)

    def read_bit(self, address):
        with self.lock:
            if address.startswith("%M"):
                values = self.db.get_coils(int(address[2:]), 1)
                if values is None:
                    raise ValueError(f"Memória fora do banco: {address}")
                return bool(values[0])
            if address in self.inputs:
                return self.inputs[address]
            return self.outputs[address]

    def set_input(self, address, value):
        with self.lock:
            if address not in self.inputs:
                raise ValueError(f"Entrada inexistente: {address}")
            self.inputs[address] = bool(value)

    def _store(self, address, value):
        if address.startswith("%M"):
            if not self.db.set_coils(int(address[2:]), [bool(value)]):
                raise ValueError(f"Memória fora do banco: {address}")
        else:
            self.outputs[address] = bool(value)

    def step(self, tick_ms):
        if tick_ms < 0:
            raise ValueError("Tempo de varredura negativo")
        with self.lock:
            for _, rungs in self.pous:
                for instructions in rungs:
                    acc, stack, timer = False, [], None
                    for op, arg in instructions:
                        if op == "BLK":
                            timer = self.timers[arg]
                        elif op == "IN":
                            timer.update(acc, tick_ms)
                        elif op == "OUT_BLK":
                            pass
                        elif op == "END_BLK":
                            timer = None
                        elif op == ")":
                            acc = stack.pop() or acc
                        elif op in ("ST", "STN", "S", "R"):
                            if op in ("ST", "STN") or acc:
                                self._store(arg, not acc if op == "STN" else False if op == "R" else acc)
                        else:
                            value = timer.q if arg == "Q" else self.read_bit(arg)
                            if op in ("LDN", "ANDN", "ORN", "OR(N"):
                                value = not value
                            if op in ("LD", "LDN"):
                                acc = value
                            elif op in ("AND", "ANDN"):
                                acc = acc and value
                            elif op in ("OR", "ORN"):
                                acc = acc or value
                            elif op in ("OR(", "OR(N"):
                                stack.append(acc)
                                acc = value
            self.elapsed_ms += tick_ms

    def connection_snapshot(self):
        with self.lock:
            return {"connected": self.outputs["%Q0.4"],
                    "initializing": self.elapsed_ms < self.tm4.preset_ms,
                    "missing_ms": self.tm4.elapsed_ms}
