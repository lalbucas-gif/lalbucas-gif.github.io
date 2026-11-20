'use strict';
const AUDIO_BASE='https://karamazov.grok.me/';
const P='kzp:';
const CH={
 fiodor:{n:'Fiódor Pávlovitch',i:'FP',c:'#FF5A47',aka:'o pai · “o velho”',w:'O pai. Proprietário de terras esperto com dinheiro, bufão e libertino.'},
 adelaida:{n:'Adelaída Ivánovna',i:'AI',c:'#F29BC4',aka:'1ª esposa · da família Miússov',w:'Primeira esposa de Fiódor e mãe de Mítia. Rica, impulsiva, romântica.'},
 sofia:{n:'Sófia Ivánovna',i:'SI',c:'#9FD8FF',aka:'2ª esposa',w:'Segunda esposa de Fiódor, mãe de Ivan e Aliócha. Órfã, frágil, devota.'},
 dmitri:{n:'Mítia',i:'Mi',c:'#FF9F3D',aka:'Dmítri Fiódorovitch · Mítka',w:'O filho mais velho. Ex-oficial, impetuoso, passional, sempre sem dinheiro.'},
 ivan:{n:'Ivan',i:'Iv',c:'#4F8EFF',aka:'Ivan Fiódorovitch · Vánia',w:'O filho do meio. Intelectual brilhante, frio e cético.'},
 alyosha:{n:'Aliócha',i:'Al',c:'#3DDC97',aka:'Alekssêi Fiódorovitch · Liócha · Aliôchka',w:'O caçula. Noviço no mosteiro, bondoso — o herói do livro.'},
 smerd:{n:'Smierdiakóv',i:'Sm',c:'#A98BFF',aka:'Pável Fiódorovitch · o cozinheiro',w:'Criado e cozinheiro de Fiódor. Calado, estranho, epiléptico.'},
 grigori:{n:'Grigóri',i:'Gr',c:'#B5C48F',aka:'Grigóri Vassílievitch',w:'Velho criado fiel de Fiódor; foi quem cuidou dos meninos.'},
 marfa:{n:'Márfa',i:'Ma',c:'#D6AE84',aka:'Márfa Ignátievna',w:'Esposa de Grigóri, criada da casa.'},
 grush:{n:'Grúchenka',i:'Gk',c:'#FF4FA8',aka:'Agrafiêna Alekssándrovna',w:'Mulher sedutora da cidade. Pai e filho, Fiódor e Mítia, disputam por ela.'},
 katia:{n:'Katierína Ivánovna',i:'KI',c:'#F5C542',aka:'Kátia',w:'Noiva de Mítia. Orgulhosa, altiva, de família de militar.'},
 zossima:{n:'Zóssima',i:'Zo',c:'#FFF0BE',aka:'o ancião · stárets',w:'O ancião do mosteiro, venerado pelo povo. Mentor de Aliócha.'},
 miusov:{n:'Miússov',i:'Mü',c:'#7FD8CB',aka:'Piôtr Alekssándrovitch',w:'Primo de Adelaída. Liberal ocidentalizado, rico e vaidoso.'},
 rakitin:{n:'Rakítin',i:'Ra',c:'#C2E35A',aka:'o seminarista',w:'Seminarista ambicioso e cínico, “amigo” de Aliócha.'},
 khokh:{n:'Rorlakôva',i:'Ro',c:'#FFB59E',aka:'Madame Rorlakôva',w:'Senhora rica e tagarela, admiradora de Zóssima.'},
 ferapont:{n:'Padre Ferapônt',i:'Fe',c:'#B0A8A0',aka:'o asceta',w:'Monge asceta e rígido, inimigo de Zóssima.'},
 paissi:{n:'Padre Paíssi',i:'Pa',c:'#C9BEFF',aka:'monge',w:'Monge erudito do mosteiro, próximo de Zóssima.'}
};
const RECAP={
 '01-01':{k:'Antes de começar',s:'30 segundos · sem spoilers',l:[
  'Uma cidadezinha russa, século XIX. O narrador vai contar a história da família <b data-c="fiodor">Karamázov</b>.',
  'Você conhece o pai, <b data-c="fiodor">Fiódor Pávlovitch</b>: esperto com dinheiro, bufão e irresponsável.',
  'E a primeira esposa dele, <b data-c="adelaida">Adelaída Ivánovna</b>, de família rica — um casamento que deu muito errado.'],
  tip:'💡 Russos têm muitos apelidos: <b data-c="alyosha">Aliócha</b> = Alekssêi · <b data-c="dmitri">Mítia</b> = Dmítri. Quando um nome aparecer, um cartão colorido te lembra quem é.'},
 '04-02':{k:'Onde você parou',s:'30 segundos · até o fim do capítulo 1',l:[
  'Ontem <b data-c="dmitri">Mítia</b> invadiu a casa do pai atrás de <b data-c="grush">Grúchenka</b> e espancou o velho <b data-c="fiodor">Fiódor</b>.',
  'Na casa de <b data-c="katia">Katierína</b>, <b data-c="grush">Grúchenka</b> humilhou-a na frente de <b data-c="alyosha">Aliócha</b>.',
  'O ancião <b data-c="zossima">Zóssima</b> está muito fraco. O <b data-c="ferapont">padre Ferapônt</b>, asceta rígido, fala mal dele.',
  'Agora: <b data-c="alyosha">Aliócha</b> vai ver o pai, que pediu para encontrá-lo a sós — sem <b data-c="ivan">Ivan</b>.'],
  tip:'💡 O pai está ferido e desconfiado. Repare no que ele pergunta sobre os filhos.'}
};
const $=s=>document.querySelector(s);
const au=$('#au');
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>{t=Math.max(0,t|0);return (t/60|0)+':'+String(t%60).padStart(2,'0')};
const S={chapters:[],ch:null,d:null,t:0,wi:-1,s:-1,max:-1,met:new Set(),metOrder:[],lastCard:{},now:{},speed:1,mode:'focus',userScroll:0,dur:1};
let starts=[],sents=[],mentionAt=new Map(),fullW=[],fullS=[],playing=false,raf=0;
const SPEEDS=[0.8,1,1.15,1.3,1.5,1.75,2];

