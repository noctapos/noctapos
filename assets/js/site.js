/* ==========================================================
   NoctaPOS site.js  (gabungan: nav mobile + app + compro-v2 + pages)
   ========================================================== */

/* ---------- NAV MOBILE: tombol hamburger + panel menu (dibuat otomatis dari .nav-links & .nav-actions) ---------- */
(function () {
  'use strict';
  var wrap = document.querySelector('.header-wrap'), bar = document.querySelector('.navbar');
  if (!wrap || !bar) return;
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Buka menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'navSheet');
  btn.innerHTML = '<span></span><span></span><span></span>';
  var sheet = document.createElement('div');
  sheet.className = 'nav-sheet'; sheet.id = 'navSheet'; sheet.hidden = true;
  function copy(src, cls) {
    if (!src) return;
    var c = src.cloneNode(true); c.className = cls; c.removeAttribute('id');
    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
    sheet.appendChild(c);
  }
  copy(bar.querySelector('.nav-links'), 'nav-sheet-links');
  copy(bar.querySelector('.nav-actions'), 'nav-sheet-acts');
  bar.appendChild(btn); wrap.appendChild(sheet);
  function set(v) {
    sheet.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    btn.setAttribute('aria-label', v ? 'Tutup menu' : 'Buka menu'); btn.classList.toggle('on', v);
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(sheet.hidden); });
  sheet.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (!sheet.hidden && !wrap.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { set(false); btn.focus(); } });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();

/* ---------- app ---------- */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const rp=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const num=el=>parseInt(el.textContent.replace(/\D/g,''),10)||0;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* reveal */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('.rv').forEach(el=>io.observe(el));

/* Slider sebelum/sesudah */
const rng=$('#rng'),ba=$('#ba');
if(rng&&ba){const set=()=>ba.style.setProperty('--x',rng.value+'%');rng.addEventListener('input',set);set()}

/* HERO: tablet UI Nocta + nota */
const hList=$('#heroTxList'),hPaper=$('#heroPaperLines'),paper=$('#heroPaper');
if(hList&&hPaper){
  let cash=12450000,bank=25000000,i=0,timer=null;
  const fmt=n=>n.toLocaleString('id-ID');
  const set=()=>{$('#heroCashVal').textContent=rp(cash);$('#heroBankVal').textContent=rp(bank);$('#rpCash').textContent=fmt(cash);$('#rpBank').textContent=fmt(bank)};
  set();
  const EV=[['Tarik Tunai BRI',1000000,'tarik','JASA'],['Pulsa Tsel 10K',12000,'jual','TOKEN'],['Token PLN 50K',52000,'jual','TOKEN'],['Setor Tunai BRI',500000,'setor','JASA']];
  const run=()=>{
    const [name,amt,mode,tag]=EV[i++%EV.length];
    if(mode==='jual')cash+=amt;else if(mode==='tarik'){cash-=amt;bank+=amt}else{cash+=amt;bank-=amt}
    set();const g=mode!=='tarik',d=new Date(),t=String(d.getHours()).padStart(2,'0')+'.'+String(d.getMinutes()).padStart(2,'0')+' WIB';
    const it=document.createElement('div');it.className='nx-tx new';
    it.innerHTML='<div class="ico'+(g?' g':'')+'">'+(g?'+':'\u2212')+'</div><div class="m"><span class="nx-chip"></span><span class="nm"></span><small></small></div><div class="a'+(g?' g':'')+'"></div>';
    $('.nx-chip',it).textContent=tag;$('.nm',it).textContent=name;$('small',it).textContent=t;$('.a',it).textContent=(g?'+':'\u2212')+'Rp '+fmt(amt);
    hList.prepend(it);while(hList.children.length>3)hList.lastChild.remove();
    const row=document.createElement('div');row.className='rp-rr new';row.innerHTML='<span></span><span></span>';
    row.firstChild.textContent=name;row.lastChild.textContent=fmt(amt);hPaper.append(row);
    while(hPaper.children.length>3)hPaper.firstChild.remove();
    if(!reduce){const st=$('#rpStamp');paper.style.animation='none';st.style.animation='none';void paper.offsetWidth;
      paper.style.animation='rpfeed 2s steps(14,end) forwards';st.style.animation='rpstamp .3s 2.1s cubic-bezier(.3,1.4,.6,1) forwards'}
  };
  $('#nxHeroBtn').addEventListener('click',()=>{run();clearInterval(timer);timer=null});
  if(!reduce){timer=setInterval(run,7000);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(timer);timer=null}else if(!timer)timer=setInterval(run,7000)})}
}

