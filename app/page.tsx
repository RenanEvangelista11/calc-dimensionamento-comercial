"use client";

import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Block2 {
  regime: "pj" | "clt";
  modalidade: "remoto" | "presencial";
  nivelCloser: "junior" | "pleno" | "senior" | "lider";
  nivelSDR: "junior" | "pleno" | "senior" | "senior_avancado";
}

interface Block3 {
  baseCalculo: "cheio" | "entrada";
  percentualEntrada: number;
}

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
  senior_avancado: { fixo: 3200, label: "Sênior Avançado" },
};

const REGIME_MULT  = { pj: 1, clt: 1.5 };
const MODAL_MULT   = { remoto: 1, presencial: 1.25 };
const DIAS_UTEIS   = 22;
const SDR_BOOKING_RATE = 0.25;

function getCommissionRate(ticket: number): number {
  if (ticket <= 5000)  return 0.05;
  if (ticket <= 15000) return 0.035;
  if (ticket <= 30000) return 0.025;
  return 0.02;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtN = (n: number, decimals = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  label, prefix, suffix, value, onChange, placeholder, hint,
}: {
  label: string; prefix?: string; suffix?: string;
  value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: "rgba(255,255,255,0.35)" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          className="input-field"
          style={{ paddingLeft: prefix ? "36px" : undefined, paddingRight: suffix ? "40px" : undefined }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: "rgba(255,255,255,0.35)" }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.28)" }}>{hint}</p>}
    </div>
  );
}

