/* Karamázov UI v2 — modo foco, personagens vivos, árvore sem spoiler, resumo, trechos.
   Progress storage is 100% compatible with v1: localStorage kz.rec.<id> / kz.pos.<id> / kz.last / kz.rate
   + IndexedDB 'kz-progress'/'kv' mirror (newest 'at' wins). */
(function(){
'use strict';
var BASE=/github\.io$/.test(location.hostname)?'https://karamazov.grok.me/':'';   /* preview pulls live data/audio */
var BACK=2;
var $=function(s){return document.querySelector(s);};
var au=$('#au');
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var fmt=function(t){t=Math.max(0,t|0);return (t/60|0)+':'+String(t%60).padStart(2,'0');};
/* ---------- storage (v1-compatible) ---------- */
var LS={get:function(k,d){try{var v=localStorage.getItem('kz.'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
        set:function(k,v){try{localStorage.setItem('kz.'+k,JSON.stringify(v));}catch(e){}}};
var IDB=(function(){var dbp=null;
  function open(){ if(dbp)return dbp; dbp=new Promise(function(res,rej){ if(!window.indexedDB)return rej(new Error('no idb'));
    var r=indexedDB.open('kz-progress',1); r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); dbp.catch(function(){dbp=null;}); return dbp; }
  return {set:function(k,v){return open().then(function(db){return new Promise(function(res){var tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=tx.onabort=function(){res();};});}).catch(function(){});},
    all:function(){return open().then(function(db){return new Promise(function(res){var out={},rq=db.transaction('kv','readonly').objectStore('kv').openCursor();
      rq.onsuccess=function(){var c=rq.result;if(c){out[c.key]=c.value;c.continue();}else res(out);};rq.onerror=function(){res(out);};});}).catch(function(){return {};});}};
})();
function getRec(id){ var r=LS.get('rec.'+id,null); if(r&&typeof r.t==='number')return r; var t=LS.get('pos.'+id,0); return t>0?{id:id,t:t,k:-1,at:0,mode:'audio'}:null; }
function putRec(r){ LS.set('rec.'+r.id,r); LS.set('pos.'+r.id,r.t); LS.set('last',r); IDB.set('rec.'+r.id,r); IDB.set('last',r); }
function syncFromIDB(){
  var to=new Promise(function(res){setTimeout(function(){res({});},1200);});
  return Promise.race([IDB.all(),to]).then(function(kv){
    Object.keys(kv||{}).forEach(function(k){ var v=kv[k]; if(!v||typeof v!=='object')return;
      if(k==='last'||k.indexOf('rec.')===0){ var cur=LS.get(k,null); if(!cur||!(cur.at>=v.at)){ LS.set(k,v); if(k!=='last')LS.set('pos.'+v.id,v.t); } } });
    var l=LS.get('last',null),il=kv&&kv.last; if(l&&l.at&&(!il||il.at<l.at))IDB.set('last',l);
  });
}
function fetchJSON(u){return fetch(BASE+u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.json();});}
function fetchLocal(u,d){return fetch(u,{cache:'no-cache'}).then(function(r){return r.ok?r.json():d;}).catch(function(){return d;});}

/* ---------- state ---------- */
var BOOK=null,CH={},TOK={},IDX={},REC={};
var S={ch:null,d:null,t:0,wi:-1,s:-1,max:-1,met:new Set(),metOrder:[],lastCard:{},now:{},speed:1,mode:'focus',userScroll:0,dur:1};
var starts=[],sents=[],mentions=[],mentionAt=new Map(),fullW=[],fullS=[],playing=false,raf=0,lastSave=0,pendingT=null;
var SPEEDS=[0.8,0.9,1,1.15,1.3,1.5,1.75,2];
var norm=function(w){return w.replace(/[^\p{L}]/gu,'');};

function init(){
  Promise.all([fetchJSON('chapters.json'),fetchLocal('personagens.json',[]),fetchLocal('resumos.json',{}),fetchLocal('indice-personagens.json',{}),syncFromIDB()]).then(function(r){
    BOOK=r[0]; r[1].forEach(function(p){CH[p.id]=p; p.tok.forEach(function(t){TOK[t]=p.id;});}); REC=r[2]; IDX=r[3];
    S.speed=+LS.get('rate',1)||1; setSpeedLbl(); applyPrefs(); bindUI();
    var m=/cap=([\w-]+)/.exec(location.hash), last=LS.get('last',null), q=new URLSearchParams(location.search).get('ch');
    var id=(m&&m[1])||q||(last&&last.id)||BOOK.capitulos[0].id;
    loadChapter(byId(id)>=0?id:BOOK.capitulos[0].id,'auto');
  }).catch(function(e){document.body.insertAdjacentHTML('afterbegin','<p style="padding:40px 20px;color:#f88">Erro ao carregar: '+esc(String(e))+'</p>');});
}
function byId(id){for(var i=0;i<BOOK.capitulos.length;i++)if(BOOK.capitulos[i].id===id)return i;return -1;}

function loadChapter(id,recapMode,autoplay){
  if(S.ch&&S.ch.id!==id)save(true);
  var ch=BOOK.capitulos[byId(id)]; au.pause();
  S.ch=ch; if(location.hash!=='#cap='+id)history.replaceState(null,'','#cap='+id);
  document.title=ch.titulo+' — Karamázov';
  return fetchJSON(ch.dados).then(function(d){
    S.d=d; var n=d.w.length,i; starts=new Float64Array(n);
    for(i=0;i<n;i++)starts[i]=d.t[2*i];
    sents=[]; for(i=0;i<n;i++){var s=d.si[i]; if(!sents[s])sents[s]={a:i,b:i,p:d.p[i]}; else sents[s].b=i;}
    mentions=[]; for(i=0;i<n;i++){var c=TOK[norm(d.w[i])]; if(c)mentions.push([i,c]);}
    mentionAt=new Map(mentions);
    S.dur=ch.duracao;
    var rec=getRec(id); if(rec&&rec.t>ch.duracao-3)rec=null;
    var t0=rec?Math.max(0,rec.t-(rec.mode==='scroll'?0:BACK)):0;
    /* this chapter becomes 'last' without moving its saved spot (same as v1) */
    putRec(rec?{id:id,t:rec.t,k:rec.k,sk:rec.sk,so:rec.so,mode:rec.mode,at:Date.now()}:{id:id,t:0,k:-1,mode:'audio',at:Date.now()});
    S.max=Math.max(LS.get('max.'+id,-1),findWordIn(t0));
    S.met=new Set(); S.metOrder=[];
    var bi=byId(id); for(var j=0;j<bi;j++)(IDX[BOOK.capitulos[j].id]||[]).forEach(function(c){addMet(c,true);});
    mentions.forEach(function(m){if(m[0]<=S.max)addMet(m[1],true);});
    S.wi=-1; S.s=-1; S.lastCard={}; S.now={}; S.touched=false;
    $('#chLbl').textContent=ch.rotulo; $('#chTitle').textContent=ch.titulo;
    au.src=BASE+ch.audio; au.preload='auto'; au.playbackRate=S.speed; au.defaultPlaybackRate=S.speed;
    pendingT=t0>0?t0:null; S.t=t0;
    buildFull(); renderCast(); renderTicks(); renderHlCount();
    var lastC=null; for(var k=mentions.length-1;k>=0;k--)if(mentions[k][0]<=S.max){lastC=mentions[k][1];break;}
    setAura(lastC&&CH[lastC]?CH[lastC].c:'#3DDC97');
    update(t0,true); setMedia();
    var stale=rec&&rec.at&&Date.now()-rec.at>6*3600e3;
    if(recapMode===true||(recapMode==='auto'&&(t0<5||stale)))openRecap();
    else if(autoplay)play();
  });
}
function findWordIn(t){var lo=0,hi=starts.length-1,r=-1;while(lo<=hi){var m=(lo+hi)>>1;if(starts[m]<=t){r=m;lo=m+1;}else hi=m-1;}return r;}
function addMet(c,silent){ if(!CH[c]||S.met.has(c))return false; S.met.add(c); S.metOrder.push(c); if(!silent)renderCast(); return true; }

/* ---------- text ---------- */
function wordHTML(i){var c=mentionAt.get(i);return '<span class="w'+(c?' nm':'')+'"'+(c?' style="--c:'+CH[c].c+'"':'')+'>'+esc(S.d.w[i])+'</span>';}
function buildFull(){
  var d=S.d,h='<h1>'+esc(S.ch.rotulo)+'</h1><h2>'+esc(S.ch.titulo)+'</h2>',cp=-1,cs=-1;
  for(var i=0;i<d.w.length;i++){var s=d.si[i],p=d.p[i];
    if(s!==cs||p!==cp){ if(cs>=0)h+='</span> '; if(p!==cp){ if(cp>=0)h+='</p>'; h+='<p class="par">'; cp=p;} h+='<span class="s" data-s="'+s+'">'; cs=s; }
    h+=wordHTML(i)+' ';}
  h+='</span></p>'+nextNav(); var f=$('#full'); f.innerHTML=h;
  fullW=f.querySelectorAll('.w'); fullS=[]; f.querySelectorAll('.s').forEach(function(e){fullS[+e.dataset.s]=e;});
  var nb=f.querySelector('.nextbtn'); if(nb)nb.onclick=function(){loadChapter(nb.dataset.id,true);};
  markSaved();
}
function nextNav(){var nx=BOOK.capitulos[byId(S.ch.id)+1];return nx?'<button class="nextbtn" data-id="'+nx.id+'">Próximo: '+esc(nx.rotulo)+' · '+esc(nx.titulo)+' ›</button>':'<p class="endnote">Fim dos capítulos publicados até agora.</p>';}
function renderFocus(dir){
  var f=$('#focus'),s=S.s<0?0:S.s,h='',cls=['p2','p1','cur','n1','n2'];
  for(var k=-2;k<=2;k++){var j=s+k,se=sents[j];
    if(!se){h+='<div class="fs '+cls[k+2]+'"></div>';continue;}
    var inner='';
    if(k===0){for(var i=se.a;i<=se.b;i++)inner+=wordHTML(i)+' ';}
    else inner=esc(S.d.w.slice(se.a,se.b+1).join(' '));
    var len=se.b-se.a+1,sz=k===0?(len>70?' xl':len>38?' long':''):'';
    h+='<div class="fs '+cls[k+2]+sz+(isSaved(j)?' saved':'')+(k===0&&dir>0?' enter-up':'')+'" data-s="'+j+'">'+inner+'</div>';}
  f.innerHTML=h; S.fw=f.querySelectorAll('.cur .w');
}
function paintFocus(){var se=sents[S.s];if(!se||!S.fw)return;S.fw.forEach(function(e,k){var i=se.a+k;e.classList.toggle('done',i<S.wi);e.classList.toggle('now',i===S.wi);});}

/* ---------- engine ---------- */
function update(t,force){
  S.t=t; var wi=Math.max(0,findWordIn(t)),prev=S.wi;
  if(wi!==prev||force){
    S.wi=wi; var s=S.d.si[wi];
    if(s!==S.s||force){var dir=s>S.s?1:-1; if(fullS[S.s])fullS[S.s].classList.remove('cur'); S.s=s; if(fullS[s])fullS[s].classList.add('cur'); renderFocus(force?0:dir); autoScroll(force);}
    if(prev>=0&&fullW[prev])fullW[prev].classList.remove('now'); if(fullW[wi])fullW[wi].classList.add('now');
    paintFocus();
    if(!force&&wi>prev&&wi-prev<40){for(var i=prev+1;i<=wi;i++){var c=mentionAt.get(i);if(c)mention(c);}}
    if(wi>S.max){mentions.forEach(function(m){if(m[0]>S.max&&m[0]<=wi)addMet(m[1],false);});S.max=wi;}
  }
  var pct=Math.min(1,t/S.dur)*100;
  $('#fill').style.width=pct+'%'; $('#knob').style.left=pct+'%';
  $('#tCur').textContent=fmt(t); $('#tLeft').textContent='-'+fmt((S.dur-t)/S.speed);
  $('#tSent').textContent='frase '+(S.s+1)+' de '+sents.length;
}
function save(force){
  if(!S.ch||!S.d||!S.touched)return; var now=Date.now(); if(!force&&now-lastSave<1000)return; lastSave=now;
  var t=pendingT!=null?pendingT:(au.currentTime||S.t); if(!(t>=0))return;
  putRec({id:S.ch.id,t:t,k:S.wi,sk:S.wi,so:0,mode:'audio',at:now}); LS.set('max.'+S.ch.id,S.max);
}
function loop(){update(au.currentTime);save(false);if(playing)raf=requestAnimationFrame(loop);}
au.addEventListener('loadedmetadata',function(){ if(isFinite(au.duration))S.dur=au.duration; if(pendingT!=null){try{au.currentTime=pendingT;}catch(e){} } renderTicks(); });
au.addEventListener('seeked',function(){ if(pendingT!=null&&Math.abs(au.currentTime-pendingT)<1)pendingT=null; });
au.addEventListener('play',function(){playing=true;setPlayIcon();cancelAnimationFrame(raf);loop();});
au.addEventListener('pause',function(){playing=false;setPlayIcon();update(au.currentTime||S.t);save(true);});
au.addEventListener('timeupdate',function(){save(false);if(!playing)update(au.currentTime);});
au.addEventListener('ended',function(){playing=false;setPlayIcon();var nx=BOOK.capitulos[byId(S.ch.id)+1];
  if(nx){putRec({id:S.ch.id,t:0,k:-1,mode:'audio',at:Date.now()});loadChapter(nx.id,false,true);} else save(true);});
['pagehide','beforeunload','freeze'].forEach(function(ev){window.addEventListener(ev,function(){save(true);});});
document.addEventListener('visibilitychange',function(){if(document.hidden)save(true);});
function setPlayIcon(){$('#icPlay').style.display=playing?'none':'';$('#icPause').style.display=playing?'':'none';}
function play(){S.touched=true;au.playbackRate=S.speed;if(pendingT!=null&&au.readyState>=1){try{au.currentTime=pendingT;}catch(e){}}var p=au.play();if(p)p.catch(function(){toast('Toque ▶ de novo para tocar');});cacheAudio();}
function pause(){au.pause();}
function seek(t){S.touched=true;t=Math.max(0,Math.min(S.dur-0.2,t));S.t=t;pendingT=au.readyState>=1?null:t;try{au.currentTime=t;}catch(e){}update(t);save(true);}
function seekSentence(s){var se=sents[s];if(!se)return;seek(S.d.t[2*se.a]+0.01);if(!playing)play();}
function cur(){return playing?au.currentTime:S.t;}

/* ---------- characters ---------- */
function setAura(c){$('#aura').style.backgroundColor=c;document.documentElement.style.setProperty('--acc',c);}
function mention(c){var ch=CH[c];if(!ch)return;var isNew=addMet(c,false);S.now[c]=Date.now();setAura(ch.c);pulseCast(c);
  var t=performance.now(); if(isNew||!S.lastCard[c]||t-S.lastCard[c]>90000){S.lastCard[c]=t;showCard(c,isNew);}}
var cardTimer=0;
function showCard(c,isNew){var ch=CH[c],L=$('#cardLayer');clearTimeout(cardTimer);
  L.innerHTML='<div class="ccard" style="--c:'+ch.c+'"><div class="av">'+ch.i+'</div><div class="cc-b"><div class="cc-n">'+esc(ch.n)+(isNew?'<span class="badge">NOVO</span>':'')+'</div><div class="cc-a">'+esc(ch.aka)+'</div><div class="cc-w">'+esc(ch.w)+'</div></div></div>';
  L.firstChild.onclick=function(){hideCard();openTree(c);}; cardTimer=setTimeout(hideCard,isNew?6500:4200);}
function hideCard(){var e=$('#cardLayer .ccard');if(!e)return;e.classList.add('out');setTimeout(function(){e.remove();},400);}
function renderCast(){var el=$('#cast');
  if(!S.metOrder.length){el.innerHTML='<span class="hint">Os personagens aparecem aqui conforme você ouve.</span>';return;}
  el.innerHTML=S.metOrder.slice().reverse().map(function(c){return '<button class="cdot" data-c="'+c+'" style="--c:'+CH[c].c+'" aria-label="'+esc(CH[c].n)+'">'+CH[c].i+'</button>';}).join('');}
function pulseCast(c){var b=$('#cast .cdot[data-c="'+c+'"]');if(!b)return;if(b.previousElementSibling)b.parentNode.prepend(b);b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('on');},3500);}
function renderTicks(){var d=S.d,h='';mentions.forEach(function(m){if(!S.met.has(m[1]))return;h+='<i style="left:'+(d.t[2*m[0]]/S.dur*100).toFixed(2)+'%;--c:'+CH[m[1]].c+'"></i>';});$('#ticks').innerHTML=h;}

/* ---------- family tree ---------- */
var TN={fiodor:[180,52,26],adelaida:[62,52,22],sofia:[298,52,22],dmitri:[62,172,24],smerd:[160,172,22],ivan:[244,172,24],alyosha:[318,172,24],
 katia:[44,300,20],grush:[124,300,21],grigori:[218,300,19],marfa:[296,300,19],miusov:[44,420,19],khokh:[122,420,19],ferapont:[198,420,19],rakitin:[262,420,19],zossima:[326,420,21]};
var TE=[['m','adelaida','fiodor'],['m','fiodor','sofia'],['k',[121,52],'dmitri'],['k',[239,52],'ivan'],['k',[239,52],'alyosha'],['d','fiodor','smerd','?'],
 ['l','katia','dmitri','noiva'],['x','grush','dmitri'],['x','grush','fiodor'],['m','grigori','marfa'],['l','zossima','alyosha','mentor'],['d','rakitin','alyosha'],['d','ferapont','zossima']];
function openTree(focus){
  var met=S.met,h='<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>';
  [['FAMÍLIA',14,18],['EM VOLTA · CASA',14,262],['MOSTEIRO & CIDADE',14,382]].forEach(function(l){h+='<text x="'+l[1]+'" y="'+l[2]+'" fill="#6f6b80" font-size="9" letter-spacing="2" font-weight="700" font-family="-apple-system,sans-serif">'+l[0]+'</text>';});
  var P=function(k){return Array.isArray(k)?k:TN[k];};
  TE.forEach(function(e){var ty=e[0],a=e[1],b=e[2],lab=e[3],A=P(a),B=P(b);
    var on=(Array.isArray(a)||met.has(a))&&met.has(b)&&(ty!=='k'||met.has('fiodor'));
    var col=on?CH[b].c:'#24222e',d;
    if(ty==='m')d='M'+(A[0]+A[2])+' '+A[1]+'H'+(B[0]-B[2]);
    else if(ty==='k')d='M'+A[0]+' '+A[1]+'V112H'+B[0]+'V'+(B[1]-B[2]);
    else d='M'+A[0]+' '+(A[1]+(A[1]<B[1]?A[2]:-A[2]))+'L'+B[0]+' '+(B[1]+(A[1]<B[1]?-B[2]:B[2]));
    h+='<path d="'+d+'" stroke="'+(ty==='x'&&on?'#FF4FA8':col)+'" stroke-opacity="'+(on?.7:.6)+'" stroke-width="'+(ty==='m'?2.4:1.8)+'"'+((ty==='d'||ty==='x')?' stroke-dasharray="4 5"':'')+'/>';
    if(lab&&on)h+='<text x="'+((A[0]+B[0])/2+5)+'" y="'+((A[1]+B[1])/2)+'" fill="#9a96aa" font-size="9" font-style="italic" font-family="Georgia,serif">'+lab+'</text>';});
  var k=0;
  Object.keys(TN).forEach(function(c){var x=TN[c][0],y=TN[c][1],r=TN[c][2],m=met.has(c),ch=CH[c],now=S.now[c]&&Date.now()-S.now[c]<20000;
    h+='<g class="tn'+(m?' met':'')+(now?' now':'')+'" data-c="'+c+'" style="transform-origin:'+x+'px '+y+'px;animation-delay:'+(m?(k++*45):0)+'ms">';
    if(m){h+='<circle class="halo" cx="'+x+'" cy="'+y+'" r="'+(r+6)+'" fill="'+ch.c+'" opacity=".28" filter="url(#gl)"/><circle class="b" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+ch.c+'"'+(c===focus?' stroke="#fff" stroke-width="3"':'')+'/>';
      h+='<text x="'+x+'" y="'+(y+4.5)+'" text-anchor="middle" font-size="'+(r>21?13:11)+'" font-weight="800" fill="#0b0b12" font-family="-apple-system,sans-serif">'+ch.i+'</text>';
      h+='<text x="'+x+'" y="'+(y+r+14)+'" text-anchor="middle" font-size="10.5" fill="#e4ded2" font-family="Georgia,serif">'+esc(ch.n.replace('Padre ','Pe. ').replace(' Ivánovna','').replace(' Pávlovitch',''))+'</text>';}
    else h+='<circle class="b" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#121119" stroke="#302d3d" stroke-dasharray="3 4"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle" font-size="14" fill="#47435a" font-family="Georgia,serif">?</text>';
    h+='</g>';});
  var svg=$('#treeSvg'); svg.innerHTML=h;
  var tot=Object.keys(TN).length,cnt=Object.keys(TN).filter(function(c){return met.has(c);}).length;
  $('#treeCount').textContent=cnt+' de '+tot+' conhecidos';
  svg.querySelectorAll('.tn').forEach(function(g){g.onclick=function(){treeInfo(g.dataset.c);};});
  var others=S.metOrder.filter(function(c){return !TN[c];});
  $('#treeMore').innerHTML=others.length?'<div class="more-h">Também já apareceram</div>'+others.map(function(c){return '<button class="chip" data-c="'+c+'" style="--c:'+CH[c].c+'">'+esc(CH[c].n)+'</button>';}).join(''):'';
  $('#treeMore').querySelectorAll('.chip').forEach(function(b){b.onclick=function(){treeInfo(b.dataset.c);};});
  treeInfo(focus&&met.has(focus)?focus:null); openSheet('tree');
}
function treeInfo(c){var el=$('#treeInfo');
  if(!c){el.innerHTML='Toque num personagem aceso para ver quem é.';return;}
  if(!S.met.has(c)){el.innerHTML='🔒 Ainda não apareceu na história. Continue ouvindo.';return;}
  var ch=CH[c];el.innerHTML='<b style="color:'+ch.c+'">'+esc(ch.n)+'</b><br><span style="color:#9a96aa;font-size:12.5px">'+esc(ch.aka)+'</span><br><span style="color:var(--fg)">'+esc(ch.w)+'</span>';}

/* ---------- recap ---------- */
function autoRecap(){ /* fallback for chapters without a written recap */
  var i=byId(S.ch.id),pv=BOOK.capitulos[i-1]; if(!pv)return null;
  var who=(IDX[pv.id]||[]).filter(function(c){return CH[c];}).slice(0,5).map(function(c){return '<b data-c="'+c+'">'+esc(CH[c].n)+'</b>';});
  return {l:['Capítulo anterior: “'+esc(pv.titulo)+'”.'].concat(who.length?['Quem apareceu: '+who.join(', ')+'.']:[])};
}
function openRecap(){
  var r=REC[S.ch.id]||autoRecap(); if(!r){return;}
  var col=function(s){return s.replace(/<b data-c="(\w+)">/g,function(m,c){return '<b style="color:'+(CH[c]?CH[c].c:'inherit')+'">';});};
  var resume=S.t>5, i=byId(S.ch.id);
  $('#recapBody').innerHTML='<div class="rc-k">'+(resume?'Continue de onde parou':(r.k||(i?'Onde você parou':'Antes de começar')))+'</div><div class="rc-t">'+esc(S.ch.titulo)+'</div><div class="rc-s">'+esc(S.ch.rotulo)+' · 30 segundos · sem spoilers</div>'+
   '<ul class="rc-l">'+r.l.map(function(x,k){return '<li style="animation-delay:'+(120+k*140)+'ms"><span class="n">'+(k+1)+'</span>'+col(x)+'</li>';}).join('')+'</ul>'+
   (r.tip?'<div class="tip">'+col(r.tip)+'</div>':'')+'<div class="btns"><button class="btn g" id="rcSpeak">🔊 Ouvir</button><button class="btn" id="rcGo">'+(resume?'Continuar · '+fmt(S.t):'Começar capítulo')+'</button></div>';
  $('#rcGo').onclick=function(){if(window.speechSynthesis)speechSynthesis.cancel();closeSheets();play();};
  $('#rcSpeak').onclick=function(){speak(r);}; openSheet('recap');
}
function speak(r){if(!('speechSynthesis' in window))return toast('Sem voz neste navegador');speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(r.l.map(function(x){return x.replace(/<[^>]+>/g,'');}).join(' '));u.lang='pt-BR';u.rate=1.05;
  var v=speechSynthesis.getVoices().find(function(v){return /pt[-_]BR/i.test(v.lang);});if(v)u.voice=v;speechSynthesis.speak(u);}

/* ---------- highlights ---------- */
function hls(){return LS.get('hl',[]);}
function isSaved(s){return hls().some(function(h){return h.ch===S.ch.id&&h.s===s;});}
function toggleHL(s){var a=hls(),i=a.findIndex(function(h){return h.ch===S.ch.id&&h.s===s;});
  if(i>=0){a.splice(i,1);toast('Trecho removido');}
  else{var se=sents[s];a.unshift({ch:S.ch.id,s:s,t:S.d.t[2*se.a],txt:S.d.w.slice(se.a,se.b+1).join(' '),at:Date.now()});toast('✦ Trecho salvo');}
  LS.set('hl',a);markSaved();renderFocus(0);paintFocus();renderHlCount();if(navigator.vibrate)navigator.vibrate(18);}
function markSaved(){var set=new Set(hls().filter(function(h){return h.ch===S.ch.id;}).map(function(h){return h.s;}));fullS.forEach(function(e,s){if(e)e.classList.toggle('saved',set.has(s));});}
function renderHlCount(){var n=hls().length;$('#hlCount').textContent=n||'';}
function openHls(){var a=hls(),L=$('#hlList');
  L.innerHTML=a.length?a.map(function(h,k){var i=byId(h.ch),c=BOOK.capitulos[i];return '<div class="hl" data-k="'+k+'"><q>“'+esc(h.txt)+'”<small>'+esc(c?c.rotulo:h.ch)+' · '+fmt(h.t)+'</small></q><button data-del="'+k+'" aria-label="Apagar">✕</button></div>';}).join(''):'<div class="empty">Nenhum trecho ainda.<br>Segure qualquer frase por meio segundo.</div>';
  L.querySelectorAll('.hl q').forEach(function(q){q.onclick=function(){var h=a[+q.parentNode.dataset.k];closeSheets();
    (h.ch!==S.ch.id?loadChapter(h.ch,false):Promise.resolve()).then(function(){seek(h.t+0.01);});};});
  L.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){a.splice(+b.dataset.del,1);LS.set('hl',a);markSaved();renderFocus(0);paintFocus();renderHlCount();openHls();};});
  openSheet('hls');}