function lsj(k,d){try{return JSON.parse(localStorage.getItem(P+k))??d}catch(e){return d}}
function lss(k,v){try{localStorage.setItem(P+k,JSON.stringify(v))}catch(e){}}

async function init(){
  S.chapters=await fetch('data/chapters.json').then(r=>r.json());
  S.speed=lsj('speed',1);
  const last=lsj('last',S.chapters[0].id);
  bindUI();
  await loadChapter(new URLSearchParams(location.search).get('ch')||last,true);
}

async function loadChapter(id,recap){
  const ch=S.chapters.find(c=>c.id===id)||S.chapters[0];
  pause();
  S.ch=ch; lss('last',ch.id);
  const d=S.d=await fetch('data/'+ch.id+'.json').then(r=>r.json());
  const n=d.w.length; starts=new Float64Array(n);
  for(let i=0;i<n;i++) starts[i]=d.t[2*i];
  sents=[];
  for(let i=0;i<n;i++){const s=d.si[i]; if(!sents[s]) sents[s]={a:i,b:i,p:d.p[i]}; else sents[s].b=i;}
  mentionAt=new Map(d.c.map(([i,c])=>[i,c]));
  S.dur=ch.duracao; S.t=+lsj('pos:'+ch.id,0)||0; S.max=lsj('max:'+ch.id,-1);
  S.met=new Set(); S.metOrder=[]; d.met0.forEach(c=>addMet(c,true));
  for(const [i,c] of d.c) if(i<=S.max) addMet(c,true);
  S.wi=-1; S.s=-1; S.lastCard={}; S.now={};
  $('#chLbl').textContent=ch.rotulo; $('#chTitle').textContent=ch.titulo;
  au.src=AUDIO_BASE+ch.audio; au.playbackRate=S.speed;
  buildFull(); renderCast(); renderTicks(); renderHlCount();
  setAura(ch.id==='01-01'?'#FF5A47':'#3DDC97');
  update(S.t,true);
  if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:ch.titulo,artist:'Os Irmãos Karamázov',album:ch.rotulo});}
  if(recap) openRecap();
}

