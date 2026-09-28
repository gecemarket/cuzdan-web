// 1. SUPABASE BİLGİLERİNİZ
const SUPABASE_URL = "https://ijmdrizpzfggmvnricde.supabase.co/rest/v1/"; 
const SUPABASE_ANON_KEY = "sb_publishable_hyJxzInEszidGUHRbPAJhg_apYW0_hu";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = {
  "Yiyecek & İçecek": { color: "#ea580c", icon: "🍴", subs: ["Yiyecek & İçecek", "Bar, kafe", "Market alışverişi", "Restoran, fast-food"] },
  "Alışveriş": { color: "#0284c7", icon: "🛍️", subs: ["Alışveriş", "Boş zaman", "Eczane, kozmetik", "Elektronik, aksesuar", "Ev, bahçe", "Evcil hayvanlar", "Hediyeler, mutluluklar", "Kıyafet & ayakkabı"] },
  "Konut": { color: "#f97316", icon: "🏠", subs: ["Konut", "Bakım, onarım", "Emlak sigortası", "Enerji, hizmetler", "Hizmetler", "Kira", "Konut kredisi"] },
  "Ulaşım": { color: "#64748b", icon: "🚌", subs: ["Ulaşım", "İş seyahatleri", "Taksi", "Toplu taşıma", "Uzak mesafe"] },
  "Araç": { color: "#c026d3", icon: "🚗", subs: ["Araç", "Yakıt", "Bakım", "Otopark", "Sigorta"] },
  "Yaşam & Eğlence": { color: "#84cc16", icon: "🎉", subs: ["Kültür, spor", "Tatil", "Abonelikler", "Hobiler"] },
  "Finansal giderler": { color: "#14b8a6", icon: "💳", subs: ["Banka ücretleri", "Vergiler", "Kredi faizi"] },
  "Yatırımlar": { color: "#ec4899", icon: "📈", subs: ["Hisse senedi", "Altın/Döviz", "Kripto", "Tasarruf"] },
  "Gelir": { color: "#eab308", icon: "💰", subs: ["Maaş, faturalar", "Hediyeler", "Yatırım geliri", "Ek kazanç"] },
  "Diğer": { color: "#6b7280", icon: "📦", subs: ["Diğer"] }
};

let selectedAccountId = null;
let currentModalType = 'expense';
let expenseChartInstance = null;

