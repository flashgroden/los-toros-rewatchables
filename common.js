const MEMBERS=['Greg','Keith','David','Steele','Will'];
const LT_BUILD='v1.1.3';

function currentPerson(){const n=localStorage.getItem('lt_person');return MEMBERS.includes(n)?n:null}
function setCurrentPerson(name){if(MEMBERS.includes(name)){localStorage.setItem('lt_person',name);window.dispatchEvent(new CustomEvent('lt-person-changed',{detail:name}))}else localStorage.removeItem('lt_person')}
function identityControl(){const who=currentPerson();return `<div class="lt-identity" style="margin-top:10px;font-size:.9rem"><span class="meta">You:</span> <select id="ltIdentity" aria-label="Who are you?"><option value="">Pick your name…</option>${MEMBERS.map(n=>`<option value="${n}"${n===who?' selected':''}>${n}</option>`).join('')}</select>${who?` <button type="button" id="ltSwitch" class="link-btn" style="border:0;background:none;text-decoration:underline;cursor:pointer">switch</button>`:''}</div>`}
function wireIdentity(){const s=document.getElementById('ltIdentity');if(!s)return;s.onchange=()=>{if(s.value){setCurrentPerson(s.value);location.reload()}};const b=document.getElementById('ltSwitch');if(b)b.onclick=()=>{localStorage.removeItem('lt_person');location.reload()}}
function navClass(paths){const p=(location.pathname.split('/').pop()||'list.html').toLowerCase();return paths.includes(p)?' class="nav-active" aria-current="page"':''}
function mast(){setTimeout(wireIdentity,0);return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a>${identityControl()}</div><nav aria-label="Main navigation"><a${navClass(['','list.html'])} href="list.html">The Board</a><a${navClass(['critics.html','director-ladder.html'])} href="critics.html">Critics</a><a${navClass(['nominate.html','support.html','pick.html'])} href="nominate.html">Nominate</a><a${navClass(['review.html','score.html','club-watch.html','finish.html','recalibrate.html'])} href="review.html">Rate a Film</a><a${navClass(['about.html'])} href="about.html">About</a><a${navClass(['how-it-works.html'])} href="how-it-works.html">How It Works</a></nav></div>`}
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