function addMet(c,silent){ if(!CH[c]||S.met.has(c)) return false; S.met.add(c); S.metOrder.push(c); if(!silent) renderCast(); return true; }

/* ---------- full text ---------- */
function buildFull(){
  const d=S.d, f=$('#full'); let h='<h1>'+esc(S.ch.rotulo)+'</h1><h2>'+esc(S.ch.titulo)+'</h2>';
  let curP=-1,curS=-1;
  for(let i=0;i<d.w.length;i++){
    const s=d.si[i],p=d.p[i];
    if(s!==curS||p!==curP){ if(curS>=0) h+='</span> '; if(p!==curP){ if(curP>=0) h+='</p>'; h+='<p class="par">'; curP=p;} h+='<span class="s" data-s="'+s+'">'; curS=s; }
    h+=wordHTML(i)+' ';
  }
  h+='</span></p>'; f.innerHTML=h;
  fullW=f.querySelectorAll('.w'); fullS=[]; f.querySelectorAll('.s').forEach(e=>fullS[+e.dataset.s]=e);
  markSaved();
}
function wordHTML(i){ const c=mentionAt.get(i); const met=c&&(S.met.has(c)||i<=S.max+40);
  return '<span class="w'+(c?' nm':'')+'"'+(c?' style="--c:'+CH[c].c+'" data-c="'+c+'"':'')+'>'+esc(S.d.w[i])+'</span>'; }

/* ---------- focus ---------- */
function renderFocus(dir){
  const f=$('#focus'), s=S.s<0?0:S.s; let h='';
  const cls=['p2','p1','cur','n1','n2'];
  for(let k=-2;k<=2;k++){ const j=s+k; const se=sents[j];
    if(!se){ h+='<div class="fs '+cls[k+2]+'"></div>'; continue; }
    let inner='';
    if(k===0){ for(let i=se.a;i<=se.b;i++) inner+=wordHTML(i)+' '; }
    else inner=esc(S.d.w.slice(se.a,se.b+1).join(' '));
    const len=se.b-se.a+1, sz=k===0?(len>70?' xl':len>38?' long':''):'';
    h+='<div class="fs '+cls[k+2]+sz+(isSaved(j)?' saved':'')+(k===0&&dir>0?' enter-up':'')+'" data-s="'+j+'">'+inner+'</div>';
  }
  f.innerHTML=h; S.focusWords=f.querySelectorAll('.cur .w');
}
function paintFocusWords(){
  const se=sents[S.s]; if(!se||!S.focusWords) return;
  S.focusWords.forEach((e,k)=>{const i=se.a+k; e.classList.toggle('done',i<S.wi); e.classList.toggle('now',i===S.wi);});
}

