const MEMBERS=['Greg','Keith','David','Steele','Will'];

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

const movieLookupCache=new Map();
async function publicMovieSearch(query){
  if(!ltDb)throw new Error('Database client unavailable');
  const {data,error}=await ltDb.functions.invoke('movie-lookup',{body:{q:query}});
  if(error)throw error;
  const arr=data?.candidates||[];
  arr.forEach(x=>{if(x.id)movieLookupCache.set(x.id,x)});
  return arr;
}

// Kept under the old helper names so both Nominate and Rate-a-Film stay simple.
async function omdbLookupTitle(title,year=null){
  const arr=await publicMovieSearch(title);
  if(!arr.length)return null;
  const exact=arr.find(x=>x.title?.toLowerCase()===title.trim().toLowerCase() && (!year || Number(x.year)===Number(year)))
    || arr.find(x=>!year || Number(x.year)===Number(year))
    || arr[0];
  return {...exact,rt:null,poster:null};
}
async function omdbSearchMovies(query){
  return publicMovieSearch(query);
}
async function omdbLookupId(id){
  return movieLookupCache.get(id)||null;
}
