/**
 * Eenvoudige 2D-symbolen per meubeltype, getekend rond (0,0) in mm. De voorkant wijst naar +y.
 * Zelfgemaakt, zonder externe beelden.
 */
const stroke = "#5e5143";
const fill = "#ffffff";

export function furnitureSymbol(kind: string, w: number, d: number) {
  const hw = w / 2;
  const hd = d / 2;
  const sw = Math.max(12, Math.min(w, d) * 0.025);
  const base = <rect x={-hw} y={-hd} width={w} height={d} rx={Math.min(w, d) * 0.06} fill={fill} stroke={stroke} strokeWidth={sw} />;
  const line = (x1: number, y1: number, x2: number, y2: number, key: string) => (
    <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw * 0.8} />
  );

  switch (kind) {
    case "sofa":
    case "armchair": {
      const back = d * 0.25;
      const arm = Math.min(w * 0.15, 200);
      return (
        <g>
          {base}
          <rect x={-hw} y={-hd} width={w} height={back} fill="#efe9df" stroke={stroke} strokeWidth={sw * 0.8} />
          <rect x={-hw} y={-hd} width={arm} height={d} fill="#efe9df" stroke={stroke} strokeWidth={sw * 0.8} />
          <rect x={hw - arm} y={-hd} width={arm} height={d} fill="#efe9df" stroke={stroke} strokeWidth={sw * 0.8} />
          {kind === "sofa" && [1, 2].map((i) => line(-hw + arm + ((w - 2 * arm) * i) / 3, -hd + back, -hw + arm + ((w - 2 * arm) * i) / 3, hd, `s${i}`))}
        </g>
      );
    }
    case "bed":
      return (
        <g>
          {base}
          <rect x={-hw} y={-hd} width={w} height={d * 0.07} fill="#d8cfc0" stroke={stroke} strokeWidth={sw * 0.8} />
          <rect x={-hw + w * 0.08} y={-hd + d * 0.1} width={w * 0.38} height={d * 0.14} rx={40} fill="#f5f1eb" stroke={stroke} strokeWidth={sw * 0.6} />
          <rect x={w * 0.04} y={-hd + d * 0.1} width={w * 0.38} height={d * 0.14} rx={40} fill="#f5f1eb" stroke={stroke} strokeWidth={sw * 0.6} />
          {line(-hw, -hd + d * 0.32, hw, -hd + d * 0.32, "deken")}
        </g>
      );
    case "chair":
      return (
        <g>
          {base}
          <rect x={-hw} y={-hd} width={w} height={d * 0.18} fill="#efe9df" stroke={stroke} strokeWidth={sw * 0.8} />
        </g>
      );
    case "wardrobe":
    case "bookcase":
      return (
        <g>
          {base}
          {Array.from({ length: Math.max(1, Math.round(w / 500)) - 1 }, (_, i) => {
            const x = -hw + (w * (i + 1)) / Math.max(1, Math.round(w / 500));
            return line(x, -hd, x, hd, `k${i}`);
          })}
          {kind === "wardrobe" && line(-hw, hd - d * 0.08, hw, hd - d * 0.08, "deur")}
        </g>
      );
    case "kitchen":
      return (
        <g>
          {base}
          <rect x={-hw + w * 0.55} y={-hd + d * 0.18} width={w * 0.2} height={d * 0.55} rx={30} fill="#f5f1eb" stroke={stroke} strokeWidth={sw * 0.7} />
          {[0.15, 0.3].map((f, i) => (
            <circle key={`p${i}`} cx={-hw + w * f} cy={0} r={d * 0.14} fill="none" stroke={stroke} strokeWidth={sw * 0.7} />
          ))}
        </g>
      );
    case "vanity":
      return (
        <g>
          {base}
          <ellipse cx={0} cy={hd * 0.1} rx={w * 0.25} ry={d * 0.3} fill="#f5f1eb" stroke={stroke} strokeWidth={sw * 0.7} />
        </g>
      );
    case "dining-table":
    case "coffee-table":
    case "desk":
    default:
      return base;
  }
}
