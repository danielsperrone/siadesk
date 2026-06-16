/* OWL — App shell: sidebar + topbar */

const NavGroup = ({ label, children }) => (
  <div>
    <div className="nav-group-label">{label}</div>
    {children}
  </div>
);

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button className={`nav-item${active ? " active" : ""}`} onClick={onClick}>
    <span className="nav-marker"></span>
    <Icon name={icon} size={16} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge && <Pill kind="info" dot={false}>{badge}</Pill>}
  </button>
);

const Sidebar = ({ route, go }) => (
  <aside className="sidebar">
    <div className="sidebar-brand">
      <img src="../../assets/logo/siamac-logo-color.webp" alt="SIAMAC" style={{ filter: "brightness(0) invert(1)" }}/>
      <span className="tag">OWL</span>
    </div>
    <nav>
      <NavGroup label="OPERAÇÃO">
        <NavItem icon="layout-dashboard" label="Início" active={route === "dashboard"} onClick={() => go("dashboard")}/>
        <NavItem icon="scale" label="Nova pesagem" active={route === "weighing"} onClick={() => go("weighing")}/>
        <NavItem icon="ticket" label="Tickets" active={route === "tickets" || route === "ticket"} onClick={() => go("tickets")} badge="142"/>
        <NavItem icon="alert-triangle" label="Auditoria" onClick={() => {}}/>
      </NavGroup>
      <NavGroup label="CADASTROS">
        <NavItem icon="users" label="Clientes" onClick={() => {}}/>
        <NavItem icon="truck" label="Veículos" onClick={() => {}}/>
        <NavItem icon="package" label="Produtos" onClick={() => {}}/>
        <NavItem icon="user-check" label="Motoristas" onClick={() => {}}/>
      </NavGroup>
      <NavGroup label="ANÁLISE">
        <NavItem icon="bar-chart-3" label="Relatórios" onClick={() => {}}/>
        <NavItem icon="settings" label="Configurações" onClick={() => {}}/>
      </NavGroup>
    </nav>
    <div className="sidebar-footer">
      <div className="avatar">MA</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Marcos Almeida</div>
        <div style={{ fontSize: 11, color: "#88A4CB", fontFamily: "var(--font-mono)" }}>Turno A · Balança 02</div>
      </div>
      <button className="icon-btn" style={{ color: "#88A4CB" }}><Icon name="log-out" /></button>
    </div>
  </aside>
);

const Topbar = ({ title, crumbs, onNew }) => (
  <header className="topbar">
    <div>
      <h1>{title}</h1>
      {crumbs && <div className="crumbs">{crumbs}</div>}
    </div>
    <div className="spacer"/>
    <div className="search">
      <Icon name="search" size={14} />
      <input placeholder="Buscar ticket, placa, cliente…"/>
    </div>
    <button className="icon-btn"><Icon name="bell" /><span className="badge-dot"></span></button>
    <button className="icon-btn"><Icon name="help-circle" /></button>
    {onNew && <Button kind="primary" leadingIcon="plus" onClick={onNew}>Nova pesagem</Button>}
  </header>
);

const AppShell = ({ children, route, go, title, crumbs, onNew }) => (
  <div className="app">
    <Sidebar route={route} go={go}/>
    <Topbar title={title} crumbs={crumbs} onNew={onNew}/>
    <main className="main">{children}</main>
  </div>
);

Object.assign(window, { AppShell });
