const MEMBERS=['Greg','Keith','David','Steele','Will'];
const LT_BUILD='v1.0.5';

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a><a href="how-it-works.html">How It Works</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Someone else…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

const movieLookupCache=new Map();
const WIKI='https://en.wikipedia.org/w/api.php';
async function wikiGet(params){const qs=new URLSearchParams({...params,format:'json',origin:'*'});const r=await fetch(WIKI+'?'+qs.toString());if(!r.ok)throw new Error('Movie lookup request failed');return r.json()}
function stripHtml(s){const el=document.createElement('textarea');el.innerHTML=String(s||'').replace(/<[^>]*>/g,' ');return el.value.replace(/\s+/g,' ').trim()}
function cleanWikiTitle(t){return String(t||'').replace(/\s*\((?:\d{4}\s+)?film\)\s*$/i,'').trim()}
function yearFromText(title,text){const tm=String(title||'').match(/\((18|19|20)\d{2}\s+film\)/i);if(tm)return Number(tm[0].match(/\d{4}/)[0]);const m=String(text||'').match(/\b(18|19|20)\d{2}\b/);return m?Number(m[0]):null}
function directorFromText(text){const m=String(text||'').match(/directed by ([^.;]+?)(?:,| and starring| starring|\. |$)/i);return m?m[1].trim():null}
function isFilmPage(title,extract,snippet=''){const s=(title+' '+extract+' '+snippet).toLowerCase();return /\(.*film\)/i.test(title)||/\b(is|was) (an? |the )?.{0,35}(film|movie|documentary)\b/.test(s)||/\bfilm directed by\b/.test(s)}

async function publicMovieSearch(query){
  const q=String(query||'').trim();if(q.length<2)return[];
  const [prefix,search]=await Promise.all([
    wikiGet({action:'query',list:'prefixsearch',pssearch:q,psnamespace:'0',pslimit:'15'}),
    wikiGet({action:'query',list:'search',srsearch:`intitle:${q} film`,srnamespace:'0',srlimit:'12'})
  ]);
  const merged=[];const seenIds=new Set();
  for(const r of [...(prefix?.query?.prefixsearch||[]),...(search?.query?.search||[])]){if(!r?.pageid||seenIds.has(r.pageid))continue;seenIds.add(r.pageid);merged.push(r)}
  if(!merged.length)return[];
  const ids=merged.map(r=>r.pageid).join('|');
  const details=await wikiGet({action:'query',prop:'extracts',exintro:'1',explaintext:'1',pageids:ids});
  const pages=details?.query?.pages||{};const norm=q.toLowerCase();const out=[];
  for(let index=0;index<merged.length;index++){
    const r=merged[index],page=pages[r.pageid]||{},extract=String(page.extract||''),snippet=stripHtml(r.snippet||'');
    if(!isFilmPage(r.title,extract,snippet))continue;
    const title=cleanWikiTitle(r.title),year=yearFromText(r.title,extract||snippet),director=directorFromText(extract);
    const low=title.toLowerCase();const titleRank=low===norm?0:low.startsWith(norm)?1:low.includes(norm)?2:4;
    const f={id:String(r.pageid),title,year,director,genre:null,blurb:(extract||snippet).split(/(?<=[.!?])\s+/).slice(0,2).join(' ').trim()||null,rt:null,poster:null,_rank:titleRank*100+index};movieLookupCache.set(f.id,f);out.push(f)
  }
  out.sort((a,b)=>a._rank-b._rank);
  const seen=new Set();return out.filter(f=>{const k=(f.title+'|'+(f.year||'')).toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).slice(0,6).map(({_rank,...f})=>f)
}
async function omdbLookupTitle(title,year=null){const arr=await publicMovieSearch(title);if(!arr.length)return null;const norm=title.trim().toLowerCase();return arr.find(x=>x.title?.toLowerCase()===norm&&(!year||Number(x.year)===Number(year)))||arr.find(x=>!year||Number(x.year)===Number(year))||arr[0]}
async function omdbSearchMovies(query){return publicMovieSearch(query)}
async function omdbLookupId(id){return movieLookupCache.get(String(id))||null}
