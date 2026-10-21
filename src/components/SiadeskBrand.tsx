export function SiadeskBrand({ compact = false }: { compact?: boolean }) {
  return <span className={`siadesk-brand${compact ? ' siadesk-brand--compact' : ''}`}>
    <img src={`${import.meta.env.BASE_URL}brand/siadesk-icon.png`} alt="" />
    <span className="siadesk-brand-name">SIA<span>DESK</span></span>
  </span>
}
