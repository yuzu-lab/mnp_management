/*!
 * MNP Management Tool
 * (c) 2025 yuzu (@yuzuuuuyyzz)
 * Created: 2025-08-29
 * Watermark: MNP-${Math.random().toString(36).substr(2,9)}-${Date.now()}
 * All rights reserved.
 * Instance: ${btoa(Date.now() + Math.random()).slice(0,12)}
 */

// 盗用防止強化：複数箇所にランダム透かし埋め込み
const watermarks = [
  `MNP-${btoa(Date.now() + Math.random()).slice(0,12)}`,
  `yuzu-${Date.now().toString(36)}`,
  `tool-${Math.random().toString(36).substr(2,9)}`
];

// データ保存先キー
const STORAGE_KEY = "mnp_entries";

// 転出可能日ルール
let rules = {
  docomo: 182,
  au: 215,
  sb: 215,
  rk: 215,
  jci: 0,     // 日本通信
  mineo: 0,   // mineo
  iij: 0,     // IIJmio
  aeon: 0,    // イオンモバイル
  povo: 0,    // povo
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
  jci: document.getElementById("ruleJci"),
  mineo: document.getElementById("ruleMineo"),
  iij: document.getElementById("ruleIij"),
  aeon: document.getElementById("ruleAeon"),
  povo: document.getElementById("rulePovo"),
  other: document.getElementById("ruleOther"),
};

// データ管理
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// 盗用防止：ローカルストレージにも透かし
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === STORAGE_KEY) {
    try {
      const data = JSON.parse(value);
      data._meta = {
        tool: "yuzu_mnp_manager",
        created: Date.now(),
        id: watermarks[0]
      };
      value = JSON.stringify(data);
    } catch(e) {
      // JSONパースエラー時はそのまま保存
    }
  }
  return originalSetItem.call(this, key, value);
};

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// 実質利益計算
function calcProfit(e) {
  const months = Number(e.months);
  return (Number(e.cashback) + Number(e.resale)) -
    (Number(e.firstMonthCost) + 
     Number(e.deviceCost) + 
     (Number(e.deviceCostInstallment) * months) + 
     (Number(e.monthly) * (months > 0 ? months - 1 : 0)) + 
     Number(e.extras) + 
     Number(e.referral));
}

// 転出可能日
function calcTransferDate(e) {
  const base = new Date(e.contractDate);
  if (isNaN(base)) return "";
  
  let days = rules.other;
  const carrier = e.carrier.toLowerCase();
  
  if (carrier.includes("docomo") || carrier.includes("ahamo")) days = rules.docomo;
  else if (carrier.includes("au") || carrier.includes("uq")) days = rules.au;
  else if (carrier.includes("soft") || carrier.includes("y") || carrier.includes("line")) days = rules.sb;
  else if (carrier.includes("rakuten")) days = rules.rk;
  else if (carrier.includes("日本通信")) days = rules.jci;
  else if (carrier.includes("mineo")) days = rules.mineo;
  else if (carrier.includes("iij")) days = rules.iij;
  else if (carrier.includes("イオン") || carrier.includes("aeon")) days = rules.aeon;
  else if (carrier.includes("povo")) days = rules.povo;
  
  const d = new Date(base);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split("T")[0];
}

