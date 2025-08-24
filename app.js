// データ保存先キー
const STORAGE_KEY = "mnp_entries";

// 転出可能日ルール
let rules = {
  docomo: 182,
  au: 215,
  sb: 215,
  rk: 215,
  other: 215,
};

// DOM取得
const form = document.getElementById("entryForm");
const resetBtn = document.getElementById("resetBtn");
const exportCsvBtn = document.getElementById("exportCsv");
const importCsvInput = document.getElementById("importCsvInput");
const downloadJsonBtn = document.getElementById("downloadJson");
const uploadJsonInput = document.getElementById("uploadJsonInput");
const wipeAllBtn = document.getElementById("wipeAll");
const searchInput = document.getElementById("search");
const filterStatus = document.getElementById("filterStatus");
const tableBody = document.querySelector("#table tbody");

// ルール入力
const ruleInputs = {
  docomo: document.getElementById("ruleDocomo"),
  au: document.getElementById("ruleAu"),
  sb: document.getElementById("ruleSb"),
  rk: document.getElementById("ruleRk"),
  other: document.getElementById("ruleOther"),
};

// データ管理
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// 実質利益計算
function calcProfit(e) {
  return (Number(e.cashback) + Number(e.resale)) -
    (Number(e.deviceCost) + (Number(e.monthly) * Number(e.months)) + Number(e.extras) + Number(e.referral));
}

// 転出可能日
function calcTransferDate(e) {
  const base = new Date(e.contractDate);
  if (isNaN(base)) return "";
  let days = rules.other;
  if (e.carrier.includes("docomo")) days = rules.docomo;
  else if (e.carrier.includes("au") || e.carrier.includes("UQ")) days = rules.au;
  else if (e.carrier.includes("Soft") || e.carrier.includes("Y!") || e.carrier.includes("LINE")) days = rules.sb;
  else if (e.carrier.includes("Rakuten")) days = rules.rk;
  const d = new Date(base);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split("T")[0];
}

// 描画
function render() {
  tableBody.innerHTML = "";
  const q = searchInput.value.toLowerCase();
  const fs = filterStatus.value;

  let sum = { device:0, cb:0, resale:0, referral:0, keep:0, extras:0, profit:0 };

  entries.forEach((e, idx) => {
    // フィルタ
    if (fs !== "all" && e.status !== fs) return;
    if (q && !(String(e.phone)+String(e.device)+String(e.carrier)+String(e.memo)).toLowerCase().includes(q)) return;

    const profit = calcProfit(e);
    const transferDate = calcTransferDate(e);

    sum.device += Number(e.deviceCost);
    sum.cb += Number(e.cashback);
    sum.resale += Number(e.resale);
    sum.referral += Number(e.referral);
    sum.keep += Number(e.monthly) * Number(e.months);
    sum.extras += Number(e.extras);
    sum.profit += profit;

    const tr = document.createElement("tr");
    if (e.status === "active" && transferDate && new Date(transferDate) <= new Date()) {
      tr.classList.add("highlight");
    }
    tr.innerHTML = `
      <td class="nowrap">
        <button onclick="editEntry(${idx})">編集</button>
        <button onclick="deleteEntry(${idx})">削除</button>
      </td>
      <td>${e.contractDate||""}</td>
      <td>${transferDate||""}</td>
      <td>${e.phone||""}</td>
      <td>${e.carrier||""}</td>
      <td>${e.device||""}</td>
      <td class="right mono">${e.deviceCost}</td>
      <td class="right mono">${e.cashback}</td>
      <td class="right mono">${e.resale}</td>
      <td class="right mono">${e.referral}</td>
      <td class="right mono">${Number(e.monthly) * Number(e.months)}</td>
      <td class="right mono">${e.extras}</td>
      <td class="right mono">${profit}</td>
      <td>${e.status}</td>
      <td>${e.cancelDate||""}</td>
      <td>${e.memo||""}</td>
    `;
    tableBody.appendChild(tr);
  });

  document.getElementById("sumDevice").textContent = sum.device;
  document.getElementById("sumCb").textContent = sum.cb;
  document.getElementById("sumResale").textContent = sum.resale;
  document.getElementById("sumReferral").textContent = sum.referral;
  document.getElementById("sumKeep").textContent = sum.keep;
  document.getElementById("sumExtras").textContent = sum.extras;
  document.getElementById("sumProfit").textContent = sum.profit;
}