/* Scene 07:00 - kulakan */
const ra=$('.restock-alert');
if(ra){
  ra.classList.add('act');ra.setAttribute('role','button');ra.tabIndex=0;
  const go=()=>{const it=$('.inv-item'),bar=$('.inv-bar',it),b=$('b',it);
    b.textContent='48 (Aman)';b.style.color='';bar.classList.remove('warn');bar.firstElementChild.style.setProperty('--w','90%');
    ra.firstElementChild.textContent='Kulakan 40 pcs Pulsa Tsel 10K dicatat. Stok kembali aman.';ra.lastElementChild.textContent='SELESAI'};
  ra.addEventListener('click',go,{once:true});ra.addEventListener('keydown',e=>{if(e.key==='Enter')go()},{once:true});
  ra.firstElementChild.textContent='Rekomendasi Kulakan: ketuk untuk kulakan 40 pcs Pulsa Tsel 10K.';
}
/* Scene 11:30 - tarik tunai */
const bt=$('#btnTarik'),kk=$('#kk'),kb=$('#kb');
if(bt)bt.addEventListener('click',()=>{const k=num(kk)-500000,b=num(kb)+500000;
  if(k<0){bt.textContent='Kas laci tidak cukup';return}
  kk.textContent=rp(k);kb.textContent=rp(b);bt.textContent='Tercatat. Total tetap Rp 7.770.000';bt.disabled=true;setTimeout(()=>{bt.disabled=false;bt.textContent='Catat tarik tunai Rp 500.000'},2200)});
/* Scene 15:10 - offline POS */
const pos=$('#pos');
if(pos){
  let on=true,cnt=0,sum=0,queue=0;const log=$('#log');
  $('#sw').addEventListener('click',e=>{on=!on;pos.classList.toggle('off',!on);e.currentTarget.setAttribute('aria-pressed',on);
    $('#swt').textContent='Sinyal Konter: '+(on?'ON':'OFF');
    $('#stat').textContent=on?(queue?queue+' transaksi tersinkron':'Online & Tersinkron'):'Offline \u00B7 tersimpan di perangkat';
    if(on)queue=0});
  $$('#items button').forEach(x=>x.addEventListener('click',()=>{
    if(!cnt)log.innerHTML='';cnt++;sum+=+x.dataset.v;if(!on)queue++;
    const r=document.createElement('div');r.className='e';r.innerHTML='<span></span><span></span>';
    r.firstChild.textContent=x.dataset.n+(on?'':' (antre sinkron)');r.lastChild.textContent=rp(+x.dataset.v);log.prepend(r);
    $('#cnt').textContent=cnt+' transaksi';$('#sum').textContent=rp(sum)}));
}
/* Scene 21:45 - tutup kas */
const ti=$('#tutupIn');
if(ti)ti.addEventListener('input',()=>{const d=num(ti)-(+ti.dataset.sys),r=$('#tutupRes');
  r.lastElementChild.style.color=d===0?'var(--em)':'#B47800';
  r.lastElementChild.textContent=d===0?'Rp 0 \u00B7 COCOK':(d>0?'Lebih ':'Kurang ')+rp(Math.abs(d))});

/* Scene 07:00 - analisis AI & kulakan */
const bAI=$('#btnAI');
if(bAI){bAI.addEventListener('click',()=>{$('#aiBox').hidden=false;bAI.hidden=true});
  $('#btnKul').addEventListener('click',e=>{$('#stTsel').textContent='48';$('#stTsel').className='ok';$('#stMen').textContent='0';$('#stMen').style.color='#10a974';e.currentTarget.textContent='Kulakan dicatat. Stok aman.';e.currentTarget.disabled=true})}
