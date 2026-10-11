const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const te = new TextEncoder();

function u16(n: number) {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff);
}
function u32(n: number) {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

/** Uncompressed ZIP (Excel opens STORE archives). */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = te.encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      te.encode('PK\u0003\u0004'), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0),
      name, file.data,
    ]);
    locals.push(local);
    centrals.push(concat([
      te.encode('PK\u0001\u0002'), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const central = concat(centrals);
  const eocd = concat([
    te.encode('PK\u0005\u0006'), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...locals, central, eocd]);
}

export async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buf);
  const eocd = findEocd(bytes);
  const count = u16le(bytes, eocd + 10);
  const centralOff = u32le(bytes, eocd + 16);
  const out = new Map<string, Uint8Array>();
  let p = centralOff;
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (!(bytes[p] === 0x50 && bytes[p + 1] === 0x4b && bytes[p + 2] === 0x01 && bytes[p + 3] === 0x02)) break;
    const method = u16le(bytes, p + 10);
    const comp = u32le(bytes, p + 20);
    const nameLen = u16le(bytes, p + 28);
    const extra = u16le(bytes, p + 30);
    const comment = u16le(bytes, p + 32);
    const localOff = u32le(bytes, p + 42);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const localName = u16le(bytes, localOff + 26);
    const localExtra = u16le(bytes, localOff + 28);
    const start = localOff + 30 + localName + localExtra;
    const packed = bytes.subarray(start, start + comp);
    out.set(name.replace(/\\/g, '/'), method === 0 ? packed.slice() : await inflateRaw(packed));
    p += 46 + nameLen + extra + comment;
  }
  if (!out.size) throw new Error('This Excel file could not be read.');
  return out;
}

function findEocd(bytes: Uint8Array) {
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  throw new Error('This Excel file could not be read.');
}

function u16le(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8);
}
function u32le(b: Uint8Array, o: number) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed Excel files.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