/* ---------- time engine ---------- */
function findWord(t){ let lo=0,hi=starts.length-1,r=-1; while(lo<=hi){const m=(lo+hi)>>1; if(starts[m]<=t){r=m;lo=m+1}else hi=m-1} return r; }
function update(t,force){
  S.t=t; const wi=Math.max(0,findWord(t)), prev=S.wi;
  if(wi!==prev||force){
    S.wi=wi; const s=S.d.si[wi];
    if(s!==S.s||force){ const dir=s>S.s?1:-1; if(fullS[S.s]) fullS[S.s].classList.remove('cur'); S.s=s; fullS[s]&&fullS[s].classList.add('cur'); renderFocus(force?0:dir); autoScroll(); }
    if(prev>=0&&fullW[prev]) fullW[prev].classList.remove('now'); fullW[wi]&&fullW[wi].classList.add('now');
    paintFocusWords();
    if(!force && wi>prev && wi-prev<40){ for(let i=prev+1;i<=wi;i++){const c=mentionAt.get(i); if(c) mention(c,i);} }
    if(wi>S.max){ for(const [i,c] of S.d.c){ if(i>S.max&&i<=wi&&addMet(c,false)&&force){} } S.max=wi; }
  }
  const pct=Math.min(1,t/S.dur)*100;
  $('#fill').style.width=pct+'%'; $('#knob').style.left=pct+'%';
  $('#tCur').textContent=fmt(t); $('#tLeft').textContent='-'+fmt((S.dur-t)/S.speed);
  $('#tSent').textContent='frase '+(S.s+1)+' de '+sents.length;
}
function loop(){ update(au.currentTime); if(playing) raf=requestAnimationFrame(loop); }
let saveT=0;
au.addEventListener('timeupdate',()=>{ if(!playing) return; const n=Date.now(); if(n-saveT>2000){saveT=n; lss('pos:'+S.ch.id,au.currentTime); lss('max:'+S.ch.id,S.max);} });
au.addEventListener('loadedmetadata',()=>{ if(isFinite(au.duration)) S.dur=au.duration; if(Math.abs(au.currentTime-S.t)>0.5) au.currentTime=S.t; renderTicks(); });
au.addEventListener('play',()=>{playing=true;setPlayIcon();cancelAnimationFrame(raf);loop()});
au.addEventListener('pause',()=>{playing=false;setPlayIcon();lss('pos:'+S.ch.id,au.currentTime);lss('max:'+S.ch.id,S.max)});
au.addEventListener('ended',()=>{playing=false;setPlayIcon()});
function setPlayIcon(){ $('#icPlay').style.display=playing?'none':''; $('#icPause').style.display=playing?'':'none'; }
function play(){ au.playbackRate=S.speed; const p=au.play(); if(p) p.catch(e=>toast('Toque ▶ de novo para tocar')); }
function pause(){ au.pause(); }
function seek(t){ t=Math.max(0,Math.min(S.dur-0.2,t)); S.t=t; try{au.currentTime=t}catch(e){} update(t); lss('pos:'+S.ch.id,t); }
function seekSentence(s){ const se=sents[s]; if(!se) return; seek(S.d.t[2*se.a]+0.01); if(!playing) play(); }

/* ---------- characters ---------- */
function setAura(c){ $('#aura').style.backgroundColor=c; document.documentElement.style.setProperty('--acc',c); }
function mention(c,i){
  const ch=CH[c]; if(!ch) return;
  const isNew=addMet(c,false);
  S.now[c]=Date.now(); setAura(ch.c); pulseCast(c);
  const t=performance.now();
  if(isNew||!S.lastCard[c]||t-S.lastCard[c]>90000){ S.lastCard[c]=t; showCard(c,isNew); }
}
let cardTimer=0;
function showCard(c,isNew){
  const ch=CH[c], L=$('#cardLayer'); clearTimeout(cardTimer);
  L.innerHTML='<div class="ccard" style="--c:'+ch.c+'"><div class="av">'+ch.i+'</div><div class="cc-b"><div class="cc-n">'+esc(ch.n)+(isNew?'<span class="badge">NOVO</span>':'')+'</div><div class="cc-a">'+esc(ch.aka)+'</div><div class="cc-w">'+esc(ch.w)+'</div></div></div>';
  L.firstChild.onclick=()=>{hideCard();openTree(c)};
  cardTimer=setTimeout(hideCard,isNew?6500:4200);
}
function hideCard(){ const e=$('#cardLayer .ccard'); if(!e) return; e.classList.add('out'); setTimeout(()=>e.remove(),400); }
function renderCast(){
  const el=$('#cast');
  if(!S.metOrder.length){ el.innerHTML='<span class="hint">Os personagens aparecem aqui conforme você ouve.</span>'; return; }
  el.innerHTML=S.metOrder.map(c=>'<button class="cdot" data-c="'+c+'" style="--c:'+CH[c].c+'" aria-label="'+esc(CH[c].n)+'">'+CH[c].i+'</button>').join('');
}
function pulseCast(c){ const b=$('#cast .cdot[data-c="'+c+'"]'); if(!b) return; b.classList.add('on'); clearTimeout(b._t); b._t=setTimeout(()=>b.classList.remove('on'),3500); }
function renderTicks(){
  const d=S.d; let h='';
  for(const [i,c] of d.c){ if(!S.met.has(c)) continue; h+='<i style="left:'+(d.t[2*i]/S.dur*100).toFixed(2)+'%;--c:'+CH[c].c+'"></i>'; }
  $('#ticks').innerHTML=h;
}

