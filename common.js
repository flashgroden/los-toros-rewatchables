const MEMBERS=['Greg','Keith','David','Steele','Will'];

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

const movieLookupCache=new Map();
const WD='https://www.wikidata.org/w/api.php';
async function wdGet(params){
  const qs=new URLSearchParams({...params,format:'json',origin:'*'});
  const r=await fetch(WD+'?'+qs.toString());
  if(!r.ok)throw new Error('Movie lookup request failed');
  return r.json();
}
function wdClaimIds(claims,key){return (claims?.[key]||[]).map(c=>c?.mainsnak?.datavalue?.value?.id).filter(Boolean)}
function wdYear(claims){const t=(claims?.P577||[])[0]?.mainsnak?.datavalue?.value?.time;const m=typeof t==='string'?t.match(/[+-](\d{4})-/):null;return m?Number(m[1]):null}
async function wdLabels(ids){
  if(!ids.length)return{};
  const d=await wdGet({action:'wbgetentities',ids:ids.join('|'),props:'labels',languages:'en'});
  const out={};for(const id of ids)out[id]=d?.entities?.[id]?.labels?.en?.value||'';return out;
}
async function publicMovieSearch(query){
  const s=await wdGet({action:'wbsearchentities',search:query,language:'en',uselang:'en',type:'item',limit:'8'});
  let hits=(s.search||[]).filter(x=>/film|movie/i.test(x.description||''));
  if(!hits.length)hits=(s.search||[]).slice(0,5);
  hits=hits.slice(0,6);
  const out=[];
  for(const hit of hits){
    try{
      const d=await wdGet({action:'wbgetentities',ids:hit.id,props:'claims|labels|descriptions',languages:'en'});
      const e=d?.entities?.[hit.id];if(!e)continue;
      const directorIds=wdClaimIds(e.claims,'P57').slice(0,2);
      const genreIds=wdClaimIds(e.claims,'P136').slice(0,3);
      const labels=await wdLabels([...directorIds,...genreIds]);
      const f={id:hit.id,title:e?.labels?.en?.value||hit.label,year:wdYear(e.claims),director:directorIds.map(id=>labels[id]).filter(Boolean).join(' & ')||null,genre:genreIds.map(id=>labels[id]).filter(Boolean).join(' / ')||null,blurb:e?.descriptions?.en?.value||hit.description||null,rt:null,poster:null};
      movieLookupCache.set(f.id,f);out.push(f);
    }catch(err){console.warn('Skipping movie lookup result',err)}
  }
  return out;
}

async function omdbLookupTitle(title,year=null){
  const arr=await publicMovieSearch(title);
  if(!arr.length)return null;
  const norm=title.trim().toLowerCase();
  return arr.find(x=>x.title?.toLowerCase()===norm&&(!year||Number(x.year)===Number(year)))||arr.find(x=>!year||Number(x.year)===Number(year))||arr[0];
}
async function omdbSearchMovies(query){return publicMovieSearch(query)}
async function omdbLookupId(id){return movieLookupCache.get(id)||null}
