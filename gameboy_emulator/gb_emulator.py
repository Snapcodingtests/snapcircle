from __future__ import annotations

from dataclasses import dataclass
from typing import List

SCREEN_W = 160
SCREEN_H = 144
CLOCK_HZ = 4_194_304
FRAME_CYCLES = 70_224


class Memory:
    def __init__(self) -> None:
        self.rom = bytearray(0x8000)
        self.vram = bytearray(0x2000)
        self.eram = bytearray(0x2000)
        self.wram = bytearray(0x2000)
        self.oam = bytearray(0xA0)
        self.io = bytearray(0x80)
        self.hram = bytearray(0x7F)
        self.ie = 0

    def load_rom(self, data: bytes) -> None:
        self.rom = bytearray(0x8000)
        self.rom[: min(len(data), 0x8000)] = data[:0x8000]

    def read8(self, addr: int) -> int:
        addr &= 0xFFFF
        if addr < 0x8000:
            return self.rom[addr]
        if addr < 0xA000:
            return self.vram[addr - 0x8000]
        if addr < 0xC000:
            return self.eram[addr - 0xA000]
        if addr < 0xE000:
            return self.wram[addr - 0xC000]
        if addr < 0xFE00:
            return self.wram[addr - 0xE000]
        if addr < 0xFEA0:
            return self.oam[addr - 0xFE00]
        if addr < 0xFF00:
            return 0xFF
        if addr < 0xFF80:
            return self.io[addr - 0xFF00]
        if addr < 0xFFFF:
            return self.hram[addr - 0xFF80]
        return self.ie

    def write8(self, addr: int, value: int) -> None:
        addr &= 0xFFFF
        value &= 0xFF
        if 0x8000 <= addr < 0xA000:
            self.vram[addr - 0x8000] = value
        elif 0xA000 <= addr < 0xC000:
            self.eram[addr - 0xA000] = value
        elif 0xC000 <= addr < 0xE000:
            self.wram[addr - 0xC000] = value
        elif 0xE000 <= addr < 0xFE00:
            self.wram[addr - 0xE000] = value
        elif 0xFE00 <= addr < 0xFEA0:
            self.oam[addr - 0xFE00] = value
        elif 0xFF00 <= addr < 0xFF80:
            self.io[addr - 0xFF00] = value
        elif 0xFF80 <= addr < 0xFFFF:
            self.hram[addr - 0xFF80] = value
        elif addr == 0xFFFF:
            self.ie = value


@dataclass
class Registers:
    a: int = 0x01
    f: int = 0xB0
    b: int = 0x00
    c: int = 0x13
    d: int = 0x00
    e: int = 0xD8
    h: int = 0x01
    l: int = 0x4D
    sp: int = 0xFFFE
    pc: int = 0x0100


class CPU:
    def __init__(self, mem: Memory) -> None:
        self.mem = mem
        self.r = Registers()
        self.halted = False

    def read16(self, addr: int) -> int:
        lo = self.mem.read8(addr)
        hi = self.mem.read8(addr + 1)
        return (hi << 8) | lo

    def set_flag_znhc(self, z: bool, n: bool, h: bool, c: bool) -> None:
        self.r.f = (0x80 if z else 0) | (0x40 if n else 0) | (0x20 if h else 0) | (0x10 if c else 0)

    def step(self) -> int:
        if self.halted:
            return 4
        op = self.mem.read8(self.r.pc)
        self.r.pc = (self.r.pc + 1) & 0xFFFF

        if op == 0x00:
            return 4
        if op == 0x3E:
            self.r.a = self.mem.read8(self.r.pc)
            self.r.pc += 1
            return 8
        if op == 0x06:
            self.r.b = self.mem.read8(self.r.pc)
            self.r.pc += 1
            return 8
        if op == 0x0E:
            self.r.c = self.mem.read8(self.r.pc)
            self.r.pc += 1
            return 8
        if op == 0xAF:
            self.r.a ^= self.r.a
            self.set_flag_znhc(self.r.a == 0, False, False, False)
            return 4
        if op == 0xEA:
            addr = self.read16(self.r.pc)
            self.r.pc += 2
            self.mem.write8(addr, self.r.a)
            return 16
        if op == 0xFA:
            addr = self.read16(self.r.pc)
            self.r.pc += 2
            self.r.a = self.mem.read8(addr)
            return 16
        if op == 0xC3:
            self.r.pc = self.read16(self.r.pc)
            return 16
        if op == 0xCD:
            target = self.read16(self.r.pc)
            self.r.pc += 2
            self.r.sp = (self.r.sp - 1) & 0xFFFF
            self.mem.write8(self.r.sp, (self.r.pc >> 8) & 0xFF)
            self.r.sp = (self.r.sp - 1) & 0xFFFF
            self.mem.write8(self.r.sp, self.r.pc & 0xFF)
            self.r.pc = target
            return 24
        if op == 0xC9:
            lo = self.mem.read8(self.r.sp)
            self.r.sp = (self.r.sp + 1) & 0xFFFF
            hi = self.mem.read8(self.r.sp)
            self.r.sp = (self.r.sp + 1) & 0xFFFF
            self.r.pc = (hi << 8) | lo
            return 16
        if op == 0x76:
            self.halted = True
            return 4
        return 4