/* ---------- family tree ---------- */
const TN={fiodor:[180,52,26],adelaida:[62,52,22],sofia:[298,52,22],dmitri:[62,172,24],smerd:[160,172,22],ivan:[244,172,24],alyosha:[318,172,24],
 katia:[44,300,20],grush:[124,300,21],grigori:[218,300,19],marfa:[296,300,19],miusov:[44,420,19],khokh:[122,420,19],ferapont:[198,420,19],rakitin:[262,420,19],zossima:[326,420,21]};
const TE=[['m','adelaida','fiodor'],['m','fiodor','sofia'],['k',[121,52],'dmitri'],['k',[239,52],'ivan'],['k',[239,52],'alyosha'],['d','fiodor','smerd','?'],
 ['l','katia','dmitri','noiva'],['x','grush','dmitri'],['x','grush','fiodor'],['m','grigori','marfa'],['l','zossima','alyosha','mentor'],['d','rakitin','alyosha'],['d','ferapont','zossima']];
function openTree(focus){
  const met=S.met, svg=$('#treeSvg'); let h='<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>';
  const lbl=[['FAMÍLIA',14,18],['EM VOLTA · CASA',14,262],['MOSTEIRO & CIDADE',14,382]];
  lbl.forEach(([t,x,y])=>h+='<text x="'+x+'" y="'+y+'" fill="#6f6b80" font-size="9" letter-spacing="2" font-weight="700" font-family="-apple-system,sans-serif">'+t+'</text>');
  const P=k=>Array.isArray(k)?k:TN[k];
  for(const [ty,a,b,lab] of TE){
    const A=P(a),B=P(b); const on=(Array.isArray(a)||met.has(a))&&met.has(b) && (ty!=='k'||met.has('fiodor'));
    const col=on?(CH[b]?CH[b].c:'#888'):'#2a2836', op=on?.75:.6;
    let d;
    if(ty==='m') d='M'+(A[0]+A[2])+' '+A[1]+'H'+(B[0]-B[2]);
    else if(ty==='k') d='M'+A[0]+' '+A[1]+'V112H'+B[0]+'V'+(B[1]-B[2]);
    else d='M'+A[0]+' '+(A[1]+(A[1]<B[1]?A[2]:-A[2]))+'L'+B[0]+' '+(B[1]+(A[1]<B[1]?-B[2]:B[2]));
    const dash=(ty==='d'||ty==='x')?' stroke-dasharray="4 5"':'';
    h+='<path d="'+d+'" stroke="'+(ty==='x'&&on?'#FF4FA8':col)+'" stroke-opacity="'+op+'" stroke-width="'+(ty==='m'?2.4:1.8)+'"'+dash+'/>';
    if(lab&&on){ const mx=(A[0]+B[0])/2, my=(A[1]+B[1])/2; h+='<text x="'+(mx+5)+'" y="'+my+'" fill="#9a96aa" font-size="9" font-style="italic" font-family="Georgia,serif">'+lab+'</text>'; }
  }
  let k=0;
  for(const [c,[x,y,r]] of Object.entries(TN)){
    const m=met.has(c), ch=CH[c], now=S.now[c]&&Date.now()-S.now[c]<20000;
    h+='<g class="tn'+(m?' met':'')+(now?' now':'')+'" data-c="'+c+'" style="transform-origin:'+x+'px '+y+'px;animation-delay:'+(m?(k++*45):0)+'ms">';
    if(m){ h+='<circle class="halo" cx="'+x+'" cy="'+y+'" r="'+(r+6)+'" fill="'+ch.c+'" opacity=".35" filter="url(#gl)"/>';
      h+='<circle class="b" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+ch.c+'"'+(c===focus?' stroke="#fff" stroke-width="3"':'')+'/>';
      h+='<text x="'+x+'" y="'+(y+4.5)+'" text-anchor="middle" font-size="'+(r>21?13:11)+'" font-weight="800" fill="#0b0b12" font-family="-apple-system,sans-serif">'+ch.i+'</text>';
      h+='<text x="'+x+'" y="'+(y+r+14)+'" text-anchor="middle" font-size="10.5" fill="#e9e4d8" font-family="Georgia,serif">'+esc(ch.n.replace('Padre ','Pe. ').replace(' Ivánovna','').replace(' Pávlovitch',''))+'</text>';
    } else { h+='<circle class="b" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#17161f" stroke="#353244" stroke-dasharray="3 4"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle" font-size="14" fill="#4b4760" font-family="Georgia,serif">?</text>'; }
    h+='</g>';
  }
  svg.innerHTML=h;
  const tot=Object.keys(TN).length, cnt=Object.keys(TN).filter(c=>met.has(c)).length;
  $('#treeCount').textContent=cnt+' de '+tot+' conhecidos';
  svg.querySelectorAll('.tn').forEach(g=>g.onclick=()=>treeInfo(g.dataset.c));
  treeInfo(focus&&met.has(focus)?focus:null);
  openSheet('tree');
}
function treeInfo(c){
  const el=$('#treeInfo');
  if(!c){ el.innerHTML='Toque num personagem aceso para ver quem é.'; return; }
  if(!S.met.has(c)){ el.innerHTML='🔒 Ainda não apareceu na história. Continue ouvindo.'; return; }
  const ch=CH[c]; el.innerHTML='<b style="color:'+ch.c+'">'+esc(ch.n)+'</b><br><span style="color:#9a96aa;font-size:12.5px">'+esc(ch.aka)+'</span><br><span style="color:var(--fg)">'+esc(ch.w)+'</span>';
}