/* ---------- chapters ---------- */
function openChapters(){
  var groups={},order=[];BOOK.capitulos.forEach(function(c){if(!groups[c.livro]){groups[c.livro]=[];order.push(c.livro);}groups[c.livro].push(c);});
  var Lm=BOOK.livros||{};
  $('#chList').innerHTML=order.map(function(ln){var meta=Lm[String(ln)]||{};
    return '<details'+(ln===S.ch.livro?' open':'')+'><summary class="bookhd">'+esc(meta.rotulo||('Livro '+ln))+'</summary>'+groups[ln].map(function(c){
      var p=LS.get('pos.'+c.id,0),pct=Math.min(100,Math.round(100*p/c.duracao));
      return '<button class="chi'+(c.id===S.ch.id?' cur':'')+'" data-id="'+c.id+'"><div class="r">'+c.cap+'</div><div class="tx"><b>'+esc(c.titulo)+'</b><span>'+fmt(c.duracao)+(p>5?' · parou em '+fmt(p):'')+'</span>'+(p>5?'<i class="prog"><i style="width:'+pct+'%"></i></i>':'')+'</div></button>';}).join('')+'</details>';}).join('')+
    '<p class="nota">'+esc(BOOK.nota||'')+'</p>';
  $('#chList').querySelectorAll('.chi').forEach(function(b){b.onclick=function(){closeSheets();if(b.dataset.id!==S.ch.id)loadChapter(b.dataset.id,'auto');};});
  openSheet('chs');}

