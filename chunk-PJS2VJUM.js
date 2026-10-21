import{d as fe}from"./chunk-YXZVD6G4.js";import{A as me,G as ue,H as $e,g as se,n as ye,v as xe,z as ge}from"./chunk-QAQEF4Q6.js";import{$a as C,Ba as V,Da as I,Fa as k,La as ae,Na as W,Pa as w,Qa as j,Ra as _,T as ne,Wa as J,Xa as N,Y as h,aa as ce,ab as v,bb as X,ga as oe,kb as de,m as F,ma as L,na as P,nb as he,oa as O,pb as pe,qa as z,qb as be,r as B,ra as D,s as R,sa as T,t as E,ta as G,u as re,ua as g,va as m,wa as S}from"./chunk-STN5WYNJ.js";import"./chunk-3NAQCYEU.js";var Le=e=>({count:e}),Pe=()=>["left","right"],Oe=e=>[e],Ze=()=>[0,45,90,135,180,225,270,315],ve=(e,t)=>t.id,De=(e,t)=>t.key;function Te(e,t){if(e&1&&(g(0,"span",5),S(1,"lucide-icon",23),w(2),C(3,"translate"),m()),e&2){let i=k();h(),G("img",i.Check)("strokeWidth",4),h(),_(" ",v(3,3,"calendar.completed")," ")}}function Ge(e,t){if(e&1&&S(0,"span",24),e&2){let i=t.$index,l=k();W("on",i<l.found.length)}}function Ee(e,t){if(e&1&&(g(0,"span")(1,"span",11),w(2),C(3,"translate"),m(),g(4,"span",12),w(5),m()()),e&2){let i=k();h(2),_("",v(3,2,"challenges.spotDifference.best"),":"),h(3),j(i.bestLabel)}}function Ie(e,t){if(e&1&&S(0,"div",26),e&2){let i=k().$implicit,l=k();G("innerHTML",i==="left"?l.leftHtml:l.rightHtml,ne)}}function Ae(e,t){if(e&1&&(E(),g(0,"g"),S(1,"circle",30),m()),e&2){let i=k(2);L("transform","translate("+i.hint.x+" "+i.hint.y+")"),h(),L("r",i.hint.r*1.7)}}function He(e,t){if(e&1&&(E(),S(0,"line",34)),e&2){let i=t.$implicit,l=k().$implicit;L("y1",-(l.r+6))("y2",-(l.r+13))("transform","rotate("+i+")")}}function Fe(e,t){if(e&1&&(E(),g(0,"g",28),S(1,"circle",31)(2,"circle",32)(3,"ellipse",33),D(4,He,1,3,":svg:line",34,z),m()),e&2){let i=t.$implicit;L("transform","translate("+i.x+" "+i.y+")"),h(),L("r",i.r+2),h(),L("r",i.r+2),h(),L("rx",i.r+4)("ry",i.r+1),h(),T(J(5,Ze))}}function Be(e,t){if(e&1&&(E(),g(0,"g")(1,"g",35),S(2,"circle",36),g(3,"text",37),w(4,"\u2744"),m(),g(5,"text",38),w(6,"+3s"),m()()()),e&2){let i=k().$implicit;L("transform","translate("+i.x+" "+i.y+")")}}function Re(e,t){if(e&1&&P(0,Be,7,1,":svg:g"),e&2){let i=t.$implicit,l=k().$implicit;O(i.side===l?0:-1)}}function ze(e,t){e&1&&(w(0),C(1,"translate")),e&2&&_(" ",v(1,1,"challenges.spotDifference.original")," ")}function Ve(e,t){if(e&1&&(w(0),C(1,"translate")),e&2){let i=k(2);_(" \u2728 ",X(1,1,"challenges.spotDifference.changed",N(4,Le,i.active.length-i.found.length))," ")}}function We(e,t){if(e&1){let i=V();g(0,"div",25,0),I("pointerdown",function(a){let f=B(i).$implicit,s=ae(1),d=k();return R(d.tap(a,s,f))}),D(2,Ie,1,1,"div",26,z),E(),g(4,"svg",27),P(5,Ae,2,2,":svg:g"),D(6,Fe,6,6,":svg:g",28,ve),D(8,Re,1,1,null,null,De),m(),re(),g(10,"span",29),P(11,ze,2,3)(12,Ve,2,6),m()()}if(e&2){let i=t.$implicit,l=k();L("data-side",i),h(2),T(N(6,Oe,l.sceneKey)),h(2),L("viewBox","0 0 "+l.W+" "+l.H),h(),O(l.hint?5:-1),h(),T(l.found),h(2),T(l.misses),h(2),W("tag-changed",i==="right"),h(),O(i==="left"?11:12)}}function je(e,t){e&1&&(g(0,"div",16),w(1),C(2,"translate"),m()),e&2&&(h(),_("\u2728 ",v(2,1,"challenges.spotDifference.win")," \u2728"))}function Ne(e,t){if(e&1){let i=V();g(0,"button",39),I("click",function(){B(i);let a=k();return R(a.showReward())}),w(1),C(2,"translate"),m()}e&2&&(h(),_(" ",v(2,1,"ui.showReward")," "))}function qe(e,t){if(e&1){let i=V();g(0,"button",40),I("click",function(){B(i);let a=k();return R(a.shuffle())}),S(1,"lucide-icon",20),w(2),C(3,"translate"),m()}if(e&2){let i=k();h(),G("img",i.Shuffle)("strokeWidth",2.25),h(),_(" ",v(3,3,"challenges.spotDifference.newSet")," ")}}var A=400,K=300,Ke=3,we=24,q=[659.25,783.99,880,987.77,1046.5,1174.66,1318.51,1567.98,1760];function ke(e,t,i,l=0){let a=null,f=1/0;for(let s of e){let d=Math.hypot(s.x-t,s.y-i)/Math.max(s.r,l);d<=1&&d<f&&(a=s,f=d)}return a}var Me=class e{config={};isCompleted=!1;day;levelId;completed=new ce;Check=ye;Lightbulb=xe;RotateCcw=ge;Shuffle=me;W=A;H=K;stateService=F(de);sound=F(be);sanitizer=F(fe);scene;active=[];found=[];misses=[];missCount=0;hint=null;hintsUsed=0;leftHtml="";rightHtml="";won=!1;seconds=0;bestTime=null;sceneKey=0;startedAt=Date.now();penalty=0;missKey=0;tick=null;timers=[];get remaining(){return this.active.filter(t=>!this.found.includes(t))}get canShuffle(){return!Array.isArray(this.config?.differences)&&this.active.length<this.scene.diffs.length}get timeLabel(){return _e(this.seconds)}get bestLabel(){return this.bestTime===null?"":_e(this.bestTime)}ngOnInit(){this.scene=Ce.find(l=>l.id===this.config?.scene)??Ce[0];let t=this.statsKey,i=t?this.stateService.getGameStats(t):null;this.bestTime=typeof i?.bestTime=="number"?i.bestTime:null,this.newRound(!0),this.tick=setInterval(()=>this.updateClock(),250)}ngOnDestroy(){this.tick&&clearInterval(this.tick),this.timers.forEach(clearTimeout)}tap(t,i,l){if(this.won||t.pointerType==="mouse"&&t.button!==0)return;let a=i.getBoundingClientRect();if(!a.width)return;let f=a.width/A,s=(t.clientX-a.left)/a.width*A,d=(t.clientY-a.top)/a.height*K;if(ke(this.found,s,d,we/f))return;let u=ke(this.remaining,s,d,we/f);u?this.markFound(u):this.registerMiss(s,d,l)}showHint(){if(this.won)return;let t=this.remaining[0];t&&(this.hintsUsed++,this.hint=null,this.later(()=>this.hint=t,20),this.later(()=>{this.hint===t&&(this.hint=null)},3600))}restart(){this.newRound(!1)}shuffle(){this.newRound(!0)}showReward(){this.completed.emit()}newRound(t){if(this.timers.forEach(clearTimeout),this.timers=[],t||!this.active.length){this.active=this.pickDifferences();let i=new Set(this.active.map(l=>l.id));this.leftHtml=this.sanitizer.bypassSecurityTrustHtml(this.scene.render("sdL",()=>!1)),this.rightHtml=this.sanitizer.bypassSecurityTrustHtml(this.scene.render("sdR",l=>i.has(l)))}this.found=[],this.misses=[],this.missCount=0,this.hint=null,this.hintsUsed=0,this.won=!1,this.penalty=0,this.seconds=0,this.startedAt=Date.now(),this.sceneKey++}pickDifferences(){let t=this.scene.diffs,i=this.config?.differences;if(Array.isArray(i)){let f=t.filter(s=>i.includes(s.id));if(f.length)return f}let l=Math.max(3,Math.min(t.length,typeof i=="number"?i:6)),a=[...t.filter(f=>!f.subtle).sort(()=>Math.random()-.5),...t.filter(f=>f.subtle).sort(()=>Math.random()-.5)];return t.filter(f=>a.slice(0,l).includes(f))}markFound(t){this.found=[...this.found,t],this.hint===t&&(this.hint=null);let i=this.found.length-1;this.sound.bell(q[i%q.length],.2),this.sound.bell(q[(i+2)%q.length],.08,.09),this.found.length===this.active.length&&this.onWin()}registerMiss(t,i,l){this.missCount++,this.penalty+=Ke,this.updateClock();let a={key:++this.missKey,x:t,y:i,side:l};this.misses=[...this.misses,a],this.sound.thud(),this.later(()=>this.misses=this.misses.filter(f=>f!==a),1100)}onWin(){this.updateClock(),this.won=!0,this.hint=null,this.later(()=>this.sound.fanfare(),350);let t=this.statsKey;if(t){let i=this.bestTime===null?this.seconds:Math.min(this.bestTime,this.seconds);this.bestTime=i,this.stateService.saveGameStats(t,{bestTime:i,misses:this.missCount})}this.later(()=>this.completed.emit(),2e3)}updateClock(){this.won||(this.seconds=Math.floor((Date.now()-this.startedAt)/1e3)+this.penalty)}get statsKey(){return this.day??this.levelId}later(t,i){this.timers.push(setTimeout(t,i))}static \u0275fac=function(i){return new(i||e)};static \u0275cmp=oe({type:e,selectors:[["app-spot-difference-challenge"]],inputs:{config:"config",isCompleted:"isCompleted",day:"day",levelId:"levelId"},outputs:{completed:"completed"},decls:43,vars:37,consts:[["board",""],[1,"spot"],[1,"flex","flex-col","items-center","text-center","mb-2","sm:mb-3"],[1,"flex","items-center","justify-center","gap-3","mb-1","flex-wrap"],[1,"game-title"],[1,"pill"],[1,"text-sm","sm:text-base","text-text-muted","max-w-xl"],[1,"hud"],[1,"found-dots"],[1,"dot",3,"on"],[1,"flex","gap-4","text-sm","sm:text-base"],[1,"text-text-muted"],[1,"text-gold","font-bold","ml-1","tabular-nums"],[1,"text-gold","font-bold","ml-1"],[1,"boards"],[1,"board"],[1,"win-banner"],[1,"actions"],["type","button",1,"btn","btn-primary","w-full","sm:w-auto"],["type","button",1,"btn","btn-outline","flex","items-center","justify-center","gap-2",3,"click","disabled"],[1,"w-4","h-4",3,"img","strokeWidth"],["type","button",1,"btn","btn-outline","flex","items-center","justify-center","gap-2",3,"click"],["type","button",1,"btn","btn-secondary","flex","items-center","justify-center","gap-2"],[1,"w-3","h-3",3,"img","strokeWidth"],[1,"dot"],[1,"board",3,"pointerdown"],[1,"scene",3,"innerHTML"],["aria-hidden","true",1,"overlay"],[1,"found"],[1,"tag"],[1,"hint"],[1,"ring-glow"],["pathLength","1","transform","rotate(-90)",1,"ring"],["pathLength","1","transform","rotate(-70)",1,"ring","ring-2"],["x1","0","x2","0","pathLength","1",1,"ray"],[1,"miss"],["r","11",1,"miss-bg"],["y","5","text-anchor","middle",1,"miss-flake"],["y","-14","text-anchor","middle",1,"miss-text"],["type","button",1,"btn","btn-primary","w-full","sm:w-auto",3,"click"],["type","button",1,"btn","btn-secondary","flex","items-center","justify-center","gap-2",3,"click"]],template:function(i,l){i&1&&(g(0,"div",1)(1,"div",2)(2,"div",3)(3,"h3",4),w(4),C(5,"translate"),m(),P(6,Te,4,5,"span",5),m(),g(7,"p",6),w(8),C(9,"translate"),m()(),g(10,"div",7)(11,"div",8),D(12,Ge,1,2,"span",9,ve),m(),g(14,"div",10)(15,"span")(16,"span",11),w(17),C(18,"translate"),m(),g(19,"span",12),w(20),m()(),g(21,"span")(22,"span",11),w(23),C(24,"translate"),m(),g(25,"span",13),w(26),m()(),P(27,Ee,6,4,"span"),m()(),g(28,"div",14),D(29,We,13,8,"div",15,z),P(31,je,3,3,"div",16),m(),g(32,"div",17),P(33,Ne,3,3,"button",18),g(34,"button",19),I("click",function(){return l.showHint()}),S(35,"lucide-icon",20),w(36),C(37,"translate"),m(),g(38,"button",21),I("click",function(){return l.restart()}),S(39,"lucide-icon",20),w(40),C(41,"translate"),m(),P(42,qe,4,5,"button",22),m()()),i&2&&(h(4),_(" \u{1F50E} ",v(5,21,"challenges.spotDifference.title")," "),h(2),O(l.isCompleted?6:-1),h(2),_(" ",X(9,23,"challenges.spotDifference.instruction",N(34,Le,l.active.length))," "),h(3),L("aria-label",l.found.length+" / "+l.active.length),h(),T(l.active),h(5),_("",v(18,26,"challenges.spotDifference.time"),":"),h(3),j(l.timeLabel),h(3),_("",v(24,28,"challenges.spotDifference.misses"),":"),h(3),j(l.missCount),h(),O(l.bestTime!==null?27:-1),h(),W("won",l.won),h(),T(J(36,Pe)),h(2),O(l.won?31:-1),h(2),O(l.isCompleted&&!l.won?33:-1),h(),G("disabled",l.won),h(),G("img",l.Lightbulb)("strokeWidth",2.25),h(),_(" ",v(37,30,"ui.showHint")," "),h(3),G("img",l.RotateCcw)("strokeWidth",2.25),h(),_(" ",v(41,32,"ui.reset")," "),h(2),O(l.canShuffle?42:-1))},dependencies:[se,pe,$e,ue,he],styles:["[_nghost-%COMP%]{display:block}.spot[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center}.hud[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 18px;margin-bottom:8px}.found-dots[_ngcontent-%COMP%]{display:flex;gap:6px}.found-dots[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%]{width:14px;height:14px;border-radius:50%;background:#ffffff14;border:1.5px dashed rgba(247,200,115,.45);transition:background .3s,border-color .3s,box-shadow .3s}.found-dots[_ngcontent-%COMP%]   .dot.on[_ngcontent-%COMP%]{border:1.5px solid #ffe3a3;background:radial-gradient(circle at 35% 30%,#fff6d8,var(--color-gold) 55%,#c98a2e);box-shadow:0 0 10px #f7c873cc;animation:_ngcontent-%COMP%_dotPop .45s var(--ease-bounce)}@keyframes _ngcontent-%COMP%_dotPop{0%{transform:scale(.3)}to{transform:none}}.boards[_ngcontent-%COMP%]{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}.board[_ngcontent-%COMP%]{position:relative;width:min(100%,(100dvh - 262px) / 1.5 * 1.3333);aspect-ratio:4/3;border-radius:16px;overflow:hidden;cursor:crosshair;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;background:#1a1030;box-shadow:0 0 0 2px #f7c87359,0 0 0 6px #140c1e99,0 16px 40px -12px #000c}@media (min-width: 768px){.boards[_ngcontent-%COMP%]{flex-direction:row;justify-content:center;gap:16px}.board[_ngcontent-%COMP%]{width:min(50% - 8px,(100dvh - 290px) * 1.3333)}}@media (min-width: 1024px){.board[_ngcontent-%COMP%]{width:min(50% - 8px,(90vh - 262px) * 1.3333)}}.scene[_ngcontent-%COMP%]{position:absolute;inset:0;pointer-events:none}.scene[_ngcontent-%COMP%]     svg{display:block;width:100%;height:100%}.overlay[_ngcontent-%COMP%]{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.tag[_ngcontent-%COMP%]{position:absolute;left:8px;top:8px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.02em;color:var(--color-text);background:#05071a99;border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:none}.tag.tag-changed[_ngcontent-%COMP%]{color:#3a1d06;background:linear-gradient(180deg,#ffe3a3,var(--color-gold));border-color:transparent}.found[_ngcontent-%COMP%]   *[_ngcontent-%COMP%]{transform-box:fill-box;transform-origin:center}.ring[_ngcontent-%COMP%]{fill:none;stroke:#ffd772;stroke-width:3.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;filter:drop-shadow(0 0 3px rgba(255,200,90,.9));animation:_ngcontent-%COMP%_draw .55s cubic-bezier(.6,.1,.3,1) forwards}.ring.ring-2[_ngcontent-%COMP%]{stroke:#fff3c4;stroke-width:1.3;opacity:.8;animation-delay:.18s}.ring-glow[_ngcontent-%COMP%]{fill:#ffd77224;animation:_ngcontent-%COMP%_glowIn .6s ease-out both}.ray[_ngcontent-%COMP%]{stroke:#fff3c4;stroke-width:2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;opacity:0;animation:_ngcontent-%COMP%_ray .7s .35s ease-out}@keyframes _ngcontent-%COMP%_draw{to{stroke-dashoffset:0}}@keyframes _ngcontent-%COMP%_glowIn{0%{opacity:0}}@keyframes _ngcontent-%COMP%_ray{0%{opacity:1;stroke-dashoffset:1}50%{opacity:1;stroke-dashoffset:0}to{opacity:0;stroke-dashoffset:-1}}.hint[_ngcontent-%COMP%]{fill:#7fb8ff2e;stroke:#cfe6ff;stroke-width:2;stroke-dasharray:5 4;transform-box:fill-box;transform-origin:center;animation:_ngcontent-%COMP%_hintPulse 1.1s ease-in-out 3,_ngcontent-%COMP%_hintSpin 3.3s linear}@keyframes _ngcontent-%COMP%_hintPulse{0%,to{transform:scale(.85);opacity:.55}50%{transform:scale(1.12);opacity:1}}@keyframes _ngcontent-%COMP%_hintSpin{to{stroke-dashoffset:-60}}.miss[_ngcontent-%COMP%]{transform-box:fill-box;transform-origin:center;animation:_ngcontent-%COMP%_miss 1.1s ease-out forwards}.miss-bg[_ngcontent-%COMP%]{fill:#0a0f248c;stroke:#cfe6ffcc;stroke-width:1.2}.miss-flake[_ngcontent-%COMP%]{font-size:15px;fill:#cfe6ff}.miss-text[_ngcontent-%COMP%]{font-size:11px;font-weight:800;fill:#ffb3be;paint-order:stroke;stroke:#05071acc;stroke-width:3px}@keyframes _ngcontent-%COMP%_miss{0%{transform:scale(.3) rotate(-30deg);opacity:0}18%{transform:scale(1.15);opacity:1}70%{transform:scale(1);opacity:1}to{transform:translateY(-6px) scale(.9);opacity:0}}.boards.won[_ngcontent-%COMP%]   .board[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_boardWin 1s ease-out}@keyframes _ngcontent-%COMP%_boardWin{40%{box-shadow:0 0 0 3px #ffe3a3,0 0 40px 8px #f7c873b3}}.win-banner[_ngcontent-%COMP%]{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;padding:10px 22px;border-radius:999px;font-family:var(--font-display);font-weight:700;font-size:1.1rem;color:#3a1d06;background:linear-gradient(180deg,#ffe3a3,var(--color-gold));box-shadow:0 0 40px #f7c873cc;animation:_ngcontent-%COMP%_bannerIn .6s var(--ease-bounce) both;pointer-events:none;z-index:2}@keyframes _ngcontent-%COMP%_bannerIn{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}}.actions[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}.actions[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{padding:.45rem .9rem}.scene[_ngcontent-%COMP%]     .sd-twinkle{animation:_ngcontent-%COMP%_sdTwinkle 2.4s ease-in-out infinite alternate}.scene[_ngcontent-%COMP%]     .sd-snow{animation:_ngcontent-%COMP%_sdFall 8s linear infinite}.scene[_ngcontent-%COMP%]     .sd-flame{transform-box:fill-box;transform-origin:50% 100%;animation:_ngcontent-%COMP%_sdFlame .9s ease-in-out infinite alternate}.scene[_ngcontent-%COMP%]     .sd-candle{transform-box:fill-box;transform-origin:50% 100%;animation:_ngcontent-%COMP%_sdFlame .7s ease-in-out infinite alternate}.scene[_ngcontent-%COMP%]     .sd-glow{animation:_ngcontent-%COMP%_sdGlow 2.2s ease-in-out infinite alternate}.scene[_ngcontent-%COMP%]     .sd-ember{animation:_ngcontent-%COMP%_sdEmber 2.2s ease-out infinite}.scene[_ngcontent-%COMP%]     .sd-smoke{transform-box:fill-box;transform-origin:center;animation:_ngcontent-%COMP%_sdSmoke 4s ease-out infinite}.scene[_ngcontent-%COMP%]     .sd-pendulum{transform-box:view-box;animation:_ngcontent-%COMP%_sdSwing 1.6s ease-in-out infinite alternate}.scene[_ngcontent-%COMP%]     .sd-hammer{transform-box:view-box;animation:_ngcontent-%COMP%_sdHammer .9s ease-in-out infinite}.scene[_ngcontent-%COMP%]     .sd-aurora{animation:_ngcontent-%COMP%_sdAurora 7s ease-in-out infinite alternate}@keyframes _ngcontent-%COMP%_sdTwinkle{0%{opacity:.25}to{opacity:1}}@keyframes _ngcontent-%COMP%_sdFall{0%{transform:translate(0)}to{transform:translate(var(--drift, 0px),var(--fall, 300px))}}@keyframes _ngcontent-%COMP%_sdFlame{0%{transform:scaleY(.88) skew(-2deg)}to{transform:scale(.94,1.08) skew(2deg)}}@keyframes _ngcontent-%COMP%_sdGlow{0%{opacity:.75}to{opacity:1}}@keyframes _ngcontent-%COMP%_sdEmber{0%{transform:translate(0);opacity:1}to{transform:translate(4px,-28px);opacity:0}}@keyframes _ngcontent-%COMP%_sdSmoke{0%{transform:translate(0) scale(.6);opacity:.8}to{transform:translate(10px,-30px) scale(1.4);opacity:0}}@keyframes _ngcontent-%COMP%_sdSwing{0%{transform:rotate(-14deg)}to{transform:rotate(14deg)}}@keyframes _ngcontent-%COMP%_sdHammer{0%,to{transform:rotate(-28deg)}55%{transform:rotate(6deg)}65%{transform:rotate(2deg)}}@keyframes _ngcontent-%COMP%_sdAurora{0%{opacity:.6;transform:translate(-8px)}to{opacity:1;transform:translate(8px)}}@media (prefers-reduced-motion: reduce){.scene[_ngcontent-%COMP%]     *{animation:none!important}}"]})};function _e(e){let t=Math.floor(e/60),i=e%60;return`${t}:${i.toString().padStart(2,"0")}`}function U(e){let t=e;return()=>{t=t+1831565813|0;let i=Math.imul(t^t>>>15,1|t);return i=i+Math.imul(i^i>>>7,61|i)^i,((i^i>>>14)>>>0)/4294967296}}var p=e=>Math.round(e*10)/10;function Y(e,t,i,l,a=""){let f=[];for(let s=0;s<10;s++){let d=s%2?i*.45:i,u=-Math.PI/2+s*Math.PI/5;f.push(`${p(e+d*Math.cos(u))},${p(t+d*Math.sin(u))}`)}return`<polygon points="${f.join(" ")}" fill="${l}" ${a}/>`}function Qe(e,t,i,l){return`<circle cx="${t}" cy="${i}" r="${l*2.6}" fill="url(#${e}glow)" opacity="0.9"/>
    <path d="M${t} ${i-l} Q${t+l*.18} ${i-l*.18} ${t+l} ${i} Q${t+l*.18} ${i+l*.18} ${t} ${i+l} Q${t-l*.18} ${i+l*.18} ${t-l} ${i} Q${t-l*.18} ${i-l*.18} ${t} ${i-l} Z" fill="#fffbe8" class="sd-twinkle"/>`}function ee(e,t,i,l,a,f,s=1.6){let d=U(e),u="";for(let M=0;M<t;M++){let r=p(i+d()*a),n=p(l-10-d()*20),o=p(.6+d()*s),x=p(5+d()*6),b=p(-d()*11);u+=`<circle class="sd-snow" cx="${r}" cy="${n}" r="${o}" style="--fall:${f+30}px;--drift:${p(d()*12-6)}px;animation-duration:${x}s;animation-delay:${b}s"/>`}return`<g fill="#fff" opacity="0.9">${u}</g>`}function te(e,t,i,l,a,f){let s=U(e),d="";for(let u=0;u<t;u++){let M=s()<.35;d+=`<circle cx="${p(i+s()*a)}" cy="${p(l+s()*f)}" r="${p(.4+s()*.9)}" fill="#fff" opacity="${p(.4+s()*.6)}"${M?` class="sd-twinkle" style="animation-delay:${p(-s()*3)}s"`:""}/>`}return d}function H(e,t,i,l,a,f){let s=l*.3,d=e+i/2;return`<g>
    <ellipse cx="${d}" cy="${t+l}" rx="${i*.6}" ry="3" fill="#000" opacity="0.25"/>
    <rect x="${e}" y="${t+s*.6}" width="${i}" height="${l-s*.6}" rx="1.5" fill="${a}"/>
    <rect x="${e}" y="${t+s*.6}" width="${i}" height="${l-s*.6}" rx="1.5" fill="url(#__shade)" opacity="0.35"/>
    <rect x="${e-1.5}" y="${t}" width="${i+3}" height="${s}" rx="1.5" fill="${a}"/>
    <rect x="${e-1.5}" y="${t}" width="${i+3}" height="1.6" rx="0.8" fill="#fff" opacity="0.25"/>
    <rect x="${d-i*.09}" y="${t}" width="${i*.18}" height="${l}" fill="${f}"/>
    <rect x="${e-1.5}" y="${t+s*.35}" width="${i+3}" height="${s*.35}" fill="${f}" opacity="0.9"/>
    <ellipse cx="${d-i*.16}" cy="${t-2}" rx="${i*.17}" ry="${i*.1}" fill="${f}" transform="rotate(-20 ${d-i*.16} ${t-2})"/>
    <ellipse cx="${d+i*.16}" cy="${t-2}" rx="${i*.17}" ry="${i*.1}" fill="${f}" transform="rotate(20 ${d+i*.16} ${t-2})"/>
    <circle cx="${d}" cy="${t-1}" r="${i*.07+1}" fill="${f}"/>
  </g>`}function Ue(e){return`
    <radialGradient id="${e}glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.85"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="${e}vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05071a" stop-opacity="0.55"/></radialGradient>
    <linearGradient id="${e}shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
    <radialGradient id="${e}shine" cx="0.35" cy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`}function ie(e,t,i){return`<svg viewBox="0 0 ${A} ${K}" xmlns="http://www.w3.org/2000/svg" class="sd-scene" aria-hidden="true">
    <defs>${Ue(e)}${t}</defs>
    ${i.replace(/__shade/g,`${e}shade`)}
    <rect width="${A}" height="${K}" fill="url(#${e}vignette)" pointer-events="none"/>
  </svg>`}function Z(e,t,i,l,a){return`<g>
    <rect x="${t-l*.3}" y="${i-l-2}" width="${l*.6}" height="2.6" rx="0.6" fill="#d9b25c"/>
    <circle cx="${t}" cy="${i}" r="${l}" fill="${a}"/>
    <circle cx="${t}" cy="${i}" r="${l}" fill="url(#${e}shine)"/>
    <circle cx="${t}" cy="${i}" r="${l}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="0.8"/>
  </g>`}function Je(e,t){let i=`
    <linearGradient id="${e}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e1d31"/><stop offset="1" stop-color="#7a2a3b"/></linearGradient>
    <pattern id="${e}paper" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="9" height="18" fill="#fff" opacity="0.035"/>
      <path d="M13.5 6 l1.4 3 -1.4 3 -1.4 -3 z" fill="#f7c873" opacity="0.16"/>
    </pattern>
    <linearGradient id="${e}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4126"/><stop offset="1" stop-color="#3f2313"/></linearGradient>
    <linearGradient id="${e}night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1433"/><stop offset="1" stop-color="#2e4a82"/></linearGradient>
    <linearGradient id="${e}tree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a9b69"/><stop offset="1" stop-color="#17573d"/></linearGradient>
    <linearGradient id="${e}stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a93a6"/><stop offset="1" stop-color="#6a6478"/></linearGradient>
    <radialGradient id="${e}fire" cx="0.5" cy="0.85" r="0.7"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.45" stop-color="#ff7a2f" stop-opacity="0.75"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
    <clipPath id="${e}glass"><rect x="26" y="38" width="92" height="108"/></clipPath>
    <linearGradient id="${e}curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f1f33"/><stop offset="0.5" stop-color="#c9364d"/><stop offset="1" stop-color="#8f1f33"/></linearGradient>`,l=["#ff5a6e","#f7c873","#5cf2b3","#7fb8ff","#ff9f43","#d58bff"],a="",f=0;for(let r=0;r<4;r++){let n=r*100;a+=`<path d="M${n} 13 Q${n+50} 41 ${n+100} 13" stroke="#173a29" stroke-width="1.4" fill="none"/>`;for(let o of[.17,.5,.83]){let x=n+100*o,b=13+56*o*(1-o),c=l[f++%l.length];a+=`<circle cx="${p(x)}" cy="${p(b+3)}" r="5.5" fill="${c}" opacity="0.28" class="sd-twinkle" style="animation-delay:${p(-f*.37)}s"/>
        <ellipse cx="${p(x)}" cy="${p(b+3)}" rx="2.2" ry="3" fill="${c}"/>`}}let s="";for(let r=0;r<11;r++){let n=124+r*9;s+=`<line x1="244" y1="${n}" x2="356" y2="${n}"/>`;for(let o=244+(r%2?9:0);o<356;o+=18)s+=`<line x1="${o}" y1="${n}" x2="${o}" y2="${n+9}"/>`}let d="";[238,254,272,292].forEach((r,n)=>{d+=`<line x1="0" y1="${r}" x2="400" y2="${r}"/>`;for(let o=30+n*37;o<400;o+=120)d+=`<line x1="${o}" y1="${r-(n?[16,16,18,20][n]:14)}" x2="${o}" y2="${r}"/>`});let u=(r,n,o)=>`
    <g transform="translate(${r} 121)">
      <line x1="0" y1="0" x2="0" y2="3" stroke="#d9b25c" stroke-width="1"/>
      <g ${o?'transform="scale(-1 1)"':""}>
        <path d="M-6 6 L-6 22 Q-6 31 3 31 L11 31 Q16.5 31 16.5 25.5 Q16.5 20.5 11 20.5 L6 20.5 L6 6 Z" fill="${n}"/>
        <path d="M-6 22 Q-6 31 3 31 L4 31 Q-1 28 0 20 L-6 20 Z" fill="#000" opacity="0.15"/>
        <path d="M9.5 20.5 Q16.5 20.5 16.5 25.5 Q16.5 31 11 31 Q13.5 26 9.5 20.5 Z" fill="#fff" opacity="0.85"/>
        <rect x="-7.5" y="2" width="15" height="6.5" rx="2" fill="#fbf6ee"/>
        ${Y(0,15,3,"#f7c873")}
      </g>
    </g>`,M=(r,n,o)=>`
    <rect x="${r-2.5}" y="${112-n}" width="5" height="${n}" rx="1" fill="#f6ead2"/>
    <rect x="${r+.6}" y="${112-n}" width="1.6" height="${n}" fill="#000" opacity="0.08"/>
    <circle cx="${r}" cy="${108-n}" r="9" fill="url(#${e}glow)"/>
    <ellipse cx="${r}" cy="${108-n}" rx="1.8" ry="3.6" fill="#ffcf5a" class="sd-candle" style="animation-delay:${-o*.23}s"/>
    <ellipse cx="${r}" cy="${109-n}" rx="0.8" ry="1.6" fill="#fff8e0"/>`;return ie(e,i,`
    <rect width="400" height="224" fill="url(#${e}wall)"/>
    <rect width="400" height="224" fill="url(#${e}paper)"/>
    <ellipse cx="300" cy="200" rx="150" ry="120" fill="url(#${e}glow)" opacity="0.35"/>
    <ellipse cx="178" cy="150" rx="70" ry="100" fill="url(#${e}glow)" opacity="0.22"/>
    <rect width="400" height="9" fill="#3a1220"/>
    <rect y="9" width="400" height="2" fill="#c9a65a" opacity="0.5"/>
    ${a}

    <!-- Window -->
    <rect x="20" y="32" width="104" height="120" rx="3" fill="#efe3cb"/>
    <rect x="26" y="38" width="92" height="108" fill="url(#${e}night)"/>
    <g clip-path="url(#${e}glass)">
      ${te(11,18,26,38,92,60)}
      <circle cx="98" cy="58" r="20" fill="url(#${e}glow)" opacity="0.6"/>
      <circle cx="98" cy="58" r="9" fill="#fff2cf"/>
      <circle cx="95" cy="56" r="1.6" fill="#e9dcb8"/><circle cx="101" cy="61" r="1.2" fill="#e9dcb8"/>
      ${t("star")?Qe(e,48,58,7):""}
      <path d="M26 116 Q58 100 86 112 T120 106 L120 146 L26 146 Z" fill="#b9cbea"/>
      <g fill="#1d2b52">
        <polygon points="78,116 84,98 90,116"/><polygon points="88,114 95,92 102,114"/><polygon points="100,112 106,96 112,112"/>
      </g>
      <rect x="40" y="108" width="18" height="13" fill="#2a315e"/>
      <polygon points="37,109 49,99 61,109" fill="#2a315e"/>
      <path d="M37 109 L49 99 L61 109 L58 110 L49 102 L40 110 Z" fill="#f4f8ff"/>
      <rect x="46" y="112" width="5" height="5" fill="#ffcf6b"/>
      <path d="M26 130 Q72 120 120 132 L120 146 L26 146 Z" fill="#eaf1fc"/>
      ${t("cat")?`<g fill="#151026">
          <path d="M57 143 Q70 142 66 131 Q64 126 61 128" stroke="#151026" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <ellipse cx="49" cy="135" rx="9" ry="11"/>
          <circle cx="49" cy="121" r="6.6"/>
          <polygon points="43.5,118 44.5,109.5 48.5,116"/><polygon points="49.5,116 53.5,109.5 54.5,118"/>
          <ellipse cx="46.6" cy="121" rx="1.3" ry="1.6" fill="#ffd76a"/><ellipse cx="51.4" cy="121" rx="1.3" ry="1.6" fill="#ffd76a"/>
        </g>`:""}
      ${ee(21,16,26,38,92,108)}
    </g>
    <path d="M26 38 l14 0 q-10 4 -14 14 z M118 38 l-14 0 q10 4 14 14 z" fill="#fff" opacity="0.35"/>
    <rect x="70" y="38" width="4" height="108" fill="#efe3cb"/>
    <rect x="26" y="90" width="92" height="4" fill="#efe3cb"/>
    <rect x="14" y="149" width="116" height="7" rx="2" fill="#f6ecd8"/>
    <rect x="16" y="156" width="112" height="3" fill="#000" opacity="0.22"/>
    <rect x="2" y="20" width="140" height="4" rx="2" fill="#c9a65a"/>
    <circle cx="3" cy="22" r="3.2" fill="#e3c27a"/><circle cx="141" cy="22" r="3.2" fill="#e3c27a"/>
    <path d="M6 23 Q20 23 32 25 Q26 90 36 120 Q24 152 32 186 L6 186 Z" fill="url(#${e}curtain)"/>
    <path d="M138 23 Q124 23 112 25 Q118 90 108 120 Q120 152 112 186 L138 186 Z" fill="url(#${e}curtain)"/>
    <path d="M14 30 Q18 80 16 180 M24 28 Q26 90 24 182 M130 30 Q126 80 128 180 M120 28 Q118 90 120 182" stroke="#000" stroke-opacity="0.15" stroke-width="1.4" fill="none"/>
    <rect x="22" y="116" width="16" height="5" rx="2.5" fill="#f7c873"/><rect x="106" y="116" width="16" height="5" rx="2.5" fill="#f7c873"/>

    <!-- Painting above the fireplace -->
    <g transform="translate(308 62)${t("frame")?" rotate(11)":""}">
      <path d="M-13 -21 L0 -31 L13 -21" stroke="#d9b25c" stroke-width="0.9" fill="none"/>
      <rect x="-27" y="-21" width="54" height="42" rx="2" fill="#c9a65a"/>
      <rect x="-27" y="-21" width="54" height="42" rx="2" fill="none" stroke="#7d5c23" stroke-width="1.2"/>
      <rect x="-22" y="-16" width="44" height="32" fill="#2c4a7a"/>
      <circle cx="12" cy="-8" r="3.5" fill="#fff3d0"/>
      <polygon points="-22,9 -9,-7 0,3 9,-5 22,9" fill="#e7eef8"/>
      <polygon points="-9,-7 -5,-2 -12,-3" fill="#fff"/>
      <rect x="-22" y="9" width="44" height="7" fill="#f3f6fb"/>
      <rect x="-5" y="3" width="10" height="7" fill="#c0392b"/>
      <polygon points="-7,4 0,-1.5 7,4" fill="#5a2a2a"/>
      <rect x="-1" y="5.5" width="2.5" height="2.5" fill="#ffd56b"/>
    </g>
    <circle cx="308" cy="31" r="1.4" fill="#d9b25c"/>

    <!-- Baseboard, mouse hole, floor, rug -->
    <rect y="214" width="400" height="10" fill="#2e1a12"/>
    <rect y="214" width="400" height="1.5" fill="#6b4126"/>
    <path d="M104 224 L104 214 Q114 202 124 214 L124 224 Z" fill="#140806"/>
    ${t("mouse")?`<g>
        <ellipse cx="114" cy="219" rx="6" ry="4.6" fill="#9a93a6"/>
        <circle cx="109.5" cy="214.8" r="2.6" fill="#9a93a6"/><circle cx="109.5" cy="214.8" r="1.4" fill="#f2a7b8"/>
        <circle cx="118.5" cy="214.8" r="2.6" fill="#9a93a6"/><circle cx="118.5" cy="214.8" r="1.4" fill="#f2a7b8"/>
        <circle cx="111.8" cy="218.6" r="0.9" fill="#111"/><circle cx="116.2" cy="218.6" r="0.9" fill="#111"/>
        <circle cx="114" cy="221.6" r="1.1" fill="#ff8fa8"/>
        <path d="M110 221.5 l-6 -1 M110 222.5 l-6 1.5 M118 221.5 l6 -1 M118 222.5 l6 1.5" stroke="#ddd" stroke-width="0.4"/>
      </g>`:""}
    <rect y="224" width="400" height="76" fill="url(#${e}floor)"/>
    <g stroke="#000" stroke-opacity="0.25" stroke-width="0.8">${d}</g>
    <ellipse cx="205" cy="270" rx="168" ry="25" fill="#7c1f30"/>
    <ellipse cx="205" cy="270" rx="155" ry="20" fill="none" stroke="#f7c873" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.7"/>
    <ellipse cx="205" cy="270" rx="122" ry="13" fill="#9c2f43"/>
    <ellipse cx="205" cy="270" rx="70" ry="6" fill="none" stroke="#f7c873" stroke-width="1" opacity="0.4"/>

    <!-- Fireplace -->
    <rect x="244" y="122" width="112" height="94" fill="url(#${e}stone)"/>
    <g stroke="#2a2433" stroke-opacity="0.35" stroke-width="0.8">${s}</g>
    <path d="M262 216 L262 166 Q300 136 338 166 L338 216 Z" fill="#4b4456"/>
    <path d="M266 216 L266 168 Q300 142 334 168 L334 216 Z" fill="#170a07"/>
    <ellipse cx="300" cy="204" rx="38" ry="30" fill="url(#${e}fire)" class="sd-glow"/>
    <rect x="276" y="203" width="48" height="8" rx="4" fill="#5a3320" transform="rotate(-9 300 207)"/>
    <rect x="276" y="203" width="48" height="8" rx="4" fill="#6e3f27" transform="rotate(9 300 207)"/>
    <g>
      <path d="M286 208 C278 199 282 191 286 184 C288 193 294 195 293 206 Z" fill="#ff6a2a" class="sd-flame" style="animation-delay:-0.3s"/>
      <path d="M314 208 C322 199 318 191 314 184 C312 193 306 195 307 206 Z" fill="#ff6a2a" class="sd-flame" style="animation-delay:-0.7s"/>
      <path d="M300 207 C285 197 291 182 296 170 C298 181 306 180 304 164 C318 180 317 199 300 207 Z" fill="#ff8a2a" class="sd-flame"/>
      <path d="M300 207 C292 199 296 189 300 182 C302 190 308 192 306 184 C312 195 308 203 300 207 Z" fill="#ffd36a" class="sd-flame" style="animation-delay:-0.5s"/>
    </g>
    <circle cx="296" cy="178" r="1" fill="#ffd36a" class="sd-ember"/>
    <circle cx="306" cy="182" r="0.9" fill="#ffb347" class="sd-ember" style="animation-delay:-1.1s"/>
    <circle cx="290" cy="186" r="0.8" fill="#ffd36a" class="sd-ember" style="animation-delay:-0.6s"/>
    <rect x="234" y="214" width="132" height="10" rx="2" fill="#6e6878"/>
    <rect x="234" y="214" width="132" height="2" rx="1" fill="#a9a2b8"/>
    <rect x="232" y="111" width="136" height="11" rx="2" fill="#5b3422"/>
    <rect x="232" y="111" width="136" height="2.2" rx="1" fill="#8a5636"/>
    <rect x="236" y="122" width="128" height="3" fill="#000" opacity="0.25"/>
    ${M(246,16,0)}${M(257,21,1)}${M(268,14,2)}${t("candles")?M(279,18,3):""}
    <!-- Little tomte on the mantel -->
    <g>
      <ellipse cx="352" cy="110" rx="8" ry="2" fill="#000" opacity="0.25"/>
      <path d="M345 110 Q345 99 352 98 Q359 99 359 110 Z" fill="#8a8a96"/>
      <path d="M346 101 Q352 112 358 101 Q357 106 352 108 Q347 106 346 101 Z" fill="#f4f1ea"/>
      <circle cx="352" cy="100.5" r="2" fill="#f2b7a0"/>
      <path d="M344.5 100 Q352 102 359.5 100 L353 82 Q351 80 350 84 Z" fill="${t("tomte")?"#2e8b57":"#c0392b"}"/>
      <circle cx="352.5" cy="82" r="1.4" fill="#fff"/>
    </g>
    <path d="M234 122 Q267 133 300 122 Q333 133 366 122" stroke="#1f6f4a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M234 122 Q267 133 300 122 Q333 133 366 122" stroke="#2f9a64" stroke-width="2" fill="none" stroke-dasharray="2 3" stroke-linecap="round"/>
    <g fill="#e0475b"><circle cx="249" cy="127" r="1.6"/><circle cx="283" cy="127" r="1.6"/><circle cx="317" cy="127" r="1.6"/><circle cx="351" cy="127" r="1.6"/></g>
    ${u(270,"#c0392b",!1)}${u(300,"#2e8b57",t("stocking"))}${u(330,"#3b5fb0",!1)}

    <!-- Tree -->
    <rect x="173" y="210" width="10" height="12" fill="#5a3324"/>
    <path d="M178 112 L230 212 Q178 226 126 212 Z" fill="url(#${e}tree)"/>
    <path d="M178 112 L230 212 Q205 220 178 222 Z" fill="#000" opacity="0.14"/>
    <path d="M178 78 L219 164 Q178 175 137 164 Z" fill="url(#${e}tree)"/>
    <path d="M178 78 L219 164 Q200 171 178 173 Z" fill="#000" opacity="0.14"/>
    <path d="M178 44 L205 116 Q178 125 151 116 Z" fill="url(#${e}tree)"/>
    <path d="M178 44 L205 116 Q192 121 178 122 Z" fill="#000" opacity="0.14"/>
    <path d="M132 210 l6 -4 4 5 5 -4 4 5 5 -4 4 5 M143 162 l6 -4 4 5 5 -4 4 5 M156 114 l5 -4 4 4 5 -4" stroke="#5fc48f" stroke-opacity="0.45" stroke-width="1" fill="none"/>
    <path d="M140 196 Q178 214 220 190" stroke="#f7c873" stroke-width="1.6" fill="none" opacity="0.85"/>
    <path d="M148 150 Q178 162 210 142" stroke="#f7c873" stroke-width="1.5" fill="none" opacity="0.85"/>
    <path d="M158 104 Q178 113 198 98" stroke="#f7c873" stroke-width="1.3" fill="none" opacity="0.85"/>
    ${[[150,196],[166,203],[196,204],[214,194],[158,155],[184,158],[204,147],[168,108],[188,106],[178,88],[146,178],[208,178]].map(([r,n],o)=>`<circle cx="${r}" cy="${n}" r="3.6" fill="${l[o%6]}" opacity="0.35" class="sd-twinkle" style="animation-delay:${p(-o*.41)}s"/><circle cx="${r}" cy="${n}" r="1.3" fill="#fffbe8"/>`).join("")}
    ${Z(e,150,205,6,"#e0475b")}
    ${Z(e,208,204,6,"#f7c873")}
    ${Z(e,178,192,6.5,"#5b8def")}
    ${Z(e,160,146,5.2,"#f7c873")}
    ${Z(e,200,152,6.3,t("ornament")?"#8e5bd8":"#e0475b")}
    ${Z(e,178,134,5,"#d8dee8")}
    ${Z(e,165,101,4.6,"#e0475b")}
    ${Z(e,192,100,4.6,"#5cc39a")}
    ${Z(e,178,70,4,"#f7c873")}
    <circle cx="178" cy="40" r="22" fill="url(#${e}glow)"/>
    ${Y(178,40,11,"#ffd772",'stroke="#e9a64a" stroke-width="1"')}

    <!-- Presents -->
    ${H(130,222,30,24,"#c0392b",t("ribbon")?"#fdf6ec":"#f7c873")}
    ${t("present")?"":H(190,225,26,22,"#2e8b57","#e0475b")}
    ${H(159,233,20,15,"#3b6fd8","#fdf6ec")}
    <rect x="166" y="218" width="24" height="16" rx="3" fill="#9b2335"/>
    <rect x="166" y="222" width="24" height="3" fill="#f7c873"/>

    <!-- Teddy on the rug -->
    <g>
      <ellipse cx="72" cy="268" rx="18" ry="4" fill="#000" opacity="0.25"/>
      <ellipse cx="62" cy="264" rx="6" ry="5" fill="#9a6235"/><ellipse cx="82" cy="264" rx="6" ry="5" fill="#9a6235"/>
      <ellipse cx="62" cy="265" rx="3" ry="2.6" fill="#e8c49a"/><ellipse cx="82" cy="265" rx="3" ry="2.6" fill="#e8c49a"/>
      <ellipse cx="72" cy="254" rx="11" ry="12" fill="#a8703f"/>
      <ellipse cx="72" cy="257" rx="6" ry="7" fill="#d9ad7c"/>
      <ellipse cx="60" cy="250" rx="4" ry="6" fill="#9a6235" transform="rotate(25 60 250)"/>
      <ellipse cx="84" cy="250" rx="4" ry="6" fill="#9a6235" transform="rotate(-25 84 250)"/>
      <circle cx="63" cy="229" r="4.2" fill="#a8703f"/><circle cx="81" cy="229" r="4.2" fill="#a8703f"/>
      <circle cx="63" cy="229" r="2.2" fill="#d9ad7c"/><circle cx="81" cy="229" r="2.2" fill="#d9ad7c"/>
      <circle cx="72" cy="236" r="10" fill="#b57a45"/>
      <ellipse cx="72" cy="239.5" rx="4.6" ry="3.6" fill="#e8c49a"/>
      <ellipse cx="72" cy="238" rx="1.8" ry="1.3" fill="#2b1a12"/>
      <circle cx="68" cy="233.5" r="1.2" fill="#2b1a12"/><circle cx="76" cy="233.5" r="1.2" fill="#2b1a12"/>
      <path d="M66 246 L72 249 L78 246 L78 250 L72 248.5 L66 250 Z" fill="#e0475b"/>
      ${t("teddyHat")?`<path d="M62 229 Q72 224 82 229 L76 214 Q71 210 66 219 Z" fill="#d6283f"/>
        <rect x="61" y="226.5" width="22" height="4.5" rx="2.2" fill="#fbf6ee"/>
        <circle cx="65.5" cy="217" r="3" fill="#fbf6ee"/>`:""}
    </g>

    <!-- Armchair peeking in on the right -->
    <g>
      <rect x="372" y="150" width="40" height="80" rx="10" fill="#2f6f62"/>
      <rect x="360" y="196" width="40" height="18" rx="6" fill="#3b8a79"/>
      <rect x="358" y="186" width="16" height="44" rx="7" fill="#286055"/>
      <path d="M380 150 L400 150 L400 214 L388 214 Q384 180 380 150 Z" fill="#c0392b"/>
      <path d="M384 150 L386 214 M392 150 L394 214" stroke="#f7c873" stroke-width="1.2" opacity="0.7"/>
      <rect x="360" y="228" width="5" height="10" fill="#3e2414"/>
    </g>
    `)}function Xe(e,t){let i=`
    <linearGradient id="${e}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060b28"/><stop offset="0.55" stop-color="#1a2b62"/><stop offset="1" stop-color="#3d5490"/></linearGradient>
    <linearGradient id="${e}snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f1fd"/><stop offset="1" stop-color="#b9cbe8"/></linearGradient>
    <linearGradient id="${e}tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.95"/></linearGradient>
    <filter id="${e}blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <mask id="${e}crescent"><rect width="400" height="300" fill="#fff"/><circle cx="339" cy="43" r="15.5" fill="#000"/></mask>`,l=(r,n,o,x,b)=>{let c="",y=x-r,$=Math.round(y/12);for(let Q=$;Q>0;Q--){let Se=r+y*Q/$,le=r+y*(Q-1)/$;c+=` Q${p((le+Se)/2)} ${b+6} ${p(le)} ${b}`}return`<path d="M${r} ${b} L${n} ${o} L${x} ${b}${c} Z" fill="#f4f8ff"/>
      <path d="M${n} ${o} L${x} ${b} L${x-6} ${b+1} Z" fill="#c9d8ef" opacity="0.8"/>`},a=(r,n,o,x,b=!0)=>`
    ${b?`<circle cx="${r+o/2}" cy="${n+x/2}" r="${o*1.3}" fill="url(#${e}glow)" opacity="0.7"/>`:""}
    <rect x="${r-2}" y="${n-2}" width="${o+4}" height="${x+4}" rx="1" fill="#f3ead9"/>
    <rect x="${r}" y="${n}" width="${o}" height="${x}" fill="${b?"#ffcf6b":"#1c2448"}"/>
    ${b?`<rect x="${r}" y="${n+x*.55}" width="${o}" height="${x*.45}" fill="#ffad42" opacity="0.5"/>`:`<path d="M${r} ${n} l${o*.5} 0 l-${o*.5} ${x*.5} z" fill="#fff" opacity="0.08"/>`}
    <rect x="${r+o/2-.9}" y="${n}" width="1.8" height="${x}" fill="#f3ead9"/>
    <rect x="${r}" y="${n+x/2-.9}" width="${o}" height="1.8" fill="#f3ead9"/>
    <rect x="${r-3}" y="${n+x+1}" width="${o+6}" height="3" rx="1.5" fill="#fff"/>`,f=(r,n,o,x)=>{let b="";for(let c=n+6;c<x;c+=6)b+=`<line x1="${r}" y1="${c}" x2="${r+o}" y2="${c}"/>`;return`<g stroke="#000" stroke-opacity="0.12" stroke-width="0.7">${b}</g>`},s=(r,n)=>`
    ${n?`<circle cx="${r}" cy="135" r="30" fill="url(#${e}glow)" class="sd-glow"/><ellipse cx="${r}" cy="226" rx="26" ry="6" fill="#ffe7a8" opacity="0.35"/>`:""}
    <rect x="${r-1.6}" y="140" width="3.2" height="84" fill="#20243b"/>
    <rect x="${r-4}" y="218" width="8" height="7" rx="1" fill="#20243b"/>
    <path d="M${r-2.5} 172 q-6 -3 -4 -9" stroke="#20243b" stroke-width="1.2" fill="none"/>
    <path d="M${r-7} 127 L${r+7} 127 L${r+5} 142 L${r-5} 142 Z" fill="${n?"#ffe39a":"#3a4166"}"/>
    <path d="M${r} 127 L${r} 142 M${r-6} 134 L${r+6} 134" stroke="#20243b" stroke-width="0.8"/>
    <path d="M${r-9} 128 L${r} 119 L${r+9} 128 Z" fill="#20243b"/>
    <path d="M${r-8} 126 Q${r} 115 ${r+8} 126 Q${r+4} 124 ${r} 125 Q${r-4} 124 ${r-8} 126 Z" fill="#fff"/>
    <rect x="${r-6}" y="142" width="12" height="2.5" fill="#20243b"/>`,d=U(7),u="";for(let r=-4;r<410;r+=9+d()*14){let n=150+Math.sin(r/60)*8+10,o=12+d()*14;u+=`<polygon points="${p(r-o*.3)},${p(n)} ${p(r)},${p(n-o)} ${p(r+o*.3)},${p(n)}"/>`}let M=(r,n,o,x)=>`
    <rect x="-5" y="-14" width="10" height="13" rx="4" fill="${r}"/>
    <path d="${x?"M-4 -11 L-9 -20 M4 -11 L9 -20":"M-4 -9 L-9 -4 M4 -9 L9 -4"}" stroke="${r}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="0" cy="-19" r="5" fill="#f2c9a0"/>
    <circle cx="-1.8" cy="-19" r="0.7" fill="#2b1a12"/><circle cx="1.8" cy="-19" r="0.7" fill="#2b1a12"/>
    <circle cx="-3" cy="-17.4" r="1" fill="#f28c8c" opacity="0.7"/><circle cx="3" cy="-17.4" r="1" fill="#f28c8c" opacity="0.7"/>
    <path d="M-5.4 -20 Q-5.4 -26.5 0 -26.5 Q5.4 -26.5 5.4 -20 Z" fill="${n}"/>
    <rect x="-5.6" y="-21.4" width="11.2" height="2.4" rx="1.2" fill="${o}"/>
    <circle cx="0" cy="-27" r="2" fill="${o}"/>
    <rect x="-5" y="-14.5" width="10" height="2.4" rx="1.2" fill="#f7c873"/>`;return ie(e,i,`
    <rect width="400" height="300" fill="url(#${e}sky)"/>
    <path d="M0 78 C70 34 150 96 230 56 S350 36 400 58 L400 84 C330 66 260 116 200 96 S80 70 0 106 Z" fill="#5cf2b3" opacity="0.16" filter="url(#${e}blur)" class="sd-aurora"/>
    ${te(3,46,0,0,400,140)}
    <circle cx="330" cy="48" r="38" fill="url(#${e}glow)" opacity="0.45"/>
    <g ${t("moon")?`mask="url(#${e}crescent)"`:""}>
      <circle cx="330" cy="48" r="17" fill="#fff3d4"/>
      <circle cx="324" cy="44" r="3.4" fill="#ece0bd"/><circle cx="335" cy="54" r="2.4" fill="#ece0bd"/><circle cx="333" cy="40" r="1.6" fill="#ece0bd"/>
    </g>
    ${t("shooting")?`<g><line x1="86" y1="26" x2="140" y2="52" stroke="url(#${e}tail)" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="140" cy="52" r="7" fill="url(#${e}glow)"/><circle cx="140" cy="52" r="2.2" fill="#fff"/></g>`:""}

    <path d="M0 162 Q60 132 130 152 T260 142 T400 152 L400 210 L0 210 Z" fill="#8ea4cf"/>
    <g fill="#24345f">${u}</g>
    <path d="M0 186 Q100 166 200 182 T400 176 L400 210 L0 210 Z" fill="#c6d4ec"/>

    <!-- Red house -->
    <rect x="84" y="100" width="12" height="26" fill="#7a3b2e"/>
    <rect x="82" y="97" width="16" height="5" rx="2" fill="#fff"/>
    ${t("smoke")?"":`<g fill="#d3dbee">
        <circle cx="90" cy="88" r="4.5" class="sd-smoke"/>
        <circle cx="90" cy="88" r="5.5" class="sd-smoke" style="animation-delay:-1s"/>
        <circle cx="90" cy="88" r="6.5" class="sd-smoke" style="animation-delay:-2s"/>
        <circle cx="90" cy="88" r="7" class="sd-smoke" style="animation-delay:-3s"/>
      </g>`}
    <rect x="22" y="138" width="86" height="67" fill="#b8323f"/>
    ${f(22,138,86,205)}
    <rect x="22" y="138" width="3" height="67" fill="#f3ead9"/><rect x="105" y="138" width="3" height="67" fill="#f3ead9"/>
    <polygon points="14,141 65,96 116,141" fill="#3a2a35"/>
    ${l(12,65,93,118,141)}
    ${a(32,152,18,18)}${a(80,152,18,18)}
    <rect x="55" y="170" width="18" height="35" rx="2" fill="#f3ead9"/>
    <rect x="57" y="172" width="14" height="33" rx="1.5" fill="#e8dcc4"/>
    <circle cx="68" cy="190" r="1.2" fill="#c9a65a"/>
    ${t("wreath")?`<circle cx="64" cy="181" r="5.2" fill="none" stroke="#1f7a4c" stroke-width="3.4"/>
        <circle cx="64" cy="181" r="5.2" fill="none" stroke="#3fae6f" stroke-width="1.2" stroke-dasharray="1.5 2"/>
        <path d="M61 186 L64 184 L67 186 L66 190 L64 186.5 L62 190 Z" fill="#e0475b"/>`:""}
    <rect x="52" y="204" width="24" height="3" fill="#d9e2f2"/>

    <!-- Yellow house -->
    <rect x="212" y="86" width="12" height="24" fill="#7a3b2e"/>
    <rect x="210" y="83" width="16" height="5" rx="2" fill="#fff"/>
    <rect x="150" y="120" width="92" height="85" fill="#e0a93a"/>
    ${f(150,120,92,205)}
    <rect x="150" y="120" width="3" height="85" fill="#f3ead9"/><rect x="239" y="120" width="3" height="85" fill="#f3ead9"/>
    <polygon points="142,123 196,79 250,123" fill="#3a2a35"/>
    ${l(140,196,76,252,123)}
    ${t("attic")?"":`<circle cx="196" cy="106" r="11" fill="url(#${e}glow)" opacity="0.7"/>`}
    <circle cx="196" cy="106" r="7" fill="#f3ead9"/><circle cx="196" cy="106" r="5.4" fill="${t("attic")?"#1c2448":"#ffcf6b"}"/>
    <path d="M196 100.6 V111.4 M190.6 106 H201.4" stroke="#f3ead9" stroke-width="1.2"/>
    ${a(162,132,16,18)}${a(214,132,16,18,!t("window"))}
    ${a(162,166,16,18)}
    <rect x="200" y="170" width="18" height="35" rx="2" fill="#7a2a2a"/>
    <rect x="203" y="174" width="12" height="10" rx="1" fill="#ffcf6b" opacity="0.85"/>
    <circle cx="214" cy="190" r="1.2" fill="#f7c873"/>
    <rect x="197" y="204" width="24" height="3" fill="#d9e2f2"/>
    <path d="M144 123 Q160 129 176 123 Q192 129 208 123 Q224 129 248 123" stroke="#1d1d2e" stroke-width="0.8" fill="none"/>
    ${[148,156,164,172,180,188,196,204,212,220,228,236,244].map((r,n)=>{let o=["#ff5a6e","#f7c873","#5cf2b3","#7fb8ff"][n%4];return`<circle cx="${r}" cy="${p(125.5+Math.abs(Math.sin((r-144)/10.2))*1.6)}" r="3.6" fill="${o}" opacity="0.4" class="sd-twinkle" style="animation-delay:${p(-n*.29)}s"/><circle cx="${r}" cy="${p(125.5+Math.abs(Math.sin((r-144)/10.2))*1.6)}" r="1.4" fill="${o}"/>`}).join("")}

    <!-- Blue house -->
    <rect x="352" y="112" width="11" height="22" fill="#7a3b2e"/>
    <rect x="350" y="109" width="15" height="5" rx="2" fill="#fff"/>
    <rect x="284" y="142" width="96" height="63" fill="#3b6ea8"/>
    ${f(284,142,96,205)}
    <rect x="284" y="142" width="3" height="63" fill="#f3ead9"/><rect x="377" y="142" width="3" height="63" fill="#f3ead9"/>
    <polygon points="276,145 332,104 388,145" fill="#3a2a35"/>
    ${l(274,332,101,390,145)}
    ${a(296,154,18,18)}${a(350,154,18,18)}
    <rect x="323" y="169" width="18" height="36" rx="2" fill="${t("door")?"#d23c4f":"#2e8b57"}"/>
    <rect x="326" y="173" width="12" height="12" rx="1" fill="#000" opacity="0.15"/>
    <rect x="326" y="189" width="12" height="12" rx="1" fill="#000" opacity="0.15"/>
    <circle cx="337" cy="188" r="1.2" fill="#f7c873"/>
    <rect x="320" y="204" width="24" height="3" fill="#d9e2f2"/>

    <!-- Snowy ground -->
    <path d="M0 204 Q100 199 200 205 T400 203 L400 300 L0 300 Z" fill="url(#${e}snow)"/>
    <g fill="#ffe7a8" opacity="0.28">
      <ellipse cx="41" cy="214" rx="14" ry="3"/><ellipse cx="89" cy="214" rx="14" ry="3"/><ellipse cx="171" cy="213" rx="12" ry="3"/>
      <ellipse cx="305" cy="214" rx="14" ry="3"/><ellipse cx="359" cy="214" rx="14" ry="3"/>
    </g>
    ${s(128,!0)}${s(262,!t("lamp"))}

    <!-- Little decorated spruce -->
    <g>
      <rect x="103" y="232" width="4" height="7" fill="#5a3324"/>
      <polygon points="105,196 118,234 92,234" fill="#1f6f4a"/>
      <polygon points="105,196 118,234 105,234" fill="#000" opacity="0.15"/>
      <path d="M95 228 Q105 222 116 229 M98 216 Q105 212 112 216" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>
      <circle cx="100" cy="222" r="1.6" fill="#ff5a6e" class="sd-twinkle"/><circle cx="110" cy="224" r="1.6" fill="#f7c873" class="sd-twinkle" style="animation-delay:-0.8s"/>
      <circle cx="105" cy="209" r="1.5" fill="#7fb8ff" class="sd-twinkle" style="animation-delay:-1.4s"/>
      ${t("spruceStar")?"":Y(105,195,3.6,"#ffd772")}
    </g>

    <!-- Fence -->
    <g>
      <rect x="128" y="256" width="104" height="4" fill="#7a4e32"/>
      <rect x="128" y="266" width="104" height="4" fill="#7a4e32"/>
      ${[132,150,168,186,204,222].map(r=>`<rect x="${r-2.5}" y="250" width="5" height="28" fill="#8a5a3a"/>
            <polygon points="${r-2.5},250 ${r},246 ${r+2.5},250" fill="#8a5a3a"/>
            <ellipse cx="${r}" cy="248" rx="3.6" ry="2" fill="#fff"/>`).join("")}
      <rect x="128" y="254" width="104" height="2" rx="1" fill="#fff"/>
      ${t("bird")?`<g>
          <path d="M187 245 L180 247 L186 249 Z" fill="#5a3a26"/>
          <ellipse cx="193" cy="243" rx="7" ry="5.4" fill="#7a5236"/>
          <ellipse cx="196" cy="244" rx="4" ry="4" fill="#e8582f"/>
          <circle cx="198" cy="238" r="3.6" fill="#7a5236"/>
          <circle cx="199" cy="239" r="2.4" fill="#e8582f"/>
          <circle cx="199" cy="237" r="0.8" fill="#111"/>
          <polygon points="201.2,237.8 204,238.6 201.2,239.4" fill="#e7b33a"/>
        </g>`:""}
    </g>

    <!-- Snowman -->
    <g transform="translate(-18 12)">
      <ellipse cx="58" cy="281" rx="24" ry="5" fill="#8ea4cf" opacity="0.5"/>
      <circle cx="58" cy="263" r="20" fill="#fbfdff"/><path d="M70 249 A20 20 0 0 1 58 283 A18 18 0 0 0 70 249 Z" fill="#c9d8ef"/>
      <circle cx="58" cy="236" r="14" fill="#fbfdff"/><path d="M66 225 A14 14 0 0 1 58 250 A12.5 12.5 0 0 0 66 225 Z" fill="#c9d8ef"/>
      <circle cx="58" cy="215" r="10" fill="#fbfdff"/>
      <path d="M44 234 L28 222 M31 224.5 L27 228 M72 234 L88 224 M84 226.5 L88 230" stroke="#5a3a26" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="54.5" cy="213" r="1.3" fill="#1b1b2a"/><circle cx="61.5" cy="213" r="1.3" fill="#1b1b2a"/>
      <polygon points="58,216 68,218.5 58,219.5" fill="#f08a2a"/>
      <path d="M53.5 220.5 Q58 223.5 62.5 220.5" stroke="#1b1b2a" stroke-width="1" stroke-dasharray="0.8 1.4" fill="none"/>
      <circle cx="58" cy="232" r="1.4" fill="#1b1b2a"/><circle cx="58" cy="239" r="1.4" fill="#1b1b2a"/><circle cx="58" cy="257" r="1.6" fill="#1b1b2a"/>
      <path d="M47 223.5 Q58 229 69 223.5 L69 227 Q58 232 47 227 Z" fill="#e0475b"/>
      <path d="M63 227 L66 240 L70 239 L66.5 226 Z" fill="#c0392b"/>
      ${t("snowmanHat")?"":`<rect x="45" y="205" width="26" height="3.4" rx="1.4" fill="#1b1b2a"/>
        <rect x="49.5" y="189" width="17" height="17" rx="1.5" fill="#1b1b2a"/>
        <rect x="49.5" y="200" width="17" height="3" fill="#e0475b"/>
        <circle cx="63" cy="200.5" r="2" fill="#2e8b57"/>`}
    </g>

    <!-- Sledding hill -->
    <path d="M236 300 Q300 262 400 222 L400 300 Z" fill="#f3f8ff"/>
    <path d="M236 300 Q300 262 400 222" stroke="#b9cbe8" stroke-width="1.5" fill="none"/>
    <path d="M300 279 Q340 260 400 236 M304 284 Q344 265 400 241" stroke="#b9cbe8" stroke-width="1" fill="none" opacity="0.8"/>
    <g transform="translate(318 266) rotate(-22)">
      <path d="M-20 4 L18 4 Q24 4 24 -2" stroke="#7a4e32" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <rect x="-18" y="-2" width="34" height="4.5" rx="1.5" fill="#c0392b"/>
      <path d="M-14 2.5 L-14 4 M10 2.5 L10 4" stroke="#7a4e32" stroke-width="1.6"/>
      <g transform="translate(6 -1)">${M("#3b6fd8","#f7c873","#fff",!1)}</g>
      <g transform="translate(-8 -1)">${M("#c0392b",t("kidHat")?"#5cc39a":"#7b4fc9","#fff",!0)}</g>
    </g>

    ${ee(42,44,0,0,400,300,1.8)}
    `)}function Ye(e,t){let i=`
    <linearGradient id="${e}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3520"/><stop offset="1" stop-color="#7b4c2d"/></linearGradient>
    <linearGradient id="${e}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f2f1b"/><stop offset="1" stop-color="#2f1b0f"/></linearGradient>
    <linearGradient id="${e}night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1433"/><stop offset="1" stop-color="#2e4a82"/></linearGradient>
    <linearGradient id="${e}wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47e4c"/><stop offset="1" stop-color="#8a5a36"/></linearGradient>
    <linearGradient id="${e}sack" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a5824f"/><stop offset="1" stop-color="#7a5a32"/></linearGradient>
    <clipPath id="${e}glass"><path d="M170 106 L170 58 A30 30 0 0 1 230 58 L230 106 Z"/></clipPath>`,l="",a=U(5);for(let c=0;c<400;c+=25)l+=`<rect x="${c}" y="0" width="25" height="226" fill="#000" opacity="${p(a()*.12)}"/><line x1="${c}" y1="0" x2="${c}" y2="226"/>`,a()<.5&&(l+=`<ellipse cx="${p(c+6+a()*12)}" cy="${p(20+a()*180)}" rx="2" ry="3.4" fill="#3e2516" opacity="0.4" stroke="none"/>`);let f="";[240,258,280].forEach((c,y)=>{f+=`<line x1="0" y1="${c}" x2="400" y2="${c}"/>`;for(let $=20+y*45;$<400;$+=110)f+=`<line x1="${$}" y1="${c-16}" x2="${$}" y2="${c}"/>`});let s=(c,y)=>`
    ${y?`<circle cx="${c}" cy="46" r="36" fill="url(#${e}glow)" class="sd-glow"/>`:""}
    <line x1="${c}" y1="12" x2="${c}" y2="32" stroke="#2a1a10" stroke-width="1.2"/>
    <circle cx="${c}" cy="31" r="2.4" fill="none" stroke="#2a1a10" stroke-width="1.2"/>
    <path d="M${c-9} 38 L${c} 32 L${c+9} 38 Z" fill="#2a2a36"/>
    <rect x="${c-7}" y="38" width="14" height="18" fill="${y?"#ffd77a":"#3c3446"}"/>
    ${y?`<ellipse cx="${c}" cy="49" rx="2.2" ry="3.6" fill="#fff4c8" class="sd-candle"/>`:""}
    <path d="M${c-7} 38 V56 M${c} 38 V56 M${c+7} 38 V56" stroke="#2a2a36" stroke-width="1.3"/>
    <rect x="${c-9}" y="56" width="18" height="3" rx="1" fill="#2a2a36"/>`,d=(c,y,$,Q)=>`
    <rect x="${c}" y="${y}" width="15" height="15" rx="1.5" fill="${$}"/>
    <rect x="${c}" y="${y}" width="15" height="2" rx="1" fill="#fff" opacity="0.3"/>
    <text x="${c+7.5}" y="${y+11.5}" text-anchor="middle" font-size="10" font-weight="800" font-family="Nunito, Arial, sans-serif" fill="#fff">${Q}</text>`,u=(c,y,$)=>`<circle cx="${c}" cy="${y}" r="${$}" fill="#2a2a36"/><circle cx="${c}" cy="${y}" r="${$*.4}" fill="#f7c873"/>`,M=(c,y,$)=>`
    <rect x="${c}" y="130" width="27" height="13" rx="2" fill="${y}"/>
    <rect x="${c}" y="130" width="27" height="2.4" fill="#fff" opacity="0.25"/>
    ${$}
    ${u(c+7,145,4)}${u(c+20,145,4)}
    <rect x="${c-4}" y="138" width="4" height="2" fill="#2a2a36"/>`,r=t("clock")?120:300,n=t("clock")?180:60,o=(c,y,$)=>{let Q=(c-90)*Math.PI/180;return`<line x1="352" y1="72" x2="${p(352+y*Math.cos(Q))}" y2="${p(72+y*Math.sin(Q))}" stroke="#2a1a10" stroke-width="${$}" stroke-linecap="round"/>`},x="";for(let c=0;c<12;c++){let y=c*30*Math.PI/180;x+=`<line x1="${p(352+12*Math.sin(y))}" y1="${p(72-12*Math.cos(y))}" x2="${p(352+14*Math.sin(y))}" y2="${p(72-14*Math.cos(y))}"/>`}let b=Array.from({length:16},(c,y)=>{let $=6+y*25,Q=["#e0475b","#f7c873","#3aae8a","#fdf6ec"][y%4];return`<polygon points="${$},16 ${$+16},16 ${$+8},29" fill="${Q}"/>`}).join("");return ie(e,i,`
    <rect width="400" height="226" fill="url(#${e}wall)"/>
    <g stroke="#2a1a10" stroke-opacity="0.35" stroke-width="1">${l}</g>
    <ellipse cx="200" cy="170" rx="210" ry="140" fill="url(#${e}glow)" opacity="0.25"/>
    <rect width="400" height="15" fill="#3e2516"/>
    <rect y="15" width="400" height="2" fill="#2a1a10"/>
    <path d="M0 16 Q100 22 200 16 T400 16" stroke="#2a1a10" stroke-width="0.8" fill="none"/>
    ${b}

    <!-- Window -->
    <path d="M163 110 L163 58 A37 37 0 0 1 237 58 L237 110 Z" fill="#e8d6b0"/>
    <path d="M170 106 L170 58 A30 30 0 0 1 230 58 L230 106 Z" fill="url(#${e}night)"/>
    <g clip-path="url(#${e}glass)">
      ${te(9,14,170,28,60,44)}
      <circle cx="214" cy="48" r="14" fill="url(#${e}glow)" opacity="0.7"/>
      <circle cx="214" cy="48" r="6.4" fill="#fff2cf"/>
      ${t("star")?Qe(e,185,52,6.5):""}
      <path d="M170 92 Q190 82 206 90 T232 86 L232 108 L170 108 Z" fill="#c4d3ee"/>
      <g fill="#1d2b52"><polygon points="176,94 181,78 186,94"/><polygon points="214,92 220,74 226,92"/></g>
      <path d="M170 99 Q200 94 232 100 L232 108 L170 108 Z" fill="#eaf1fc"/>
      ${ee(13,10,170,20,60,90)}
    </g>
    <rect x="198.5" y="22" width="3" height="86" fill="#e8d6b0"/>
    <rect x="170" y="70" width="60" height="3" fill="#e8d6b0"/>
    <rect x="158" y="108" width="84" height="6" rx="2" fill="#c9a874"/>
    <rect x="160" y="114" width="80" height="3" fill="#000" opacity="0.25"/>
    <!-- Little plant on the sill -->
    <path d="M220 100 q-5 -8 0 -12 q5 4 0 12 M220 100 q6 -6 10 -4 q-3 6 -10 4 M220 100 q-7 -4 -10 -1 q4 5 10 1" fill="#3aae8a"/>
    <path d="M214 100 L226 100 L224 108 L216 108 Z" fill="#c0392b"/>

    ${s(130,!0)}${s(270,!t("lantern"))}

    <!-- Nice list -->
    <g>
      <rect x="290" y="30" width="34" height="58" fill="#f6ecd2"/>
      <rect x="287" y="27" width="40" height="6" rx="3" fill="#e2d2ad"/>
      <rect x="287" y="85" width="40" height="6" rx="3" fill="#e2d2ad"/>
      <text x="307" y="44" text-anchor="middle" font-size="7" font-weight="800" font-family="Nunito, Arial, sans-serif" fill="#c0392b">NICE</text>
      <g stroke="#8a7a5a" stroke-width="1" stroke-linecap="round">
        <line x1="295" y1="51" x2="315" y2="51"/><line x1="295" y1="57" x2="318" y2="57"/><line x1="295" y1="63" x2="312" y2="63"/>
        <line x1="295" y1="69" x2="317" y2="69"/><line x1="295" y1="75" x2="310" y2="75"/>
      </g>
      <g fill="#3aae8a"><circle cx="320" cy="51" r="1.4"/><circle cx="321" cy="63" r="1.4"/><circle cx="320" cy="75" r="1.4"/></g>
      <circle cx="307" cy="27" r="1.6" fill="#c9a65a"/>
    </g>

    <!-- Clock with pendulum -->
    <g>
      <rect x="342" y="86" width="20" height="34" rx="3" fill="#5a3520"/>
      <rect x="345" y="89" width="14" height="28" rx="2" fill="#2a1a10"/>
      <g class="sd-pendulum" style="transform-origin: 352px 89px">
        <line x1="352" y1="89" x2="352" y2="108" stroke="#c9a65a" stroke-width="1.2"/>
        <circle cx="352" cy="110" r="3.6" fill="#f7c873"/>
      </g>
      <circle cx="352" cy="72" r="19" fill="#7a4c2d"/>
      <circle cx="352" cy="72" r="16" fill="#fbf3e0"/>
      <g stroke="#2a1a10" stroke-width="1">${x}</g>
      ${o(r,8,2.4)}${o(n,12,1.5)}
      <circle cx="352" cy="72" r="1.6" fill="#c0392b"/>
    </g>

    <!-- Shelves -->
    <rect x="8" y="86" width="136" height="6" rx="1" fill="url(#${e}wood)"/>
    <rect x="8" y="150" width="136" height="6" rx="1" fill="url(#${e}wood)"/>
    <g fill="#5a3520">
      <polygon points="20,92 30,92 20,104"/><polygon points="132,92 122,92 132,104"/>
      <polygon points="20,156 30,156 20,168"/><polygon points="132,156 122,156 132,168"/>
    </g>
    <rect x="8" y="92" width="136" height="3" fill="#000" opacity="0.25"/>
    <rect x="8" y="156" width="136" height="3" fill="#000" opacity="0.25"/>

    <!-- Teddy -->
    <g>
      <ellipse cx="22" cy="83" rx="5" ry="4" fill="#9a6235"/><ellipse cx="42" cy="83" rx="5" ry="4" fill="#9a6235"/>
      <ellipse cx="32" cy="74" rx="10" ry="11" fill="#a8703f"/>
      <ellipse cx="32" cy="77" rx="5.5" ry="6.5" fill="#d9ad7c"/>
      <ellipse cx="21" cy="71" rx="3.4" ry="6" fill="#9a6235" transform="rotate(30 21 71)"/>
      <ellipse cx="43" cy="71" rx="3.4" ry="6" fill="#9a6235" transform="rotate(-30 43 71)"/>
      <circle cx="24" cy="50" r="4" fill="#a8703f"/><circle cx="40" cy="50" r="4" fill="#a8703f"/>
      <circle cx="24" cy="50" r="2" fill="#d9ad7c"/><circle cx="40" cy="50" r="2" fill="#d9ad7c"/>
      <circle cx="32" cy="57" r="9.5" fill="#b57a45"/>
      <ellipse cx="32" cy="60.5" rx="4.4" ry="3.4" fill="#e8c49a"/>
      <ellipse cx="32" cy="59" rx="1.7" ry="1.2" fill="#2b1a12"/>
      <circle cx="28.4" cy="55" r="1.1" fill="#2b1a12"/><circle cx="35.6" cy="55" r="1.1" fill="#2b1a12"/>
      <path d="M24 66 L32 69.5 L40 66 L40 71 L32 69 L24 71 Z" fill="${t("teddyBow")?"#3b6fd8":"#e0475b"}"/>
      <circle cx="32" cy="69" r="2" fill="${t("teddyBow")?"#2c58b5":"#b72e45"}"/>
    </g>

    <!-- Blocks -->
    ${d(62,71,"#e0475b","A")}${d(79,71,"#3b6fd8","B")}${t("blocks")?"":d(70.5,56,"#3aae8a","C")}

    <!-- Drum -->
    <g>
      <rect x="106" y="66" width="28" height="20" fill="#e0475b"/>
      <path d="M106 68 L113 84 L120 68 L127 84 L134 68" stroke="#f7c873" stroke-width="1.4" fill="none"/>
      <rect x="105" y="64" width="30" height="4" rx="1.5" fill="#fdf6ec"/>
      <rect x="105" y="83" width="30" height="4" rx="1.5" fill="#fdf6ec"/>
      <ellipse cx="120" cy="64" rx="15" ry="3.4" fill="#f4ead7"/>
      ${t("drumsticks")?"":`<path d="M112 62 L100 48 M128 62 L140 50" stroke="#c9a874" stroke-width="2" stroke-linecap="round"/>
      <circle cx="100" cy="48" r="2.2" fill="#fdf6ec"/><circle cx="140" cy="50" r="2.2" fill="#fdf6ec"/>`}
    </g>

    <!-- Train -->
    <g>
      <rect x="14" y="124" width="30" height="19" rx="2" fill="#2e8b57"/>
      <rect x="30" y="114" width="14" height="14" rx="1.5" fill="#2e8b57"/>
      <rect x="33" y="117" width="8" height="6" rx="1" fill="#ffd77a"/>
      <rect x="28" y="111" width="18" height="3.4" rx="1.5" fill="#c0392b"/>
      <rect x="17" y="114" width="6" height="10" fill="#2a2a36"/>
      <rect x="15.5" y="111.5" width="9" height="3" rx="1" fill="#2a2a36"/>
      <circle cx="20" cy="105" r="3" fill="#e6ecf6" opacity="0.8" class="sd-smoke"/>
      <rect x="14" y="124" width="30" height="2.4" fill="#fff" opacity="0.25"/>
      <path d="M14 139 L8 143 L14 143 Z" fill="#c0392b"/>
      ${u(22,145,4.6)}${u(37,145,4.6)}
      ${M(48,"#e0475b",'<rect x="52" y="122" width="9" height="8" fill="#f7c873"/><rect x="62" y="124" width="8" height="6" fill="#3b6fd8"/>')}
      ${t("train")?"":M(79,"#3b6fd8",'<circle cx="86" cy="127" r="4" fill="#e0475b"/><circle cx="96" cy="127" r="4" fill="#3aae8a"/>')}
    </g>

    <!-- Ball -->
    <g>
      <circle cx="128" cy="139" r="10.5" fill="#fdf6ec"/>
      <path d="M118 135 Q128 129 138 135 L138.5 139 Q128 133 117.5 139 Z" fill="#e0475b"/>
      <path d="M118 143 Q128 149 138 143 L137 146 Q128 151 119 146 Z" fill="#3b6fd8"/>
      <circle cx="128" cy="139" r="10.5" fill="url(#${e}shine)"/>
    </g>

    <!-- Floor -->
    <rect y="224" width="400" height="76" fill="url(#${e}floor)"/>
    <rect y="224" width="400" height="2" fill="#000" opacity="0.35"/>
    <g stroke="#000" stroke-opacity="0.3" stroke-width="0.8">${f}</g>
    <g fill="#e6c38f" opacity="0.45"><circle cx="180" cy="262" r="1"/><circle cx="186" cy="266" r="0.8"/><circle cx="222" cy="270" r="1"/><circle cx="160" cy="276" r="0.8"/></g>

    <!-- Elf behind the workbench -->
    <g>
      <path d="M182 200 L186 160 Q200 152 214 160 L218 200 Z" fill="#2e8b57"/>
      <path d="M186 168 L214 168 L213 174 L187 174 Z" fill="#2a1a10"/>
      <rect x="197" y="168" width="6" height="6" fill="#f7c873"/>
      <path d="M187 159 L193 166 L200 159 L207 166 L213 159 Q200 154 187 159 Z" fill="#c0392b"/>
      <circle cx="193" cy="166" r="1.4" fill="#f7c873"/><circle cx="207" cy="166" r="1.4" fill="#f7c873"/>
      <path d="M188 162 Q178 176 184 192" stroke="#2e8b57" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="185" cy="193" r="3.4" fill="#f2c9a0"/>
      <path d="M186 146 L176 138 L188 142 Z" fill="#f2c9a0"/><path d="M214 146 L224 138 L212 142 Z" fill="#f2c9a0"/>
      <circle cx="200" cy="145" r="12" fill="#f2c9a0"/>
      <circle cx="195.5" cy="144" r="1.4" fill="#2b1a12"/><circle cx="204.5" cy="144" r="1.4" fill="#2b1a12"/>
      <circle cx="192.5" cy="148.5" r="2" fill="#f28c8c" opacity="0.7"/><circle cx="207.5" cy="148.5" r="2" fill="#f28c8c" opacity="0.7"/>
      <path d="M196 150 Q200 153.5 204 150" stroke="#8a3a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="200" cy="147.5" rx="1.6" ry="1.2" fill="#e8a080"/>
      <path d="M187 138 Q200 132 213 138 L208 118 Q214 108 226 112 Q215 104 205 112 Q196 118 187 138 Z" fill="${t("elfHat")?"#d6283f":"#1f7a4c"}"/>
      <rect x="186" y="134.5" width="28" height="5.4" rx="2.7" fill="#fbf6ee"/>
      <circle cx="226" cy="112" r="3.4" fill="#f7c873"/>
      <g class="sd-hammer" style="transform-origin: 212px 162px">
        <path d="M212 162 Q222 160 224 170" stroke="#2e8b57" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="224" cy="172" r="3.4" fill="#f2c9a0"/>
        <line x1="224" y1="172" x2="224" y2="186" stroke="#8a5a36" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="218" y="183" width="12" height="7" rx="1.5" fill="#6a6a78"/>
      </g>
    </g>

    <!-- Workbench -->
    <rect x="118" y="196" width="164" height="10" rx="2" fill="url(#${e}wood)"/>
    <rect x="118" y="196" width="164" height="2" rx="1" fill="#d9a774"/>
    <rect x="124" y="206" width="152" height="8" fill="#6e4426"/>
    <rect x="128" y="214" width="9" height="66" fill="#6e4426"/><rect x="263" y="214" width="9" height="66" fill="#6e4426"/>
    <rect x="137" y="250" width="126" height="5" fill="#5a3520"/>
    <ellipse cx="200" cy="282" rx="80" ry="5" fill="#000" opacity="0.3"/>
    <!-- Toy car being built -->
    <g>
      <path d="M140 194 L140 186 Q142 180 150 180 L158 180 Q164 180 166 186 L170 186 Q172 187 172 194 Z" fill="${t("car")?"#3b6fd8":"#e0475b"}"/>
      <rect x="147" y="182" width="5" height="4" rx="1" fill="#cfe6ff"/><rect x="154" y="182" width="5" height="4" rx="1" fill="#cfe6ff"/>
      ${u(147,194,3.4)}${u(165,194,3.4)}
    </g>
    <!-- Paint pots -->
    <g>
      <rect x="236" y="186" width="11" height="10" rx="1.5" fill="#d8dee8"/><ellipse cx="241.5" cy="186" rx="5.5" ry="1.8" fill="#3b6fd8"/>
      <rect x="250" y="188" width="10" height="8" rx="1.5" fill="#d8dee8"/><ellipse cx="255" cy="188" rx="5" ry="1.6" fill="#f7c873"/>
      <rect x="263" y="186" width="11" height="10" rx="1.5" fill="#d8dee8"/><ellipse cx="268.5" cy="186" rx="5.5" ry="1.8" fill="#3aae8a"/>
      <line x1="244" y1="186" x2="250" y2="174" stroke="#c9a874" stroke-width="1.6" stroke-linecap="round"/>
    </g>

    <!-- Sack of presents -->
    <g>
      ${t("sackPresent")?"":`<g transform="rotate(14 320 214)">${H(312,206,18,16,"#3b6fd8","#f7c873")}</g>`}
      <g transform="rotate(-12 300 216)">${H(292,206,18,16,"#e0475b","#fdf6ec")}</g>
      <path d="M306 222 L306 196 Q306 190 311 190 Q316 190 316 196" stroke="#fdf6ec" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M306 222 L306 196 Q306 190 311 190" stroke="#e0475b" stroke-width="3.4" fill="none" stroke-dasharray="3 3"/>
      <path d="M288 226 Q282 254 290 280 Q312 290 336 280 Q344 254 336 226 Q312 232 288 226 Z" fill="url(#${e}sack)"/>
      <path d="M286 226 Q312 236 338 226 Q336 220 312 222 Q290 220 286 226 Z" fill="#8a6a3e"/>
      <path d="M296 240 Q300 262 298 278 M322 238 Q326 260 324 280" stroke="#000" stroke-opacity="0.15" stroke-width="1.2" fill="none"/>
      <path d="M302 250 l3 -6 3 6 -6 -3.6 h6 z" fill="#c0392b" opacity="0.8"/>
    </g>

    <!-- Rocking horse -->
    <g transform="translate(368 254)">
      <g ${t("horse")?'transform="scale(-1 1)"':""}>
        <path d="M-28 26 Q0 40 28 26" stroke="#8a2433" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M-16 6 L-20 28 M-8 6 L-10 31 M10 6 L12 31 M17 4 L22 28" stroke="#f4ead7" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="0" cy="2" rx="21" ry="9" fill="#f4ead7"/>
        <path d="M14 -2 Q18 -18 26 -22 Q32 -22 32 -16 Q30 -12 24 -12 Q22 -4 20 2 Z" fill="#f4ead7"/>
        <path d="M17 -6 Q16 -18 24 -24 Q20 -16 22 -8 Z M24 -24 Q22 -18 26 -14" fill="#c0392b"/>
        <path d="M-21 0 Q-30 0 -30 12 Q-26 6 -20 6" fill="#c0392b"/>
        <circle cx="26" cy="-17" r="1.3" fill="#2a1a10"/>
        <path d="M24 -24 L23 -29 L27 -25" fill="#f4ead7"/>
        <rect x="-8" y="-7" width="14" height="9" rx="3" fill="#3b6fd8"/>
        <rect x="-8" y="-7" width="14" height="2" rx="1" fill="#f7c873"/>
        <path d="M26 -14 L14 -4" stroke="#f7c873" stroke-width="1"/>
      </g>
    </g>

    <!-- Second elf with a candy cane -->
    <g>
      <ellipse cx="58" cy="284" rx="20" ry="4" fill="#000" opacity="0.3"/>
      <path d="M50 262 L49 280 M64 262 L65 280" stroke="#fdf6ec" stroke-width="5"/>
      <path d="M50 266 L49 270 M64 266 L65 270 M50 274 L49 277 M64 274 L65 277" stroke="#e0475b" stroke-width="5"/>
      <path d="M42 282 Q42 278 50 278 Q53 280 52 283 Q46 285 40 280" fill="#1f7a4c"/>
      <path d="M72 282 Q72 278 64 278 Q61 280 62 283 Q68 285 74 280" fill="#1f7a4c"/>
      <path d="M44 264 L47 232 Q57 226 67 232 L70 264 Z" fill="#c0392b"/>
      <path d="M44 264 L48 258 L52 264 L56 258 L60 264 L64 258 L70 264 Z" fill="#c0392b"/>
      <rect x="45" y="246" width="24" height="5" fill="#2a1a10"/><rect x="54" y="246" width="6" height="5" fill="#f7c873"/>
      <path d="M48 234 Q38 242 40 252" stroke="#c0392b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="253" r="2.8" fill="#f2c9a0"/>
      <path d="M40 256 L40 236 Q40 230 34 230 Q29 230 29 235" stroke="#fdf6ec" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 256 L40 236 Q40 230 34 230 Q29 230 29 235" stroke="#e0475b" stroke-width="3" fill="none" stroke-dasharray="2.5 2.5"/>
      <path d="M66 234 Q74 244 72 252" stroke="#c0392b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="72" cy="253" r="2.8" fill="#f2c9a0"/>
      <path d="M46 220 L37 213 L48 216 Z" fill="#f2c9a0"/><path d="M68 220 L77 213 L66 216 Z" fill="#f2c9a0"/>
      <circle cx="57" cy="220" r="10.5" fill="#f2c9a0"/>
      <circle cx="53" cy="219.5" r="1.3" fill="#2b1a12"/><circle cx="61" cy="219.5" r="1.3" fill="#2b1a12"/>
      <circle cx="50.5" cy="223.5" r="1.8" fill="#f28c8c" opacity="0.7"/><circle cx="63.5" cy="223.5" r="1.8" fill="#f28c8c" opacity="0.7"/>
      <path d="M54 225 Q57 228 60 225" stroke="#8a3a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M45 214 Q57 208 69 214 Q66 200 58 194 Q50 190 42 196 Q50 198 52 202 Z" fill="#e0475b"/>
      <rect x="44" y="211" width="26" height="5" rx="2.5" fill="#fbf6ee"/>
      <circle cx="42" cy="196" r="3" fill="#fbf6ee"/>
    </g>
    `)}var Ce=[{id:"livingRoom",render:Je,diffs:[{id:"star",x:48,y:58,r:15},{id:"cat",x:50,y:130,r:18},{id:"teddyHat",x:72,y:225,r:16},{id:"mouse",x:114,y:216,r:15},{id:"ornament",x:200,y:152,r:14},{id:"present",x:203,y:236,r:18},{id:"candles",x:262,y:98,r:20},{id:"frame",x:308,y:62,r:28},{id:"stocking",x:300,y:138,r:17},{id:"tomte",x:352,y:94,r:14,subtle:!0},{id:"ribbon",x:145,y:232,r:16,subtle:!0}]},{id:"village",render:Xe,diffs:[{id:"shooting",x:116,y:40,r:22},{id:"smoke",x:91,y:78,r:18},{id:"wreath",x:64,y:182,r:15},{id:"snowmanHat",x:40,y:210,r:16},{id:"bird",x:194,y:242,r:15},{id:"window",x:222,y:141,r:15},{id:"lamp",x:262,y:134,r:17},{id:"moon",x:330,y:48,r:23},{id:"door",x:332,y:187,r:16},{id:"kidHat",x:304,y:247,r:15},{id:"spruceStar",x:105,y:196,r:12,subtle:!0},{id:"attic",x:196,y:106,r:12,subtle:!0}]},{id:"workshop",render:Ye,diffs:[{id:"teddyBow",x:32,y:66,r:15},{id:"blocks",x:78,y:63,r:15},{id:"train",x:92,y:137,r:17},{id:"star",x:185,y:52,r:14},{id:"elfHat",x:208,y:124,r:18},{id:"lantern",x:270,y:46,r:17},{id:"clock",x:352,y:72,r:20},{id:"sackPresent",x:322,y:213,r:15},{id:"horse",x:368,y:252,r:26},{id:"car",x:156,y:187,r:14,subtle:!0},{id:"drumsticks",x:120,y:54,r:16,subtle:!0}]}];export{K as SCENE_H,A as SCENE_W,Me as SpotDifferenceChallenge,ke as findHit};
