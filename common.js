const MEMBERS=['Greg','Keith','David','Steele','Will'];

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

async function lookupMoviesPublic(q){
  q=(q||'').trim(); if(q.length<2)return[];
  try{
    const u=window.LT_CONFIG.SUPABASE_URL+'/functions/v1/movie-lookup?q='+encodeURIComponent(q);
    const r=await fetch(u,{headers:{apikey:window.LT_CONFIG.SUPABASE_KEY,Authorization:'Bearer '+window.LT_CONFIG.SUPABASE_KEY}});
    if(r.ok){const j=await r.json();if(j.candidates?.length)return j.candidates}
  }catch(_){}
  try{
    const s=await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&uselang=en&type=item&limit=10&search='+encodeURIComponent(q)).then(r=>r.json());
    let hits=(s.search||[]).filter(x=>/film|movie/i.test(x.description||'')).slice(0,5);
    if(!hits.length){const s2=await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*&language=en&uselang=en&type=item&limit=10&search='+encodeURIComponent(q+' film')).then(r=>r.json());hits=(s2.search||[]).filter(x=>/film|movie/i.test(x.description||'')).slice(0,5)}
    const out=[];
    for(const hit of hits){
      const e=(await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=claims|labels|descriptions&languages=en&ids='+hit.id).then(r=>r.json())).entities?.[hit.id]; if(!e)continue;
      const claims=e.claims||{};const time=claims.P577?.[0]?.mainsnak?.datavalue?.value?.time||'';const ym=time.match(/[+-](\d{4})-/);const ids=[...(claims.P57||[]).slice(0,2).map(c=>c.mainsnak?.datavalue?.value?.id),...(claims.P136||[]).slice(0,3).map(c=>c.mainsnak?.datavalue?.value?.id)].filter(Boolean);
      let labels={};if(ids.length){const d=await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels&languages=en&ids='+encodeURIComponent(ids.join('|'))).then(r=>r.json());for(const id of ids)labels[id]=d.entities?.[id]?.labels?.en?.value||''}
      const dirs=(claims.P57||[]).slice(0,2).map(c=>labels[c.mainsnak?.datavalue?.value?.id]).filter(Boolean);const genres=(claims.P136||[]).slice(0,3).map(c=>labels[c.mainsnak?.datavalue?.value?.id]).filter(Boolean);
      out.push({id:hit.id,title:e.labels?.en?.value||hit.label,year:ym?Number(ym[1]):null,director:dirs.join(' & ')||null,genre:genres.join(' / ')||null,blurb:hit.description||''});
    }
    return out;
  }catch(_){return[]}
}
