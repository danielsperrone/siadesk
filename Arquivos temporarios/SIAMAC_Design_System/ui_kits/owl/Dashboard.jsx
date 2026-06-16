/* OWL — Dashboard */

const LiveReadout = ({ weight, stable, onCapture }) => (
  <div className="card" style={{
    background: "linear-gradient(180deg,#0F1620 0%, #080C12 100%)",
    border: "1px solid #1d2632", borderRadius: 14, color: "#fff",
    padding: 0, position: "relative", overflow: "hidden",
    boxShadow: "0 12px 36px rgba(0,71,136,.18)"
  }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, display: "flex", flexDirection: "column" }}>
      <span style={{ flex: 1, background: "#800000" }}/>
      <span style={{ flex: 1, background: "#018743" }}/>
      <span style={{ flex: 1, background: "#004788" }}/>
    </div>
    <div style={{ padding: "22px 28px 22px 36px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="eyebrow" style={{ color: "#88A4CB" }}>PESO BRUTO · BALANÇA 02 · TOLEDO MGR-3000</div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: stable ? "#27d04a" : "#FFC93D",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: ".14em"
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: "currentColor",
            boxShadow: "0 0 10px currentColor", animation: stable ? "none" : "pulse 1.2s infinite" }}/>
          {stable ? "ESTÁVEL" : "OSCILANDO"}
        </span>
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 96, lineHeight: 1,
        letterSpacing: "-0.02em", margin: "12px 0 6px", fontVariantNumeric: "tabular-nums"
      }}>
        {weight.toLocaleString("pt-BR")}
        <span style={{ fontSize: 28, fontWeight: 500, color: "#88A4CB", marginLeft: 10 }}>kg</span>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "#88A4CB" }}>
        <span>Placa <b style={{ color: "#fff", fontWeight: 600 }}>BRA-2E19</b></span>
        <span>Tara <b style={{ color: "#fff", fontWeight: 600 }}>14.880 kg</b></span>
        <span>Líquido <b style={{ color: "#27d04a", fontWeight: 600 }}>{(weight - 14880).toLocaleString("pt-BR")} kg</b></span>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, padding: "14px 28px 18px 36px", borderTop: "1px solid #1d2632" }}>
      <Button kind="success" leadingIcon="check-circle-2" size="lg" onClick={onCapture}>Capturar peso bruto</Button>
      <Button kind="secondary" leadingIcon="refresh-cw" style={{ background: "#161B23", color: "#fff", borderColor: "#1d2632" }}>Zerar indicador</Button>
      <div style={{ flex: 1 }}/>
      <button className="btn btn-secondary" style={{ background: "#161B23", color: "#88A4CB", borderColor: "#1d2632" }}>
        <Icon name="settings"/>
      </button>
    </div>
  </div>
);

const BalanceCard = ({ id, name, indicator, ok, last }) => (
  <div style={{
    background: "#fff", border: "1px solid var(--ink-75)", borderRadius: 10,
    padding: 14, display: "flex", gap: 12, alignItems: "center"
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: ok ? "var(--color-success-soft)" : "var(--color-danger-soft)",
      color: ok ? "var(--color-success)" : "var(--color-danger)",
      display: "grid", placeItems: "center"
    }}>
      <Icon name="scale" size={18}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--fg-1)" }}>{name}</span>
        <Pill kind={ok ? "success" : "danger"}>{ok ? "Online" : "Offline"}</Pill>
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)", marginTop: 3 }}>
        {id} · {indicator}
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{last}</div>
    </div>
  </div>
);

