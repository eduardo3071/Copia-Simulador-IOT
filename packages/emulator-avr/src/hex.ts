/** Parses Intel HEX into a flash image. Throws on malformed records or bad checksums. */
export function loadHex(source: string, flashBytes: number = 0x8000): Uint8Array {
  const flash = new Uint8Array(flashBytes);
  let base = 0;
  let sawEof = false;
  for (const [lineNo, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    if (line[0] !== ":") throw new Error(`HEX inválido na linha ${lineNo + 1}`);
    const bytes = new Uint8Array((line.length - 1) / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(line.substr(1 + i * 2, 2), 16);
    const count = bytes[0]!;
    const address = (bytes[1]! << 8) | bytes[2]!;
    const type = bytes[3]!;
    if (bytes.length !== count + 5) throw new Error(`Tamanho de registro inválido na linha ${lineNo + 1}`);
    const sum = bytes.reduce((acc, b) => (acc + b) & 0xff, 0);
    if (sum !== 0) throw new Error(`Checksum inválido na linha ${lineNo + 1}`);
    if (type === 0x00) {
      const start = base + address;
      if (start + count > flash.length) throw new Error("Programa maior que a flash do microcontrolador.");
      flash.set(bytes.subarray(4, 4 + count), start);
    } else if (type === 0x01) {
      sawEof = true;
      break;
    } else if (type === 0x02) {
      base = ((bytes[4]! << 8) | bytes[5]!) << 4;
    } else if (type === 0x04) {
      base = ((bytes[4]! << 8) | bytes[5]!) << 16;
    }
  }
  if (!sawEof) throw new Error("HEX sem registro de fim de arquivo.");
  return flash;
}