/* Scene 11:30 - BRILink */
const bGo=$('#bGo');
if(bGo){let laci=12450000,bank=25000000;
  bGo.addEventListener('click',()=>{const n=num($('#bNom')),a=num($('#bAdm'));
    if(!n||n>laci){$('#bRes').textContent='Nominal tidak valid atau melebihi kas laci.';return}
    laci=laci-n+a;bank+=n;$('#bLaci').textContent=laci.toLocaleString('id-ID');$('#bBank').textContent=bank.toLocaleString('id-ID');
    $('#bRes').textContent='Tercatat: laci '+rp(-n+a).replace('Rp -','-Rp ')+', saldo BRI +'+rp(n)+'. Biaya admin '+rp(a)+' masuk laci.'})}
/* Scene 18:00 - Telegram */
const tgSw=$('#tgSw');
if(tgSw){tgSw.addEventListener('click',()=>{const on=tgSw.getAttribute('aria-pressed')!=='true';tgSw.setAttribute('aria-pressed',on);$('#tgFeed').style.opacity=on?1:.3});
  $('#tgSim').addEventListener('click',()=>{if(tgSw.getAttribute('aria-pressed')!=='true')return;const b=document.createElement('div');b.className='tg-bubble warn';b.style.setProperty('--d','0s');b.innerHTML='<small><span>STOK KRITIS</span><span>17:55 WIB</span></small>Stok <b>Pulsa Telkomsel 10K</b> tersisa 8 transaksi.';$('#tgFeed').append(b)})}
/* Demo kasir mini - Kenapa NoctaPOS */
const kd=$('#kdItems');
if(kd){let tot=0,cnt=0;const kl=$('#kdLog'),ph='<div class="e"><span>Belum ada item. Ketuk produk di atas.</span></div>';
  $$('button',kd).forEach(b=>b.addEventListener('click',()=>{if(!cnt)kl.innerHTML='';tot+=+b.dataset.v;cnt++;$('#kdTotal').textContent=rp(tot);$('#kdRes').textContent=cnt+' item di struk.';
    const r=document.createElement('div');r.className='e';r.innerHTML='<span></span><span></span>';r.firstChild.textContent=$('small',b).textContent;r.lastChild.textContent=rp(+b.dataset.v);kl.prepend(r)}));
  $('#kdPay').addEventListener('click',()=>{if(!tot){$('#kdRes').textContent='Pilih produk dulu.';return}$('#kdRes').textContent='Struk tercetak. Kas laci +'+rp(tot)+' tercatat otomatis.';tot=0;cnt=0;kl.innerHTML=ph;$('#kdTotal').textContent='Rp 0'})}
/* Filter kategori blog */
$$('.chip').forEach(c=>c.addEventListener('click',()=>{$$('.chip').forEach(x=>x.classList.toggle('on',x===c));let n=0;
  $$('#blogGrid .am-card').forEach(a=>{const ok=c.dataset.cat==='all'||a.dataset.cat===c.dataset.cat;a.hidden=!ok;if(ok)n++});
  const big=$('.am-card.big');if(big)big.hidden=!(c.dataset.cat==='all'||big.dataset.cat===c.dataset.cat);$('#blogEmpty').hidden=n>0}));
})();