/* ---------- reading prefs ---------- */
var FONTS={lexend:'Lexend',atkinson:'Atkinson Hyperlegible',roboto:'Roboto',serif:'Serifada (atual)'};
function applyPrefs(){var f=LS.get('font','lexend'),al=LS.get('align','justify');if(!FONTS[f])f='lexend';
  document.body.className=document.body.className.replace(/\b(f|al)-\w+/g,'').trim()+' f-'+f+' al-'+al;}
function openPrefs(){var f=LS.get('font','lexend'),al=LS.get('align','justify');
  $('#prefBody').innerHTML='<div class="pf-h">Fonte</div>'+Object.keys(FONTS).map(function(k){return '<button class="fopt fo-'+k+(k===f?' on':'')+'" data-f="'+k+'"><span>'+FONTS[k]+'</span><em>Aliócha ouviu a voz do pai.</em></button>';}).join('')+
   '<div class="pf-h">Alinhamento</div><div class="seg"><button data-al="justify"'+(al==='justify'?' class="on"':'')+'>Justificado</button><button data-al="left"'+(al==='left'?' class="on"':'')+'>Esquerda</button></div>';
  $('#prefBody').querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){LS.set('font',b.dataset.f);applyPrefs();openPrefs();};});
  $('#prefBody').querySelectorAll('[data-al]').forEach(function(b){b.onclick=function(){LS.set('align',b.dataset.al);applyPrefs();openPrefs();};});
  openSheet('prefs');}

