/* @ds-bundle: {"format":3,"namespace":"SIAMACDesignSystem_cafef5","components":[],"sourceHashes":{"ui_kits/owl/AppShell.jsx":"c0267469e70c","ui_kits/owl/Dashboard.jsx":"571927c4644f","ui_kits/owl/Login.jsx":"30fd3baf035d","ui_kits/owl/TicketDetail.jsx":"efcd4c15a476","ui_kits/owl/Weighing.jsx":"bed7ef8221e3","ui_kits/owl/components.jsx":"527cc6ddd705"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SIAMACDesignSystem_cafef5 = window.SIAMACDesignSystem_cafef5 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/owl/AppShell.jsx
try { (() => {
/* OWL — App shell: sidebar + topbar */

const NavGroup = ({
  label,
  children
}) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "nav-group-label"
}, label), children);
const NavItem = ({
  icon,
  label,
  active,
  onClick,
  badge
}) => /*#__PURE__*/React.createElement("button", {
  className: `nav-item${active ? " active" : ""}`,
  onClick: onClick
}, /*#__PURE__*/React.createElement("span", {
  className: "nav-marker"
}), /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 16
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1
  }
}, label), badge && /*#__PURE__*/React.createElement(Pill, {
  kind: "info",
  dot: false
}, badge));
const Sidebar = ({
  route,
  go
}) => /*#__PURE__*/React.createElement("aside", {
  className: "sidebar"
}, /*#__PURE__*/React.createElement("div", {
  className: "sidebar-brand"
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/logo/siamac-logo-color.webp",
  alt: "SIAMAC",
  style: {
    filter: "brightness(0) invert(1)"
  }
}), /*#__PURE__*/React.createElement("span", {
  className: "tag"
}, "OWL")), /*#__PURE__*/React.createElement("nav", null, /*#__PURE__*/React.createElement(NavGroup, {
  label: "OPERA\xC7\xC3O"
}, /*#__PURE__*/React.createElement(NavItem, {
  icon: "layout-dashboard",
  label: "In\xEDcio",
  active: route === "dashboard",
  onClick: () => go("dashboard")
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "scale",
  label: "Nova pesagem",
  active: route === "weighing",
  onClick: () => go("weighing")
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "ticket",
  label: "Tickets",
  active: route === "tickets" || route === "ticket",
  onClick: () => go("tickets"),
  badge: "142"
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "alert-triangle",
  label: "Auditoria",
  onClick: () => {}
})), /*#__PURE__*/React.createElement(NavGroup, {
  label: "CADASTROS"
}, /*#__PURE__*/React.createElement(NavItem, {
  icon: "users",
  label: "Clientes",
  onClick: () => {}
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "truck",
  label: "Ve\xEDculos",
  onClick: () => {}
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "package",
  label: "Produtos",
  onClick: () => {}
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "user-check",
  label: "Motoristas",
  onClick: () => {}
})), /*#__PURE__*/React.createElement(NavGroup, {
  label: "AN\xC1LISE"
}, /*#__PURE__*/React.createElement(NavItem, {
  icon: "bar-chart-3",
  label: "Relat\xF3rios",
  onClick: () => {}
}), /*#__PURE__*/React.createElement(NavItem, {
  icon: "settings",
  label: "Configura\xE7\xF5es",
  onClick: () => {}
}))), /*#__PURE__*/React.createElement("div", {
  className: "sidebar-footer"
}, /*#__PURE__*/React.createElement("div", {
  className: "avatar"
}, "MA"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff"
  }
}, "Marcos Almeida"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: "#88A4CB",
    fontFamily: "var(--font-mono)"
  }
}, "Turno A \xB7 Balan\xE7a 02")), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn",
  style: {
    color: "#88A4CB"
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "log-out"
}))));
const Topbar = ({
  title,
  crumbs,
  onNew
}) => /*#__PURE__*/React.createElement("header", {
  className: "topbar"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, title), crumbs && /*#__PURE__*/React.createElement("div", {
  className: "crumbs"
}, crumbs)), /*#__PURE__*/React.createElement("div", {
  className: "spacer"
}), /*#__PURE__*/React.createElement("div", {
  className: "search"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "search",
  size: 14
}), /*#__PURE__*/React.createElement("input", {
  placeholder: "Buscar ticket, placa, cliente\u2026"
})), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "bell"
}), /*#__PURE__*/React.createElement("span", {
  className: "badge-dot"
})), /*#__PURE__*/React.createElement("button", {
  className: "icon-btn"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "help-circle"
})), onNew && /*#__PURE__*/React.createElement(Button, {
  kind: "primary",
  leadingIcon: "plus",
  onClick: onNew
}, "Nova pesagem"));
const AppShell = ({
  children,
  route,
  go,
  title,
  crumbs,
  onNew
}) => /*#__PURE__*/React.createElement("div", {
  className: "app"
}, /*#__PURE__*/React.createElement(Sidebar, {
  route: route,
  go: go
}), /*#__PURE__*/React.createElement(Topbar, {
  title: title,
  crumbs: crumbs,
  onNew: onNew
}), /*#__PURE__*/React.createElement("main", {
  className: "main"
}, children));
Object.assign(window, {
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/owl/Dashboard.jsx
try { (() => {
/* OWL — Dashboard */

const LiveReadout = ({
  weight,
  stable,
  onCapture
}) => /*#__PURE__*/React.createElement("div", {
  className: "card",
  style: {
    background: "linear-gradient(180deg,#0F1620 0%, #080C12 100%)",
    border: "1px solid #1d2632",
    borderRadius: 14,
    color: "#fff",
    padding: 0,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 12px 36px rgba(0,71,136,.18)"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    display: "flex",
    flexDirection: "column"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#800000"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#018743"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#004788"
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: "22px 28px 22px 36px"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: {
    color: "#88A4CB"
  }
}, "PESO BRUTO \xB7 BALAN\xC7A 02 \xB7 TOLEDO MGR-3000"), /*#__PURE__*/React.createElement("span", {
  style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: stable ? "#27d04a" : "#FFC93D",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: ".14em"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 8,
    height: 8,
    borderRadius: 4,
    background: "currentColor",
    boxShadow: "0 0 10px currentColor",
    animation: stable ? "none" : "pulse 1.2s infinite"
  }
}), stable ? "ESTÁVEL" : "OSCILANDO")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: 96,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    margin: "12px 0 6px",
    fontVariantNumeric: "tabular-nums"
  }
}, weight.toLocaleString("pt-BR"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 28,
    fontWeight: 500,
    color: "#88A4CB",
    marginLeft: 10
  }
}, "kg")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 24,
    marginTop: 16,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "#88A4CB"
  }
}, /*#__PURE__*/React.createElement("span", null, "Placa ", /*#__PURE__*/React.createElement("b", {
  style: {
    color: "#fff",
    fontWeight: 600
  }
}, "BRA-2E19")), /*#__PURE__*/React.createElement("span", null, "Tara ", /*#__PURE__*/React.createElement("b", {
  style: {
    color: "#fff",
    fontWeight: 600
  }
}, "14.880 kg")), /*#__PURE__*/React.createElement("span", null, "L\xEDquido ", /*#__PURE__*/React.createElement("b", {
  style: {
    color: "#27d04a",
    fontWeight: 600
  }
}, (weight - 14880).toLocaleString("pt-BR"), " kg")))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 8,
    padding: "14px 28px 18px 36px",
    borderTop: "1px solid #1d2632"
  }
}, /*#__PURE__*/React.createElement(Button, {
  kind: "success",
  leadingIcon: "check-circle-2",
  size: "lg",
  onClick: onCapture
}, "Capturar peso bruto"), /*#__PURE__*/React.createElement(Button, {
  kind: "secondary",
  leadingIcon: "refresh-cw",
  style: {
    background: "#161B23",
    color: "#fff",
    borderColor: "#1d2632"
  }
}, "Zerar indicador"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement("button", {
  className: "btn btn-secondary",
  style: {
    background: "#161B23",
    color: "#88A4CB",
    borderColor: "#1d2632"
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "settings"
}))));
const BalanceCard = ({
  id,
  name,
  indicator,
  ok,
  last
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: "#fff",
    border: "1px solid var(--ink-75)",
    borderRadius: 10,
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "center"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: ok ? "var(--color-success-soft)" : "var(--color-danger-soft)",
    color: ok ? "var(--color-success)" : "var(--color-danger)",
    display: "grid",
    placeItems: "center"
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "scale",
  size: 18
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--fg-1)"
  }
}, name), /*#__PURE__*/React.createElement(Pill, {
  kind: ok ? "success" : "danger"
}, ok ? "Online" : "Offline")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--fg-3)",
    marginTop: 3
  }
}, id, " \xB7 ", indicator)), /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: "right"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--fg-3)"
  }
}, last)));
const Dashboard = ({
  go
}) => {
  const [weight, setWeight] = React.useState(32480);
  React.useEffect(() => {
    const t = setInterval(() => {
      // Simulate small fluctuations around stable value
      setWeight(w => {
        const target = 32480;
        const drift = Math.round((Math.random() - 0.5) * 20);
        const next = w + drift + (target - w) * 0.3;
        return Math.round(next / 20) * 20;
      });
    }, 1400);
    return () => clearInterval(t);
  }, []);
  const tickets = [{
    id: "PSG-2026-04-1827",
    plate: "BRA-2E19",
    client: "COFCO Brasil",
    product: "Soja a granel",
    net: "17.600 kg",
    op: "Carga",
    status: "success",
    statusLabel: "Concluída",
    time: "14:32"
  }, {
    id: "PSG-2026-04-1826",
    plate: "RIO-4H82",
    client: "JBS Aves",
    product: "Milho moído",
    net: "12.840 kg",
    op: "Descarga",
    status: "info",
    statusLabel: "Em pesagem",
    time: "14:28"
  }, {
    id: "PSG-2026-04-1825",
    plate: "PRD-9K01",
    client: "Cargill Agrícola",
    product: "Farelo de soja",
    net: "21.300 kg",
    op: "Carga",
    status: "danger",
    statusLabel: "Fora da tolerância",
    time: "14:15"
  }, {
    id: "PSG-2026-04-1824",
    plate: "BHS-1J47",
    client: "Bunge Alimentos",
    product: "Trigo",
    net: "19.420 kg",
    op: "Carga",
    status: "success",
    statusLabel: "Concluída",
    time: "13:58"
  }, {
    id: "PSG-2026-04-1823",
    plate: "SPO-7M11",
    client: "Granol Indústria",
    product: "Óleo de soja",
    net: "24.120 kg",
    op: "Carga",
    status: "success",
    statusLabel: "Concluída",
    time: "13:41"
  }, {
    id: "PSG-2026-04-1822",
    plate: "BRA-3L09",
    client: "ADM do Brasil",
    product: "Milho",
    net: "18.200 kg",
    op: "Descarga",
    status: "success",
    statusLabel: "Concluída",
    time: "13:14"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.7fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(LiveReadout, {
    weight: weight,
    stable: true,
    onCapture: () => go("weighing")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Pesagens hoje",
    value: "142",
    delta: "\u25B2 12% vs ontem",
    deltaKind: "up",
    icon: "ticket"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Peso l\xEDquido",
    value: "4.218",
    unit: "t",
    delta: "\u25B2 8%",
    deltaKind: "up",
    icon: "layers"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Tickets a auditar",
    value: "2",
    delta: "Fora da toler\xE2ncia",
    deltaKind: "down",
    icon: "alert-triangle"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Tempo m\xE9dio",
    value: "3:42",
    unit: "min",
    delta: "por ve\xEDculo",
    icon: "clock"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2.2fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Pesagens recentes",
    icon: "list",
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      kind: "ghost",
      leadingIcon: "filter"
    }, "Filtros"), /*#__PURE__*/React.createElement(Button, {
      kind: "secondary",
      leadingIcon: "download"
    }, "Exportar"))
  }), /*#__PURE__*/React.createElement("table", {
    className: "t"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Ticket"), /*#__PURE__*/React.createElement("th", null, "Hora"), /*#__PURE__*/React.createElement("th", null, "Placa"), /*#__PURE__*/React.createElement("th", null, "Cliente \xB7 Produto"), /*#__PURE__*/React.createElement("th", null, "Op."), /*#__PURE__*/React.createElement("th", null, "Peso l\xEDq."), /*#__PURE__*/React.createElement("th", null, "Status"))), /*#__PURE__*/React.createElement("tbody", null, tickets.map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id,
    onClick: () => go("ticket")
  }, /*#__PURE__*/React.createElement("td", {
    className: "mono",
    style: {
      color: "var(--color-primary)"
    }
  }, "#", t.id.split("-").pop()), /*#__PURE__*/React.createElement("td", {
    className: "mono"
  }, t.time), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Plate, null, t.plate)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-1)",
      fontWeight: 500
    }
  }, t.client), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-3)",
      fontSize: 12
    }
  }, t.product)), /*#__PURE__*/React.createElement("td", null, t.op), /*#__PURE__*/React.createElement("td", {
    className: "mono",
    style: {
      fontWeight: 600
    }
  }, t.net), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Pill, {
    kind: t.status
  }, t.statusLabel))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Balan\xE7as",
    icon: "activity",
    right: /*#__PURE__*/React.createElement(Pill, {
      kind: "success"
    }, "3 / 3 online")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(BalanceCard, {
    id: "BAL-01",
    name: "Balan\xE7a 01 \xB7 Entrada",
    indicator: "Toledo MGR-3000",
    ok: true,
    last: "ativa agora"
  }), /*#__PURE__*/React.createElement(BalanceCard, {
    id: "BAL-02",
    name: "Balan\xE7a 02 \xB7 Sa\xEDda",
    indicator: "Filizola UR-10000",
    ok: true,
    last: "14:32"
  }), /*#__PURE__*/React.createElement(BalanceCard, {
    id: "BAL-03",
    name: "Balan\xE7a 03 \xB7 Auxiliar",
    indicator: "L\xEDder LD-2050",
    ok: true,
    last: "13:48"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Anti-fraude \xB7 OWL",
    icon: "shield-check"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 22px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: "var(--color-danger-soft)",
      color: "var(--color-danger)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert-triangle",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--fg-1)",
      fontSize: 13
    }
  }, "1 ve\xEDculo passou na balan\xE7a sem gerar ticket"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-3)",
      fontSize: 12,
      marginTop: 2
    }
  }, "14:08 \xB7 Balan\xE7a 01 \xB7 peso de ", /*#__PURE__*/React.createElement("span", {
    className: "t-mono",
    style: {
      color: "var(--fg-1)",
      fontWeight: 600
    }
  }, "21.480 kg")))), /*#__PURE__*/React.createElement(Button, {
    kind: "secondary",
    leadingIcon: "search",
    style: {
      width: "100%",
      justifyContent: "center"
    }
  }, "Ver registro de auditoria"))))));
};
Object.assign(window, {
  Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/owl/Login.jsx
try { (() => {
/* OWL — Login screen */

const Login = ({
  onSubmit
}) => {
  const [user, setUser] = React.useState("marcos.almeida");
  const [pwd, setPwd] = React.useState("••••••••");
  return /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-hero"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/siamac-logo-color.webp",
    alt: "SIAMAC",
    style: {
      height: 32,
      filter: "brightness(0) invert(1)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: 28,
      color: "#88A4CB"
    }
  }, "SOFTWARE DE PESAGEM"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 56,
      lineHeight: 1.05,
      margin: "10px 0 0",
      color: "#fff",
      letterSpacing: "-0.02em"
    }
  }, "OWL"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.6,
      color: "#C8D2DE",
      maxWidth: 440,
      marginTop: 18
    }
  }, "Vigil\xE2ncia, estabilidade e seguran\xE7a nas opera\xE7\xF5es de balan\xE7as rodovi\xE1rias. Integrado a praticamente todos os indicadores do mercado.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 36,
      color: "#fff",
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums"
    }
  }, "35+"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: 6,
      color: "#88A4CB"
    }
  }, "ANOS DE EXPERI\xCANCIA")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 36,
      background: "#1F62A6"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 36,
      color: "#fff",
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums"
    }
  }, "9"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: 6,
      color: "#88A4CB"
    }
  }, "ESTADOS")))), /*#__PURE__*/React.createElement("div", {
    className: "login-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-card"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "ACESSO DO OPERADOR"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 28,
      color: "var(--fg-1)",
      margin: "8px 0 6px"
    }
  }, "Bem-vindo de volta."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--fg-3)",
      fontSize: 14,
      marginTop: 0,
      marginBottom: 28
    }
  }, "Entre com sua conta SIAMAC para acessar as pesagens."), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit();
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Usu\xE1rio",
    required: true
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    value: user,
    onChange: e => setUser(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Senha",
    required: true
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: "password",
    value: pwd,
    onChange: e => setPwd(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: true
  }), " Manter conectado neste computador"), /*#__PURE__*/React.createElement("a", {
    className: "t-link",
    href: "#",
    style: {
      fontSize: 12
    }
  }, "Esqueci a senha")), /*#__PURE__*/React.createElement(Button, {
    kind: "primary",
    size: "lg",
    type: "submit",
    trailingIcon: "arrow-right",
    style: {
      marginTop: 12,
      justifyContent: "center"
    }
  }, "Entrar"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 18,
      borderTop: "1px solid var(--ink-75)",
      fontSize: 12,
      color: "var(--fg-3)",
      lineHeight: 1.6
    }
  }, "Precisa de ajuda? Fale com nosso suporte pelo", " ", /*#__PURE__*/React.createElement("a", {
    className: "t-link",
    href: "https://wa.me/5511918512948"
  }, "WhatsApp (11) 91851-2948"), " ", "\u2014 atendimento de seg. a sex., 8h \xE0s 18h.")))));
};
Object.assign(window, {
  Login
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/owl/TicketDetail.jsx
try { (() => {
/* OWL — Ticket detail / print-style ticket */

const TicketDetail = ({
  go
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 980,
    margin: "0 auto"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "center",
    marginBottom: 18
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "btn btn-ghost",
  onClick: () => go("dashboard")
}, /*#__PURE__*/React.createElement(Icon, {
  name: "arrow-left"
}), " Voltar aos tickets"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 8
  }
}, /*#__PURE__*/React.createElement(Button, {
  kind: "secondary",
  leadingIcon: "printer"
}, "Imprimir (1 via)"), /*#__PURE__*/React.createElement(Button, {
  kind: "secondary",
  leadingIcon: "copy"
}, "Imprimir (3 vias)"), /*#__PURE__*/React.createElement(Button, {
  kind: "secondary",
  leadingIcon: "mail"
}, "Enviar por e-mail"), /*#__PURE__*/React.createElement(Button, {
  kind: "primary",
  leadingIcon: "download"
}, "PDF"))), /*#__PURE__*/React.createElement("div", {
  className: "card",
  style: {
    padding: 0,
    overflow: "hidden"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    height: 6,
    display: "flex"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#800000"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#018743"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#004788"
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: "28px 36px 32px"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/logo/siamac-logo-color.webp",
  alt: "SIAMAC",
  style: {
    height: 36
  }
}), /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: {
    marginTop: 14
  }
}, "TICKET DE PESAGEM RODOVI\xC1RIA \xB7 OWL"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 36,
    color: "var(--fg-1)",
    margin: "4px 0 0",
    letterSpacing: "-0.02em"
  }
}, "#PSG-2026-04-1828"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 8
  }
}, /*#__PURE__*/React.createElement(Pill, {
  kind: "success"
}, "Conclu\xEDda \xB7 dentro da toler\xE2ncia"))), /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: "right"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: "var(--fg-3)",
    letterSpacing: ".06em",
    fontFamily: "var(--font-display)",
    fontWeight: 600
  }
}, "EMITIDO EM"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    fontSize: 14,
    marginTop: 4,
    color: "var(--fg-1)"
  }
}, "20/05/2026 \xB7 14:32:08"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 16,
    fontSize: 11,
    color: "var(--fg-3)",
    letterSpacing: ".06em",
    fontFamily: "var(--font-display)",
    fontWeight: 600
  }
}, "BALAN\xC7A"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    fontSize: 13,
    marginTop: 4,
    color: "var(--fg-1)"
  }
}, "BAL-02 \xB7 Toledo MGR-3000"))), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 28,
    padding: "24px 28px",
    background: "var(--ink-25)",
    border: "1px solid var(--ink-75)",
    borderRadius: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 0
  }
}, /*#__PURE__*/React.createElement(Big, {
  label: "TARA",
  value: "14.880",
  unit: "kg"
}), /*#__PURE__*/React.createElement(Big, {
  label: "BRUTO",
  value: "32.480",
  unit: "kg"
}), /*#__PURE__*/React.createElement(Big, {
  label: "L\xCDQUIDO",
  value: "17.600",
  unit: "kg",
  highlight: true
})), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 28,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 36
  }
}, /*#__PURE__*/React.createElement(Section, {
  title: "Opera\xE7\xE3o"
}, /*#__PURE__*/React.createElement(KV, {
  k: "Opera\xE7\xE3o",
  v: "Carga (sa\xEDda)"
}), /*#__PURE__*/React.createElement(KV, {
  k: "Produto",
  v: "Soja a granel"
}), /*#__PURE__*/React.createElement(KV, {
  k: "Categoria",
  v: "Gr\xE3os / commodities"
}), /*#__PURE__*/React.createElement(KV, {
  k: "Fator de corre\xE7\xE3o",
  v: "1,000 (sem ajuste)",
  mono: true
}), /*#__PURE__*/React.createElement(KV, {
  k: "Nota fiscal",
  v: "0034871",
  mono: true
}), /*#__PURE__*/React.createElement(KV, {
  k: "Toler\xE2ncia",
  v: "\xB1 200 kg \xB7 OK",
  mono: true,
  ok: true
})), /*#__PURE__*/React.createElement(Section, {
  title: "Cliente & ve\xEDculo"
}, /*#__PURE__*/React.createElement(KV, {
  k: "Cliente",
  v: "COFCO Brasil S/A"
}), /*#__PURE__*/React.createElement(KV, {
  k: "CNPJ",
  v: "12.345.678/0001-90",
  mono: true
}), /*#__PURE__*/React.createElement(KV, {
  k: "Transportadora",
  v: "Translog Bahia"
}), /*#__PURE__*/React.createElement(KV, {
  k: "Motorista",
  v: "Jo\xE3o Pedro Silva"
}), /*#__PURE__*/React.createElement(KV, {
  k: "CNH",
  v: "01234567890",
  mono: true
}), /*#__PURE__*/React.createElement(KV, {
  k: "Placa",
  v: /*#__PURE__*/React.createElement(Plate, null, "BRA-2E19")
}), /*#__PURE__*/React.createElement(KV, {
  k: "Ve\xEDculo",
  v: "Carreta \xB7 3 eixos"
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 28,
    padding: "16px 20px",
    background: "var(--ink-25)",
    border: "1px dashed var(--ink-100)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--fg-3)",
    lineHeight: 1.6
  }
}, /*#__PURE__*/React.createElement("b", {
  style: {
    color: "var(--fg-2)"
  }
}, "Observa\xE7\xF5es:"), " Pesagem capturada com indicador est\xE1vel. Operador conferiu a posi\xE7\xE3o completa do ve\xEDculo sobre a plataforma. Registro vital\xEDcio gravado no servidor local com c\xF3pia em nuvem."), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 28,
    paddingTop: 18,
    borderTop: "1px solid var(--ink-75)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    color: "var(--fg-3)",
    fontFamily: "var(--font-mono)"
  }
}, /*#__PURE__*/React.createElement("span", null, "Operador: ", /*#__PURE__*/React.createElement("b", {
  style: {
    color: "var(--fg-1)"
  }
}, "Marcos Almeida"), " \xB7 c\xF3d. 00214"), /*#__PURE__*/React.createElement("span", null, "SIAMAC OWL v3.8.2 \xB7 licen\xE7a #LIC-COFCO-04-2026")))));
const Big = ({
  label,
  value,
  unit,
  highlight
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    padding: "0 12px",
    borderRight: "1px solid var(--ink-100)",
    display: "flex",
    flexDirection: "column"
  },
  className: "big-cell"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: ".14em",
    color: "var(--fg-3)"
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: highlight ? 44 : 36,
    color: highlight ? "var(--color-success)" : "var(--fg-1)",
    lineHeight: 1,
    marginTop: 8,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em"
  }
}, value, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--fg-3)",
    marginLeft: 6,
    fontFamily: "var(--font-mono)"
  }
}, unit)));
const Section = ({
  title,
  children
}) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: {
    marginBottom: 12
  }
}, title), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  }
}, children));
const KV = ({
  k,
  v,
  mono,
  ok
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 12,
    color: "var(--fg-3)"
  }
}, k), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    color: ok ? "var(--color-success)" : "var(--fg-1)",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500
  }
}, v));
Object.assign(window, {
  TicketDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/TicketDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/owl/Weighing.jsx
try { (() => {
/* OWL — Nova pesagem (guided capture flow) */

const Step = ({
  n,
  label,
  state
}) => {
  // state: "done" | "active" | "todo"
  const bg = state === "done" ? "var(--color-success)" : state === "active" ? "var(--color-primary)" : "var(--ink-100)";
  const fg = state === "todo" ? "var(--fg-3)" : "#fff";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: bg,
      color: fg,
      display: "grid",
      placeItems: "center",
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 12,
      flexShrink: 0
    }
  }, state === "done" ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14
  }) : n), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 13,
      color: state === "todo" ? "var(--fg-3)" : "var(--fg-1)"
    }
  }, label)));
};
const Steps = ({
  step
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    gap: 0,
    padding: "8px 0 24px"
  }
}, /*#__PURE__*/React.createElement(Step, {
  n: 1,
  label: "Cliente & opera\xE7\xE3o",
  state: step > 1 ? "done" : step === 1 ? "active" : "todo"
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 1,
    background: "var(--ink-100)",
    alignSelf: "center"
  }
}), /*#__PURE__*/React.createElement(Step, {
  n: 2,
  label: "Ve\xEDculo & produto",
  state: step > 2 ? "done" : step === 2 ? "active" : "todo"
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 1,
    background: "var(--ink-100)",
    alignSelf: "center"
  }
}), /*#__PURE__*/React.createElement(Step, {
  n: 3,
  label: "Tara",
  state: step > 3 ? "done" : step === 3 ? "active" : "todo"
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 1,
    background: "var(--ink-100)",
    alignSelf: "center"
  }
}), /*#__PURE__*/React.createElement(Step, {
  n: 4,
  label: "Peso bruto",
  state: step > 4 ? "done" : step === 4 ? "active" : "todo"
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 1,
    background: "var(--ink-100)",
    alignSelf: "center"
  }
}), /*#__PURE__*/React.createElement(Step, {
  n: 5,
  label: "Ticket",
  state: step === 5 ? "active" : "todo"
}));
const ScaleReadoutMini = ({
  value,
  label,
  stable
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: "#0B0F14",
    color: "#fff",
    borderRadius: 10,
    padding: "18px 22px",
    position: "relative",
    overflow: "hidden"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: "linear-gradient(180deg, #800000 0 33%, #018743 33% 66%, #004788 66% 100%)"
  }
}), /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: {
    color: "#88A4CB"
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginTop: 6
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: 46,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.01em"
  }
}, value.toLocaleString("pt-BR")), /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: "var(--font-mono)",
    color: "#88A4CB",
    fontSize: 16
  }
}, "kg"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    fontSize: 10,
    letterSpacing: ".12em",
    color: stable ? "#27d04a" : "#FFC93D",
    fontWeight: 700,
    fontFamily: "var(--font-display)"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 7,
    height: 7,
    borderRadius: 4,
    background: "currentColor"
  }
}), stable ? "ESTÁVEL" : "OSCILANDO")));
const Weighing = ({
  go
}) => {
  const [step, setStep] = React.useState(3);
  const [tare, setTare] = React.useState(14880);
  const [gross, setGross] = React.useState(32480);
  const [live, setLive] = React.useState(32460);
  const net = gross - tare;
  React.useEffect(() => {
    const t = setInterval(() => {
      setLive(w => {
        const target = step === 3 ? 14880 : 32480;
        const drift = Math.round((Math.random() - 0.5) * 40);
        return Math.round((w + drift + (target - w) * 0.4) / 20) * 20;
      });
    }, 1200);
    return () => clearInterval(t);
  }, [step]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Steps, {
    step: step
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.5fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: step === 3 ? "3 · Capturar peso de tara" : step === 4 ? "4 · Capturar peso bruto" : "Dados da pesagem",
    icon: "scale",
    right: /*#__PURE__*/React.createElement(Pill, {
      kind: "info"
    }, "Balan\xE7a 02")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "22px 24px 24px"
    }
  }, /*#__PURE__*/React.createElement(ScaleReadoutMini, {
    value: live,
    label: step === 3 ? "PESO DE ENTRADA (TARA) · LEITURA AO VIVO" : "PESO DE SAÍDA (BRUTO) · LEITURA AO VIVO",
    stable: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      marginTop: 14,
      background: "var(--siamac-blue-50)",
      color: "var(--siamac-blue-900)",
      border: "1px solid var(--siamac-blue-100)",
      borderRadius: 8,
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      fontSize: 13,
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 16
  }), /*#__PURE__*/React.createElement("div", null, "Aguarde o indicador estabilizar. Para evitar fraude, o OWL s\xF3 captura o peso com o ve\xEDculo", /*#__PURE__*/React.createElement("b", null, " totalmente sobre a plataforma"), " e indica\xE7\xE3o est\xE1vel por 2 segundos consecutivos.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Peso capturado",
    hint: "kg \xB7 leitura direta do indicador"
  }, /*#__PURE__*/React.createElement("input", {
    className: "input mono",
    value: (step === 3 ? tare : gross).toLocaleString("pt-BR"),
    readOnly: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Toler\xE2ncia vs. nota fiscal",
    hint: "Configur\xE1vel por produto"
  }, /*#__PURE__*/React.createElement("input", {
    className: "input mono",
    value: "\xB1 200 kg"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "secondary",
    leadingIcon: "arrow-left",
    onClick: () => setStep(Math.max(1, step - 1))
  }, "Voltar"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    kind: "ghost"
  }, "Salvar rascunho"), /*#__PURE__*/React.createElement(Button, {
    kind: "success",
    leadingIcon: "check-circle-2",
    onClick: () => {
      if (step === 3) {
        setTare(live);
        setStep(4);
      } else if (step === 4) {
        setGross(live);
        setStep(5);
        go("ticket");
      }
    }
  }, "Capturar peso e continuar")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "RESUMO DA PESAGEM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      color: "var(--fg-1)",
      margin: "8px 0 18px"
    }
  }, "Carga \xB7 COFCO Brasil"), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Ticket",
    value: "#PSG-2026-04-1828",
    mono: true,
    accent: true
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Opera\xE7\xE3o",
    value: "Carga (sa\xEDda)"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Cliente",
    value: "COFCO Brasil S/A"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Motorista",
    value: "Jo\xE3o Pedro Silva"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Placa",
    value: /*#__PURE__*/React.createElement(Plate, null, "BRA-2E19")
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Produto",
    value: "Soja a granel"
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Nota fiscal",
    value: "0034871",
    mono: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--ink-75)",
      margin: "12px 0"
    }
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Tara",
    value: `${tare.toLocaleString("pt-BR")} kg`,
    mono: true
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "Bruto",
    value: step >= 4 ? `${gross.toLocaleString("pt-BR")} kg` : "—",
    mono: true,
    muted: step < 4
  }), /*#__PURE__*/React.createElement(SummaryRow, {
    label: "L\xEDquido",
    value: step >= 4 ? `${net.toLocaleString("pt-BR")} kg` : "—",
    mono: true,
    strong: true,
    muted: step < 4
  })), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      background: "var(--color-success-soft)",
      borderColor: "var(--siamac-green-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 18
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 13,
      color: "var(--color-success-fg)"
    }
  }, "Pesagem rastre\xE1vel"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--color-success-fg)",
      marginTop: 4,
      lineHeight: 1.5,
      opacity: .9
    }
  }, "Operador, hor\xE1rio e leitura do indicador s\xE3o gravados em registro imut\xE1vel para auditoria.")))))));
};
const SummaryRow = ({
  label,
  value,
  mono,
  strong,
  accent,
  muted
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 12,
    color: "var(--fg-3)"
  }
}, label), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: strong ? 15 : 13,
    fontWeight: strong ? 700 : 500,
    fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
    color: muted ? "var(--fg-4)" : accent ? "var(--color-primary)" : "var(--fg-1)",
    fontVariantNumeric: "tabular-nums"
  }
}, value));
Object.assign(window, {
  Weighing
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/Weighing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/owl/components.jsx
try { (() => {
/* OWL — shared atoms */

const Icon = ({
  name,
  size = 16,
  strokeWidth = 1.75
}) => {
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
      attrs: {
        "stroke-width": strokeWidth,
        width: size,
        height: size
      }
    });
  }, [name, size, strokeWidth]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      lineHeight: 0,
      flexShrink: 0,
      color: "currentColor"
    }
  });
};
const Button = ({
  kind = "primary",
  size,
  leadingIcon,
  trailingIcon,
  children,
  onClick,
  type = "button",
  style
}) => {
  const cls = `btn btn-${kind}${size === "lg" ? " btn-lg" : ""}`;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    className: cls,
    onClick: onClick,
    style: style
  }, leadingIcon && /*#__PURE__*/React.createElement(Icon, {
    name: leadingIcon
  }), /*#__PURE__*/React.createElement("span", null, children), trailingIcon && /*#__PURE__*/React.createElement(Icon, {
    name: trailingIcon
  }));
};
const Pill = ({
  kind = "neutral",
  children,
  dot = true
}) => /*#__PURE__*/React.createElement("span", {
  className: `pill pill-${kind}`
}, dot && kind !== "neutral" && /*#__PURE__*/React.createElement("span", {
  className: "dot"
}), children);
const Eyebrow = ({
  children,
  color
}) => /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: color ? {
    color
  } : null
}, children);
const Plate = ({
  children
}) => /*#__PURE__*/React.createElement("span", {
  className: "plate"
}, children);
const Field = ({
  label,
  required,
  hint,
  children,
  error
}) => /*#__PURE__*/React.createElement("div", {
  className: "field"
}, label && /*#__PURE__*/React.createElement("label", null, label, required && /*#__PURE__*/React.createElement("span", {
  className: "req"
}, " *")), children, hint && /*#__PURE__*/React.createElement("div", {
  className: "help",
  style: error ? {
    color: "var(--siamac-red-700)"
  } : null
}, hint));
const Card = ({
  children,
  style,
  padding = true
}) => /*#__PURE__*/React.createElement("div", {
  className: "card",
  style: style
}, padding ? /*#__PURE__*/React.createElement("div", {
  className: "card-pad"
}, children) : children);
const CardHead = ({
  title,
  icon,
  right
}) => /*#__PURE__*/React.createElement("div", {
  className: "card-head"
}, /*#__PURE__*/React.createElement("div", {
  className: "card-title"
}, icon && /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 16
}), /*#__PURE__*/React.createElement("span", null, title)), right);
const StatTile = ({
  label,
  value,
  unit,
  delta,
  deltaKind = "neutral",
  icon
}) => /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "eyebrow",
  style: {
    color: "var(--fg-3)"
  }
}, label), icon && /*#__PURE__*/React.createElement(Icon, {
  name: icon,
  size: 16
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 1,
    marginTop: 12,
    color: "var(--fg-1)",
    fontVariantNumeric: "tabular-nums"
  }
}, value, unit && /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--fg-3)",
    marginLeft: 4
  }
}, unit)), delta && /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: 600,
    color: deltaKind === "up" ? "var(--color-success)" : deltaKind === "down" ? "var(--color-danger)" : "var(--fg-3)"
  }
}, delta));
const BrandBars = ({
  vertical,
  size = 4
}) => vertical ? /*#__PURE__*/React.createElement("div", {
  style: {
    width: size,
    height: "100%",
    display: "flex",
    flexDirection: "column"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#800000"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#018743"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#004788"
  }
})) : /*#__PURE__*/React.createElement("div", {
  style: {
    height: size,
    width: "100%",
    display: "flex"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#800000"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#018743"
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1,
    background: "#004788"
  }
}));
Object.assign(window, {
  Icon,
  Button,
  Pill,
  Eyebrow,
  Plate,
  Field,
  Card,
  CardHead,
  StatTile,
  BrandBars
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/owl/components.jsx", error: String((e && e.message) || e) }); }

})();
