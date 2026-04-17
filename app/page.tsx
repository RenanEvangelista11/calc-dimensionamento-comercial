"use client";

import { useState, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSER_DATA = {
  junior:  { fixo: 2500, callsDay: 4, label: "Júnior" },
  pleno:   { fixo: 3000, callsDay: 5, label: "Pleno" },
  senior:  { fixo: 3750, callsDay: 6, label: "Sênior" },
  lider:   { fixo: 5750, callsDay: 4, label: "Líder / Gerente" },
};

const SDR_DATA = {
  junior:          { fixo: 1900, label: "Júnior" },
  pleno:           { fixo: 2500, label: "Pleno" },
  senior:          { fixo: 3000, label: "Sênior" },
  senior_avancado: { fixo: 3200, label: "Sr. Avançado" },
};

type CloserNivel = keyof typeof CLOSER_DATA;
type SDRNivel = keyof typeof SDR_DATA;
type Regime = "pj" | "clt";
type Modalidade = "remoto" | "presencial";
type BaseCalculo = "cheio" | "entrada";

const REGIME_MULT: Record<Regime, number>     = { pj: 1, clt: 1.5 };
const MODAL_MULT: Record<Modalidade, number>  = { remoto: 1, presencial: 1.25 };
const SDR_BOOKING_RATE = 0.25;
const DIAS_UTEIS = 22;

function getCommissionRate(ticket: number) {
  if (ticket <= 5000)  return 0.05;
  if (ticket <= 15000) return 0.035;
  if (ticket <= 30000) return 0.025;
  return 0.02;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtN = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const pct = (n: number, d = 1) => `${fmtN(n * 100, d)}%`;

// ─── UI Components ────────────────────────────────────────────────────────────

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold mb-4" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em" }}>
          {title}
        </p>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function NumberInput({
  label, value, onChange, step = 1, min = 0,
}: {
  label: string; value: string; onChange: (v: string) => void; step?: number; min?: number;
}) {
  const increment = () => onChange(String(Math.max(min, (parseFloat(value) || 0) + step)));
  const decrement = () => onChange(String(Math.max(min, (parseFloat(value) || 0) - step)));

  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</label>
      <div className="flex items-center rounded-lg overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none min-w-0"
          style={{ fontFamily: "'Fira Code', monospace" }}
        />
        <div className="flex flex-col border-l flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button onClick={increment} className="px-2.5 py-1 text-xs leading-none transition-colors hover:bg-white/10 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>▲</button>
          <button onClick={decrement} className="px-2.5 py-1 text-xs leading-none transition-colors hover:bg-white/10 cursor-pointer border-t" style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.08)" }}>▼</button>
        </div>
      </div>
    </div>
  );
}