/* ---------- ui ---------- */
function openSheet(id){document.querySelectorAll('.sheet').forEach(function(s){s.classList.toggle('open',s.id===id);});$('#scrim').classList.add('on');}
function closeSheets(){document.querySelectorAll('.sheet').forEach(function(s){s.classList.remove('open');});$('#scrim').classList.remove('on');}
var toastT=0;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on');},1600);}
function setMode(m){S.mode=m;$('#focus').classList.toggle('off',m!=='focus');$('#full').classList.toggle('off',m!=='full');$('#modeLbl').textContent=m==='focus'?'Texto':'Foco';if(m==='full'){S.userScroll=0;autoScroll(true);}}
function autoScroll(instant){if(S.mode!=='full'||Date.now()-S.userScroll<4000)return;var e=fullS[S.s];if(!e)return;var f=$('#full');f.scrollTo({top:e.offsetTop-f.clientHeight*0.32,behavior:instant?'auto':'smooth'});}
function setSpeedLbl(){$('#spd').textContent=String(S.speed).replace('.',',')+'×';}
function setMedia(){if(!('mediaSession' in navigator)||!S.ch)return;var base=new URL('icons/',BASE?BASE:location.href).href;
  try{navigator.mediaSession.metadata=new MediaMetadata({title:S.ch.titulo,artist:'Os Irmãos Karamázov — '+S.ch.rotulo,album:'Fiódor Dostoiévski · audiolivro',artwork:[{src:base+'icon-192.png',sizes:'192x192',type:'image/png'},{src:base+'icon-512.png',sizes:'512x512',type:'image/png'}]});}catch(e){}}
