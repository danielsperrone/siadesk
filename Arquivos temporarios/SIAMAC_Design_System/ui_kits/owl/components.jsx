/* OWL — shared atoms */

const Icon = ({ name, size = 16, strokeWidth = 1.75 }) => {
  // Lucide icons by name. We render an <i data-lucide> into our own span and
  // let lucide replace it on mount; this isolates the icon from React's diffs
  // (otherwise re-renders revert the SVG back to a bare <i>).
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !window.lucide) return;
    el.innerHTML = `<i data-lucide="${name}"></i>`;
    window.lucide.createIcons({
      icons: window.lucide.icons,
      nameAttr: "data-lucide",
      attrs: { "stroke-width": strokeWidth, width: size, height: size },
    });
  }, [name, size, strokeWidth]);
  return <span ref={ref} style={{
    display: "inline-flex", width: size, height: size, lineHeight: 0,
    flexShrink: 0, color: "currentColor"
  }}/>;
};

const Button = ({ kind = "primary", size, leadingIcon, trailingIcon, children, onClick, type = "button", style }) => {
  const cls = `btn btn-${kind}${size === "lg" ? " btn-lg" : ""}`;
  return (
    <button type={type} className={cls} onClick={onClick} style={style}>
      {leadingIcon && <Icon name={leadingIcon} />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} />}
    </button>
  );
};

const Pill = ({ kind = "neutral", children, dot = true }) => (
  <span className={`pill pill-${kind}`}>
    {dot && kind !== "neutral" && <span className="dot"></span>}
    {children}
  </span>
);

const Eyebrow = ({ children, color }) => (
  <div className="eyebrow" style={color ? { color } : null}>{children}</div>
);

const Plate = ({ children }) => <span className="plate">{children}</span>;

const Field = ({ label, required, hint, children, error }) => (
  <div className="field">
    {label && <label>{label}{required && <span className="req"> *</span>}</label>}
    {children}
    {hint && <div className="help" style={error ? { color: "var(--siamac-red-700)" } : null}>{hint}</div>}
  </div>
);

const Card = ({ children, style, padding = true }) => (
  <div className="card" style={style}>
    {padding ? <div className="card-pad">{children}</div> : children}
  </div>
);

const CardHead = ({ title, icon, right }) => (
  <div className="card-head">
    <div className="card-title">
      {icon && <Icon name={icon} size={16} />}
      <span>{title}</span>
    </div>
    {right}
  </div>
);

const StatTile = ({ label, value, unit, delta, deltaKind = "neutral", icon }) => (
  <Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div className="eyebrow" style={{ color: "var(--fg-3)" }}>{label}</div>
      {icon && <Icon name={icon} size={16} />}
    </div>
    <div style={{
      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 32, lineHeight: 1,
      marginTop: 12, color: "var(--fg-1)", fontVariantNumeric: "tabular-nums"
    }}>
      {value}
      {unit && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-3)", marginLeft: 4 }}>{unit}</span>}
    </div>
    {delta && (
      <div style={{
        marginTop: 10, fontSize: 11, fontWeight: 600,
        color: deltaKind === "up" ? "var(--color-success)" : deltaKind === "down" ? "var(--color-danger)" : "var(--fg-3)"
      }}>{delta}</div>
    )}
  </Card>
);

const BrandBars = ({ vertical, size = 4 }) => (
  vertical ? (
    <div style={{ width: size, height: "100%", display: "flex", flexDirection: "column" }}>
      <span style={{ flex: 1, background: "#800000" }}/>
      <span style={{ flex: 1, background: "#018743" }}/>
      <span style={{ flex: 1, background: "#004788" }}/>
    </div>
  ) : (
    <div style={{ height: size, width: "100%", display: "flex" }}>
      <span style={{ flex: 1, background: "#800000" }}/>
      <span style={{ flex: 1, background: "#018743" }}/>
      <span style={{ flex: 1, background: "#004788" }}/>
    </div>
  )
);

Object.assign(window, { Icon, Button, Pill, Eyebrow, Plate, Field, Card, CardHead, StatTile, BrandBars });
