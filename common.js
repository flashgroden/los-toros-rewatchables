const MEMBERS=['Greg','Keith','David','Steele','Will'];
const LT_BUILD='v1.0.1';

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

const movieLookupCache=new Map();
const WIKI='https://en.wikipedia.org/w/api.php';
const WD='https://www.wikidata.org/w/api.php';
async function apiGet(base,params){const qs=new URLSearchParams({...params,format:'json',origin:'*'});const r=await fetch(base+'?'+qs.toString());if(!r.ok)throw new Error('Movie lookup request failed');return r.json()}
function claimIds(claims,key){return (claims?.[key]||[]).map(c=>c?.mainsnak?.datavalue?.value?.id).filter(Boolean)}
function yearFromClaims(claims){const t=(claims?.P577||[])[0]?.mainsnak?.datavalue?.value?.time;const m=typeof t==='string'?t.match(/[+-](\d{4})-/):null;return m?Number(m[1]):null}
async function labelsFor(ids){if(!ids.length)return{};const d=await apiGet(WD,{action:'wbgetentities',ids:[...new Set(ids)].join('|'),props:'labels',languages:'en'});const out={};for(const id of ids)out[id]=d?.entities?.[id]?.labels?.en?.value||'';return out}
function cleanTitle(t){return String(t||'').replace(/\s*\((?:\d{4}\s+)?film\)\s*$/i,'').trim()}
function firstSentences(s){return String(s||'').split(/(?<=[.!?])\s+/).slice(0,2).join(' ').trim()}

async function publicMovieSearch(query){
  const q=String(query||'').trim();if(q.length<2)return[];
  const s=await apiGet(WIKI,{action:'query',list:'search',srsearch:q+' film',srnamespace:'0',srlimit:'10'});
  let rows=(s?.query?.search||[]).filter(x=>/film/i.test(x.title||'')||/film|movie/i.test(String(x.snippet||'').replace(/<[^>]+>/g,'')));
  if(!rows.length)rows=(s?.query?.search||[]).slice(0,8);
  rows=rows.slice(0,8);if(!rows.length)return[];
  const titles=rows.map(x=>x.title);
  const p=await apiGet(WIKI,{action:'query',prop:'pageprops|extracts',redirects:'1',exintro:'1',explaintext:'1',titles:titles.join('|')});
  const pages=Object.values(p?.query?.pages||{});
  const qids=pages.map(x=>x?.pageprops?.wikibase_item).filter(Boolean);if(!qids.length)return[];
  const ed=await apiGet(WD,{action:'wbgetentities',ids:qids.join('|'),props:'claims|labels|descriptions',languages:'en'});
  const entities=ed?.entities||{};
  const related=[];for(const qid of qids){const e=entities[qid];related.push(...claimIds(e?.claims,'P57').slice(0,2),...claimIds(e?.claims,'P136').slice(0,3))}
  const lm=await labelsFor(related);
  const rank=new Map(titles.map((t,i)=>[t,i]));
  const out=[];
  for(const page of pages){const qid=page?.pageprops?.wikibase_item;const e=entities[qid];if(!e)continue;const desc=e?.descriptions?.en?.value||'';const filmish=/film|movie/i.test(desc)||/film/i.test(page.title||'');if(!filmish)continue;const dirs=claimIds(e.claims,'P57').slice(0,2);const genres=claimIds(e.claims,'P136').slice(0,3);const f={id:qid,title:cleanTitle(e?.labels?.en?.value||page.title),year:yearFromClaims(e.claims),director:dirs.map(id=>lm[id]).filter(Boolean).join(' & ')||null,genre:genres.map(id=>lm[id]).filter(Boolean).join(' / ')||null,blurb:firstSentences(page.extract||desc)||null,rt:null,poster:null,_rank:rank.get(page.title)??99};movieLookupCache.set(qid,f);out.push(f)}
  const norm=q.toLowerCase();
  out.sort((a,b)=>{const ax=a.title.toLowerCase(),bx=b.title.toLowerCase();const as=ax===norm?0:ax.startsWith(norm)?1:ax.includes(norm)?2:3;const bs=bx===norm?0:bx.startsWith(norm)?1:bx.includes(norm)?2:3;return as-bs||a._rank-b._rank});
  return out.slice(0,6).map(({_rank,...x})=>x);
}
async function omdbLookupTitle(title,year=null){const arr=await publicMovieSearch(title);if(!arr.length)return null;const norm=title.trim().toLowerCase();return arr.find(x=>x.title?.toLowerCase()===norm&&(!year||Number(x.year)===Number(year)))||arr.find(x=>!year||Number(x.year)===Number(year))||arr[0]}
async function omdbSearchMovies(query){return publicMovieSearch(query)}
async function omdbLookupId(id){return movieLookupCache.get(id)||null}
