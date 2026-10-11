const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let S=Object.assign({work:25,short:5,mid:15,long:30,sound:true,theme:'light',strict:false,vol:.5,block:[]},store.get('pomo_settings',{}));
let tasks=store.get('pomo_tasks',[]),curTask=store.get('pomo_cur',null);
const today=new Date().toDateString();
let day=store.get('pomo_day',{date:today,pomos:0,cycles:0});
if(day.date!==today)day={date:today,pomos:0,cycles:0};
 
let phase='work',round=1,running=false,endAt=0,remaining=S.work*60,hiddenAt=0,wake=null;
const C=816.8;
const kindAfter=r=>r===2?'mid':r===4?'long':'short';
const names={short:'Short break',mid:'Medium break',long:'Long break'};
const total=()=>phase==='work'?S.work*60:S[kindAfter(round)]*60;
const locked=()=>S.strict&&running&&phase==='work';
const save=()=>{store.set('pomo_settings',S);store.set('pomo_tasks',tasks);store.set('pomo_cur',curTask);store.set('pomo_day',day)};
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
 
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3200)}
 
/* ---------- render ---------- */
function render(){
  document.body.dataset.mode=phase;
  document.documentElement.dataset.theme=S.theme;
  $('#bTheme').textContent=S.theme==='dark'?'☀️':'🌙';
  $('#time').textContent=fmt(remaining);
  $('#fg').style.strokeDashoffset=C*(1-remaining/total());
  $('#modeLabel').textContent=phase==='work'?`Focus · Round ${round} of 4`:names[kindAfter(round)]+' · relax';
  [...$('#dots').children].forEach((d,i)=>{d.className=i<round-1||(i===round-1&&phase==='break')?'done':i===round-1?'active':''});
  const t=tasks.find(x=>x.id===curTask);
  $('#cur').textContent=t?t.text:'No task selected';
  document.title=`(${fmt(remaining)}) Pomodoro Timer`;
  $('#cycles').textContent=day.cycles;$('#pomos').textContent=day.pomos;
  $('#bStart').disabled=running;
  const L=locked();
  $('#bPause').disabled=!running||L;$('#bReset').disabled=L;$('#bSkip').disabled=L;
  $('#strictQuick').checked=S.strict;$('#strictQuick').disabled=L;
}
 
/* ---------- audio (generated with Web Audio, no files needed) ---------- */
let actx,master,amb=null,clinkT=null;
function A(){if(!actx){actx=new(window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=S.vol;master.connect(actx.destination)}if(actx.state==='suspended')actx.resume();return actx}
function bell(){if(!S.sound)return;const c=A(),t=c.currentTime;
  [0,.7].forEach(o=>[523.25,1046.5,1568].forEach((f,i)=>{const os=c.createOscillator(),g=c.createGain();os.type='sine';os.frequency.value=f;
    g.gain.setValueAtTime(0,t+o);g.gain.linearRampToValueAtTime(.35/(i+1),t+o+.01);g.gain.exponentialRampToValueAtTime(.0001,t+o+2.4);
    os.connect(g);g.connect(c.destination);os.start(t+o);os.stop(t+o+2.5)}))}
function noise(brown){const c=A(),n=c.sampleRate*3,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);let l=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w*.5}return b}
function clink(){const c=A(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.frequency.value=2200+Math.random()*1800;
  g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g);g.connect(master);o.start(t);o.stop(t+.2)}
function setAmb(k){
  if(amb){try{amb.stop()}catch(e){}amb=null}clearInterval(clinkT);
  document.querySelectorAll('#amb button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  if(k==='off')return;
  const c=A(),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=noise(k==='cafe');s.loop=true;
  if(k==='rain'){f.type='highpass';f.frequency.value=1000;g.gain.value=.6}
  else if(k==='cafe'){f.type='lowpass';f.frequency.value=700;g.gain.value=1.3;clinkT=setInterval(()=>Math.random()<.7&&clink(),2200)}
  else{f.type='lowpass';f.frequency.value=12000;g.gain.value=.35}
  s.connect(f);f.connect(g);g.connect(master);s.start();amb=s;
}
$('#amb').onclick=e=>{const k=e.target.dataset.k;if(k)setAmb(k)};
$('#vol').value=S.vol;
$('#vol').oninput=e=>{S.vol=+e.target.value;if(master)master.gain.value=S.vol;save()};
 
/* ---------- timer ---------- */
function notify(t,b){try{if('Notification' in window&&Notification.permission==='granted')new Notification(t,{body:b})}catch(e){}}
function next(counted){
  if(phase==='work'){
    if(counted){day.pomos++;if(round===4)day.cycles++;}
    phase='break';
  }else{phase='work';round=round===4?1:round+1}
  remaining=total();running=false;save();render();
}
function complete(){
  bell();
  const wasWork=phase==='work',r=round;
  next(true);
  if(wasWork){const t=tasks.find(x=>x.id===curTask);
    notify('Focus session complete 🎉',(t?t.text+' — ':'')+'time for a '+names[kindAfter(r)].toLowerCase());
    toast('Great work! Enjoy your '+names[kindAfter(r)].toLowerCase()+'.');
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    if(wake){wake.release().catch(()=>{});wake=null}
  }else{notify('Break over','Ready for the next focus round?');toast('Break over — start your next round.')}
}
setInterval(()=>{
  if(!running)return;
  remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));
  if(remaining<=0)complete();else render();
},250);
 
