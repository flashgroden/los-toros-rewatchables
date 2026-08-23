window.LT_CONFIG={SUPABASE_URL:'https://lycoafboikmlwtioqssv.supabase.co',SUPABASE_KEY:'sb_publishable_uJAJENVap2L47611QV7aTg_qAyarrZA'};

// Live club-watch hotfix: don't let the 5-second status poll redraw the score form
// while a member is entering scores, and don't prefill accidental 7.0 scores.
if(location.pathname.startsWith('/club/')||location.pathname==='/club-watch.html'){
  const nativeSetInterval=window.setInterval.bind(window);
  window.setInterval=function(fn,ms,...args){
    return nativeSetInterval(function(...cbArgs){
      const scoringForm=document.getElementById('form');
      if(scoringForm&&scoringForm.querySelector('.score-entry input[type="number"]')) return;
      return fn(...cbArgs);
    },ms,...args);
  };
  const clearClubScoreDefaults=()=>{
    document.querySelectorAll('.score-entry input[type="number"]').forEach(input=>{
      if(input.value==='7.0'||input.value==='7') input.value='';
      input.placeholder='—';
    });
  };
  new MutationObserver(clearClubScoreDefaults).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',clearClubScoreDefaults);
}