import { useState } from "react";
import { PRICE_DATE, costCsv, costTable, type PriceConfidence, type SuporteVersion } from "@simiot/adapter-cad";

const brl = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const qty = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const CONFIDENCE: Record<PriceConfidence | "sem-preco", string> = {
  pagina: "página da loja",
  anuncio: "anúncio visto na busca",
  proxy: "preço de item parecido",
  estimativa: "estimativa",
  "sem-preco": "sem preço",
};

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Cost of the support and its electronics in R$, for one prototype or a batch. The pregoscopio (P1 to P10) is not priced. */
export function Custos({ version }: { version: SuporteVersion }) {
  const [units, setUnits] = useState(1);
  const t = costTable(version, units);
  return (
    <section className="calc">
      <h4>Custo do suporte e da eletrônica (sem o pregoscópio)</h4>
      <p className="small muted">
        Preços de varejo no Brasil, à vista no Pix, como apareciam nas lojas em {PRICE_DATE}; mudam. O pregoscópio e a objetiva (P1 a P10) ficam de fora. As peças impressas entram só pelo filamento: a hora de máquina e o desgaste da impressora não foram contados.
      </p>
      <div className="row">
        <button className={units === 1 ? "active" : ""} onClick={() => setUnits(1)}>1 protótipo</button>
        <button className={units === 100 ? "active" : ""} onClick={() => setUnits(100)}>Lote de 100</button>
        <button onClick={() => download(`custos-${version}-${units}un.csv`, costCsv(version, units))}>Baixar planilha (CSV)</button>
      </div>
      <dl>
        <dt>Custo por unidade, só o que é usado</dt><dd><b>{brl(t.usedPerUnit)}</b></dd>
        <dt>{units === 1 ? "Gasto para comprar tudo" : "Gasto por unidade comprando pacotes inteiros"}</dt>
        <dd><b>{brl(units === 1 ? t.purchase : t.purchasePerUnit)}</b>{units > 1 ? ` (total ${brl(t.purchase)})` : ""}</dd>
        <dt>Filamento por unidade</dt><dd>{t.grams.toFixed(0)} g de PLA (estimativa)</dd>
      </dl>
      <table className="plan">
        <thead><tr><th>Item</th><th>Qtd</th><th>Pacote</th><th>Usado</th><th>Compra</th><th>Origem</th></tr></thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.id} · {r.label}</td>
              <td className="mono">{qty(r.need)} {r.unit}</td>
              <td className="mono">{r.packPrice === null ? "—" : `${r.packs} × ${brl(r.packPrice)} (${r.packLabel})`}</td>
              <td className="mono">{brl(r.used)}</td>
              <td className="mono">{brl(r.purchase)}</td>
              <td className="small">
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.store}</a> : r.store}{r.store ? ", " : ""}{CONFIDENCE[r.confidence]}
                {r.note ? <span className="muted"> — {r.note}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {t.missing.length > 0 && <p className="small error">Sem preço e fora do total: {t.missing.join(", ")}.</p>}
      <p className="small muted">
        No lote os preços são de varejo, sem desconto de atacado: é um teto, e um fornecedor de atacado ou a importação sai mais barato. Várias lojas mostravam "últimas unidades": para 100 peças é preciso pedir estoque ou cotar atacado. A placa fabricada a partir dos Gerbers não foi cotada; a placa ilhada serve para montar à mão.
      </p>
    </section>
  );
}