function cacheAudio(){if(BASE||!S.ch||!('caches' in window)||!navigator.serviceWorker||!navigator.serviceWorker.controller)return;
  var u=new URL(S.ch.audio,location.href).href,d=new URL(S.ch.dados,location.href).href;
  caches.open('kz-audio-v1').then(function(c){return c.match(u).then(function(hit){if(!hit)c.add(u).catch(function(){});c.add(d).catch(function(){});});});}
function bindPress(root){var tm=0,sx=0,sy=0,fired=false,tg=null;
  var cancel=function(){clearTimeout(tm);if(tg)tg.classList.remove('pressing');};
  root.addEventListener('pointerdown',function(e){var el=e.target.closest('[data-s]');if(!el||!el.textContent)return;tg=el;fired=false;sx=e.clientX;sy=e.clientY;el.classList.add('pressing');tm=setTimeout(function(){fired=true;el.classList.remove('pressing');toggleHL(+el.dataset.s);},520);});
  root.addEventListener('pointermove',function(e){if(tg&&Math.hypot(e.clientX-sx,e.clientY-sy)>10){cancel();tg=null;}});
  root.addEventListener('pointerup',function(){cancel();if(tg&&!fired)seekSentence(+tg.dataset.s);tg=null;});
  root.addEventListener('pointercancel',function(){cancel();tg=null;});
  root.addEventListener('contextmenu',function(e){e.preventDefault();});}
