import "./FreeCover.css";



/** Animated blue–white nature cover for the free card form. Pure SVG + CSS. */
export default function FreeCover({ design }: { design: string }) {
  const id = `fc-${design}`;
  const sky = (top: string, mid: string, bottom: string) => (
    <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset=".6" stopColor={mid} /><stop offset="1" stopColor={bottom} /></linearGradient>
  );
  const peaks = (y: number, fill: string, cls = "", snow = false) => (
    <g className={cls}>
      <path d={`M-20 ${y + 70} L40 ${y + 20} L80 ${y + 45} L130 ${y - 10} L175 ${y + 30} L220 ${y + 5} L270 ${y + 40} L320 ${y - 5} L370 ${y + 35} L420 ${y + 10} L420 160 L-20 160Z`} fill={fill} />
      {snow && <path d={`M118 ${y + 4} L130 ${y - 10} L142 ${y + 6} L134 ${y + 2} L128 ${y + 9}Z M308 ${y + 8} L320 ${y - 5} L333 ${y + 10} L324 ${y + 6} L317 ${y + 12}Z M210 ${y + 14} L220 ${y + 5} L230 ${y + 15} L223 ${y + 12}Z`} fill="#f0f9ff" opacity=".95" />}
    </g>
  );

  return (
    <svg className={`free-scene s-${design}`} viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        {design === "pamir" && sky("#0b3b8f", "#3b82f6", "#bfdbfe")}
        {design === "lake" && sky("#06386b", "#38bdf8", "#e0f2fe")}
        {design === "aurora" && sky("#030617", "#111a4a", "#1e3a8a")}
        {design === "stars" && sky("#01030d", "#0b1d4d", "#1d4ed8")}
        {design === "sunrise" && sky("#1e40af", "#60a5fa", "#f0f9ff")}
        {design === "river" && sky("#083344", "#0891b2", "#a5f3fc")}
        <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".35" stopColor="#e0f2fe" stopOpacity=".55" /><stop offset="1" stopColor="#7dd3fc" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-aur`} x1="0" x2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity="0" /><stop offset=".3" stopColor="#67e8f9" /><stop offset=".6" stopColor="#a5b4fc" /><stop offset="1" stopColor="#e0e7ff" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0c4a6e" /></linearGradient>
      </defs>
      <rect width="400" height="150" fill={`url(#${id}-sky)`} />

      {design === "pamir" && (<>
        <circle className="fs-pulse" cx="300" cy="38" r="46" fill={`url(#${id}-glow)`} />
        <g className="fs-clouds"><ellipse cx="80" cy="40" rx="50" ry="8" fill="#fff" opacity=".55" /><ellipse cx="260" cy="58" rx="60" ry="7" fill="#fff" opacity=".4" /><ellipse cx="480" cy="34" rx="55" ry="7" fill="#fff" opacity=".5" /></g>
        {peaks(55, "#1e3a8a", "", true)}{peaks(85, "#172554", "fs-drift")}{peaks(110, "#0b1533")}
      </>)}

      {design === "lake" && (<>
        <circle className="fs-pulse" cx="200" cy="30" r="40" fill={`url(#${id}-glow)`} />
        {peaks(40, "#1e40af", "", true)}
        <rect y="88" width="400" height="62" fill={`url(#${id}-water)`} />
        <g transform="translate(0 176) scale(1 -1)" opacity=".35">{peaks(40, "#1e40af")}</g>
        <g className="fs-shimmer" stroke="#f0f9ff" strokeLinecap="round">{[96, 104, 113, 123, 134].map((y, i) => <line key={y} x1={40 + i * 30} y1={y} x2={110 + i * 40} y2={y} strokeWidth="1.4" opacity=".7" />)}</g>
      </>)}

      {design === "aurora" && (<>
        <g className="fs-aurora"><path d="M-40 70 C 60 20, 140 90, 220 40 S 380 60, 460 20" stroke={`url(#${id}-aur)`} strokeWidth="26" fill="none" opacity=".75" /><path d="M-40 90 C 80 50, 160 100, 250 60 S 390 80, 460 50" stroke={`url(#${id}-aur)`} strokeWidth="14" fill="none" opacity=".5" /></g>
        <g className="fs-twinkle" fill="#fff">{[[30, 20], [90, 12], [150, 28], [210, 10], [270, 22], [330, 14], [380, 30], [60, 45], [350, 48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? .9 : 1.4} style={{ animationDelay: `${i * .3}s` }} />)}</g>
        {peaks(95, "#0b1533", "", true)}
      </>)}

      {design === "stars" && (<>
        <g className="fs-twinkle" fill="#fff">{Array.from({ length: 34 }).map((_, i) => <circle key={i} cx={(i * 53) % 400} cy={(i * 37) % 90} r={i % 4 ? .8 : 1.5} style={{ animationDelay: `${(i % 7) * .4}s` }} />)}</g>
        <line className="fs-shoot" x1="80" y1="10" x2="140" y2="30" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="330" cy="30" r="14" fill="#e0f2fe" /><circle cx="336" cy="26" r="13" fill="#0b1d4d" opacity=".85" />
        {peaks(90, "#0f2a6b", "", true)}{peaks(112, "#061234")}
      </>)}

      {design === "sunrise" && (<>
        <g className="fs-rays" style={{ transformOrigin: "200px 105px" }}>{Array.from({ length: 12 }).map((_, i) => <path key={i} d="M200 105 L170 -120 L230 -120Z" fill="#fff" opacity=".16" transform={`rotate(${i * 30} 200 105)`} />)}</g>
        <circle className="fs-pulse" cx="200" cy="100" r="55" fill={`url(#${id}-glow)`} />
        {peaks(70, "#3b82f6", "", true)}{peaks(98, "#1e3a8a", "fs-drift")}{peaks(118, "#0f1f4d")}
      </>)}

      {design === "river" && (<>
        <circle className="fs-pulse" cx="90" cy="34" r="36" fill={`url(#${id}-glow)`} />
        {peaks(48, "#155e75", "", true)}
        <g className="fs-waves">
          <path d="M-400 108 Q -350 98 -300 108 T -200 108 T -100 108 T 0 108 T 100 108 T 200 108 T 300 108 T 400 108 T 500 108 V160 H-400Z" fill="#22d3ee" opacity=".55" />
          <path d="M-400 122 Q -350 112 -300 122 T -200 122 T -100 122 T 0 122 T 100 122 T 200 122 T 300 122 T 400 122 T 500 122 V160 H-400Z" fill="#0e7490" />
          <path d="M-400 136 Q -350 128 -300 136 T -200 136 T -100 136 T 0 136 T 100 136 T 200 136 T 300 136 T 400 136 T 500 136 V160 H-400Z" fill="#083344" />
        </g>
      </>)}

      <g className="fs-sparks" fill="#fff">{[[60, 70], [140, 50], [250, 80], [340, 60], [190, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" style={{ animationDelay: `${i * .7}s` }} />)}</g>
    </svg>
  );
}