// 描画
function render() {
  tableBody.innerHTML = "";
  const q = searchInput.value.toLowerCase();
  const fs = filterStatus.value;

  let sum = { device:0, deviceInstallment:0, firstMonth:0, cb:0, resale:0, referral:0, keep:0, extras:0, profit:0 };

  entries.forEach((e, idx) => {
    // フィルタ
    if (fs !== "all" && e.status !== fs) return;
    if (q && !(String(e.phone)+String(e.device)+String(e.carrier)+String(e.shop)+String(e.memo)).toLowerCase().includes(q)) return;

    const profit = calcProfit(e);
    const transferDate = calcTransferDate(e);

    sum.device += Number(e.deviceCost);
    sum.deviceInstallment += Number(e.deviceCostInstallment);
    sum.firstMonth += Number(e.firstMonthCost);
    sum.cb += Number(e.cashback);
    sum.resale += Number(e.resale);
    sum.referral += Number(e.referral);
    sum.keep += e.monthly * (e.months > 0 ? e.months - 1 : 0);
    sum.extras += e.extras;
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
      <td>${e.shop||""}</td>
      <td>${e.device||""}</td>
      <td class="right mono">${e.deviceCost||0}</td>
      <td class="right mono">${e.deviceCostInstallment||0}</td>
      <td class="right mono">${e.firstMonthCost||0}</td>
      <td class="right mono">${e.cashback||0}</td>
      <td class="right mono">${e.resale||0}</td>
      <td class="right mono">${e.referral||0}</td>
      <td class="right mono">${e.monthly * (e.months > 0 ? e.months - 1 : 0)}</td>
      <td class="right mono">${e.extras||0}</td>
      <td class="right mono">${profit}</td>
      <td>${e.status}</td>
      <td>${e.cancelDate||""}</td>
      <td>${e.returnDate||""}</td>
      <td>${e.memo||""}</td>
    `;
    tableBody.appendChild(tr);
  });

  const updateElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  updateElement("sumDevice", sum.device);
  updateElement("sumDeviceInstallment", sum.deviceInstallment);
  updateElement("sumFirstMonth", sum.firstMonth);
  updateElement("sumCb", sum.cb);
  updateElement("sumResale", sum.resale);
  updateElement("sumReferral", sum.referral);
  updateElement("sumKeep", sum.keep);
  updateElement("sumExtras", sum.extras);
  updateElement("sumProfit", sum.profit);
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
  ["id","contractDate","phone","carrier","shop","device","deviceCost","deviceCostInstallment","firstMonthCost","cashback","resale","referral","monthly","months","extras","status","cancelDate","returnDate","memo"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) obj[id] = el.value;
  });

  // idを数値化、新規はnull
  const idVal = obj.id !== "" ? Number(obj.id) : null;
  delete obj.id;

  // 数値変換
  ["deviceCost","deviceCostInstallment","firstMonthCost","cashback","resale","referral","monthly","months","extras"].forEach(f=>{
    obj[f] = Number(obj[f]) || 0;
  });

  // 数値項目の型変換とバリデーション
  ["deviceCost","deviceCostInstallment","firstMonthCost","cashback","resale","referral","monthly","months","extras"].forEach(f=>{
    obj[f] = Number(obj[f]) || 0;
    // 月数がマイナスにならないように
    if (f === 'months' && obj[f] < 0) obj[f] = 0;
  });

  console.log("保存するデータ:", obj); // デバッグ用

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
  let csv = "契約日,転出可能日,番号,キャリア,店舗,端末,購入(一括),購入(分割),初月費用,CB,売却,紹介,維持費合計,その他,実質利益,状況,解約日,返却予定,メモ\n";
  entries.forEach(e => {
    csv += `${e.contractDate},${calcTransferDate(e)},${e.phone},${e.carrier},${e.shop},${e.device},${e.deviceCost},${e.deviceCostInstallment},${e.firstMonthCost},${e.cashback},${e.resale},${e.referral},${Number(e.monthly)*(Number(e.months)>0?Number(e.months)-1:0)},${e.extras},${calcProfit(e)},${e.status},${e.cancelDate},${e.returnDate},${e.memo}\n`;
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
      const [
        contractDate,      // 契約日
        _transferDate,     // 転出可能日（計算値なので無視）
        phone,            // 番号
        carrier,          // キャリア
        shop,             // 店舗
        device,           // 端末
        deviceCost,       // 購入(一括)
        deviceCostInstallment, // 購入(分割)
        firstMonthCost,   // 初月費用
        cashback,         // CB
        resale,           // 売却
        referral,         // 紹介
        _keep,            // 維持費合計（計算値なので無視）
        extras,           // その他
        _profit,          // 実質利益（計算値なので無視）
        status,           // 状況
        cancelDate,       // 解約日
        returnDate,       // 返却予定
        memo             // メモ
      ] = line.split(",");
      
      entries.push({
        contractDate,
        phone,
        carrier,
        shop,
        device,
        deviceCost: Number(deviceCost) || 0,
        deviceCostInstallment: Number(deviceCostInstallment) || 0,
        firstMonthCost: Number(firstMonthCost) || 0,
        cashback: Number(cashback) || 0,
        resale: Number(resale) || 0,
        referral: Number(referral) || 0,
        monthly: 0,
        months: 0,
        extras: Number(extras) || 0,
        status,
        cancelDate,
        returnDate,
        memo
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

// 盗用防止：HTMLコメントに埋め込み（気づきにくい）
document.head.insertAdjacentHTML('beforeend', 
  `<!-- Auth: yuzu@${Date.now()} Instance: ${watermarks[0]} -->`);

// 盗用防止：CSS疑似要素での透かし（見た目に影響なし）
const styleEl = document.createElement('style');
styleEl.textContent = `
  body::before {
    content: "${watermarks[1]}";
    position: absolute;
    left: -9999px;
    opacity: 0;
  }
`;
document.head.appendChild(styleEl);

// 盗用防止：ダミーコードの挿入（動作に影響なし）
if (false) {
  console.log("Dummy code - yuzu watermark protection");
  const dummyVar = "yuzu_protection_" + Date.now();
}

// 盗用防止：実行時間をログに記録（使用状況トラッキング）
console.log(`%cTool initialized by yuzu at ${new Date().toISOString()}
Instance ID: ${watermarks[2]}
Browser: ${navigator.userAgent.split(' ')[0]}`, 
"color: #333; font-size: 10px;");

// 盗用防止：定期的な整合性チェック（改変検知）
setInterval(() => {
  const expectedElements = ['entryForm', 'table', 'loginScreen'];
  const missing = expectedElements.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.warn(`Integrity check failed - Missing: ${missing.join(',')}`);
  }
}, 30000);

// 盗用防止：右クリック・F12無効化（完全ではないが初心者には効果的）
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
    console.log("Developer tools access attempt logged");
  }
});

// 盗用防止：アクセス時間の記録
window.addEventListener('load', () => {
  const accessLog = JSON.parse(localStorage.getItem('yuzu_access_log') || '[]');
  accessLog.push({
    timestamp: Date.now(),
    url: location.href,
    instance: watermarks[0]
  });
  // 最新10件のみ保持
  if (accessLog.length > 10) accessLog.splice(0, accessLog.length - 10);
  localStorage.setItem('yuzu_access_log', JSON.stringify(accessLog));
});

// 初期描画
render();

// 透かし情報をコンソールに埋め込む
console.log(
  `%c⚡ MNP Management Tool %c
開発者向け情報:
このコードは著作権で保護されています。
インスタンスID: ${btoa(Date.now())}
実行環境: ${navigator.userAgent}
タイムスタンプ: ${new Date().toISOString()}
Author: yuzu (@yuzu)
License: Proprietary - Unauthorized use prohibited`,
  "color: #fff; background: #333; padding: 5px; border-radius: 3px;",
  "color: #666;"
);