function bindUI(){
  $('#play').onclick=function(){playing?pause():play();};
  $('#back').onclick=function(){seek(cur()-15);}; $('#fwd').onclick=function(){seek(cur()+15);};
  $('#spd').onclick=function(){var i=SPEEDS.indexOf(S.speed);S.speed=SPEEDS[(i+1)%SPEEDS.length];au.playbackRate=S.speed;au.defaultPlaybackRate=S.speed;LS.set('rate',S.speed);setSpeedLbl();toast('Velocidade '+String(S.speed).replace('.',',')+'×');};
  $('#modeBtn').onclick=function(){setMode(S.mode==='focus'?'full':'focus');};
  $('#treeBtn').onclick=function(){openTree();}; $('#hlBtn').onclick=openHls; $('#fontBtn').onclick=openPrefs; $('#chBtn').onclick=openChapters;
  $('#cast').onclick=function(e){var b=e.target.closest('.cdot');if(b)showCard(b.dataset.c,false);};
  $('#scrim').onclick=function(){if(window.speechSynthesis)speechSynthesis.cancel();closeSheets();};
  bindPress($('#focus'));bindPress($('#full'));
  $('#full').addEventListener('touchmove',function(){S.userScroll=Date.now();},{passive:true});
  $('#full').addEventListener('wheel',function(){S.userScroll=Date.now();},{passive:true});
  document.querySelectorAll('.sheet').forEach(function(sh){var y0=null;sh.addEventListener('touchstart',function(e){if(sh.scrollTop<=0)y0=e.touches[0].clientY;},{passive:true});sh.addEventListener('touchend',function(e){if(y0!==null&&e.changedTouches[0].clientY-y0>80)closeSheets();y0=null;});});
  var bar=$('#bar'),drag=false,at=function(e){var r=bar.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*S.dur;};
  bar.addEventListener('pointerdown',function(e){drag=true;bar.setPointerCapture(e.pointerId);update(at(e));});
  bar.addEventListener('pointermove',function(e){if(drag)update(at(e));});
  bar.addEventListener('pointerup',function(e){if(drag){drag=false;seek(at(e));}});
  window.addEventListener('hashchange',function(){var m=/cap=([\w-]+)/.exec(location.hash);if(m&&S.ch&&m[1]!==S.ch.id&&byId(m[1])>=0)loadChapter(m[1],'auto');});
  if('mediaSession' in navigator){var ms=navigator.mediaSession,h={play:play,pause:pause,seekbackward:function(){seek(cur()-15);},seekforward:function(){seek(cur()+15);},
    seekto:function(d){seek(d.seekTime);},previoustrack:function(){var i=byId(S.ch.id);if(cur()>5||i===0)seek(0);else loadChapter(BOOK.capitulos[i-1].id,false,true);},
    nexttrack:function(){var nx=BOOK.capitulos[byId(S.ch.id)+1];if(nx)loadChapter(nx.id,false,true);}};for(var k in h){try{ms.setActionHandler(k,h[k]);}catch(e){}}}
}
window.kz={S:S,seek:seek,update:update,showCard:showCard,openTree:openTree,openRecap:openRecap,closeSheets:closeSheets,setMode:setMode,loadChapter:loadChapter,openPrefs:openPrefs,save:save,getRec:getRec};
init();
if(!BASE&&'serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(r){try{r.update();}catch(e){}}).catch(function(){});
})();