// 編集
window.editEntry = (i) => {
  const e = entries[i];
  for (let k in e) {
    const el = document.getElementById(k);
    if (el) el.value = e[k];
  }
  document.getElementById("id").value = i;
  document.getElementById("formTitle").textContent = "編集";
};

// 削除
window.deleteEntry = (i) => {
  if (confirm("削除しますか？")) {
    entries.splice(i,1);
    save(); render();
  }
};

// 送信
form.addEventListener("submit", ev => {
  ev.preventDefault();
  const obj = {};
  ["id","contractDate","phone","carrier","device","deviceCost","cashback","resale","referral","monthly","months","extras","status","cancelDate","memo"].forEach(id=>{
    obj[id] = document.getElementById(id).value;
  });

  // idを数値化、新規はnull
  const idVal = obj.id !== "" ? Number(obj.id) : null;
  delete obj.id;

  // 数値変換
  ["deviceCost","cashback","resale","referral","monthly","months","extras"].forEach(f=>{
    obj[f] = Number(obj[f]) || 0;
  });

  if (idVal === null) {
    entries.push(obj);
  } else {
    entries[idVal] = obj;
  }

  save();
  render();
  form.reset();
  document.getElementById("id").value = "";
  document.getElementById("formTitle").textContent="新規／編集 入力";
});

// リセット
resetBtn.addEventListener("click", ()=>{
  form.reset();
  document.getElementById("id").value = "";
  document.getElementById("formTitle").textContent="新規／編集 入力";
});

// CSV出力（Excelで文字化けしないようShift_JISに変換）
exportCsvBtn.addEventListener("click", () => {
  let csv = "契約日,転出可能日,番号,キャリア,端末,購入,CB,売却,紹介,維持費合計,その他,実質利益,状況,解約日,メモ\n";
  entries.forEach(e => {
    csv += `${e.contractDate},${calcTransferDate(e)},${e.phone},${e.carrier},${e.device},${e.deviceCost},${e.cashback},${e.resale},${e.referral},${Number(e.monthly)*Number(e.months)},${e.extras},${calcProfit(e)},${e.status},${e.cancelDate},${e.memo}\n`;
  });

  // UTF-8 → Shift_JIS に変換
  const sjisArray = Encoding.convert(Encoding.stringToCode(csv), {to:"SJIS", type:"array"});
  const blob = new Blob([new Uint8Array(sjisArray)], {type:"text/csv"});
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mnp.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// CSVインポート（Shift_JIS対応）
importCsvInput.addEventListener("change", ev=>{
  const file = ev.target.files[0]; 
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    // Shift_JIS を UTF-8 に変換
    const sjisArray = new Uint8Array(reader.result);
    const text = new TextDecoder("shift_jis").decode(sjisArray);

    const lines = text.split(/\r?\n/).slice(1);
    lines.forEach(line=>{
      if(!line.trim()) return;
      const [contractDate,,phone,carrier,device,deviceCost,cashback,resale,referral,keep,extras,,status,cancelDate,memo] = line.split(",");
      entries.push({
        contractDate, phone, carrier, device,
        deviceCost, cashback, resale, referral,
        monthly: 0, months: 0,
        extras, status, cancelDate, memo
      });
    });
    save(); render();
  };
  // 配列バッファとして読み込む
  reader.readAsArrayBuffer(file);
});


// JSONバックアップ
downloadJsonBtn.addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(entries)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="mnp.json";a.click();URL.revokeObjectURL(url);
});

// JSON復元
uploadJsonInput.addEventListener("change", ev=>{
  const file = ev.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    entries = JSON.parse(reader.result);
    save(); render();
  };
  reader.readAsText(file);
});

// 全削除
wipeAllBtn.addEventListener("click", ()=>{
  if(confirm("全データを削除しますか？")){
    entries=[]; save(); render();
  }
});

// 検索とフィルタ
searchInput.addEventListener("input", render);
filterStatus.addEventListener("change", render);

// ルール変更
Object.keys(ruleInputs).forEach(k=>{
  ruleInputs[k].addEventListener("input", ()=>{
    rules[k]=Number(ruleInputs[k].value);
    render();
  });
});

// 初期描画
render();