/* ---------- recap ---------- */
function openRecap(){
  const r=RECAP[S.ch.id]; if(!r) return;
  const col=s=>s.replace(/<b data-c="(\w+)">/g,(m,c)=>'<b style="color:'+CH[c].c+'">');
  const resume=S.t>5;
  $('#recapBody').innerHTML='<div class="rc-k">'+(resume?'Continue de onde parou':r.k)+'</div><div class="rc-t">'+esc(S.ch.titulo)+'</div><div class="rc-s">'+esc(S.ch.rotulo)+' · '+r.s+'</div>'+
   '<ul class="rc-l">'+r.l.map((x,i)=>'<li style="animation-delay:'+(120+i*140)+'ms"><span class="n">'+(i+1)+'</span>'+col(x)+'</li>').join('')+'</ul>'+
   '<div class="tip">'+col(r.tip)+'</div><div class="btns"><button class="btn g" id="rcSpeak">🔊 Ouvir</button><button class="btn" id="rcGo">'+(resume?'Continuar · '+fmt(S.t):'Começar capítulo')+'</button></div>';
  $('#rcGo').onclick=()=>{speechSynthesis&&speechSynthesis.cancel();closeSheets();play()};
  $('#rcSpeak').onclick=()=>speakRecap(r);
  openSheet('recap');
}
function speakRecap(r){
  if(!('speechSynthesis' in window)) return toast('Sem voz neste navegador');
  speechSynthesis.cancel(); const txt=r.l.map(x=>x.replace(/<[^>]+>/g,'')).join(' ');
  const u=new SpeechSynthesisUtterance(txt); u.lang='pt-BR'; u.rate=1.05;
  const v=speechSynthesis.getVoices().find(v=>/pt[-_]BR/i.test(v.lang)); if(v) u.voice=v; speechSynthesis.speak(u);
}

