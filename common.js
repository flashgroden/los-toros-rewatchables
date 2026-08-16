const MEMBERS=['Greg','Keith','David','Steele','Will'];
const OMDB_KEY='trilogy';

function mast(){return `<div class="mast"><div><a class="brand-link" href="list.html"><div class="brand">Los Toros</div><div class="sub">Rewatchables Movie Club</div></a></div><nav aria-label="Main navigation"><a href="list.html">The Board</a><a href="nominate.html">Nominate</a><a href="review.html">Rate a Film</a><a href="about.html">About</a></nav></div>`}
function memberOptions(includeGuest=true){return MEMBERS.map(n=>`<option>${n}</option>`).join('')+(includeGuest?'<option value="__guest">Guest / friend…</option>':'')}
function showMsg(el,msg,type='notice'){el.className=`notice ${type}`;el.textContent=msg;el.classList.remove('hide')}
function parseFilmLabel(s){const m=(s||'').match(/^(.*?)\s*\((\d{4})\)\s*$/);return m?{title:m[1].trim(),year:Number(m[2])}:{title:(s||'').trim(),year:null}}
function fmt(v){return v==null?'—':Number(v).toFixed(1)}

let ltDb=null;
try{if(window.supabase&&window.LT_CONFIG)ltDb=window.supabase.createClient(window.LT_CONFIG.SUPABASE_URL,window.LT_CONFIG.SUPABASE_KEY)}catch(err){console.error('Supabase init failed',err)}

async function omdbLookupTitle(title,year=null){
  const qs=new URLSearchParams({t:title,apikey:OMDB_KEY,plot:'short'});if(year)qs.set('y',year);
  const r=await fetch('https://www.omdbapi.com/?'+qs.toString());const d=await r.json();
  if(d.Response!=='True')return null;
  const rt=(d.Ratings||[]).find(x=>x.Source==='Rotten Tomatoes');
  return {id:d.imdbID,title:d.Title,year:parseInt(d.Year)||null,director:d.Director&&d.Director!=='N/A'?d.Director:null,genre:d.Genre&&d.Genre!=='N/A'?d.Genre:null,blurb:d.Plot&&d.Plot!=='N/A'?d.Plot:null,rt:rt?rt.Value:null,poster:d.Poster&&d.Poster!=='N/A'?d.Poster:null};
}
async function omdbSearchMovies(query){
  const r=await fetch('https://www.omdbapi.com/?'+new URLSearchParams({s:query,type:'movie',apikey:OMDB_KEY}).toString());const d=await r.json();
  if(d.Response!=='True'||!d.Search)return[];
  return d.Search.slice(0,8).map(x=>({id:x.imdbID,title:x.Title,year:parseInt(x.Year)||null,poster:x.Poster&&x.Poster!=='N/A'?x.Poster:null}));
}
async function omdbLookupId(id){
  const r=await fetch('https://www.omdbapi.com/?'+new URLSearchParams({i:id,apikey:OMDB_KEY,plot:'short'}).toString());const d=await r.json();
  if(d.Response!=='True')return null;const rt=(d.Ratings||[]).find(x=>x.Source==='Rotten Tomatoes');
  return {id:d.imdbID,title:d.Title,year:parseInt(d.Year)||null,director:d.Director&&d.Director!=='N/A'?d.Director:null,genre:d.Genre&&d.Genre!=='N/A'?d.Genre:null,blurb:d.Plot&&d.Plot!=='N/A'?d.Plot:null,rt:rt?rt.Value:null,poster:d.Poster&&d.Poster!=='N/A'?d.Poster:null};
}
