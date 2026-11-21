import qrcode from "qrcode-generator";

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();

  const count = qr.getModuleCount();
  const cell = size / count;
  const modules: { x: number; y: number }[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) modules.push({ x: col * cell, y: row * cell });
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Redemption QR code">
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      <g fill="#000">
        {modules.map((m) => (
          <rect key={`${m.x}-${m.y}`} x={m.x} y={m.y} width={cell} height={cell} />
        ))}
      </g>
    </svg>
  );
}