class PPU:
    def __init__(self, mem: Memory) -> None:
        self.mem = mem
        self.cycles = 0
        self.framebuffer = bytearray(SCREEN_W * SCREEN_H * 4)
        self.palette = [
            (224, 248, 208, 255),
            (136, 192, 112, 255),
            (52, 104, 86, 255),
            (8, 24, 32, 255),
        ]
        self.reset_registers()

    def reset_registers(self) -> None:
        self.mem.io[0x40] = 0x91
        self.mem.io[0x42] = 0
        self.mem.io[0x43] = 0
        self.mem.io[0x44] = 0
        self.mem.io[0x47] = 0xE4

    def render_scanline(self) -> None:
        ly = self.mem.io[0x44]
        if ly >= SCREEN_H:
            return
        lcdc = self.mem.io[0x40]
        if not (lcdc & 0x80):
            return
        scy = self.mem.io[0x42]
        scx = self.mem.io[0x43]
        bg_map = 0x1C00 if (lcdc & 0x08) else 0x1800
        tiles_unsigned = bool(lcdc & 0x10)

        for x in range(SCREEN_W):
            map_x = (x + scx) & 0xFF
            map_y = (ly + scy) & 0xFF
            tile_col = map_x // 8
            tile_row = map_y // 8
            tile_index = self.mem.vram[bg_map + tile_row * 32 + tile_col]

            if tiles_unsigned:
                tile_addr = tile_index * 16
            else:
                signed = tile_index if tile_index < 128 else tile_index - 256
                tile_addr = 0x1000 + signed * 16

            line = (map_y % 8) * 2
            lo = self.mem.vram[(tile_addr + line) & 0x1FFF]
            hi = self.mem.vram[(tile_addr + line + 1) & 0x1FFF]
            bit = 7 - (map_x % 8)
            color_id = ((hi >> bit) & 1) << 1 | ((lo >> bit) & 1)
            r, g, b, a = self.palette[color_id]
            idx = (ly * SCREEN_W + x) * 4
            self.framebuffer[idx: idx + 4] = bytes((r, g, b, a))

    def step(self, cpu_cycles: int) -> bool:
        self.cycles += cpu_cycles
        frame_done = False
        while self.cycles >= 456:
            self.cycles -= 456
            ly = (self.mem.io[0x44] + 1) & 0xFF
            self.mem.io[0x44] = ly
            if ly < SCREEN_H:
                self.render_scanline()
            elif ly == 144:
                self.mem.io[0x0F] |= 0x01
                frame_done = True
            elif ly > 153:
                self.mem.io[0x44] = 0
        return frame_done


class Joypad:
    def __init__(self, mem: Memory) -> None:
        self.mem = mem
        self.keys = {
            "right": 1,
            "left": 1,
            "up": 1,
            "down": 1,
            "a": 1,
            "b": 1,
            "select": 1,
            "start": 1,
        }

    def set_key(self, name: str, pressed: bool) -> None:
        if name in self.keys:
            self.keys[name] = 0 if pressed else 1
            self.mem.io[0x0F] |= 0x10

    def update(self) -> None:
        p1 = self.mem.io[0x00]
        select_buttons = not bool(p1 & 0x20)
        select_dpad = not bool(p1 & 0x10)
        out = 0xCF

        if select_buttons:
            out = (out & 0xF0) | (self.keys["start"] << 3) | (self.keys["select"] << 2) | (self.keys["b"] << 1) | self.keys["a"]
        if select_dpad:
            out = (out & 0xF0) | (self.keys["down"] << 3) | (self.keys["up"] << 2) | (self.keys["left"] << 1) | self.keys["right"]
        self.mem.io[0x00] = out


class GameBoy:
    def __init__(self) -> None:
        self.mem = Memory()
        self.cpu = CPU(self.mem)
        self.ppu = PPU(self.mem)
        self.joypad = Joypad(self.mem)
        self.running = False

    def load_rom(self, rom_data: bytes) -> None:
        self.mem.load_rom(rom_data)
        self.cpu = CPU(self.mem)
        self.ppu = PPU(self.mem)
        self.joypad = Joypad(self.mem)

    def step_frame(self) -> bytes:
        cycles = 0
        while cycles < FRAME_CYCLES:
            cpu_cycles = self.cpu.step()
            cycles += cpu_cycles
            self.joypad.update()
            self.ppu.step(cpu_cycles)
        return bytes(self.ppu.framebuffer)


EMULATOR = GameBoy()


def load_rom(data: bytes) -> None:
    EMULATOR.load_rom(data)


def set_button(name: str, pressed: bool) -> None:
    EMULATOR.joypad.set_key(name, pressed)


def run_frame() -> bytes:
    return EMULATOR.step_frame()
