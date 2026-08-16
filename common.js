const supabase = window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL, window.LT_CONFIG.SUPABASE_KEY);
const MEMBERS=['Greg','Keith','David','Steele','Will'];
function mast(){return `<div class="mast"><div><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></div><nav><a href="/list.html">The Board</a><a href="/nominate.html">Nominate</a><a href="/review.html">Rate a Film</a><a href="/about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}
