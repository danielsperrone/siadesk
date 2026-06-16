/* OWL — Login screen */

const Login = ({ onSubmit }) => {
  const [user, setUser] = React.useState("marcos.almeida");
  const [pwd, setPwd] = React.useState("••••••••");
  return (
    <div className="login">
      <div className="login-hero">
        <div>
          <img src="../../assets/logo/siamac-logo-color.webp" alt="SIAMAC" style={{ height: 32, filter: "brightness(0) invert(1)" }}/>
          <div className="eyebrow" style={{ marginTop: 28, color: "#88A4CB" }}>SOFTWARE DE PESAGEM</div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 56, lineHeight: 1.05,
            margin: "10px 0 0", color: "#fff", letterSpacing: "-0.02em"
          }}>OWL</h1>
          <p style={{
            fontSize: 16, lineHeight: 1.6, color: "#C8D2DE", maxWidth: 440, marginTop: 18
          }}>
            Vigilância, estabilidade e segurança nas operações de balanças rodoviárias. Integrado a praticamente todos os indicadores do mercado.
          </p>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 36, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>35+</div>
            <div className="eyebrow" style={{ marginTop: 6, color: "#88A4CB" }}>ANOS DE EXPERIÊNCIA</div>
          </div>
          <div style={{ width: 1, height: 36, background: "#1F62A6" }}/>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 36, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>9</div>
            <div className="eyebrow" style={{ marginTop: 6, color: "#88A4CB" }}>ESTADOS</div>
          </div>
        </div>
      </div>
      <div className="login-form">
        <div className="login-card">
          <Eyebrow>ACESSO DO OPERADOR</Eyebrow>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--fg-1)", margin: "8px 0 6px" }}>
            Bem-vindo de volta.
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: 14, marginTop: 0, marginBottom: 28 }}>
            Entre com sua conta SIAMAC para acessar as pesagens.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Usuário" required>
              <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
            </Field>
            <Field label="Senha" required>
              <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </Field>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--fg-3)" }}>
                <input type="checkbox" defaultChecked /> Manter conectado neste computador
              </label>
              <a className="t-link" href="#" style={{ fontSize: 12 }}>Esqueci a senha</a>
            </div>
            <Button kind="primary" size="lg" type="submit" trailingIcon="arrow-right" style={{ marginTop: 12, justifyContent: "center" }}>
              Entrar
            </Button>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--ink-75)", fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6 }}>
              Precisa de ajuda? Fale com nosso suporte pelo
              {" "}<a className="t-link" href="https://wa.me/5511918512948">WhatsApp (11) 91851-2948</a>
              {" "}— atendimento de seg. a sex., 8h às 18h.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Login });
