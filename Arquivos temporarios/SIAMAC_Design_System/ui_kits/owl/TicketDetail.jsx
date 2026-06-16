/* OWL — Ticket detail / print-style ticket */

const TicketDetail = ({ go }) => (
  <div style={{ maxWidth: 980, margin: "0 auto" }}>
    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
      <button className="btn btn-ghost" onClick={() => go("dashboard")}>
        <Icon name="arrow-left"/> Voltar aos tickets
      </button>
      <div style={{ flex: 1 }}/>
      <div style={{ display: "flex", gap: 8 }}>
        <Button kind="secondary" leadingIcon="printer">Imprimir (1 via)</Button>
        <Button kind="secondary" leadingIcon="copy">Imprimir (3 vias)</Button>
        <Button kind="secondary" leadingIcon="mail">Enviar por e-mail</Button>
        <Button kind="primary" leadingIcon="download">PDF</Button>
      </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Brand bar header */}
      <div style={{ height: 6, display: "flex" }}>
        <span style={{ flex: 1, background: "#800000" }}/>
        <span style={{ flex: 1, background: "#018743" }}/>
        <span style={{ flex: 1, background: "#004788" }}/>
      </div>

      <div style={{ padding: "28px 36px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <img src="../../assets/logo/siamac-logo-color.webp" alt="SIAMAC" style={{ height: 36 }}/>
            <div className="eyebrow" style={{ marginTop: 14 }}>TICKET DE PESAGEM RODOVIÁRIA · OWL</div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36,
              color: "var(--fg-1)", margin: "4px 0 0", letterSpacing: "-0.02em"
            }}>#PSG-2026-04-1828</div>
            <div style={{ marginTop: 8 }}>
              <Pill kind="success">Concluída · dentro da tolerância</Pill>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: ".06em", fontFamily: "var(--font-display)", fontWeight: 600 }}>EMITIDO EM</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 14, marginTop: 4, color: "var(--fg-1)" }}>
              20/05/2026 · 14:32:08
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--fg-3)", letterSpacing: ".06em", fontFamily: "var(--font-display)", fontWeight: 600 }}>BALANÇA</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, marginTop: 4, color: "var(--fg-1)" }}>
              BAL-02 · Toledo MGR-3000
            </div>
          </div>
        </div>

        {/* The Big Weight readout */}
        <div style={{
          marginTop: 28, padding: "24px 28px",
          background: "var(--ink-25)", border: "1px solid var(--ink-75)", borderRadius: 10,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0
        }}>
          <Big label="TARA" value="14.880" unit="kg"/>
          <Big label="BRUTO" value="32.480" unit="kg"/>
          <Big label="LÍQUIDO" value="17.600" unit="kg" highlight/>
        </div>

        {/* Two columns of info */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
          <Section title="Operação">
            <KV k="Operação" v="Carga (saída)"/>
            <KV k="Produto" v="Soja a granel"/>
            <KV k="Categoria" v="Grãos / commodities"/>
            <KV k="Fator de correção" v="1,000 (sem ajuste)" mono/>
            <KV k="Nota fiscal" v="0034871" mono/>
            <KV k="Tolerância" v="± 200 kg · OK" mono ok/>
          </Section>
          <Section title="Cliente & veículo">
            <KV k="Cliente" v="COFCO Brasil S/A"/>
            <KV k="CNPJ" v="12.345.678/0001-90" mono/>
            <KV k="Transportadora" v="Translog Bahia"/>
            <KV k="Motorista" v="João Pedro Silva"/>
            <KV k="CNH" v="01234567890" mono/>
            <KV k="Placa" v={<Plate>BRA-2E19</Plate>}/>
            <KV k="Veículo" v="Carreta · 3 eixos"/>
          </Section>
        </div>

        <div style={{
          marginTop: 28, padding: "16px 20px",
          background: "var(--ink-25)", border: "1px dashed var(--ink-100)", borderRadius: 8,
          fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6
        }}>
          <b style={{ color: "var(--fg-2)" }}>Observações:</b> Pesagem capturada com indicador estável.
          Operador conferiu a posição completa do veículo sobre a plataforma. Registro vitalício gravado
          no servidor local com cópia em nuvem.
        </div>

        <div style={{
          marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--ink-75)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)"
        }}>
          <span>Operador: <b style={{ color: "var(--fg-1)" }}>Marcos Almeida</b> · cód. 00214</span>
          <span>SIAMAC OWL v3.8.2 · licença #LIC-COFCO-04-2026</span>
        </div>
      </div>
    </div>
  </div>
);

const Big = ({ label, value, unit, highlight }) => (
  <div style={{
    padding: "0 12px", borderRight: "1px solid var(--ink-100)",
    display: "flex", flexDirection: "column",
  }} className="big-cell">
    <div style={{
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10,
      letterSpacing: ".14em", color: "var(--fg-3)"
    }}>{label}</div>
    <div style={{
      fontFamily: "var(--font-mono)", fontWeight: 700,
      fontSize: highlight ? 44 : 36,
      color: highlight ? "var(--color-success)" : "var(--fg-1)",
      lineHeight: 1, marginTop: 8, fontVariantNumeric: "tabular-nums",
      letterSpacing: "-0.02em"
    }}>
      {value}
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>{unit}</span>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <div className="eyebrow" style={{ marginBottom: 12 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
  </div>
);

const KV = ({ k, v, mono, ok }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{k}</span>
    <span style={{
      fontSize: 13, color: ok ? "var(--color-success)" : "var(--fg-1)",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontVariantNumeric: "tabular-nums", fontWeight: 500
    }}>{v}</span>
  </div>
);

Object.assign(window, { TicketDetail });