// Hata/Uyarı gösterme fonksiyonu (Ekrana basar)
function showToast(msg, isError = false) {
  let toast = document.getElementById('debug-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'debug-toast';
    toast.className = 'fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl text-xs font-semibold shadow-2xl transition duration-300';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.display = 'block';
  toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
  toast.style.color = '#ffffff';
  setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

async function loadData() {
  try {
    const { data: accounts, error: accErr } = await supabase.from('accounts').select('*').order('created_at');
    if (accErr) throw accErr;

    const { data: transactions, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (txErr) throw txErr;

    renderAccounts(accounts || []);
    renderDashboard(transactions || [], accounts || []);
  } catch (err) {
    showToast("Veri çekilemedi: " + (err.message || JSON.stringify(err)), true);
  }
}

function renderAccounts(accounts) {
  const grid = document.getElementById('accounts-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (accounts.length === 0) {
    grid.innerHTML = '<div class="col-span-2 text-xs text-slate-500 text-center py-2">Hesap bulunamadı.</div>';
  }

  accounts.forEach(acc => {
    const isSelected = selectedAccountId === acc.id;
    const card = document.createElement('div');
    card.onclick = () => filterAccount(acc.id);
    card.className = `p-3.5 rounded-2xl cursor-pointer transition border ${
      isSelected ? 'border-sky-400 bg-[#252733]' : 'border-[#282932] bg-[#1c1d24]'
    }`;
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-slate-300 font-medium">
        <span>${acc.name}</span>
        <span class="w-2 h-2 rounded-full" style="background-color: ${acc.color || '#3b82f6'}"></span>
      </div>
      <div class="text-base font-bold mt-1 text-white">
        ${acc.balance < 0 ? '-' : ''}₺${Math.abs(acc.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      </div>
    `;
    grid.appendChild(card);
  });

  const modalAccSelect = document.getElementById('modal-account');
  if (modalAccSelect) {
    modalAccSelect.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }
}

function filterAccount(id) {
  selectedAccountId = selectedAccountId === id ? null : id;
  loadData();
}

function renderDashboard(transactions, accounts) {
  const filtered = selectedAccountId 
    ? transactions.filter(t => t.account_id === selectedAccountId)
    : transactions;

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryTotals = {};

  filtered.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'expense') {
      totalExpense += amt;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
    } else {
      totalIncome += amt;
    }
  });

  const expTotalEl = document.getElementById('expense-total');
  if (expTotalEl) expTotalEl.innerText = '₺' + totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  
  renderChart(categoryTotals);

  const net = totalIncome - totalExpense;
  const netEl = document.getElementById('cashflow-net');
  if (netEl) {
    netEl.innerText = (net < 0 ? '-' : '+') + '₺' + Math.abs(net).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    netEl.className = net < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold';
  }

  const incTotEl = document.getElementById('income-total');
  const expTotLbl = document.getElementById('expense-total-label');
  if (incTotEl) incTotEl.innerText = '₺' + totalIncome.toLocaleString('tr-TR');
  if (expTotLbl) expTotLbl.innerText = '₺' + totalExpense.toLocaleString('tr-TR');

  const totalFlow = totalIncome + totalExpense;
  const incPercent = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50;
  const expPercent = totalFlow > 0 ? (totalExpense / totalFlow) * 100 : 50;
  const incBar = document.getElementById('income-bar');
  const expBar = document.getElementById('expense-bar');
  if (incBar) incBar.style.width = incPercent + '%';
  if (expBar) expBar.style.width = expPercent + '%';

  const listEl = document.getElementById('tx-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="text-center text-slate-500 py-4 text-xs">Henüz işlem yok.</div>';
    return;
  }

  filtered.slice(0, 15).forEach(t => {
    const isExp = t.type === 'expense';
    const cat = CATEGORIES[t.category] || { icon: '📦', color: '#64748b' };
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between py-2 border-b border-[#282932]/40 last:border-0';
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center text-base" style="background-color: ${cat.color}25; color: ${cat.color};">
          ${cat.icon}
        </div>
        <div>
          <div class="text-xs font-semibold text-white">${t.sub_category || t.category}</div>
          <div class="text-[11px] text-slate-400">${t.note || t.category}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs font-bold ${isExp ? 'text-rose-400' : 'text-emerald-400'}">
          ${isExp ? '-' : '+'}₺${parseFloat(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </div>
        <button onclick="deleteTx('${t.id}')" class="text-[10px] text-slate-500 hover:text-rose-400">Sil</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function renderChart(catTotals) {
  const chartCanvas = document.getElementById('expenseChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);
  const colors = labels.map(l => CATEGORIES[l]?.color || '#94a3b8');

  if (expenseChartInstance) expenseChartInstance.destroy();

  expenseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: data.length > 0 ? colors : ['#282932'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  const legendEl = document.getElementById('category-legend');
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) => `
      <span class="inline-flex items-center gap-1 text-slate-300">
        <span class="w-2 h-2 rounded-full" style="background-color: ${colors[i]}"></span>
        ${l}
      </span>
    `).join('');
  }
}

function openModal() {
  document.getElementById('tx-modal').classList.remove('hidden');
  initCategories();
}
function closeModal() {
  document.getElementById('tx-modal').classList.add('hidden');
}

function setModalType(type) {
  currentModalType = type;
  const exp = document.getElementById('modal-exp-btn');
  const inc = document.getElementById('modal-inc-btn');
  if (type === 'expense') {
    exp.className = 'py-2.5 rounded-xl font-semibold text-xs bg-rose-500 text-white';
    inc.className = 'py-2.5 rounded-xl font-semibold text-xs text-slate-400';
  } else {
    inc.className = 'py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 text-white';
    exp.className = 'py-2.5 rounded-xl font-semibold text-xs text-slate-400';
  }
}

function initCategories() {
  const catSelect = document.getElementById('modal-category');
  if (!catSelect) return;
  catSelect.innerHTML = Object.keys(CATEGORIES).map(c => `<option value="${c}">${CATEGORIES[c].icon} ${c}</option>`).join('');
  updateSubCategories();
}

function updateSubCategories() {
  const cat = document.getElementById('modal-category').value;
  const subSelect = document.getElementById('modal-subcategory');
  if (!subSelect) return;
  const subs = CATEGORIES[cat]?.subs || [cat];
  subSelect.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function submitModalTransaction() {
  const amtInput = document.getElementById('modal-amount');
  const amt = parseFloat(amtInput.value);
  if (!amt || amt <= 0) {
    showToast('Lütfen geçerli bir tutar yazın!', true);
    return;
  }

  const accountId = document.getElementById('modal-account').value;
  if (!accountId) {
    showToast('Önce bir hesap seçmelisiniz / hesap yok!', true);
    return;
  }

  const category = document.getElementById('modal-category').value;
  const subCategory = document.getElementById('modal-subcategory').value;
  const note = document.getElementById('modal-note').value;

  const btn = document.getElementById('modal-save-btn');
  btn.innerText = 'Kaydediliyor...';
  btn.disabled = true;

  try {
    // 1. İşlemi ekle
    const { error: insErr } = await supabase.from('transactions').insert([{
      account_id: accountId,
      type: currentModalType,
      amount: amt,
      category: category,
      sub_category: subCategory,
      note: note
    }]);

    if (insErr) throw insErr;

    // 2. Bakiyeyi güncelle
    const { data: acc, error: selErr } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
    if (selErr) throw selErr;

    const currentBal = parseFloat(acc.balance) || 0;
    const newBal = currentModalType === 'expense' ? (currentBal - amt) : (currentBal + amt);

    const { error: updErr } = await supabase.from('accounts').update({ balance: newBal }).eq('id', accountId);
    if (updErr) throw updErr;

    showToast('İşlem başarıyla kaydedildi!');
    amtInput.value = '';
    document.getElementById('modal-note').value = '';
    closeModal();
    loadData();
  } catch (err) {
    showToast("HATA: " + (err.message || JSON.stringify(err)), true);
  } finally {
    btn.innerText = 'Kaydet';
    btn.disabled = false;
  }
}

async function deleteTx(id) {
  if (confirm('İşlemi silmek istiyor musunuz?')) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) showToast('Silme hatası: ' + error.message, true);
    else {
      showToast('Kayıt silindi.');
      loadData();
    }
  }
}

// Realtime
try {
  supabase.channel('wallet-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => loadData())
    .subscribe();
} catch (e) {
  console.warn(e);
}

loadData();