function Toggle({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </label>
      <div className="toggle-btn">
        {options.map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)} className={value === o.value ? "active" : ""}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </label>
      <select className="select-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "yellow" }) {
  const colors = {
    green:  "text-emerald-400",
    red:    "text-red-400",
    yellow: "text-yellow-400",
    default: "text-white",
  };
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? colors[highlight] : colors.default}`}>{value}</span>
    </div>
  );
}

function AlertCard({ type, text }: { type: "warn" | "error" | "info"; text: string }) {
  const styles = {
    warn:  { bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.2)",  icon: "⚠", color: "#facc15" },
    error: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  icon: "✕", color: "#f87171" },
    info:  { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", icon: "ℹ", color: "#a78bfa" },
  };
  const s = styles[type];
  return (
    <div className="fade-in flex items-start gap-3 rounded-xl px-4 py-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="text-base mt-0.5 flex-shrink-0" style={{ color: s.color }}>{s.icon}</span>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{text}</p>
    </div>
  );
}

function BlockHeader({ num, title, subtitle, color }: { num: string; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
        style={{ background: `${color}20`, color }}>
        {num}
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  // Block 1
  const [b1, setB1] = useState<{ meta: string; ticket: string; conversao: string; cpl: string }>({
    meta: "", ticket: "", conversao: "", cpl: "",
  });

  // Block 2
  const [b2, setB2] = useState<Block2>({
    regime: "pj",
    modalidade: "remoto",
    nivelCloser: "pleno",
    nivelSDR: "junior",
  });

  // Block 3
  const [b3, setB3] = useState<Block3>({
    baseCalculo: "cheio",
    percentualEntrada: 40,
  });
  const [b3EntradaStr, setB3EntradaStr] = useState("40");

  // ─── Calculations ──────────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const meta      = parseFloat(b1.meta)      || 0;
    const ticket    = parseFloat(b1.ticket)    || 0;
    const conversao = (parseFloat(b1.conversao) || 0) / 100;
    const cpl       = parseFloat(b1.cpl)       || 0;

    // Block 1
    const vendas   = ticket > 0 ? meta / ticket : 0;
    const calls    = conversao > 0 ? vendas / conversao : 0;
    const leads    = calls / SDR_BOOKING_RATE;
    const trafego  = leads * cpl;

    // Block 2
    const closerData  = CLOSER_DATA[b2.nivelCloser];
    const sdrData     = SDR_DATA[b2.nivelSDR];
    const regimeMult  = REGIME_MULT[b2.regime];
    const modalMult   = MODAL_MULT[b2.modalidade];
    const mult        = regimeMult * modalMult;

    const capCloser     = closerData.callsDay * DIAS_UTEIS;
    const numClosers    = calls > 0 ? Math.ceil(calls / capCloser) : 0;
    const numSDRs       = numClosers * 2;

    const custoCloser   = closerData.fixo * mult;
    const custoSDR      = sdrData.fixo * mult;
    const folhaTotal    = numClosers * custoCloser + numSDRs * custoSDR;

    // Block 3
    const pEntrada      = (parseFloat(b3EntradaStr) || 40) / 100;
    const baseVenda     = b3.baseCalculo === "cheio" ? ticket : ticket * pEntrada;
    const percComissao  = getCommissionRate(ticket);
    const comissaoPorVenda = baseVenda * percComissao;
    const comissaoTotal = comissaoPorVenda * vendas;

    const comissaoSobreTicket = ticket > 0 ? comissaoPorVenda / ticket : 0;

    // Final
    const custoTotal   = folhaTotal + comissaoTotal + trafego;
    const percCusto    = meta > 0 ? custoTotal / meta : 0;

    return {
      meta, ticket, conversao, cpl,
      vendas, calls, leads, trafego,
      capCloser, numClosers, numSDRs,
      custoCloser, custoSDR, folhaTotal,
      percComissao, comissaoPorVenda, comissaoTotal, comissaoSobreTicket,
      baseVenda, pEntrada,
      custoTotal, percCusto,
    };
  }, [b1, b2, b3, b3EntradaStr]);

  // ─── Insights ─────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const list: { type: "warn" | "error" | "info"; text: string }[] = [];

    if (calc.numClosers > 1) {
      list.push({ type: "info", text: `Você precisará de ${calc.numClosers} closers. Considere contratar ${calc.numSDRs} SDRs para garantir agenda sempre cheia.` });
    }

    if (calc.comissaoSobreTicket > 0.05) {
      list.push({ type: "error", text: `Comissão acima do limite saudável de 5% do ticket (atual: ${fmtN(calc.comissaoSobreTicket * 100, 1)}%). Revise o percentual ou mude a base para entrada de caixa.` });
    }

    if (calc.percCusto > 0.35 && calc.meta > 0) {
      list.push({ type: "warn", text: `Custo comercial de ${fmtN(calc.percCusto * 100, 0)}% do faturamento supera o limite de 35%. Considere PJ remoto ou reduzir o nível de contratação.` });
    }

    if (calc.conversao > 0 && calc.conversao < 0.15) {
      list.push({ type: "warn", text: `Taxa de conversão abaixo de 15%. O volume de leads e o investimento em tráfego sobem proporcionalmente.` });
    }

    if (calc.numClosers === 1 && calc.numSDRs === 2) {
      list.push({ type: "info", text: `Com 1 closer e 2 SDRs, a agenda tende a ficar cheia. Monitore a ocupação e a taxa de no-show.` });
    }

    return list;
  }, [calc]);

  const hasData = calc.meta > 0 && calc.ticket > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #080810 0%, #0d0d1a 100%)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}>
              ◈
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Dimensionamento Comercial</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Calculadora estratégica do time de vendas</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#a78bfa" }}>
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block"></span>
            Cálculo em tempo real
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN — Inputs ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Block 1 */}
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <BlockHeader
                num="01"
                title="Metas e Produto"
                subtitle="Define o volume de trabalho necessário"
                color="#6366f1"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Meta de faturamento mensal" prefix="R$"
                  value={b1.meta} onChange={(v) => setB1((p) => ({ ...p, meta: v }))}
                  placeholder="100.000" hint="Receita bruta alvo no mês" />
                <InputField label="Ticket médio das vendas" prefix="R$"
                  value={b1.ticket} onChange={(v) => setB1((p) => ({ ...p, ticket: v }))}
                  placeholder="15.000" />
                <InputField label="Taxa de conversão do closer" suffix="%"
                  value={b1.conversao} onChange={(v) => setB1((p) => ({ ...p, conversao: v }))}
                  placeholder="25" hint="% de calls que viram venda" />
                <InputField label="Custo por lead (CPL)" prefix="R$"
                  value={b1.cpl} onChange={(v) => setB1((p) => ({ ...p, cpl: v }))}
                  placeholder="80" />
              </div>

              {/* Block 1 results */}
              {hasData && (
                <div className="mt-5 rounded-xl p-4 fade-in" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "rgba(99,102,241,0.8)" }}>Resultados do bloco 1</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Vendas/mês", value: fmtN(calc.vendas) },
                      { label: "Calls/mês", value: fmtN(calc.calls) },
                      { label: "Leads/mês", value: fmtN(calc.leads) },
                      { label: "Invest. tráfego", value: fmt(calc.trafego) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-lg font-bold text-white">{item.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Block 2 */}
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <BlockHeader
                num="02"
                title="Dimensionamento do Time"
                subtitle="Define estrutura, níveis e custo da folha"
                color="#10b981"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Toggle label="Regime de contratação"
                  options={[{ value: "pj", label: "PJ" }, { value: "clt", label: "CLT (+50%)" }]}
                  value={b2.regime} onChange={(v) => setB2((p) => ({ ...p, regime: v as "pj" | "clt" }))} />
                <Toggle label="Modalidade de trabalho"
                  options={[{ value: "remoto", label: "Remoto" }, { value: "presencial", label: "Presencial (+25%)" }]}
                  value={b2.modalidade} onChange={(v) => setB2((p) => ({ ...p, modalidade: v as "remoto" | "presencial" }))} />
                <SelectField label="Nível do Closer"
                  options={[
                    { value: "junior",  label: "Júnior — R$ 2.500 | 4 calls/dia" },
                    { value: "pleno",   label: "Pleno — R$ 3.000 | 5 calls/dia" },
                    { value: "senior",  label: "Sênior — R$ 3.750 | 6 calls/dia" },
                    { value: "lider",   label: "Líder/Gerente — R$ 5.750 | 4 calls/dia" },
                  ]}
                  value={b2.nivelCloser} onChange={(v) => setB2((p) => ({ ...p, nivelCloser: v as Block2["nivelCloser"] }))} />
                <SelectField label="Nível do SDR"
                  options={[
                    { value: "junior",          label: "Júnior — R$ 1.900 | 40 agend./mês" },
                    { value: "pleno",           label: "Pleno — R$ 2.500 | 60 agend./mês" },
                    { value: "senior",          label: "Sênior — R$ 3.000 | 80 agend./mês" },
                    { value: "senior_avancado", label: "Sênior Avançado — R$ 3.200 | 100+ agend./mês" },
                  ]}
                  value={b2.nivelSDR} onChange={(v) => setB2((p) => ({ ...p, nivelSDR: v as Block2["nivelSDR"] }))} />
              </div>

              {hasData && (
                <div className="mt-5 rounded-xl p-4 fade-in" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "rgba(16,185,129,0.8)" }}>Estrutura calculada</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Closers", value: String(calc.numClosers) },
                      { label: "SDRs", value: String(calc.numSDRs) },
                      { label: "Cap./closer", value: `${calc.capCloser} calls` },
                      { label: "Folha total", value: fmt(calc.folhaTotal) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-lg font-bold text-white">{item.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Breakdown */}
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Closer {CLOSER_DATA[b2.nivelCloser].label}: {fmt(calc.custoCloser)}/mês
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        SDR {SDR_DATA[b2.nivelSDR].label}: {fmt(calc.custoSDR)}/mês
                      </p>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Multiplicadores aplicados: {b2.regime.toUpperCase()} {b2.modalidade === "presencial" ? "× Presencial" : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Block 3 */}
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <BlockHeader
                num="03"
                title="Plano de Comissão"
                subtitle="Define quanto vai custar cada venda para o time"
                color="#f59e0b"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Toggle label="Base de cálculo da comissão"
                  options={[{ value: "cheio", label: "Valor cheio" }, { value: "entrada", label: "Entrada de caixa" }]}
                  value={b3.baseCalculo} onChange={(v) => setB3((p) => ({ ...p, baseCalculo: v as "cheio" | "entrada" }))} />
                {b3.baseCalculo === "entrada" && (
                  <InputField label="Percentual de entrada esperado" suffix="%"
                    value={b3EntradaStr} onChange={setB3EntradaStr}
                    placeholder="40" hint="Ex: 40% de entrada na contratação" />
                )}
              </div>

              {hasData && calc.ticket > 0 && (
                <div className="mt-5 rounded-xl p-4 fade-in" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "rgba(245,158,11,0.8)" }}>Comissão calculada</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "% aplicado", value: `${fmtN(calc.percComissao * 100, 1)}%` },
                      { label: "Por venda", value: fmt(calc.comissaoPorVenda) },
                      { label: "Total/mês", value: fmt(calc.comissaoTotal) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-lg font-bold text-white">{item.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {b3.baseCalculo === "entrada" && (
                    <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Base: {fmt(calc.baseVenda)} por venda ({fmtN(calc.pEntrada * 100, 0)}% de {fmt(calc.ticket)})
                    </p>
                  )}
                  <div className="mt-2 p-2.5 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)" }}>
                    <span className="font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Referência por faixa: </span>
                    Até R$5k → 5% | R$5k–R$15k → 3,5% | R$15k–R$30k → 2,5% | Acima R$30k → 2%
                  </div>
                </div>
              )}
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Insights automáticos
                </p>
                {insights.map((ins, i) => (
                  <AlertCard key={i} type={ins.type} text={ins.text} />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN — Summary ── */}
          <div className="space-y-5">
            {/* Summary card */}
            <div className="rounded-2xl p-5 sticky top-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Resumo Executivo
              </p>

              {!hasData ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-20">◈</div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Preencha a meta e o ticket médio para ver o resumo
                  </p>
                </div>
              ) : (
                <div className="fade-in">
                  {/* Main metric */}
                  <div className="rounded-xl p-4 mb-4 text-center"
                    style={{ background: calc.percCusto > 0.35 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${calc.percCusto > 0.35 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>Custo comercial total</p>
                    <p className="text-3xl font-bold text-white">{fmt(calc.custoTotal)}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span className="text-lg font-bold" style={{ color: calc.percCusto > 0.35 ? "#f87171" : "#34d399" }}>
                        {fmtN(calc.percCusto * 100, 1)}%
                      </span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>do faturamento</span>
                    </div>
                    {calc.percCusto > 0.35 && (
                      <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>Acima do limite de 35%</p>
                    )}
                    {calc.percCusto > 0 && calc.percCusto <= 0.35 && (
                      <p className="text-xs mt-1.5" style={{ color: "#34d399" }}>Dentro do limite saudável</p>
                    )}
                  </div>

                  {/* Detail rows */}
                  <div className="space-y-0">
                    <ResultRow label="Meta de faturamento" value={fmt(calc.meta)} />
                    <ResultRow label="Vendas necessárias/mês" value={fmtN(calc.vendas)} />
                    <ResultRow label="Calls necessárias/mês" value={fmtN(calc.calls)} />
                    <ResultRow label="Leads necessários/mês" value={fmtN(calc.leads)} />
                  </div>

                  <div className="mt-3 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>Time</p>
                  </div>
                  <div className="space-y-0">
                    <ResultRow label={`Closers (${CLOSER_DATA[b2.nivelCloser].label})`} value={String(calc.numClosers)} />
                    <ResultRow label={`SDRs (${SDR_DATA[b2.nivelSDR].label})`} value={String(calc.numSDRs)} />
                  </div>

                  <div className="mt-3 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>Custos</p>
                  </div>
                  <div className="space-y-0">
                    <ResultRow label="Folha salarial total" value={fmt(calc.folhaTotal)} />
                    <ResultRow label="Comissão estimada/mês" value={fmt(calc.comissaoTotal)} />
                    <ResultRow label="Invest. em tráfego" value={fmt(calc.trafego)} />
                    <ResultRow
                      label="Custo comercial total"
                      value={fmt(calc.custoTotal)}
                      highlight={calc.percCusto > 0.35 ? "red" : "green"}
                    />
                    <ResultRow
                      label="% do faturamento"
                      value={`${fmtN(calc.percCusto * 100, 1)}%`}
                      highlight={calc.percCusto > 0.35 ? "red" : calc.percCusto > 0.28 ? "yellow" : "green"}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Benchmarks */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Benchmarks de referência
              </p>
              <div className="space-y-3">
                {[
                  { label: "Custo comercial / fat.", bom: "≤ 25%", ok: "25–35%", ruim: "> 35%" },
                  { label: "Conversão do closer", bom: "> 30%", ok: "15–30%", ruim: "< 15%" },
                  { label: "Comissão / ticket", bom: "≤ 3%", ok: "3–5%", ruim: "> 5%" },
                  { label: "Tax. agendamento SDR", bom: "25–30%", ok: "15–25%", ruim: "< 15%" },
                ].map((b) => (
                  <div key={b.label}>
                    <p className="text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>{b.label}</p>
                    <div className="flex gap-1.5">
                      <span className="flex-1 text-center text-xs rounded-md py-1" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>{b.bom}</span>
                      <span className="flex-1 text-center text-xs rounded-md py-1" style={{ background: "rgba(234,179,8,0.1)", color: "#fbbf24" }}>{b.ok}</span>
                      <span className="flex-1 text-center text-xs rounded-md py-1" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{b.ruim}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#34d399" }}></span>Bom
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#fbbf24" }}></span>Atenção
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#f87171" }}></span>Ruim
                </div>
              </div>
            </div>

            {/* Carreira table */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Plano de Carreira — Closer
              </p>
              <div className="space-y-2">
                {Object.entries(CLOSER_DATA).map(([key, d]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: b2.nivelCloser === key ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${b2.nivelCloser === key ? "rgba(99,102,241,0.2)" : "transparent"}` }}>
                    <div>
                      <p className="text-xs font-medium text-white">{d.label}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{d.callsDay} calls/dia</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: b2.nivelCloser === key ? "#a78bfa" : "rgba(255,255,255,0.5)" }}>
                      {fmt(d.fixo)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-10" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Calculadora de Dimensionamento Comercial — v1.0
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
            Benchmarks baseados em dados de mercado B2B high-ticket
          </p>
        </div>
      </footer>
    </div>
  );
}
