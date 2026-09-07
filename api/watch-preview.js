const SUPABASE_URL='https://lycoafboikmlwtioqssv.supabase.co';
const SUPABASE_KEY='sb_publishable_uJAJENVap2L47611QV7aTg_qAyarrZA';

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

module.exports=async function handler(req,res){
  const slug=String(req.query.slug||'').trim();
  if(!slug){res.status(400).send('Missing watch');return;}
  let title='Los Toros shared watch',year='',creator='A Toro';
  try{
    const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};
    const weUrl=`${SUPABASE_URL}/rest/v1/watch_events?share_slug=eq.${encodeURIComponent(slug)}&select=id,title,film_id,created_by&limit=1`;
    const wr=await fetch(weUrl,{headers});
    const wa=await wr.json();
    const w=wa&&wa[0];
    if(w){
      if(w.title) title=w.title;
      if(w.film_id){
        const fr=await fetch(`${SUPABASE_URL}/rest/v1/films?id=eq.${encodeURIComponent(w.film_id)}&select=title,year&limit=1`,{headers});
        const fa=await fr.json(); if(fa&&fa[0]){title=fa[0].title||title;year=fa[0].year||'';}
      }
      if(w.created_by){
        const pr=await fetch(`${SUPABASE_URL}/rest/v1/people?id=eq.${encodeURIComponent(w.created_by)}&select=display_name&limit=1`,{headers});
        const pa=await pr.json(); if(pa&&pa[0]?.display_name)creator=pa[0].display_name;
      }
    }
  }catch(e){}
  const filmLabel=`${title}${year?` (${year})`:''}`;
  const pageTitle=`${creator} scored ${filmLabel} — Los Toros`;
  const desc=`A fresh watch on Los Toros. Score it blind, then compare after you submit.`;
  const dest=`/review.html?watch=${encodeURIComponent(slug)}`;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=300');
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pageTitle)}</title><meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(pageTitle)}"><meta name="twitter:description" content="${esc(desc)}"><script>location.replace(${JSON.stringify(dest)})</script></head><body><p><a href="${esc(dest)}">Open ${esc(filmLabel)} on Los Toros</a></p></body></html>`);
};