const Dashboard = ({ go }) => {
  const [weight, setWeight] = React.useState(32480);
  React.useEffect(() => {
    const t = setInterval(() => {
      // Simulate small fluctuations around stable value
      setWeight((w) => {
        const target = 32480;
        const drift = Math.round((Math.random() - 0.5) * 20);
        const next = w + drift + (target - w) * 0.3;
        return Math.round(next / 20) * 20;
      });
    }, 1400);
    return () => clearInterval(t);
  }, []);

  const tickets = [
    { id: "PSG-2026-04-1827", plate: "BRA-2E19", client: "COFCO Brasil", product: "Soja a granel", net: "17.600 kg", op: "Carga", status: "success", statusLabel: "Concluída", time: "14:32" },
    { id: "PSG-2026-04-1826", plate: "RIO-4H82", client: "JBS Aves", product: "Milho moído", net: "12.840 kg", op: "Descarga", status: "info", statusLabel: "Em pesagem", time: "14:28" },
    { id: "PSG-2026-04-1825", plate: "PRD-9K01", client: "Cargill Agrícola", product: "Farelo de soja", net: "21.300 kg", op: "Carga", status: "danger", statusLabel: "Fora da tolerância", time: "14:15" },
    { id: "PSG-2026-04-1824", plate: "BHS-1J47", client: "Bunge Alimentos", product: "Trigo", net: "19.420 kg", op: "Carga", status: "success", statusLabel: "Concluída", time: "13:58" },
    { id: "PSG-2026-04-1823", plate: "SPO-7M11", client: "Granol Indústria", product: "Óleo de soja", net: "24.120 kg", op: "Carga", status: "success", statusLabel: "Concluída", time: "13:41" },
    { id: "PSG-2026-04-1822", plate: "BRA-3L09", client: "ADM do Brasil", product: "Milho", net: "18.200 kg", op: "Descarga", status: "success", statusLabel: "Concluída", time: "13:14" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 20 }}>
        <LiveReadout weight={weight} stable={true} onCapture={() => go("weighing")}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <StatTile label="Pesagens hoje" value="142" delta="▲ 12% vs ontem" deltaKind="up" icon="ticket"/>
          <StatTile label="Peso líquido" value="4.218" unit="t" delta="▲ 8%" deltaKind="up" icon="layers"/>
          <StatTile label="Tickets a auditar" value="2" delta="Fora da tolerância" deltaKind="down" icon="alert-triangle"/>
          <StatTile label="Tempo médio" value="3:42" unit="min" delta="por veículo" icon="clock"/>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 0 }}>
          <CardHead title="Pesagens recentes" icon="list"
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="ghost" leadingIcon="filter">Filtros</Button>
                <Button kind="secondary" leadingIcon="download">Exportar</Button>
              </div>
            }/>
          <table className="t">
            <thead><tr>
              <th>Ticket</th><th>Hora</th><th>Placa</th><th>Cliente · Produto</th><th>Op.</th><th>Peso líq.</th><th>Status</th>
            </tr></thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} onClick={() => go("ticket")}>
                  <td className="mono" style={{ color: "var(--color-primary)" }}>#{t.id.split("-").pop()}</td>
                  <td className="mono">{t.time}</td>
                  <td><Plate>{t.plate}</Plate></td>
                  <td>
                    <div style={{ color: "var(--fg-1)", fontWeight: 500 }}>{t.client}</div>
                    <div style={{ color: "var(--fg-3)", fontSize: 12 }}>{t.product}</div>
                  </td>
                  <td>{t.op}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{t.net}</td>
                  <td><Pill kind={t.status}>{t.statusLabel}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <CardHead title="Balanças" icon="activity" right={<Pill kind="success">3 / 3 online</Pill>}/>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <BalanceCard id="BAL-01" name="Balança 01 · Entrada" indicator="Toledo MGR-3000" ok={true} last="ativa agora"/>
              <BalanceCard id="BAL-02" name="Balança 02 · Saída" indicator="Filizola UR-10000" ok={true} last="14:32"/>
              <BalanceCard id="BAL-03" name="Balança 03 · Auxiliar" indicator="Líder LD-2050" ok={true} last="13:48"/>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <CardHead title="Anti-fraude · OWL" icon="shield-check"/>
            <div style={{ padding: "16px 22px 18px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "grid", placeItems: "center" }}>
                  <Icon name="alert-triangle" size={16}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-1)", fontSize: 13 }}>
                    1 veículo passou na balança sem gerar ticket
                  </div>
                  <div style={{ color: "var(--fg-3)", fontSize: 12, marginTop: 2 }}>
                    14:08 · Balança 01 · peso de <span className="t-mono" style={{ color: "var(--fg-1)", fontWeight: 600 }}>21.480 kg</span>
                  </div>
                </div>
              </div>
              <Button kind="secondary" leadingIcon="search" style={{ width: "100%", justifyContent: "center" }}>Ver registro de auditoria</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard });
