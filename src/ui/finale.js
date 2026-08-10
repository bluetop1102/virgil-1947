// [UI] 암전 베일 + 종막 카드. world/transit.js 가 발화하는 `transit:veil`·`finale:show` 만 그린다.
// 판정도 진행도 여기 없다 — 화면과 마지막 입력 하나가 전부다.
//
// 조판은 타이틀(ui/title.js)의 활자 문법을 그대로 따른다. 시스템 폰트·현대 UI 위젯을 쓰면
// 40분을 1947년으로 버틴 화면이 마지막 한 장에서 웹 페이지로 되돌아간다(루브릭 D7).

const TYPEFACE = "'Courier New', Courier, 'AppleMyungjo', Georgia, serif"
const DISPLAY = "'Baskerville', 'Iowan Old Style', 'Times New Roman', serif"

const ACT = '제1막'
const LINE = '사건 파일은 닫히지 않았다.'
const TAIL = '수사는 계속된다.'
// docs/credits.md §1.2 — 요강 필수 기재. 화면에도 한 줄 남긴다.
const CREDIT = '음악: Kevin MacLeod (incompetech.com) · CC BY 4.0'
const EXIT_LINE = '키를 눌러 나가십시오'

function el (tag, className, text = '') {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

export default {
  name: 'finale',
  order: 86,          // title(80) 뒤 — 종막은 타이틀보다 위에 앉는다

  async init (engine) {
    this.engine = engine
    this.shown = false
    this._build()
    engine.bus.on('transit:veil', (p) => this.veil(p?.on !== false, p?.dur, p))
    engine.bus.on('finale:show', (p) => this.show(p?.delay))
    engine.bus.on('qa:shot', () => { if (engine.qa) this._reset() })
  },

  _build () {
    const style = document.createElement('style')
    style.textContent = `
      .virgil-veil{position:fixed;inset:0;z-index:150;background:#000;opacity:0;pointer-events:none;transition:opacity 500ms linear}
      /* 막 표제 — 암전과 한 몸이라 베일의 opacity 를 그대로 물려받는다 */
      .virgil-veil-cap{position:absolute;inset:0;display:none;align-items:center;justify-content:center;
        font-family:${DISPLAY};font-size:clamp(30px,3.6vw,58px);letter-spacing:.42em;text-indent:.42em;
        color:#9c8657;text-shadow:0 0 32px rgba(156,134,87,.22)}
      .virgil-veil-cap[data-on="1"]{display:flex}
      .virgil-finale{position:fixed;inset:0;z-index:151;display:none;align-items:center;justify-content:center;opacity:0;
        color:#cbb493;font-family:${TYPEFACE};background:radial-gradient(ellipse at 50% 48%,#0b0a08,#020203 68%)}
      .virgil-finale[data-on="1"]{display:flex}
      .virgil-finale[data-lit="1"]{opacity:1}
      .virgil-finale-card{width:min(760px,84vw);padding:clamp(34px,5vh,64px) clamp(28px,5vw,64px);text-align:center;
        border-top:1px solid rgba(176,146,86,.42);border-bottom:1px solid rgba(176,146,86,.42)}
      .virgil-finale-act{font-family:${DISPLAY};font-size:clamp(13px,1.3vw,19px);letter-spacing:.62em;text-indent:.62em;
        color:#8d7b56;text-shadow:0 2px 12px rgba(0,0,0,.9)}
      .virgil-finale-line{margin-top:clamp(22px,3.4vh,42px);font-family:${DISPLAY};font-size:clamp(23px,2.7vw,40px);
        line-height:1.72;letter-spacing:.13em;color:#cfbc93;text-shadow:0 1px rgba(239,224,169,.16),0 8px 30px rgba(0,0,0,.92)}
      .virgil-finale-tail{margin-top:clamp(8px,1.2vh,16px);font-family:${DISPLAY};font-size:clamp(17px,1.9vw,27px);
        line-height:1.72;letter-spacing:.19em;color:#a89772}
      .virgil-finale-credit{margin-top:clamp(30px,4.6vh,58px);font-size:clamp(11px,1.02vw,14px);letter-spacing:.10em;
        color:#7e7159}
      .virgil-finale-exit{margin-top:clamp(16px,2.4vh,30px);font-size:clamp(13px,1.24vw,18px);letter-spacing:.44em;
        text-indent:.44em;color:#ddcda4;animation:virgil-finale-pulse 2.6s ease-in-out infinite}
      @keyframes virgil-finale-pulse{0%,100%{opacity:.6}52%{opacity:1}}
      @media (prefers-reduced-motion:reduce){.virgil-finale-exit{animation:none;opacity:.92}}
    `
    document.head.appendChild(style)
    this.style = style

    this.veilNode = el('div', 'virgil-veil')
    this.capNode = el('div', 'virgil-veil-cap')
    this.veilNode.appendChild(this.capNode)
    document.body.appendChild(this.veilNode)

    this.layer = el('div', 'virgil-finale')
    const card = el('div', 'virgil-finale-card')
    card.append(
      el('div', 'virgil-finale-act', ACT),
      el('div', 'virgil-finale-line', LINE),
      el('div', 'virgil-finale-tail', TAIL),
      el('div', 'virgil-finale-credit', CREDIT),
      el('div', 'virgil-finale-exit', EXIT_LINE)
    )
    this.layer.appendChild(card)
    document.body.appendChild(this.layer)
  },

  // dur·delay 는 초. transit 이 넘기는 페이드 길이를 그대로 CSS 로 옮긴다 — 공간 빌드가
  // 프레임을 통째로 잡아먹는 구간이라 여기서만은 엔진 시간이 아니라 벽시계가 기준이다.
  veil (on, dur, opt) {
    if (!this.veilNode) return
    const ms = Math.round(Math.max(0, Number(dur) || 0.5) * 1000)
    const wait = Math.round(Math.max(0, Number(opt?.delay) || 0) * 1000)
    this.veilNode.style.transition = `opacity ${ms}ms linear ${wait}ms`
    this.veilNode.style.opacity = on ? '1' : '0'
    if (on) this.capNode.textContent = opt?.caption ?? ''
    this.capNode.dataset.on = this.capNode.textContent ? '1' : ''
  },

  show (delay) {
    if (this.shown) return
    this.shown = true
    const wait = Math.max(0, Number(delay) || 0)
    this.layer.dataset.on = '1'
    this.layer.style.transition = `opacity 900ms linear ${wait}s`
    requestAnimationFrame(() => { this.layer.dataset.lit = '1' })
    this.engine.bus.emit('game:pause', { on: true })
    document.exitPointerLock?.()
    if (this.engine.qa) return
    // 입력은 카드가 다 뜬 뒤에야 받는다. 문을 연 그 E 키가 아직 버블 중이라, 여기서 바로
    // window 에 걸면 **같은 키 한 번에 종막이 열리고 닫힌다**(S-P 실측: 화면이 곧장 타이틀로).
    this.layer.addEventListener('transitionend', () => this._arm(), { once: true })
    setTimeout(() => this._arm(), Math.round((wait + 1.2) * 1000))
  },

  _arm () {
    if (this.armed || !this.shown) return
    this.armed = true
    // Escape 는 설정 카드의 것이다(title.js 와 같은 예외) — 그 한 키만 빼고 아무 입력이나 받는다.
    this._onKey = (e) => { if (!e.repeat && e.key !== 'Escape') this._leave() }
    this._onPointer = () => this._leave()
    window.addEventListener('keydown', this._onKey)
    window.addEventListener('pointerdown', this._onPointer)
  },

  // 타이틀 복귀. title.js 의 재입장 경로와 같은 방식으로 진입 URL 을 되잡아 다시 연다 —
  // 종막 뒤의 상태는 어디에도 저장되지 않으므로(세이브 없음) 새 회차가 정직한 결과다.
  _leave () {
    if (this.left) return
    this.left = true
    this._reset()
    const url = new URL(location.href)
    url.search = ''
    location.assign(url)
  },

  _reset () {
    if (this._onKey) window.removeEventListener('keydown', this._onKey)
    if (this._onPointer) window.removeEventListener('pointerdown', this._onPointer)
    this._onKey = null
    this._onPointer = null
    this.armed = false
    if (this.layer) { this.layer.dataset.on = ''; this.layer.dataset.lit = '' }
    if (this.capNode) { this.capNode.dataset.on = ''; this.capNode.textContent = '' }
    if (this.veilNode) this.veilNode.style.opacity = '0'
    this.shown = false
  },

  update () {},

  dispose () {
    this._reset()
    this.layer?.remove()
    this.veilNode?.remove()
    this.style?.remove()
  }
}