$('#bStart').onclick=async()=>{
  A();if(running)return;
  running=true;endAt=Date.now()+remaining*1000;
  if(S.strict&&phase==='work'){
    try{await document.documentElement.requestFullscreen()}catch(e){}
    try{wake=await navigator.wakeLock.request('screen')}catch(e){}
    toast('Strict mode on — stay with it!');
  }
  render();
};
$('#bPause').onclick=()=>{if(locked())return toast('Strict mode: finish the session first.');running=false;render()};
$('#bReset').onclick=()=>{if(locked())return toast('Strict mode: finish the session first.');running=false;remaining=total();render()};
$('#bSkip').onclick=()=>{if(locked())return toast('Strict mode: finish the session first.');next(false)};
 
/* ---------- strict mode / distraction saver ---------- */
window.addEventListener('beforeunload',e=>{if(locked()){e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(running&&phase==='work'){hiddenAt=Date.now();if(S.block.length||S.strict)notify('Come back! 🍅','Your focus session is still running.')}
  }else if(hiddenAt){
    const s=Math.round((Date.now()-hiddenAt)/1000);hiddenAt=0;
    if(s>3&&running&&phase==='work')toast(`You were away ${s}s${S.block.length?' — stay off: '+S.block.slice(0,3).join(', '):''}. Back to focus!`);
  }
});
function setStrict(v){S.strict=v;save();render();$('#strictModal').checked=v}
$('#strictQuick').onchange=e=>setStrict(e.target.checked);
$('#strictModal').onchange=e=>{if(locked()){e.target.checked=true;return toast('Cannot change during a strict session.')}setStrict(e.target.checked)};
function chips(){$('#chips').innerHTML=S.block.map((b,i)=>`<span class="chip">${b.replace(/</g,'&lt;')} <button data-i="${i}" aria-label="Remove">✕</button></span>`).join('')||'<span class="note">Nothing added yet.</span>'}
$('#chips').onclick=e=>{const i=e.target.dataset.i;if(i!=null){S.block.splice(i,1);save();chips()}};
function addBlk(v){v=v.trim();if(v&&!S.block.includes(v)){S.block.push(v);save();chips()}}
$('#blkAdd').onclick=()=>{addBlk($('#blkIn').value);$('#blkIn').value=''};
$('#blkIn').onkeydown=e=>{if(e.key==='Enter')$('#blkAdd').click()};
$('#pickFolder').onclick=async()=>{
  if(!window.showDirectoryPicker)return toast('Folder picking isn\'t supported in this browser — type the name instead.');
  try{const h=await window.showDirectoryPicker();addBlk('📁 '+h.name)}catch(e){}
};
$('#askNotif').onclick=async()=>{
  if(!('Notification' in window))return toast('Notifications not supported here.');
  const p=await Notification.requestPermission();toast(p==='granted'?'Reminders enabled.':'Reminders not allowed.');
};
$('#bDistract').onclick=()=>{chips();$('#strictModal').checked=S.strict;$('#dShield').showModal()};
$('#shieldClose').onclick=()=>$('#dShield').close();
 
/* ---------- settings ---------- */
$('#bSet').onclick=()=>{
  $('#sWork').value=S.work;$('#sShort').value=S.short;$('#sMid').value=S.mid;$('#sLong').value=S.long;$('#sSound').checked=S.sound;$('#dSet').showModal()};
$('#sCancel').onclick=()=>$('#dSet').close();
$('#sSave').onclick=()=>{
  const g=(id,d)=>Math.min(180,Math.max(1,Math.round(+$(id).value)||d));
  S.work=g('#sWork',25);S.short=g('#sShort',5);S.mid=g('#sMid',15);S.long=g('#sLong',30);S.sound=$('#sSound').checked;
  if(!running)remaining=total();save();render();$('#dSet').close();toast('Settings saved.');
};
$('#bTheme').onclick=()=>{S.theme=S.theme==='dark'?'light':'dark';save();render()};
 
/* ---------- tasks ---------- */
function drawTasks(){
  $('#tasks').innerHTML=tasks.map(t=>`<li class="${t.done?'done':''} ${t.id===curTask?'sel':''}" data-id="${t.id}">
    <input type="checkbox" ${t.done?'checked':''}><span>${t.text.replace(/</g,'&lt;')}</span><button aria-label="Delete">🗑</button></li>`).join('')
    ||'<li style="justify-content:center;color:var(--muted)">No tasks yet — add one above.</li>';
}
function addTask(){const v=$('#taskIn').value.trim();if(!v)return;const t={id:Date.now(),text:v,done:false};tasks.push(t);if(!curTask)curTask=t.id;$('#taskIn').value='';save();drawTasks();render()}
$('#taskAdd').onclick=addTask;$('#taskIn').onkeydown=e=>{if(e.key==='Enter')addTask()};
$('#tasks').onclick=e=>{
  const li=e.target.closest('li[data-id]');if(!li)return;const id=+li.dataset.id,t=tasks.find(x=>x.id===id);
  if(e.target.matches('input')){t.done=e.target.checked;if(t.done&&curTask===id)curTask=(tasks.find(x=>!x.done)||{}).id||null;if(t.done)toast('Task completed ✅')}
  else if(e.target.matches('button')){tasks=tasks.filter(x=>x.id!==id);if(curTask===id)curTask=(tasks.find(x=>!x.done)||{}).id||null}
  else if(e.target.matches('span')&&!t.done)curTask=id;
  save();drawTasks();render();
};
 
/* ---------- init ---------- */
drawTasks();render();