/* ---------- highlights ---------- */
function hls(){ return lsj('hl',[]); }
function isSaved(s){ return hls().some(h=>h.ch===S.ch.id&&h.s===s); }
function toggleHL(s){
  let a=hls(); const i=a.findIndex(h=>h.ch===S.ch.id&&h.s===s);
  if(i>=0){ a.splice(i,1); toast('Trecho removido'); }
  else{ const se=sents[s]; a.unshift({ch:S.ch.id,s,t:S.d.t[2*se.a],txt:S.d.w.slice(se.a,se.b+1).join(' '),at:Date.now()}); toast('✦ Trecho salvo'); }
  lss('hl',a); markSaved(); renderFocus(0); paintFocusWords(); renderHlCount();
  if(navigator.vibrate) navigator.vibrate(18);
}
function markSaved(){ const set=new Set(hls().filter(h=>h.ch===S.ch.id).map(h=>h.s)); fullS.forEach((e,s)=>e&&e.classList.toggle('saved',set.has(s))); }
function renderHlCount(){ const n=hls().length; $('#hlCount').textContent=n||''; }
function openHls(){
  const a=hls(), L=$('#hlList');
  L.innerHTML=a.length?a.map((h,k)=>{const c=S.chapters.find(x=>x.id===h.ch);return '<div class="hl" data-k="'+k+'"><q>“'+esc(h.txt)+'”<small>'+esc(c?c.rotulo:h.ch)+' · '+fmt(h.t)+'</small></q><button data-del="'+k+'" aria-label="Apagar">✕</button></div>'}).join(''):'<div class="empty">Nenhum trecho ainda.<br>Segure qualquer frase por meio segundo.</div>';
  L.querySelectorAll('.hl q').forEach(q=>q.onclick=async()=>{const h=a[+q.parentNode.dataset.k]; closeSheets(); if(h.ch!==S.ch.id) await loadChapter(h.ch,false); seek(h.t+0.01);});
  L.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{a.splice(+b.dataset.del,1);lss('hl',a);markSaved();renderFocus(0);paintFocusWords();renderHlCount();openHls();});
  openSheet('hls');
}

