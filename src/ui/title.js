const DISCLOSURE = '이 이야기의 인물·사건·호텔은 전부 허구다. 실존하는 어떤 인물·사건·업체와도 무관하다.'
const TYPEFACE = "'Courier New', Courier, 'AppleMyungjo', Georgia, serif"
const DISPLAY = "'Baskerville', 'Iowan Old Style', 'Times New Roman', serif"

function el (tag, className, text = '') {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

function plaque (label, mode) {
  const node = el('div', 'virgil-plaque', label)
  node.dataset.mode = mode
  node.tabIndex = 0
  node.setAttribute('role', 'button')
  return node
}

function hasCheckpoint () {
  return ['virgil.checkpoint', 'virgil.save', 'virgil.state'].some(key => localStorage.getItem(key))
}

const title = {
  name: 'title',
  order: 80,

  async init (engine) {
    this.engine = engine
    this.active = 'loading'
    this.progress = { done: 0, total: 1 }
    this.qa = engine.qa
    this._build()

    const boot = window.__VIRGIL_BOOT__
    if (boot) this._progress(boot)
    engine.bus.on('boot:progress', p => this._progress(p))
    engine.bus.on('qa:shot', () => { if (engine.qa) this._hideAll() })
    engine.bus.on('qa:state', s => this._qaState(s))

    this._onKey = e => this._key(e)
    this._onPointer = e => this._pointer(e)
    window.addEventListener('keydown', this._onKey)
    window.addEventListener('pointerdown', this._onPointer)
  },

  _build () {
    const style = document.createElement('style')
    style.textContent = `
      .virgil-entry{position:fixed;inset:0;z-index:120;overflow:hidden;color:#d8c9a8;font-family:${TYPEFACE};background:#050608;pointer-events:auto}
      .virgil-entry[hidden]{display:none}.virgil-entry *{box-sizing:border-box}
      .virgil-glass{position:absolute;inset:0;background:radial-gradient(ellipse at 48% 35%,rgba(54,61,58,.34),rgba(7,9,10,.86) 54%,rgba(3,4,5,.98)),repeating-linear-gradient(92deg,rgba(187,170,126,.025) 0 1px,transparent 1px 73px)}
      .virgil-glass:before,.virgil-glass:after{content:'';position:absolute;top:-12%;bottom:-12%;width:1px;background:rgba(179,151,91,.24);box-shadow:0 0 0 1px rgba(20,17,12,.8)}
      .virgil-glass:before{left:18%}.virgil-glass:after{right:18%}
      .virgil-title-mark{position:absolute;left:50%;top:25%;transform:translateX(-50%);font-family:${DISPLAY};font-size:clamp(54px,9vw,126px);letter-spacing:.29em;text-indent:.29em;color:#b69b5d;text-shadow:0 1px #efe0a9,0 -1px #392f1d,0 0 24px rgba(176,143,75,.18);white-space:nowrap}
      .virgil-title-sub{position:absolute;left:50%;top:43%;transform:translateX(-50%);font-family:${DISPLAY};font-size:clamp(12px,1.2vw,18px);letter-spacing:.52em;text-indent:.52em;color:#716142;white-space:nowrap}
      .virgil-choices{position:absolute;left:50%;top:61%;transform:translateX(-50%);display:flex;gap:clamp(24px,5vw,72px)}
      .virgil-plaque{min-width:210px;padding:15px 32px 13px;border:1px solid #8f7543;outline:1px solid rgba(24,17,8,.9);outline-offset:-5px;background:linear-gradient(165deg,#8d7441,#4d3c20 48%,#9b814b);box-shadow:0 9px 20px rgba(0,0,0,.62),inset 0 1px rgba(244,220,159,.38);color:#20180d;text-align:center;font-size:14px;letter-spacing:.32em;text-indent:.32em;text-shadow:0 1px rgba(219,194,137,.45);cursor:pointer;transform:rotate(-.35deg)}
      .virgil-plaque:nth-child(2){transform:rotate(.45deg)}.virgil-plaque:focus,.virgil-plaque:hover{filter:brightness(1.16);outline-color:#d1b775}
      .virgil-bell-prompt{position:absolute;left:50%;bottom:16%;transform:translateX(-50%);text-align:center;color:#a99976;font-size:clamp(12px,1.3vw,17px);letter-spacing:.2em;white-space:nowrap}
      .virgil-bell{display:block;position:relative;width:54px;height:33px;margin:0 auto 20px;border:2px solid #9a7d43;border-top-left-radius:28px 26px;border-top-right-radius:28px 26px;border-bottom:0;filter:drop-shadow(0 5px 7px rgba(0,0,0,.7))}
      .virgil-bell:before{content:'';position:absolute;left:22px;top:-10px;width:7px;height:10px;border:1px solid #9a7d43}.virgil-bell:after{content:'';position:absolute;left:-7px;right:-7px;bottom:-5px;height:5px;background:#8d713b;box-shadow:0 2px #302411}
      .virgil-loading{position:absolute;inset:0;background:radial-gradient(circle at 50% 43%,#10100f,#050608 65%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10vh 12vw}
      .virgil-disclosure{max-width:860px;min-height:5em;color:#b6aa91;font-size:clamp(15px,1.55vw,23px);line-height:2.15;letter-spacing:.12em;text-align:center;text-shadow:0 0 14px rgba(197,173,120,.12)}
      .virgil-disclosure:after{content:'';display:inline-block;width:.56em;height:1.15em;margin-left:.22em;vertical-align:-.18em;background:#8e8065;opacity:.72}
      .virgil-keyrack{position:absolute;left:8vw;right:8vw;bottom:10vh;height:90px;border-top:3px solid #33291b;display:flex;justify-content:center;gap:clamp(8px,1.3vw,20px)}
      .virgil-key{position:relative;width:24px;height:58px;margin-top:-2px;border-left:3px solid #5f4d2b;opacity:.24;transform-origin:top center}
      .virgil-key:before{content:'';position:absolute;left:-8px;top:37px;width:16px;height:24px;border:2px solid #705b32;background:linear-gradient(145deg,#927644,#41331c)}
      .virgil-key.on{opacity:.92;filter:drop-shadow(0 4px 4px rgba(0,0,0,.7))}.virgil-key.on:nth-child(odd){transform:rotate(-2deg)}.virgil-key.on:nth-child(even){transform:rotate(1.5deg)}
      .virgil-resume-lines{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);width:min(760px,80vw);text-align:center;color:#b5a687;font-size:clamp(15px,1.55vw,22px);line-height:2.25;letter-spacing:.14em}
      .virgil-patina{position:absolute;inset:-20%;pointer-events:none;background:linear-gradient(105deg,transparent 42%,rgba(197,171,105,.055) 49%,transparent 55%);mix-blend-mode:screen}
    `
    document.head.appendChild(style)
    this.style = style

    this.layer = el('div', 'virgil-entry')
    document.body.appendChild(this.layer)

    this.loading = el('div', 'virgil-loading')
    this.disclosure = el('div', 'virgil-disclosure')
    this.loading.appendChild(this.disclosure)
    this.keys = el('div', 'virgil-keyrack')
    this.loading.appendChild(this.keys)
    this.layer.appendChild(this.loading)

    this.titleScreen = el('div', 'virgil-glass')
    this.titleScreen.appendChild(el('div', 'virgil-title-mark', 'VIRGIL'))
    this.titleScreen.appendChild(el('div', 'virgil-title-sub', '1947 · ROOM 942'))
    this.choices = el('div', 'virgil-choices')
    this.titleScreen.appendChild(this.choices)
    this.bellPrompt = el('div', 'virgil-bell-prompt', '프런트 벨을 누르십시오')
    this.bellPrompt.prepend(el('span', 'virgil-bell'))
    this.titleScreen.appendChild(this.bellPrompt)
    this.layer.appendChild(this.titleScreen)

    this.resumeScreen = el('div', 'virgil-glass')
    const resumeLines = el('div', 'virgil-resume-lines')
    resumeLines.append('돌아오셨습니까 — 벨을 누르십시오', document.createElement('br'), '노트는 두고 가신 그대로입니다.')
    resumeLines.prepend(el('span', 'virgil-bell'))
    this.resumeScreen.appendChild(resumeLines)
    this.layer.appendChild(this.resumeScreen)

    this.patina = el('div', 'virgil-patina')
    this.layer.appendChild(this.patina)
    this._show('loading')
  },

  _progress (p) {
    const total = Math.max(1, Number(p?.total) || 1)
    const done = Math.min(total, Math.max(this.progress.done, Number(p?.done) || 0))
    this.progress = { done, total }
    this._paintLoading()
    if (done >= total && !this.qa) this._show(location.search.includes('resume=1') ? 'resume' : 'title')
  },

  _paintLoading (typing = false) {
    const ratio = this.progress.done / this.progress.total
    const count = typing ? Math.max(17, Math.floor(DISCLOSURE.length * 0.58)) : Math.max(1, Math.floor(DISCLOSURE.length * Math.max(.12, ratio)))
    this.disclosure.textContent = DISCLOSURE.slice(0, Math.min(DISCLOSURE.length, count))
    this.keys.textContent = ''
    const total = Math.min(18, Math.max(6, this.progress.total))
    const on = typing ? Math.ceil(total * .58) : Math.round(total * ratio)
    for (let i = 0; i < total; i++) this.keys.appendChild(el('span', `virgil-key${i < on ? ' on' : ''}`))
  },

  _show (which, forceChoices = false) {
    this.layer.hidden = false
    this.loading.style.display = which === 'loading' ? 'flex' : 'none'
    this.titleScreen.style.display = which === 'title' ? 'block' : 'none'
    this.resumeScreen.style.display = which === 'resume' ? 'block' : 'none'
    this.active = which
    if (which === 'title') this._paintTitle(forceChoices)
  },

  _paintTitle (forceChoices) {
    const saved = forceChoices || hasCheckpoint()
    this.choices.textContent = ''
    this.choices.style.display = saved ? 'flex' : 'none'
    this.bellPrompt.style.display = saved ? 'none' : 'block'
    if (saved) {
      this.choices.append(plaque('이어서', 'resume'), plaque('처음부터', 'new'))
    }
  },

  _hideAll () {
    this.layer.hidden = true
    this.active = null
  },

  _qaState (s) {
    if (!this.engine.qa) return
    if (s?.ui === 'loading') {
      this.progress = { done: 7, total: 12 }
      this._show('loading')
      this._paintLoading(true)
    } else if (s?.ui === 'title') this._show('title', true)
    else if (s?.ui === 'resume') this._show('resume')
    else if (s?.ui === 'settings') this._hideAll()
  },

  _pointer (e) {
    if (this.engine.qa || !this.active || this.active === 'loading') return
    if (this.engine.get('settings')?.isOpen?.()) return
    const mode = e.target.closest?.('[data-mode]')?.dataset.mode
    if (mode) this._proceed(mode)
    else if (this.active === 'resume') this._proceed('wake')
    else if (this.active === 'title' && this.choices.style.display === 'none') this._proceed('new')
  },

  _key (e) {
    if (this.engine.qa || !this.active || this.active === 'loading' || e.key === 'Escape') return
    if (this.engine.get('settings')?.isOpen?.()) return
    if (e.key === 'Enter' && e.target?.dataset?.mode) this._proceed(e.target.dataset.mode)
    else if (this.active === 'resume') this._proceed('wake')
    else if (this.active === 'title' && this.choices.style.display === 'none') this._proceed('new')
  },

  _proceed (mode) {
    try {
      const request = this.engine.canvas.requestPointerLock?.()
      request?.catch?.(() => {})
    } catch {}
    this.engine.bus.emit('title:proceed', { mode })
    if (mode === 'resume') {
      const url = new URL(location.href)
      url.searchParams.set('resume', '1')
      location.assign(url)
      return
    }
    this._hideAll()
  },

  update (dt, elapsed) {
    if (!this.layer || this.layer.hidden) return
    const drift = Math.sin(elapsed * .21) * 3.5
    this.patina.style.transform = `translateX(${drift.toFixed(2)}%)`
  },

  dispose () {
    window.removeEventListener('keydown', this._onKey)
    window.removeEventListener('pointerdown', this._onPointer)
    this.layer?.remove()
    this.style?.remove()
  }
}

export default title
