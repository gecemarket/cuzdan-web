// SUPABASE BAĞLANTI BİLGİLERİNİZ:
const SUPABASE_URL = "https://ijmdrizpzfggmvnricde.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_hyJxzInEszidGUHRbPAJhg_apYW0_hu";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentType = 'expense';

function setType(type) {
  currentType = type;
  const expBtn = document.getElementById('type-expense');
  const incBtn = document.getElementById('type-income');
  if (type === 'expense') {
    expBtn.className = 'py-2 text-sm font-semibold rounded-xl bg-rose-500 text-white transition active:scale-95 shadow';
    incBtn.className = 'py-2 text-sm font-semibold rounded-xl text-slate-400 transition active:scale-95';
  } else {
    incBtn.className = 'py-2 text-sm font-semibold rounded-xl bg-emerald-500 text-white transition active:scale-95 shadow';
    expBtn.className = 'py-2 text-sm font-semibold rounded-xl text-slate-400 transition active:scale-95';
  }
}

// Verileri Listeleme ve Bakiye Hesaplama
async function fetchTransactions() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Hata:', error);
    return;
  }

  const listContainer = document.getElementById('tx-list');
  let total = 0;
  listContainer.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    listContainer.innerHTML = '<div class="text-center text-slate-500 py-6 text-sm bg-slate-800/40 rounded-2xl border border-slate-800">Henüz bir hareket eklenmedi.</div>';
  } else {
    transactions.forEach((tx) => {
      const isExpense = tx.type === 'expense';
      const amountVal = parseFloat(tx.amount);
      total += isExpense ? -amountVal : amountVal;

      const el = document.createElement('div');
      el.className = 'bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between shadow-sm';
      el.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${isExpense ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}">
            ${isExpense ? '↓' : '↑'}
          </div>
          <div>
            <div class="text-sm font-medium text-slate-100">${tx.category}</div>
            <div class="text-xs text-slate-400">${tx.note || 'Açıklama yok'}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}">
            ${isExpense ? '-' : '+'}₺${amountVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button onclick="deleteTransaction('${tx.id}')" class="text-xs text-slate-500 hover:text-rose-400 transition mt-0.5">Sil</button>
        </div>
      `;
      listContainer.appendChild(el);
    });
  }

  const totalEl = document.getElementById('total-balance');
  const formattedTotal = Math.abs(total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  totalEl.innerText = (total < 0 ? '-₺' : '₺') + formattedTotal;
}

// Yeni İşlem Kaydetme
async function saveTransaction() {
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');
  const noteInput = document.getElementById('note');
  const saveBtn = document.getElementById('save-btn');

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) {
    alert('Lütfen geçerli bir tutar yazın.');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerText = 'Kaydediliyor...';

  const { error } = await supabase.from('transactions').insert([
    {
      type: currentType,
      amount: amount,
      category: categorySelect.value,
      note: noteInput.value
    }
  ]);

  saveBtn.disabled = false;
  saveBtn.innerText = 'Kaydet';

  if (error) {
    alert('Kayıt başarısız: ' + error.message);
  } else {
    amountInput.value = '';
    noteInput.value = '';
    fetchTransactions();
  }
}

// İşlem Silme
async function deleteTransaction(id) {
  if (confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
    await supabase.from('transactions').delete().eq('id', id);
    fetchTransactions();
  }
}

// Canlı Senkronizasyon (İki cihaz arası anlık veri aktarımı)
supabase
  .channel('realtime-transactions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
    fetchTransactions();
  })
  .subscribe();

// Sayfa yüklendiğinde çalıştır
fetchTransactions();
