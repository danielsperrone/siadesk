# OWL — UI kit

OWL (*Software de Pesagem de Veículos*) is SIAMAC's flagship product: a Windows-installed weighing application for truck-scale (*balança rodoviária*) operations. The customer's marketing site positions it as the most secure, customizable and easy-to-use weighing software on the Brazilian market.

This UI kit is a **click-through reconstruction** of OWL's core operator surface, applied to the SIAMAC design system. **It is not based on real OWL screenshots** — we did not have access to the live application or source — so the layout is informed reading: built from the product page's feature list, FAQ and screenshots we could glean from the marketing PDF link (`Apresentacao-OWL.pdf`, not yet attached).

> If you can share OWL screenshots, the OWL apresentação PDF, or the WinForms / WPF / WebView source, **please attach via Import** and we'll align the kit to the real product.

## Files

| File | What |
|------|------|
| `index.html` | Interactive demo. Login → Dashboard → New weighing → Ticket. |
| `components.jsx` | Shared atoms — `Button`, `Card`, `StatTile`, `StatusPill`, `Icon`, sidebar/topbar primitives. |
| `Login.jsx` | Login screen with brand bars and inverse hero panel. |
| `AppShell.jsx` | Fixed left sidebar + topbar. Houses the routed screen. |
| `Dashboard.jsx` | Live readout tile + KPIs + recent-tickets table + balance status. |
| `Weighing.jsx` | The capture flow — pick vehicle/operation, tare, gross, generate ticket. |
| `TicketDetail.jsx` | Print-ready ticket view. |

## Screens covered

1. **Login** — operator credentials, big brand panel.
2. **Dashboard / Início** — live scale readout, KPIs, today's tickets, balance health.
3. **New weighing / Nova pesagem** — guided capture (Cliente → Veículo → Produto → Pesagem).
4. **Ticket detail / Ticket de pesagem** — A4 print-style ticket with all OWL fields.

## Out of scope (intentional)

- Cadastros (CRUD for clientes/motoristas/produtos/veículos)
- Relatórios (the OWL marketing copy emphasizes flexible filtered PDF/XLS exports — we left a placeholder)
- Settings / users
- The marketing-only feature pages — those belong in a separate marketing UI kit if needed.

## How to use

Open `index.html`. Use the sidebar to click through screens. The "Pesar agora" CTA on the dashboard goes to the weighing flow; the flow auto-advances every few seconds to simulate real scale reading.
