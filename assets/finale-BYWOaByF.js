var e=`'Baskerville', 'Iowan Old Style', 'Times New Roman', serif`;function t(e,t,n=``){let r=document.createElement(e);return r.className=t,r.textContent=n,r}var n={name:`finale`,order:86,async init(e){this.engine=e,this.shown=!1,this._build(),e.bus.on(`transit:veil`,e=>this.veil(e?.on!==!1,e?.dur,e)),e.bus.on(`finale:show`,e=>this.show(e?.delay)),e.bus.on(`qa:shot`,()=>{e.qa&&this._reset()})},_build(){let n=document.createElement(`style`);n.textContent=`
      .virgil-veil{position:fixed;inset:0;z-index:150;background:#000;opacity:0;pointer-events:none;transition:opacity 500ms linear}
      /* 막 표제 — 암전과 한 몸이라 베일의 opacity 를 그대로 물려받는다 */
      .virgil-veil-cap{position:absolute;inset:0;display:none;align-items:center;justify-content:center;
        font-family:${e};font-size:clamp(30px,3.6vw,58px);letter-spacing:.42em;text-indent:.42em;
        color:#9c8657;text-shadow:0 0 32px rgba(156,134,87,.22)}
      .virgil-veil-cap[data-on="1"]{display:flex}
      .virgil-finale{position:fixed;inset:0;z-index:151;display:none;align-items:center;justify-content:center;opacity:0;
        color:#cbb493;font-family:'Courier New', Courier, 'AppleMyungjo', Georgia, serif;background:radial-gradient(ellipse at 50% 48%,#0b0a08,#020203 68%)}
      .virgil-finale[data-on="1"]{display:flex}
      .virgil-finale[data-lit="1"]{opacity:1}
      .virgil-finale-card{width:min(760px,84vw);padding:clamp(34px,5vh,64px) clamp(28px,5vw,64px);text-align:center;
        border-top:1px solid rgba(176,146,86,.42);border-bottom:1px solid rgba(176,146,86,.42)}
      .virgil-finale-act{font-family:${e};font-size:clamp(13px,1.3vw,19px);letter-spacing:.62em;text-indent:.62em;
        color:#8d7b56;text-shadow:0 2px 12px rgba(0,0,0,.9)}
      .virgil-finale-line{margin-top:clamp(22px,3.4vh,42px);font-family:${e};font-size:clamp(23px,2.7vw,40px);
        line-height:1.72;letter-spacing:.13em;color:#cfbc93;text-shadow:0 1px rgba(239,224,169,.16),0 8px 30px rgba(0,0,0,.92)}
      .virgil-finale-tail{margin-top:clamp(8px,1.2vh,16px);font-family:${e};font-size:clamp(17px,1.9vw,27px);
        line-height:1.72;letter-spacing:.19em;color:#a89772}
      .virgil-finale-credit{margin-top:clamp(30px,4.6vh,58px);font-size:clamp(11px,1.02vw,14px);letter-spacing:.10em;
        color:#7e7159}
      .virgil-finale-exit{margin-top:clamp(16px,2.4vh,30px);font-size:clamp(13px,1.24vw,18px);letter-spacing:.44em;
        text-indent:.44em;color:#ddcda4;animation:virgil-finale-pulse 2.6s ease-in-out infinite}
      @keyframes virgil-finale-pulse{0%,100%{opacity:.6}52%{opacity:1}}
      @media (prefers-reduced-motion:reduce){.virgil-finale-exit{animation:none;opacity:.92}}
    `,document.head.appendChild(n),this.style=n,this.veilNode=t(`div`,`virgil-veil`),this.capNode=t(`div`,`virgil-veil-cap`),this.veilNode.appendChild(this.capNode),document.body.appendChild(this.veilNode),this.layer=t(`div`,`virgil-finale`);let r=t(`div`,`virgil-finale-card`);r.append(t(`div`,`virgil-finale-act`,`제1막`),t(`div`,`virgil-finale-line`,`사건 파일은 닫히지 않았다.`),t(`div`,`virgil-finale-tail`,`수사는 계속된다.`),t(`div`,`virgil-finale-credit`,`음악: Kevin MacLeod (incompetech.com) · CC BY 4.0`),t(`div`,`virgil-finale-exit`,`키를 눌러 나가십시오`)),this.layer.appendChild(r),document.body.appendChild(this.layer)},veil(e,t,n){if(!this.veilNode)return;let r=Math.round(Math.max(0,Number(t)||.5)*1e3),i=Math.round(Math.max(0,Number(n?.delay)||0)*1e3);this.veilNode.style.transition=`opacity ${r}ms linear ${i}ms`,this.veilNode.style.opacity=e?`1`:`0`,e&&(this.capNode.textContent=n?.caption??``),this.capNode.dataset.on=this.capNode.textContent?`1`:``},show(e){if(this.shown)return;this.shown=!0;let t=Math.max(0,Number(e)||0);this.layer.dataset.on=`1`,this.layer.style.transition=`opacity 900ms linear ${t}s`,requestAnimationFrame(()=>{this.layer.dataset.lit=`1`}),this.engine.bus.emit(`game:pause`,{on:!0}),document.exitPointerLock?.(),!this.engine.qa&&(this.layer.addEventListener(`transitionend`,()=>this._arm(),{once:!0}),setTimeout(()=>this._arm(),Math.round((t+1.2)*1e3)))},_arm(){this.armed||!this.shown||(this.armed=!0,this._onKey=e=>{!e.repeat&&e.key!==`Escape`&&this._leave()},this._onPointer=()=>this._leave(),window.addEventListener(`keydown`,this._onKey),window.addEventListener(`pointerdown`,this._onPointer))},_leave(){if(this.left)return;this.left=!0,this._reset();let e=new URL(location.href);e.search=``,location.assign(e)},_reset(){this._onKey&&window.removeEventListener(`keydown`,this._onKey),this._onPointer&&window.removeEventListener(`pointerdown`,this._onPointer),this._onKey=null,this._onPointer=null,this.armed=!1,this.layer&&(this.layer.dataset.on=``,this.layer.dataset.lit=``),this.capNode&&(this.capNode.dataset.on=``,this.capNode.textContent=``),this.veilNode&&(this.veilNode.style.opacity=`0`),this.shown=!1},update(){},dispose(){this._reset(),this.layer?.remove(),this.veilNode?.remove(),this.style?.remove()}};export{n as default};