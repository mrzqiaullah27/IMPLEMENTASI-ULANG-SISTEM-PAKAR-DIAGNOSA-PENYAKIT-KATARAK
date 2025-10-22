export const LABELS_JSON = "label_katarak.json";
export const RULES_JSON  = "rule_katarak_cf.json";

// Loader JSON
export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal memuat ${path} (${res.status})`);
  return await res.json();
}

// ===== CF helpers =====
export function cfCombine(a, b) {
  return a + b * (1 - a);
}

/** Evaluasi 1 rule (AND semua premis) */
export function evaluateRule(rule, userCF) {
  const vals = [];
  for (const p of rule.if) {
    const u = userCF[p.gejala] ?? 0;
    if (u <= 0) return { then: rule.then, value: 0 }; // AND semantics
    vals.push(u * p.cf);
  }
  if (!vals.length) return { then: rule.then, value: 0 };
  let c = vals[0];
  for (let i = 1; i < vals.length; i++) c = cfCombine(c, vals[i]);
  return { then: rule.then, value: c * (rule.cf ?? 1) };
}

/** Gabungkan antar-rule menuju penyakit sama (paralel), urut desc */
export function diagnose(rules, userCF) {
  const agg = {};
  for (const r of rules) {
    const { then, value } = evaluateRule(r, userCF);
    if (value > 0) agg[then] = agg[then] == null ? value : cfCombine(agg[then], value);
  }
  return Object.entries(agg).sort((a, b) => b[1] - a[1]);
}

/** Urutkan kode gejala berdasar angka di dalam string (GJL01..GJL18) */
export function orderedCodes(symptoms) {
  const toNum = s => parseInt(String(s).replace(/\D/g, "")) || 0;
  return Object.keys(symptoms).sort((a, b) => toNum(a) - toNum(b));
}

/** Map indeks 1..5 -> nilai CF user dari certainty_terms */
export function indexToCFMap(certaintyTerms) {
  const order = ["Tidak", "Kemungkinan Tidak", "Tidak Tahu", "Kemungkinan Iya", "Iya"];
  return {
    order,
    values: order.map(k => Number(certaintyTerms[k]))
  };
}