// Salvadanaio PWA – gestione locale con localStorage
const $ = (sel) => document.querySelector(sel);

const state = {
  movimenti: JSON.parse(localStorage.getItem('movimenti') || '[]'),
  goal: JSON.parse(localStorage.getItem('goal') || 'null')
};

function save() {
  localStorage.setItem('movimenti', JSON.stringify(state.movimenti));
}

function saveGoal() {
  localStorage.setItem('goal', JSON.stringify(state.goal));
}

function euro(n) {
  return (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function monthKey(d) {
  return d.slice(0,7); // YYYY-MM
}

function refresh() {
  // saldo totale
  const saldo = state.movimenti.reduce((acc, m) => acc + (m.tipo === 'entrata' ? m.importo : -m.importo), 0);
  $('#saldo-pill').textContent = `Saldo: ${euro(saldo)}`;
  $('#saldo-totale').textContent = euro(saldo);

  // filtro mese
  const mk = $('#mese-filtro').value || monthKey(todayISO());
  const meseMov = state.movimenti.filter(m => monthKey(m.data) === mk);

  const entrate = meseMov.filter(m => m.tipo === 'entrata').reduce((a, m)=>a+m.importo, 0);
  const spese = meseMov.filter(m => m.tipo === 'spesa').reduce((a, m)=>a+m.importo, 0);
  const saldoMese = entrate - spese;

  $('#entrate-mese').textContent = euro(entrate);
  $('#spese-mese').textContent = euro(spese);
  $('#saldo-mese').textContent = euro(saldoMese);

  // tabella
  const tbody = $('#tabella tbody');
  tbody.innerHTML = '';
  meseMov.sort((a,b)=> a.data.localeCompare(b.data));
  meseMov.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.data}</td>
      <td>${m.tipo === 'entrata' ? 'Entrata' : 'Spesa'}</td>
      <td>${m.categoria}</td>
      <td>${m.descrizione || ''}</td>
      <td class="right">${euro(m.importo)}</td>
      <td class="right"><button class="ghost" data-id="${m.id}">Elimina</button></td>`;
    tbody.appendChild(tr);
  });

  // goal
  const gi = $('#goal-info');
  if (state.goal) {
    const { importo, data } = state.goal;
    const oggi = new Date();
    const fine = new Date(data);
    const giorniRestanti = Math.ceil( (fine - oggi) / (1000*60*60*24) );
    const daMettereDaParte = Math.max(importo - saldo, 0);
    const alGiorno = giorniRestanti > 0 ? daMettereDaParte / giorniRestanti : daMettereDaParte;
    gi.style.display = 'block';
    gi.innerHTML = `Obiettivo: <b>${euro(importo)}</b> entro <b>${data}</b>.<br>
                    Mancano circa <b>${giorniRestanti}</b> giorni: metti da parte ~ <b>${euro(alGiorno)}</b> al giorno.`;
  } else {
    gi.style.display = 'none';
  }
}

function suggestOnIncome(importo) {
  const tip = $('#tip');
  const suggerito = importo * 0.2;
  tip.style.display = 'block';
  tip.textContent = `Consiglio: metti da parte almeno ${euro(suggerito)} (20% di questa entrata).`;
  setTimeout(()=> tip.style.display = 'none', 5000);
}

function addMovimento() {
  const tipo = $('#tipo').value;
  const importo = parseFloat($('#importo').value);
  const categoria = $('#categoria').value;
  const data = $('#data').value || todayISO();
  const descrizione = $('#descrizione').value.trim();

  if (!importo || importo <= 0) { alert('Inserisci un importo valido.'); return; }

  const movimento = { id: crypto.randomUUID(), tipo, importo, categoria, data, descrizione };
  state.movimenti.push(movimento);
  save();
  refresh();
  if (tipo === 'entrata') suggestOnIncome(importo);

  // pulizia parziale
  $('#importo').value = '';
  $('#descrizione').value = '';
}

function delMovimento(id) {
  const i = state.movimenti.findIndex(m => m.id === id);
  if (i >= 0) {
    state.movimenti.splice(i,1);
    save();
    refresh();
  }
}

function exportCSV() {
  const rows = [['data','tipo','categoria','descrizione','importo']]
    .concat(state.movimenti.map(m => [m.data, m.tipo, m.categoria, (m.descrizione||'').replace(/,/g,';'), String(m.importo).replace('.',',')]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'salvadanaio_movimenti.csv';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function init() {
  $('#aggiungi').addEventListener('click', addMovimento);
  $('#pulisci').addEventListener('click', () => { $('#importo').value=''; $('#descrizione').value=''; });
  $('#mese-filtro').addEventListener('change', refresh);
  $('#esporta').addEventListener('click', exportCSV);

  $('#tabella').addEventListener('click', (e) => {
    if (e.target.matches('button[data-id]')) {
      delMovimento(e.target.getAttribute('data-id'));
    }
  });

  // default month
  $('#mese-filtro').value = monthKey(todayISO());

  // goal
  $('#salva-goal').addEventListener('click', () => {
    const importo = parseFloat($('#goal-importo').value);
    const data = $('#goal-data').value;
    if (!importo || !data) { alert('Inserisci importo e scadenza.'); return; }
    state.goal = { importo, data };
    saveGoal();
    refresh();
  });

  refresh();
}

document.addEventListener('DOMContentLoaded', init);
