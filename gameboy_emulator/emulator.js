const statusEl = document.getElementById('runtimeStatus');
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const romInput = document.getElementById('romFile');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

let pyodide;
let running = false;
let rafId = null;
let hasRom = false;

const keyMap = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down', z: 'a', x: 'b', Enter: 'start', Shift: 'select' };

function setStatus(msg, kind = '') { statusEl.className = `status ${kind}`.trim(); statusEl.textContent = msg; }
function drawFrame(frameBytes) { ctx.putImageData(new ImageData(new Uint8ClampedArray(frameBytes), 160, 144), 0, 0); }

async function bootPython() {
  setStatus('Loading Pyodide runtime…');
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(`
from pyodide.http import pyfetch
content = await (await pyfetch('gb_emulator.py')).string()
open('gb_emulator.py', 'w', encoding='utf-8').write(content)
import gb_emulator
`);
  setStatus('Runtime ready. Load a .gb ROM file.', 'ok');
}

async function loadRom(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  pyodide.globals.set('rom_bytes', data);
  await pyodide.runPythonAsync(`import gb_emulator\ngb_emulator.load_rom(bytes(rom_bytes.to_py().tolist()))`);
  hasRom = true;
  setStatus(`ROM loaded: ${file.name}`, 'ok');
}

function frameLoop() {
  if (!running || !hasRom) return;
  const frame = pyodide.runPython('import gb_emulator\ngb_emulator.run_frame()');
  drawFrame(frame.toJs());
  rafId = requestAnimationFrame(frameLoop);
}

function stopLoop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

romInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  try { await loadRom(file); } catch (err) { setStatus(`Failed to load ROM: ${err.message}`, 'error'); }
});
startBtn.addEventListener('click', () => { if (!hasRom) return setStatus('Please choose a .gb ROM before starting.', 'error'); if (!running) { running = true; frameLoop(); setStatus('Running…', 'ok'); } });
pauseBtn.addEventListener('click', () => { stopLoop(); setStatus('Paused.'); });
resetBtn.addEventListener('click', async () => { stopLoop(); const file = romInput.files?.[0]; if (!file) return; await loadRom(file); ctx.clearRect(0, 0, canvas.width, canvas.height); });

window.addEventListener('keydown', (event) => {
  const key = keyMap[event.key] || keyMap[event.key.toLowerCase?.()];
  if (!key || !pyodide || !hasRom) return;
  event.preventDefault(); pyodide.globals.set('btn_name', key); pyodide.runPython('import gb_emulator\ngb_emulator.set_button(btn_name, True)');
});
window.addEventListener('keyup', (event) => {
  const key = keyMap[event.key] || keyMap[event.key.toLowerCase?.()];
  if (!key || !pyodide || !hasRom) return;
  event.preventDefault(); pyodide.globals.set('btn_name', key); pyodide.runPython('import gb_emulator\ngb_emulator.set_button(btn_name, False)');
});

bootPython().catch((err) => setStatus(`Runtime init failed: ${err.message}`, 'error'));