/* ---------- compro v2 ---------- */
/* NoctaPOS compro v2 — dimuat SETELAH app.js */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. STATUS BAR TABLET: jam, hari, tanggal, bulan sesuai waktu pengunjung ---------- */
  (function () {
    var t = document.querySelector('.tl-t'), d = document.querySelector('.tl-d');
    if (!t || !d) return;
    var H = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    var B = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    function p(x) { return (x < 10 ? '0' : '') + x; }
    function tick() {
      var n = new Date();
      t.textContent = p(n.getHours()) + '.' + p(n.getMinutes());
      d.textContent = H[n.getDay()] + ' ' + n.getDate() + ' ' + B[n.getMonth()];
    }
    tick(); setInterval(tick, 15000);
  })();

  /* ---------- 1. HERO: notifikasi ala iOS, muncul berurutan ---------- */
  (function () {
    var wrap = document.getElementById('iosWrap');
    if (!wrap || reduce) return; // reduced-motion: CSS menampilkan keduanya statis
    var notes = Array.prototype.slice.call(wrap.querySelectorAll('.ios-n'));
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function show(n) { n.classList.remove('out'); void n.offsetWidth; n.classList.add('show'); }
    function hide(n) {
      n.classList.add('out'); n.classList.remove('show');
      later(function () { n.classList.remove('out'); }, 600);
    }
    function cycle() {
      // notif 1 masuk -> tahan -> keluar, lalu notif 2 masuk -> tahan -> keluar -> jeda -> ulang
      later(function () { show(notes[0]); }, 1400);
      later(function () { hide(notes[0]); }, 5600);
      later(function () { show(notes[1]); }, 5950);
      later(function () { hide(notes[1]); }, 11400);
      later(cycle, 14000);
    }
    function stop() { timers.forEach(clearTimeout); timers = []; notes.forEach(function (n) { n.classList.remove('show', 'out'); }); }
    cycle();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!timers.length) cycle();
    });
  })();

  /* ---------- 2. MASALAH: bubble yang diklik memanjang di tempatnya ---------- */
  (function () {
    var stage = document.getElementById('pb');
    if (!stage) return;
    var items = Array.prototype.slice.call(stage.querySelectorAll('.pb-i'));
    var current = null;
    function close() {
      items.forEach(function (it) { it.classList.remove('on'); it.querySelector('.pb-b').setAttribute('aria-expanded', 'false'); });
      stage.classList.remove('open'); current = null;
    }
    function open(it) {
      items.forEach(function (x) {
        var on = x === it;
        x.classList.toggle('on', on);
        x.querySelector('.pb-b').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      stage.classList.add('open'); current = it;
    }
    items.forEach(function (it) {
      if (it.classList.contains('pbi2') || it.classList.contains('pbi4')) it.classList.add('rev');
      it.querySelector('.pb-b').addEventListener('click', function (e) { e.stopPropagation(); current === it ? close() : open(it); });
      it.querySelector('.pb-x').addEventListener('click', function (e) { e.stopPropagation(); close(); });
      it.querySelector('.pb-d').addEventListener('click', function (e) { e.stopPropagation(); });
    });
    stage.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) { var b = current.querySelector('.pb-b'); close(); b.focus(); }
    });
  })();

  /* ---------- 3. STORYBOARD: geser otomatis + kontrol manual ----------
     Perbaikan "kadang jalan, kadang stuck":
     - tidak ada lagi jeda otomatis saat kursor/fokus ada di papan (di HP, ketukan pertama membuat papan
       "terjeda" selamanya karena mouseleave/focusout tidak pernah terpicu)
     - tidak bergantung pada IntersectionObserver dengan threshold 35% dari papan yang tinggi
       (di layar pendek ambangnya tidak pernah tercapai); posisi dicek langsung dari frame gambar
     - tidak lagi mati otomatis saat OS memakai "reduce motion"; autoplay tetap jalan, transisi saja yang dimatikan CSS
     - satu-satunya cara menjeda adalah tombol jeda/putar */
  (function () {
    var board = document.getElementById('sb');
    if (!board) return;
    var slides = Array.prototype.slice.call(board.querySelectorAll('.sb-slide'));
    var steps = Array.prototype.slice.call(board.querySelectorAll('.sb-step'));
    var heads = steps.map(function (s) { return s.querySelector('.sb-hd'); });
    var frame = board.querySelector('.sb-frame');
    var nowEl = document.getElementById('sbNow'), timeEl = document.getElementById('sbTime');
    var playBtn = document.getElementById('sbPlay');
    var DUR = parseInt(board.dataset.duration, 10) || 7000;
    var n = slides.length, i = 0, elapsed = 0, last = 0, lastCheck = -1e9, raf = 0;
    var playing = true, inView = true;

    function pad(x) { return (x < 10 ? '0' : '') + x; }
    function go(k) {
      i = (k + n) % n; elapsed = 0;
      slides.forEach(function (s, j) { s.classList.toggle('on', j === i); s.setAttribute('aria-hidden', j === i ? 'false' : 'true'); });
      steps.forEach(function (s, j) {
        s.classList.toggle('on', j === i);
        if (j === i) heads[j].setAttribute('aria-current', 'step'); else heads[j].removeAttribute('aria-current');
        s.style.setProperty('--p', 0);
      });
      nowEl.textContent = pad(i + 1);
      timeEl.textContent = heads[i].querySelector('.sb-name').textContent;
    }
    function setPlaying(v) {
      playing = v; board.classList.toggle('paused', !v);
      playBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    /* cek posisi langsung dari layar; frame gambar cukup terlihat 30% */
    function measure() {
      var r = frame.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      inView = vis > Math.min(r.height, vh) * 0.3;
    }
    function tick(t) {
      raf = requestAnimationFrame(tick);
      var dt = last ? Math.min(t - last, 100) : 0; last = t;
      if (t - lastCheck > 200) { lastCheck = t; measure(); }
      if (playing && inView && !document.hidden) {
        elapsed += dt;
        if (elapsed >= DUR) go(i + 1);
        steps[i].style.setProperty('--p', Math.min(elapsed / DUR, 1).toFixed(4));
      }
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }

    heads.forEach(function (h, j) { h.addEventListener('click', function () { go(j); }); });
    document.getElementById('sbPrev').addEventListener('click', function () { go(i - 1); });
    document.getElementById('sbNext').addEventListener('click', function () { go(i + 1); });
    playBtn.addEventListener('click', function () { setPlaying(!playing); });

    /* panah kiri/kanan */
    board.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(i + 1); } else if (e.key === 'ArrowLeft') { go(i - 1); }
    });

    /* swipe di HP (gerakan scroll vertikal diabaikan) */
    var sx = null, sy = 0;
    frame.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1);
    }, { passive: true });

    /* balik dari tab lain / bfcache: pastikan loop hidup lagi */
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    window.addEventListener('pageshow', start);

    setPlaying(true);
    go(0);
    measure();
    start();
  })();
})();

