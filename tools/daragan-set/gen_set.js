const DG=require('../../js/daragan.js'), J=require('../../js/jyotish.js'), M=require('../../js/muhurta.js');
const chart=J.computeChart({y:1984,m:4,d:27,hh:0,mm:40,tz:4,lat:43.02,lon:44.68});
const nat=DG.natalTrop(chart);
const LABEL={general:'важное дело',love:'любовь',children:'дети',money:'деньги',career:'карьера',realty:'дом',travel:'поездки/учёба',social:'встречи',health:'здоровье'};
const f=x=>{const d=new Date(x+3*3600000);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');};
const orbOf=t=>{const m=/орб ([0-9.]+)°/.exec(t);return m?+m[1]:99;};
const out={};
let Y=2026, Mo=10;
for(let mi=0; mi<12; mi++){
  const dim=new Date(Date.UTC(Y,Mo,0)).getUTCDate();
  const days=[];
  for(let d=1; d<=dim; d++){
    const off=Math.round((Date.UTC(Y,Mo-1,d)-Date.UTC(2026,8,26))/86400000);
    const base=M.dayAt(43.02,44.68,3,'general',off,30);
    if(!base){ continue; }
    const sr=base.sunrise.getTime(), ss=base.sunset.getTime();
    const noon=new Date((sr+ss)/2);
    const snap=DG.daily(chart,noon);
    const good=[], badG={}, midG={}; let sup=0, total=0;
    Object.keys(LABEL).forEach(k=>{
      const t=DG.dailyTheme(nat,k,noon); total+=t.score;
      if(t.score>=1){
        const wins=DG.themeWindows(nat,k,sr,ss,30);
        if(t.score>=2 || wins.length){
          sup++;
          const w=wins.sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
          good.push({kind:'good', text: LABEL[k]+': '+(w? f(w.start)+'–'+f(w.end)+' ('+w.nak+')' : 'весь день (аспекты дня)')});
          return;
        }
      }
      if(t.score<=-2){
        const warn=(t.warns.slice().sort((a,b)=>orbOf(a)-orbOf(b))[0]||'напряжение по теме');
        const key=warn.replace(/ \(орб [0-9.]+°\)/,'');
        if((t.period||0)>=1){ (midG[key]=midG[key]||{warn,labels:[]}).labels.push(LABEL[k]); }
        else { (badG[key]=badG[key]||{warn,labels:[]}).labels.push(LABEL[k]); }
      }
    });
    const lines=[...good];
    Object.values(badG).forEach(g=>lines.push({kind:'bad', text:'не начинайте новое: '+g.labels.join(', ')+' — '+g.warn}));
    Object.values(midG).forEach(g=>lines.push({kind:'mid', text:'⚠ осторожность: '+g.labels.join(', ')+' — '+g.warn}));
    if(!lines.length) lines.push({kind:'mid', text:'особой поддержки нет: день как обычно'});
    const stars=Math.max(1,Math.min(5,3+Math.round(total/8)));
    days.push({d, vara:base.vara, stars, lunarText:'Луна: '+snap.moonSign+' · '+snap.moonPhase, lines, timeLine:'мухурта Дарагана: тем с поддержкой — '+sup});
  }
  out[Y+'-'+String(Mo).padStart(2,'0')]=days;
  Mo++; if(Mo>12){Mo=1;Y++;}
}
require('fs').writeFileSync(__dirname+'/set.json', JSON.stringify(out));
console.log('months:', Object.keys(out).length, '| days total:', Object.values(out).reduce((s,a)=>s+a.length,0));
