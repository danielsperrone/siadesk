/* OWL — Nova pesagem (guided capture flow) */

const Step = ({ n, label, state }) => {
  // state: "done" | "active" | "todo"
  const bg = state === "done" ? "var(--color-success)" : state === "active" ? "var(--color-primary)" : "var(--ink-100)";
  const fg = state === "todo" ? "var(--fg-3)" : "#fff";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: bg, color: fg,
        display: "grid", placeItems: "center", fontFamily: "var(--font-mono)",
        fontWeight: 700, fontSize: 12, flexShrink: 0
      }}>
        {state === "done" ? <Icon name="check" size={14}/> : n}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13,
          color: state === "todo" ? "var(--fg-3)" : "var(--fg-1)"
        }}>{label}</div>
      </div>
    </div>
  );
};

const Steps = ({ step }) => (
  <div style={{ display: "flex", gap: 0, padding: "8px 0 24px" }}>
    <Step n={1} label="Cliente & operação" state={step > 1 ? "done" : step === 1 ? "active" : "todo"}/>
    <div style={{ width: 32, height: 1, background: "var(--ink-100)", alignSelf: "center" }}/>
    <Step n={2} label="Veículo & produto" state={step > 2 ? "done" : step === 2 ? "active" : "todo"}/>
    <div style={{ width: 32, height: 1, background: "var(--ink-100)", alignSelf: "center" }}/>
    <Step n={3} label="Tara" state={step > 3 ? "done" : step === 3 ? "active" : "todo"}/>
    <div style={{ width: 32, height: 1, background: "var(--ink-100)", alignSelf: "center" }}/>
    <Step n={4} label="Peso bruto" state={step > 4 ? "done" : step === 4 ? "active" : "todo"}/>
    <div style={{ width: 32, height: 1, background: "var(--ink-100)", alignSelf: "center" }}/>
    <Step n={5} label="Ticket" state={step === 5 ? "active" : "todo"}/>
  </div>
);

const ScaleReadoutMini = ({ value, label, stable }) => (
  <div style={{
    background: "#0B0F14", color: "#fff", borderRadius: 10, padding: "18px 22px",
    position: "relative", overflow: "hidden"
  }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, #800000 0 33%, #018743 33% 66%, #004788 66% 100%)" }}/>
    <div className="eyebrow" style={{ color: "#88A4CB" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 46, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
        {value.toLocaleString("pt-BR")}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", color: "#88A4CB", fontSize: 16 }}>kg</span>
      <div style={{ flex: 1 }}/>
      <span style={{
        display: "inline-flex", gap: 6, alignItems: "center", fontSize: 10, letterSpacing: ".12em",
        color: stable ? "#27d04a" : "#FFC93D", fontWeight: 700, fontFamily: "var(--font-display)"
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: "currentColor" }}/>
        {stable ? "ESTÁVEL" : "OSCILANDO"}
      </span>
    </div>
  </div>
);

const Weighing = ({ go }) => {
  const [step, setStep] = React.useState(3);
  const [tare, setTare] = React.useState(14880);
  const [gross, setGross] = React.useState(32480);
  const [live, setLive] = React.useState(32460);
  const net = gross - tare;

  React.useEffect(() => {
    const t = setInterval(() => {
      setLive((w) => {
        const target = step === 3 ? 14880 : 32480;
        const drift = Math.round((Math.random() - 0.5) * 40);
        return Math.round((w + drift + (target - w) * 0.4) / 20) * 20;
      });
    }, 1200);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Steps step={step}/>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 0 }}>
          <CardHead title={
            step === 3 ? "3 · Capturar peso de tara" :
            step === 4 ? "4 · Capturar peso bruto" : "Dados da pesagem"
          } icon="scale" right={<Pill kind="info">Balança 02</Pill>}/>
          <div style={{ padding: "22px 24px 24px" }}>
            <ScaleReadoutMini
              value={live}
              label={step === 3 ? "PESO DE ENTRADA (TARA) · LEITURA AO VIVO" : "PESO DE SAÍDA (BRUTO) · LEITURA AO VIVO"}
              stable={true}
            />
            <div style={{
              padding: "14px 16px", marginTop: 14,
              background: "var(--siamac-blue-50)", color: "var(--siamac-blue-900)",
              border: "1px solid var(--siamac-blue-100)", borderRadius: 8,
              display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5
            }}>
              <Icon name="info" size={16}/>
              <div>
                Aguarde o indicador estabilizar. Para evitar fraude, o OWL só captura o peso com o veículo
                <b> totalmente sobre a plataforma</b> e indicação estável por 2 segundos consecutivos.
              </div>
            </div>
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Peso capturado" hint="kg · leitura direta do indicador">
                <input className="input mono" value={(step === 3 ? tare : gross).toLocaleString("pt-BR")} readOnly/>
              </Field>
              <Field label="Tolerância vs. nota fiscal" hint="Configurável por produto">
                <input className="input mono" value="± 200 kg"/>
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
              <Button kind="secondary" leadingIcon="arrow-left" onClick={() => setStep(Math.max(1, step - 1))}>Voltar</Button>
              <div style={{ flex: 1 }}/>
              <Button kind="ghost">Salvar rascunho</Button>
              <Button kind="success" leadingIcon="check-circle-2" onClick={() => {
                if (step === 3) { setTare(live); setStep(4); }
                else if (step === 4) { setGross(live); setStep(5); go("ticket"); }
              }}>
                Capturar peso e continuar
              </Button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <Eyebrow>RESUMO DA PESAGEM</Eyebrow>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
              color: "var(--fg-1)", margin: "8px 0 18px"
            }}>Carga · COFCO Brasil</div>
            <SummaryRow label="Ticket" value="#PSG-2026-04-1828" mono accent/>
            <SummaryRow label="Operação" value="Carga (saída)"/>
            <SummaryRow label="Cliente" value="COFCO Brasil S/A"/>
            <SummaryRow label="Motorista" value="João Pedro Silva"/>
            <SummaryRow label="Placa" value={<Plate>BRA-2E19</Plate>}/>
            <SummaryRow label="Produto" value="Soja a granel"/>
            <SummaryRow label="Nota fiscal" value="0034871" mono/>
            <div style={{ height: 1, background: "var(--ink-75)", margin: "12px 0" }}/>
            <SummaryRow label="Tara" value={`${tare.toLocaleString("pt-BR")} kg`} mono/>
            <SummaryRow label="Bruto"
              value={step >= 4 ? `${gross.toLocaleString("pt-BR")} kg` : "—"}
              mono muted={step < 4}/>
            <SummaryRow label="Líquido"
              value={step >= 4 ? `${net.toLocaleString("pt-BR")} kg` : "—"}
              mono strong muted={step < 4}/>
          </div>
          <div className="card" style={{
            background: "var(--color-success-soft)",
            borderColor: "var(--siamac-green-100)"
          }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Icon name="shield-check" size={18}/>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--color-success-fg)" }}>
                  Pesagem rastreável
                </div>
                <div style={{ fontSize: 12, color: "var(--color-success-fg)", marginTop: 4, lineHeight: 1.5, opacity: .9 }}>
                  Operador, horário e leitura do indicador são gravados em registro imutável para auditoria.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value, mono, strong, accent, muted }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
    <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{label}</span>
    <span style={{
      fontSize: strong ? 15 : 13,
      fontWeight: strong ? 700 : 500,
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      color: muted ? "var(--fg-4)" : accent ? "var(--color-primary)" : "var(--fg-1)",
      fontVariantNumeric: "tabular-nums"
    }}>{value}</span>
  </div>
);

Object.assign(window, { Weighing });