/* NoctaPOS compro v2 — FAQ chat saat terlihat + demo interaktif */
(function () {
  'use strict';
  var rp = function (n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); };
  var num = function (s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0; };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* FAQ: animasi chat mulai ketika papan chat masuk layar */
  var board = document.getElementById('chatBoard');
  if (board) {
    if (!('IntersectionObserver' in window)) board.classList.add('play');
    else {
      var o = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { board.classList.add('play'); o.disconnect(); }
      }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
      o.observe(board);
    }
  }

  /* DEMO: semua data palsu, hanya di memori browser, tanpa request ke server */
  var dm = document.getElementById('demo');
  if (!dm) return;
  var opener = null;
  function open(e) {
    if (e) e.preventDefault();
    opener = document.activeElement; dm.hidden = false; document.body.classList.add('dm-lock'); $('.dm-x', dm).focus();
  }
  function close() { dm.hidden = true; document.body.classList.remove('dm-lock'); if (opener) opener.focus(); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-demo]'), function (a) { a.addEventListener('click', open); });
  $('.dm-x', dm).addEventListener('click', close);
  dm.addEventListener('click', function (e) { if (e.target === dm) close(); });
  document.addEventListener('keydown', function (e) {
    if (dm.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { /* jaga fokus tetap di dalam modal */
      var f = dm.querySelectorAll('button:not([hidden]),a[href],input'); f = Array.prototype.filter.call(f, function (x) { return x.offsetParent; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var tabs = dm.querySelectorAll('.dm-tabs button'), pns = dm.querySelectorAll('.dm-pn');
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener('click', function () {
      Array.prototype.forEach.call(tabs, function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      Array.prototype.forEach.call(pns, function (p) { p.hidden = p.dataset.p !== t.dataset.t; });
    });
  });

  /* Kasir */
  var tot = 0, cnt = 0, log = $('#dmLog'), ph = log.innerHTML;
  Array.prototype.forEach.call(dm.querySelectorAll('#dmItems button'), function (b) {
    b.addEventListener('click', function () {
      if (!cnt) log.innerHTML = '';
      cnt++; tot += +b.dataset.v; $('#dmTot').textContent = rp(tot); $('#dmRes').textContent = '';
      var r = document.createElement('div'); r.className = 'e'; r.innerHTML = '<span></span><span></span>';
      r.firstChild.textContent = b.dataset.n; r.lastChild.textContent = rp(+b.dataset.v); log.prepend(r);
    });
  });
  $('#dmPay').addEventListener('click', function () {
    if (!tot) { $('#dmRes').textContent = 'Pilih produk dulu.'; return; }
    $('#dmRes').textContent = 'Struk tercetak. Kas laci +' + rp(tot) + ' tercatat otomatis.';
    tot = 0; cnt = 0; log.innerHTML = ph; $('#dmTot').textContent = 'Rp 0';
  });

  /* BRILink */
  var laci = 12450000, bank = 25000000, nom = 500000;
  Array.prototype.forEach.call(dm.querySelectorAll('#dmNom button'), function (b) {
    b.addEventListener('click', function () {
      nom = +b.dataset.v;
      Array.prototype.forEach.call(dm.querySelectorAll('#dmNom button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
  $('#dmTarik').addEventListener('click', function () {
    if (nom > laci) { $('#dmRes2').textContent = 'Kas laci tidak cukup untuk nominal ini.'; return; }
    laci = laci - nom + 5000; bank += nom;
    $('#dmLaci').textContent = rp(laci); $('#dmBank').textContent = rp(bank);
    $('#dmRes2').textContent = 'Tercatat: laci -' + rp(nom - 5000) + ', saldo BRI +' + rp(nom) + '. Admin Rp 5.000 masuk laci.';
  });

  /* Tutup kas */
  $('#dmFisik').addEventListener('input', function (e) {
    var v = num(e.target.value), s = $('#dmSel');
    e.target.value = v ? v.toLocaleString('id-ID') : '';
    if (!v) { s.textContent = 'Isi uang fisik'; s.style.color = ''; return; }
    var d = v - 12450000;
    s.style.color = d === 0 ? '#10a974' : '#B47800';
    s.textContent = d === 0 ? 'Rp 0 · COCOK' : (d > 0 ? 'Lebih ' : 'Kurang ') + rp(Math.abs(d));
  });
})();

/* CTA: panel naik otomatis tepat setelah section FAQ selesai di-scroll; menutup lagi (dan bisa main ulang) saat kembali ke FAQ */
(function () {
  'use strict';
  var rv = document.getElementById('ctaRv'), faq = document.getElementById('faq');
  if (!rv) return;
  var body = document.body, open = false, landed = 0, ticking = false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { body.classList.add('cta-done'); return; } /* tampil statis */
  document.documentElement.classList.add('cta-js');

  function set(v) {
    if (v === open) return;
    open = v; rv.classList.toggle('open', v); clearTimeout(landed);
    if (v) landed = setTimeout(function () { body.classList.add('cta-done'); }, 1150); /* bayangan setelah mendarat */
    else body.classList.remove('cta-done');
  }
  function check() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    /* tepi bawah FAQ = tepi atas panel CTA. Begitu ujung FAQ masuk layar, panel langsung naik */
    var edge = faq ? faq.getBoundingClientRect().bottom : rv.getBoundingClientRect().top;
    if (!open && edge <= vh * 0.9) set(true);
    else if (open && edge > vh + 60) set(false);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  rv.addEventListener('focusin', function () { set(true); }); /* pengguna keyboard */
  check(); /* kalau FAQ sudah terlewat saat halaman dibuka */
})();

/* ---------- halaman FAQ & perbandingan ---------- */
/* NoctaPOS: skrip kecil untuk halaman perbandingan-fitur.html & faq.html */
(function () {
  'use strict';

  /* FAQ: tab + hash (#umum, #daftar, #berlangganan, #fitur) */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.fq-tab'));
  if (!tabs.length) return;
  var panels = Array.prototype.slice.call(document.querySelectorAll('.fq-panel'));

  function select(id, focus, push) {
    var tab = tabs.filter(function (t) { return t.dataset.tab === id; })[0] || tabs[0];
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      var on = p.id === 'panel-' + tab.dataset.tab;
      p.hidden = !on;
      p.classList.toggle('show', on);
    });
    if (focus) tab.focus();
    if (push && history.replaceState) history.replaceState(null, '', '#' + tab.dataset.tab);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t.dataset.tab, false, true); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = -1;
      if (k === 'ArrowRight') j = (i + 1) % n;
      else if (k === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = n - 1;
      if (j > -1) { e.preventDefault(); select(tabs[j].dataset.tab, true, true); }
    });
  });

  window.addEventListener('hashchange', function () { select(location.hash.slice(1), false, false); });
  select(location.hash.slice(1), false, false);
})();
