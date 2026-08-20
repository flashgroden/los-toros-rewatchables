const MEMBERS=['Greg','Keith','David','Steele','Will'];
const LT_BUILD='v1.0.4';

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
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

async function publicMovieSearch(query){
  const q=String(query||'').trim();
  if(q.length<2)return[];
  const search=await wikiGet({action:'query',list:'search',srsearch:q+' film',srnamespace:'0',srlimit:'12'});
  let rows=(search?.query?.search||[]).filter(r=>/film|movie/i.test((r.title||'')+' '+stripHtml(r.snippet||'')));
  rows=rows.slice(0,8);
  if(!rows.length)return[];

  const ids=rows.map(r=>r.pageid).join('|');
  const details=await wikiGet({action:'query',prop:'extracts',exintro:'1',explaintext:'1',pageids:ids});
  const pages=details?.query?.pages||{};
  const norm=q.toLowerCase();
  const out=rows.map((r,index)=>{
    const page=pages[r.pageid]||{};
    const extract=String(page.extract||'');
    const snippet=stripHtml(r.snippet||'');
    const title=cleanWikiTitle(r.title);
    const year=yearFromText(r.title,extract||snippet);
    const director=directorFromText(extract);
    const f={id:String(r.pageid),title,year,director,genre:null,blurb:(extract||snippet).split(/(?<=[.!?])\s+/).slice(0,2).join(' ').trim()||null,rt:null,poster:null,_rank:index};
    movieLookupCache.set(f.id,f);
    return f;
  });

  out.sort((a,b)=>{
    const ax=a.title.toLowerCase(),bx=b.title.toLowerCase();
    const as=ax===norm?0:ax.startsWith(norm)?1:ax.includes(norm)?2:3;
    const bs=bx===norm?0:bx.startsWith(norm)?1:bx.includes(norm)?2:3;
    return as-bs||a._rank-b._rank;
  });
  const seen=new Set();
  return out.filter(f=>{const k=(f.title+'|'+(f.year||'')).toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).slice(0,6).map(({_rank,...f})=>f);
}

async function omdbLookupTitle(title,year=null){const arr=await publicMovieSearch(title);if(!arr.length)return null;const norm=title.trim().toLowerCase();return arr.find(x=>x.title?.toLowerCase()===norm&&(!year||Number(x.year)===Number(year)))||arr.find(x=>!year||Number(x.year)===Number(year))||arr[0]}
async function omdbSearchMovies(query){return publicMovieSearch(query)}
async function omdbLookupId(id){return movieLookupCache.get(String(id))||null}