function ToggleInput({
  label, options, value, onChange,
}: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</label>
      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        {options.map((o, i) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 py-2 text-xs font-medium transition-all cursor-pointer"
            style={{
              background: value === o.value ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
              color: value === o.value ? "#a78bfa" : "rgba(255,255,255,0.4)",
              borderRight: i < options.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectInput({
  label, options, value, onChange,
}: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-xs outline-none cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.8)",
          appearance: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M5 6L0 0h10z'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          paddingRight: "28px",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1a1a2e" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em" }}>{title}</p>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function FunnelArrow({ label, rate }: { label: string; rate: string }) {
  return (
    <div className="flex items-center gap-2 my-1 pl-4">
      <div className="flex flex-col items-center gap-0">
        <div className="w-px h-2.5" style={{ background: "rgba(255,255,255,0.1)" }} />
        <svg width="7" height="4" viewBox="0 0 7 4"><path d="M3.5 4L0 0h7z" fill="rgba(255,255,255,0.12)" /></svg>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{label}:</span>
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Fira Code', monospace" }}>{rate}</span>
      </div>
    </div>
  );
}

function FunnelBar({
  label, sublabel, mainValue, metrics, color, bgColor, widthPct = 100, alert,
}: {
  label: string; sublabel?: string; mainValue: string;
  metrics: { label: string; value: string; accent?: boolean }[];
  color: string; bgColor: string; widthPct?: number;
  alert?: { type: "warn" | "error"; text: string };
}) {
  return (
    <div style={{ width: `${widthPct}%` }}>
      <div className="relative rounded-xl overflow-hidden"
        style={{ background: bgColor, border: `1px solid ${color}28` }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: color }} />
        <div className="flex items-center justify-between pl-5 pr-5 py-4">
          <div>
            <p className="text-xs font-semibold" style={{ color: `${color}bb`, letterSpacing: "0.09em" }}>{label}</p>
            {sublabel && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{sublabel}</p>}
            <p className="text-2xl font-bold mt-1.5 text-white" style={{ fontFamily: "'Fira Code', monospace" }}>{mainValue}</p>
          </div>
          <div className="flex items-center gap-5">
            {metrics.map((m) => (
              <div key={m.label} className="text-right">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>{m.label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: m.accent ? color : "rgba(255,255,255,0.7)", fontFamily: "'Fira Code', monospace" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
        {alert && (
          <div className="mx-4 mb-3 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: alert.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
              color: alert.type === "error" ? "#fca5a5" : "#fde68a",
              border: `1px solid ${alert.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
            }}>
            {alert.type === "error" ? "✕ " : "⚠ "}{alert.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [meta,      setMeta]      = useState("");
  const [ticket,    setTicket]    = useState("");
  const [conversao, setConversao] = useState("");
  const [cpl,       setCpl]       = useState("");

  const [regime,      setRegime]      = useState<Regime>("pj");
  const [modalidade,  setModalidade]  = useState<Modalidade>("remoto");
  const [nivelCloser, setNivelCloser] = useState<CloserNivel>("pleno");
  const [nivelSDR,    setNivelSDR]    = useState<SDRNivel>("junior");

  const [baseCalculo, setBaseCalculo] = useState<BaseCalculo>("cheio");
  const [pEntradaStr, setPEntradaStr] = useState("40");

  const c = useMemo(() => {
    const vMeta      = parseFloat(meta)      || 0;
    const vTicket    = parseFloat(ticket)    || 0;
    const vConversao = (parseFloat(conversao) || 0) / 100;
    const vCpl       = parseFloat(cpl)       || 0;
    const vPEntrada  = (parseFloat(pEntradaStr) || 40) / 100;

    const vendas  = vTicket > 0 ? vMeta / vTicket : 0;
    const calls   = vConversao > 0 ? vendas / vConversao : 0;
    const leads   = calls / SDR_BOOKING_RATE;
    const trafego = leads * vCpl;

    const closer      = CLOSER_DATA[nivelCloser];
    const sdr         = SDR_DATA[nivelSDR];
    const mult        = REGIME_MULT[regime] * MODAL_MULT[modalidade];
    const capCloser   = closer.callsDay * DIAS_UTEIS;
    const numClosers  = calls > 0 ? Math.ceil(calls / capCloser) : 0;
    const numSDRs     = numClosers * 2;
    const custoCloser = closer.fixo * mult;
    const custoSDR    = sdr.fixo * mult;
    const folha       = numClosers * custoCloser + numSDRs * custoSDR;

    const percComis  = getCommissionRate(vTicket);
    const baseVenda  = baseCalculo === "cheio" ? vTicket : vTicket * vPEntrada;
    const comisVenda = baseVenda * percComis;
    const comisTotal = comisVenda * vendas;
    const comisRate  = vTicket > 0 ? comisVenda / vTicket : 0;

    const custoTotal = folha + comisTotal + trafego;
    const percCusto  = vMeta > 0 ? custoTotal / vMeta : 0;

    return {
      vMeta, vTicket, vConversao, vCpl, vPEntrada,
      vendas, calls, leads, trafego,
      capCloser, numClosers, numSDRs, custoCloser, custoSDR, folha,
      percComis, baseVenda, comisVenda, comisTotal, comisRate,
      custoTotal, percCusto,
    };
  }, [meta, ticket, conversao, cpl, regime, modalidade, nivelCloser, nivelSDR, baseCalculo, pEntradaStr]);

  const hasData   = c.vMeta > 0 && c.vTicket > 0;
  const isHealthy = c.percCusto > 0 && c.percCusto <= 0.35;

  // ─── Diagnóstico de gargalos ─────────────────────────────────────────────

  const insights = useMemo(() => {
    if (!hasData || c.custoTotal === 0) return [];

    type Insight = { type: "error" | "warn" | "info"; tag: string; title: string; body: string };
    const list: Insight[] = [];

    const pFolha  = c.folha / c.custoTotal;
    const pTraf   = c.trafego / c.custoTotal;
    const pComis  = c.comisTotal / c.custoTotal;

    // Identifica o maior gargalo entre os três
    const maiorGargalo = pFolha >= pTraf && pFolha >= pComis ? "folha"
      : pTraf >= pComis ? "trafego" : "comissao";

    // ── Gargalo principal ──
    if (maiorGargalo === "folha") {
      const reducaoPJ    = regime === "clt" ? c.folha - (c.folha / 1.5) : 0;
      const reducaoRem   = modalidade === "presencial" ? c.folha - (c.folha / 1.25) : 0;
      const tipo         = c.percCusto > 0.35 ? "error" : "warn";
      let body = `A folha representa ${pct(pFolha, 0)} do custo total (${fmt(c.folha)}).`;
      if (regime === "clt" && modalidade === "presencial")
        body += ` Migrar para PJ remoto reduziria a folha em ~${fmt(reducaoPJ + reducaoRem)} — o maior impacto possível agora.`;
      else if (regime === "clt")
        body += ` Migrar para PJ eliminaria o encargo de 50% — economia de ~${fmt(reducaoPJ)}/mês na folha.`;
      else if (modalidade === "presencial")
        body += ` Modalidade presencial adiciona 25% ao custo. Remoto economizaria ~${fmt(reducaoRem)}/mês.`;
      else if (nivelCloser === "lider")
        body += ` Closer no nível Líder/Gerente custa ${fmt(c.custoCloser)}/mês. Um Sênior entregaria 6 calls/dia com custo ~${fmt(CLOSER_DATA.senior.fixo * REGIME_MULT[regime] * MODAL_MULT[modalidade])}/mês.`;
      else if (c.numClosers >= 2)
        body += ` Com ${c.numClosers} closers, melhore a taxa de conversão antes de contratar — cada +5% de conversão reduz o número de calls necessárias.`;
      else
        body += ` Avalie o regime (PJ vs CLT) e a modalidade para reduzir o peso fixo.`;
      list.push({ type: tipo, tag: "GARGALO PRINCIPAL", title: "Folha do time é o maior custo", body });
    }

    if (maiorGargalo === "trafego") {
      const tipo = c.percCusto > 0.35 ? "error" : "warn";
      let body = `Tráfego representa ${pct(pTraf, 0)} do custo total (${fmt(c.trafego)}).`;
      if (c.vConversao > 0 && c.vConversao < 0.20) {
        const callsComMelhoraConv = c.vendas / 0.25;
        const leadsComMelhoraConv = callsComMelhoraConv / SDR_BOOKING_RATE;
        const economiaLead = (c.leads - leadsComMelhoraConv) * c.vCpl;
        body += ` Taxa de conversão de ${pct(c.vConversao)} está inflando o volume de leads. Subir para 25% reduziria ~${fmtN(c.leads - leadsComMelhoraConv, 0)} leads/mês — economia de ~${fmt(economiaLead)} em tráfego.`;
      } else if (c.vCpl > c.vTicket * 0.015) {
        body += ` CPL de ${fmt(c.vCpl)} está elevado para um ticket de ${fmt(c.vTicket)}. Testar canais orgânicos ou melhorar a qualificação na página de captura pode reduzir o CPL sem mexer no time.`;
      } else {
        body += ` Volume de leads alto (${fmtN(c.leads, 0)}/mês). Melhorar a qualificação de leads reduz o volume sem perder vendas.`;
      }
      list.push({ type: tipo, tag: "GARGALO PRINCIPAL", title: "Custo de tráfego é o maior peso", body });
    }

    if (maiorGargalo === "comissao") {
      const tipo = c.comisRate > 0.05 ? "error" : "warn";
      let body = `Comissão representa ${pct(pComis, 0)} do custo total (${fmt(c.comisTotal)}).`;
      if (c.comisRate > 0.05) {
        body += ` Percentual de ${pct(c.comisRate)} supera o limite saudável de 5% do ticket. `;
        if (baseCalculo === "cheio") {
          const comisEntrada = c.vTicket * 0.4 * c.percComis * c.vendas;
          body += `Mudar a base para entrada de caixa (40%) reduziria para ${fmt(comisEntrada)}/mês — economia de ${fmt(c.comisTotal - comisEntrada)}.`;
        } else {
          body += `Revise o percentual de comissão para ficar abaixo de 5% do valor cheio da venda.`;
        }
      } else if (baseCalculo === "cheio") {
        body += ` Calcular sobre entrada de caixa melhoraria o fluxo — a empresa desembolsa menos no mês da venda.`;
      } else {
        body += ` Avalie se o percentual está alinhado com o ticket e a margem do produto.`;
      }
      list.push({ type: tipo, tag: "GARGALO PRINCIPAL", title: "Comissão é o maior custo", body });
    }

    // ── Insights secundários (só aparecem se não forem o gargalo principal) ──

    if (maiorGargalo !== "trafego" && c.vConversao > 0 && c.vConversao < 0.15) {
      list.push({
        type: "warn", tag: "CONVERSÃO",
        title: "Taxa de conversão baixa",
        body: `Conversão de ${pct(c.vConversao)} exige ${fmtN(c.leads, 0)} leads/mês. Cada +5% de conversão reduz o volume de leads necessários e o custo de tráfego proporcionalmente.`,
      });
    }

    if (maiorGargalo !== "comissao" && c.comisRate > 0.05) {
      list.push({
        type: "error", tag: "COMISSÃO",
        title: "Comissão acima do limite",
        body: `${pct(c.comisRate)} do ticket vai para comissão — acima dos 5% saudáveis. ${baseCalculo === "cheio" ? "Mude a base para entrada de caixa para reduzir o desembolso no mês da venda." : "Revise o percentual aplicado."}`,
      });
    }

    if (c.percCusto <= 0.35 && c.percCusto > 0) {
      list.push({
        type: "info", tag: "SAÚDE",
        title: "Estrutura dentro do limite",
        body: `Custo comercial de ${pct(c.percCusto)} está abaixo dos 35%. O maior peso é ${maiorGargalo === "folha" ? "a folha do time" : maiorGargalo === "trafego" ? "o tráfego" : "a comissão"} — fique de olho se a meta crescer.`,
      });
    }

    return list;
  }, [c, hasData, regime, modalidade, nivelCloser, baseCalculo]);

  return (
    <div className="flex" style={{ minHeight: "100dvh", background: "#0b0d14", fontFamily: "var(--font-geist), -apple-system, sans-serif" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
        style={{ background: "#0f1117", borderRight: "1px solid rgba(255,255,255,0.06)", minHeight: "100dvh", position: "sticky", top: 0, overflowY: "auto", maxHeight: "100dvh" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Dimensionamento</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Calculadora Comercial</p>
            </div>
          </div>
        </div>

        {/* METAS */}
        <SidebarSection title="METAS">
          <NumberInput label="Meta de Faturamento  R$" value={meta}      onChange={setMeta}      step={5000} />
          <NumberInput label="Ticket Médio  R$"        value={ticket}    onChange={setTicket}    step={1000} />
        </SidebarSection>

        {/* CONVERSÃO */}
        <SidebarSection title="TAXAS DE CONVERSÃO">
          <NumberInput label="Taxa do Closer  %" value={conversao} onChange={setConversao} step={5} />
          <NumberInput label="Custo por Lead  R$" value={cpl}      onChange={setCpl}       step={10} />
        </SidebarSection>

        {/* TIME */}
        <SidebarSection title="TIME COMERCIAL">
          <ToggleInput label="Regime"
            options={[{ value: "pj", label: "PJ" }, { value: "clt", label: "CLT  +50%" }]}
            value={regime} onChange={(v) => setRegime(v as Regime)} />
          <ToggleInput label="Modalidade"
            options={[{ value: "remoto", label: "Remoto" }, { value: "presencial", label: "Presencial  +25%" }]}
            value={modalidade} onChange={(v) => setModalidade(v as Modalidade)} />
          <SelectInput label="Nível do Closer"
            options={[
              { value: "junior",  label: "Júnior — R$ 2.500 · 4 calls/dia" },
              { value: "pleno",   label: "Pleno — R$ 3.000 · 5 calls/dia" },
              { value: "senior",  label: "Sênior — R$ 3.750 · 6 calls/dia" },
              { value: "lider",   label: "Líder — R$ 5.750 · 4 calls/dia" },
            ]}
            value={nivelCloser} onChange={(v) => setNivelCloser(v as CloserNivel)} />
          <SelectInput label="Nível do SDR"
            options={[
              { value: "junior",          label: "Júnior — R$ 1.900" },
              { value: "pleno",           label: "Pleno — R$ 2.500" },
              { value: "senior",          label: "Sênior — R$ 3.000" },
              { value: "senior_avancado", label: "Sr. Avançado — R$ 3.200" },
            ]}
            value={nivelSDR} onChange={(v) => setNivelSDR(v as SDRNivel)} />
        </SidebarSection>

        {/* COMISSÃO */}
        <SidebarSection title="COMISSÃO">
          <ToggleInput label="Base de Cálculo"
            options={[{ value: "cheio", label: "Valor Cheio" }, { value: "entrada", label: "Entrada" }]}
            value={baseCalculo} onChange={(v) => setBaseCalculo(v as BaseCalculo)} />
          {baseCalculo === "entrada" && (
            <NumberInput label="% de Entrada" value={pEntradaStr} onChange={setPEntradaStr} step={5} min={1} />
          )}
          {hasData && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "Taxa aplicada", value: pct(c.percComis), color: "#fbbf24" },
                { label: "Por venda", value: fmt(c.comisVenda), color: "rgba(255,255,255,0.75)" },
                { label: "% do ticket", value: pct(c.comisRate), color: c.comisRate > 0.05 ? "#f87171" : "#34d399" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>{r.label}</span>
                  <span className="text-xs font-semibold" style={{ color: r.color, fontFamily: "'Fira Code', monospace" }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </SidebarSection>

        {/* BENCHMARKS */}
        <div className="px-5 pt-5 pb-6 flex-shrink-0">
          <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em" }}>BENCHMARKS</p>
          <div className="space-y-2.5">
            {[
              { label: "Custo comercial/fat.", vals: ["≤25%","25–35%",">35%"] },
              { label: "Conversão closer",     vals: [">30%","15–30%","<15%"] },
              { label: "Comissão/ticket",      vals: ["≤3%","3–5%",">5%"] },
            ].map((b) => (
              <div key={b.label}>
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.38)" }}>{b.label}</p>
                <div className="flex gap-1">
                  {b.vals.map((v, i) => (
                    <span key={v} className="flex-1 text-center text-xs rounded py-0.5"
                      style={{ background: i === 0 ? "rgba(16,185,129,0.12)" : i === 1 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)", color: i === 0 ? "#34d399" : i === 1 ? "#fbbf24" : "#f87171" }}>{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col">

        {/* Top bar */}
        <div className="sticky top-0 z-10 px-6 py-3.5 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: "rgba(11,13,20,0.92)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h1 className="text-sm font-semibold text-white">Fluxo Comercial</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
              {hasData ? `Meta ${fmt(c.vMeta)} · Ticket ${fmt(c.vTicket)} · Conversão ${pct(c.vConversao)}` : "Preencha os inputs no painel esquerdo para ver o fluxo"}
            </p>
          </div>
          {hasData && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: isHealthy ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${isHealthy ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
                color: isHealthy ? "#34d399" : "#f87171",
              }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block pulse-dot" style={{ background: isHealthy ? "#34d399" : "#f87171" }} />
              Custo comercial: {pct(c.percCusto)} — {isHealthy ? "Saudável" : "Atenção"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 max-w-3xl w-full">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-base font-medium text-white mb-2">Nenhum dado ainda</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                Preencha a meta de faturamento e o ticket médio<br />no painel esquerdo para ver o fluxo.
              </p>
            </div>
          ) : (
            <>
              {/* ── GERAÇÃO DE DEMANDA ── */}
              <SectionDivider title="GERAÇÃO DE DEMANDA" />

              <FunnelBar
                label="META DE FATURAMENTO"
                sublabel="Receita bruta alvo no mês"
                mainValue={fmt(c.vMeta)}
                color="#6366f1" bgColor="rgba(99,102,241,0.07)"
                widthPct={100}
                metrics={[
                  { label: "Ticket Médio",  value: fmt(c.vTicket) },
                  { label: "Período",       value: "Mensal" },
                ]}
              />

              <FunnelArrow label="÷ Ticket" rate={fmt(c.vTicket)} />

              <FunnelBar
                label="VENDAS NECESSÁRIAS"
                sublabel="Contratos fechados no mês"
                mainValue={`${fmtN(c.vendas)} vendas`}
                color="#3b82f6" bgColor="rgba(59,130,246,0.07)"
                widthPct={96}
                metrics={[
                  { label: "CPA Est.",  value: c.vendas > 0 ? fmt(c.custoTotal / c.vendas) : "—" },
                  { label: "Meta",      value: fmt(c.vMeta) },
                ]}
              />

              <FunnelArrow label="÷ Taxa conversão" rate={c.vConversao > 0 ? pct(c.vConversao) : "—%"} />

              <FunnelBar
                label="CALLS NECESSÁRIAS"
                sublabel="Reuniões de vendas agendadas"
                mainValue={`${fmtN(c.calls)} calls`}
                color="#0ea5e9" bgColor="rgba(14,165,233,0.07)"
                widthPct={90}
                metrics={[
                  { label: "Cap./Closer", value: `${c.capCloser} /mês` },
                  { label: "Dias úteis",  value: "22" },
                ]}
              />

              <FunnelArrow label="÷ Agendamento SDR" rate="25%" />

              <FunnelBar
                label="LEADS NECESSÁRIOS"
                sublabel="Leads qualificados no ICP"
                mainValue={`${fmtN(c.leads)} leads`}
                color="#06b6d4" bgColor="rgba(6,182,212,0.07)"
                widthPct={82}
                metrics={[
                  { label: "CPL",       value: fmt(c.vCpl) },
                  { label: "Investim.", value: fmt(c.trafego) },
                ]}
              />

              <FunnelArrow label="× CPL" rate={fmt(c.vCpl)} />

              <FunnelBar
                label="INVESTIMENTO EM TRÁFEGO"
                sublabel="Custo de mídia estimado"
                mainValue={fmt(c.trafego)}
                color="#10b981" bgColor="rgba(16,185,129,0.07)"
                widthPct={74}
                metrics={[
                  { label: "Por lead",  value: fmt(c.vCpl) },
                  { label: "Por venda", value: c.vendas > 0 ? fmt(c.trafego / c.vendas) : "—" },
                ]}
              />

              {/* ── TIME ── */}
              <SectionDivider title="DIMENSIONAMENTO DO TIME" />

              <div className="grid grid-cols-2 gap-3">
                <FunnelBar
                  label="CLOSERS"
                  sublabel={CLOSER_DATA[nivelCloser].label}
                  mainValue={`${c.numClosers} closer${c.numClosers !== 1 ? "s" : ""}`}
                  color="#f59e0b" bgColor="rgba(245,158,11,0.07)"
                  metrics={[
                    { label: "Fixo/un.", value: fmt(c.custoCloser) },
                    { label: "Cap./mês", value: `${c.capCloser}` },
                  ]}
                />
                <FunnelBar
                  label="SDRs"
                  sublabel={SDR_DATA[nivelSDR].label}
                  mainValue={`${c.numSDRs} SDR${c.numSDRs !== 1 ? "s" : ""}`}
                  color="#f97316" bgColor="rgba(249,115,22,0.07)"
                  metrics={[
                    { label: "Fixo/un.", value: fmt(c.custoSDR) },
                    { label: "Total/mês", value: fmt(c.numSDRs * c.custoSDR) },
                  ]}
                />
              </div>

              {/* ── CUSTOS ── */}
              <SectionDivider title="CUSTOS E COMISSÃO" />

              <FunnelBar
                label="FOLHA SALARIAL"
                sublabel={`${regime.toUpperCase()} · ${modalidade === "presencial" ? "Presencial" : "Remoto"}`}
                mainValue={fmt(c.folha)}
                color="#8b5cf6" bgColor="rgba(139,92,246,0.07)"
                metrics={[
                  { label: `${c.numClosers}× Closer`, value: fmt(c.numClosers * c.custoCloser) },
                  { label: `${c.numSDRs}× SDR`,       value: fmt(c.numSDRs * c.custoSDR) },
                ]}
              />

              <div className="my-2" />

              <FunnelBar
                label="COMISSÃO ESTIMADA"
                sublabel={baseCalculo === "cheio" ? "Sobre valor cheio" : `Sobre ${fmtN(c.vPEntrada * 100, 0)}% de entrada`}
                mainValue={fmt(c.comisTotal)}
                color="#ec4899" bgColor="rgba(236,72,153,0.07)"
                metrics={[
                  { label: "Taxa",      value: pct(c.percComis), accent: true },
                  { label: "Por venda", value: fmt(c.comisVenda) },
                ]}
                alert={c.comisRate > 0.05
                  ? { type: "error", text: `${pct(c.comisRate)} do ticket — acima do limite saudável de 5%` }
                  : undefined}
              />

              {/* ── RESULTADO FINAL ── */}
              <SectionDivider title="RESULTADO FINAL" />

              <div className="rounded-2xl overflow-hidden"
                style={{
                  background: c.percCusto > 0.35 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
                  border: `1px solid ${c.percCusto > 0.35 ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)"}`,
                }}>
                {/* Main numbers */}
                <div className="px-6 pt-5 pb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>CUSTO COMERCIAL TOTAL</p>
                    <p className="text-4xl font-bold mt-2 text-white" style={{ fontFamily: "'Fira Code', monospace" }}>{fmt(c.custoTotal)}</p>
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.38)" }}>
                      Folha {fmt(c.folha)} + Comissão {fmt(c.comisTotal)} + Tráfego {fmt(c.trafego)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>% do faturamento</p>
                    <p className="text-4xl font-bold mt-1" style={{
                      fontFamily: "'Fira Code', monospace",
                      color: c.percCusto > 0.35 ? "#f87171" : c.percCusto > 0.28 ? "#fbbf24" : "#34d399",
                    }}>{pct(c.percCusto)}</p>
                    <p className="text-xs mt-2 font-medium" style={{ color: c.percCusto > 0.35 ? "#f87171" : "#34d399" }}>
                      {c.percCusto > 0.35 ? "Acima do limite de 35%" : "Dentro do limite saudável"}
                    </p>
                  </div>
                </div>

                {/* Breakdown bar */}
                {c.custoTotal > 0 && (
                  <div className="mx-5 mb-4 rounded-lg overflow-hidden flex h-2">
                    <div style={{ width: `${(c.folha / c.custoTotal) * 100}%`, background: "#8b5cf6" }} />
                    <div style={{ width: `${(c.comisTotal / c.custoTotal) * 100}%`, background: "#ec4899" }} />
                    <div style={{ width: `${(c.trafego / c.custoTotal) * 100}%`, background: "#10b981" }} />
                  </div>
                )}

                {/* Cost breakdown cards */}
                <div className="grid grid-cols-3 gap-2.5 mx-5 mb-5">
                  {[
                    { label: "Folha salarial", value: fmt(c.folha),       share: c.custoTotal > 0 ? pct(c.folha / c.custoTotal) : "—",       color: "#8b5cf6" },
                    { label: "Comissão",        value: fmt(c.comisTotal),  share: c.custoTotal > 0 ? pct(c.comisTotal / c.custoTotal) : "—",  color: "#ec4899" },
                    { label: "Tráfego",         value: fmt(c.trafego),     share: c.custoTotal > 0 ? pct(c.trafego / c.custoTotal) : "—",     color: "#10b981" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-white" style={{ fontFamily: "'Fira Code', monospace" }}>{item.value}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: item.color }}>{item.share}</p>
                    </div>
                  ))}
                </div>

                {/* Insights de gargalo */}
                {insights.length > 0 && (
                  <div className="mx-5 mb-5 space-y-2">
                    {insights.map((ins, i) => {
                      const colors = {
                        error: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.18)",  tag: "#f87171",  text: "#fca5a5" },
                        warn:  { bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.18)",  tag: "#fbbf24",  text: "#fde68a" },
                        info:  { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.18)", tag: "#a78bfa",  text: "#c4b5fd" },
                      }[ins.type];
                      return (
                        <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                          <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: `${colors.bg}` }}>
                            <span className="text-xs font-bold tracking-widest" style={{ color: colors.tag }}>{ins.tag}</span>
                          </div>
                          <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <p className="text-xs font-semibold text-white mb-1">{ins.title}</p>
                            <p className="text-xs leading-relaxed" style={{ color: colors.text }}>{ins.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-10" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}