/* ---------- sheets / ui ---------- */
function openSheet(id){ document.querySelectorAll('.sheet').forEach(s=>s.classList.toggle('open',s.id===id)); $('#scrim').classList.add('on'); }
function closeSheets(){ document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('open')); $('#scrim').classList.remove('on'); }
let toastT=0; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),1600); }
function setMode(m){ S.mode=m; $('#focus').classList.toggle('off',m!=='focus'); $('#full').classList.toggle('off',m!=='full'); $('#modeLbl').textContent=m==='focus'?'Texto':'Foco'; if(m==='full'){S.userScroll=0;autoScroll(true);} }
function autoScroll(instant){ if(S.mode!=='full'||Date.now()-S.userScroll<4000) return; const e=fullS[S.s]; if(!e) return; const f=$('#full'); const top=e.offsetTop-f.clientHeight*0.32; f.scrollTo({top,behavior:instant?'auto':'smooth'}); }
function bindPress(root){
  let tm=0,sx=0,sy=0,fired=false,tg=null;
  const cancel=()=>{clearTimeout(tm); if(tg) tg.classList.remove('pressing');};
  root.addEventListener('pointerdown',e=>{ const el=e.target.closest('[data-s]'); if(!el||!el.textContent) return; tg=el; fired=false; sx=e.clientX; sy=e.clientY; el.classList.add('pressing'); tm=setTimeout(()=>{fired=true; el.classList.remove('pressing'); toggleHL(+el.dataset.s);},520); });
  root.addEventListener('pointermove',e=>{ if(tg&&Math.hypot(e.clientX-sx,e.clientY-sy)>10){cancel();tg=null;} });
  root.addEventListener('pointerup',e=>{ cancel(); if(tg&&!fired) seekSentence(+tg.dataset.s); tg=null; });
  root.addEventListener('pointercancel',()=>{cancel();tg=null;});
  root.addEventListener('contextmenu',e=>e.preventDefault());
}
function bindUI(){
  $('#play').onclick=()=>playing?pause():play();
  $('#back').onclick=()=>seek((playing?au.currentTime:S.t)-15);
  $('#fwd').onclick=()=>seek((playing?au.currentTime:S.t)+15);
  $('#spd').textContent=S.speed+'×';
  $('#spd').onclick=()=>{ const i=(SPEEDS.indexOf(S.speed)+1)%SPEEDS.length; S.speed=SPEEDS[i]; au.playbackRate=S.speed; lss('speed',S.speed); $('#spd').textContent=String(S.speed).replace('.',',')+'×'; toast('Velocidade '+String(S.speed).replace('.',',')+'×'); };
  $('#modeBtn').onclick=()=>setMode(S.mode==='focus'?'full':'focus');
  $('#treeBtn').onclick=()=>openTree();
  $('#hlBtn').onclick=openHls;
  $('#cast').onclick=e=>{const b=e.target.closest('.cdot'); if(b){ showCard(b.dataset.c,false); }};
  $('#scrim').onclick=()=>{ if('speechSynthesis' in window) speechSynthesis.cancel(); closeSheets(); };
  $('#chBtn').onclick=()=>{ $('#chList').innerHTML=S.chapters.map(c=>'<button class="chi'+(c.id===S.ch.id?' cur':'')+'" data-id="'+c.id+'"><div class="r">'+['','I','II','III','IV'][c.livro]+'</div><div><b>'+esc(c.titulo)+'</b><span>'+esc(c.rotulo)+' · '+Math.round(c.duracao/60)+' min</span></div></button>').join('');
    $('#chList').querySelectorAll('.chi').forEach(b=>b.onclick=()=>{closeSheets(); loadChapter(b.dataset.id,true);}); openSheet('chs'); };
  bindPress($('#focus')); bindPress($('#full'));
  $('#full').addEventListener('touchmove',()=>S.userScroll=Date.now(),{passive:true});
  $('#full').addEventListener('wheel',()=>S.userScroll=Date.now(),{passive:true});
  // swipe down to close sheets
  document.querySelectorAll('.sheet').forEach(sh=>{ let y0=null; sh.addEventListener('touchstart',e=>{ if(sh.scrollTop<=0) y0=e.touches[0].clientY; },{passive:true}); sh.addEventListener('touchend',e=>{ if(y0!==null&&e.changedTouches[0].clientY-y0>80) closeSheets(); y0=null; }); });
  // scrubber
  const bar=$('#bar'); let drag=false;
  const at=e=>{const r=bar.getBoundingClientRect(); return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*S.dur;};
  bar.addEventListener('pointerdown',e=>{drag=true; bar.setPointerCapture(e.pointerId); update(at(e));});
  bar.addEventListener('pointermove',e=>{ if(drag) update(at(e)); });
  bar.addEventListener('pointerup',e=>{ if(drag){drag=false; seek(at(e));} });
  if('mediaSession' in navigator){ const ms=navigator.mediaSession; ms.setActionHandler('play',play); ms.setActionHandler('pause',pause);
    ms.setActionHandler('seekbackward',()=>seek(au.currentTime-15)); ms.setActionHandler('seekforward',()=>seek(au.currentTime+15)); }
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){lss('pos:'+S.ch.id,au.currentTime||S.t);} });
}
window.kz={S,seek,update,showCard,openTree,openRecap,closeSheets,setMode,toggleHL,loadChapter,mention};
init();
