const DISCLOSURE = '이 이야기의 인물·사건·호텔은 전부 허구다. 실존하는 어떤 인물·사건·업체와도 무관하다.'
const TYPEFACE = "'Courier New', Courier, 'AppleMyungjo', Georgia, serif"
const DISPLAY = "'Baskerville', 'Iowan Old Style', 'Times New Roman', serif"

// B안 배경. assets/title-bg.{jpg,png,webp} 가 있으면 그것을 쓰고, 없으면 glob 이 빈 객체를
// 돌려주므로 빌드가 깨지지 않는다 — 이미지가 도착하기 전에도 A안이 그대로 돈다.
const BG_ASSETS = import.meta.glob('../../assets/title-bg.*', { eager: true, query: '?url', import: 'default' })
const BG_IMAGE = Object.values(BG_ASSETS)[0] || null

// A안 타이틀 카메라. 정문 안쪽에서 로비를 본다 — 왼쪽 기둥이 전경을 물고, 데스크 램프가
// 유일한 광원이고, 소실점은 중앙을 비껴간다(G9). 인트로 시네마틱의 시작점
// (CAMERA_START [0,1.62,8.75] → DESK_LOOK [-1.35,1.08,-3.18])과 거의 같은 자리라
// 벨을 누르는 순간 카메라가 튀지 않고 오프닝 샷으로 그대로 이어진다.
const POSE = { pos: [0.85, 1.58, 7.90], target: [-1.35, 1.24, -3.00], fov: 42 }
const QA_PHASE = 3.0   // 촬영용 고정 위상. 드리프트가 멈춰야 TAA가 수렴한다

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

// 프런트 벨. CSS 반원으로 그렸을 때는 배경(사진)과 밀도가 안 맞아 조악했다 — 돔의 금속
// 그라디언트·림 반사·누름버튼·받침 2단·접지 그림자까지 형태로 그린다. 인스턴스마다 그라디언트
// id 가 충돌하지 않도록 접미사를 받는다. 정적 마크업이라 외부 입력이 섞이지 않는다.
function bell (key) {
  const node = el('span', 'virgil-bell')
  node.innerHTML = `<svg viewBox="0 0 120 92" width="100%" height="100%" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="vb-dome-${key}" x1=".18" y1="0" x2=".82" y2="1">
        <stop offset="0" stop-color="#eed9a2"/><stop offset=".26" stop-color="#bc9852"/>
        <stop offset=".62" stop-color="#755c2c"/><stop offset="1" stop-color="#493819"/>
      </linearGradient>
      <linearGradient id="vb-base-${key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c8a862"/><stop offset=".55" stop-color="#6f5729"/>
        <stop offset="1" stop-color="#3d2f14"/>
      </linearGradient>
      <radialGradient id="vb-shadow-${key}" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#000" stop-opacity=".62"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="84" rx="46" ry="7" fill="url(#vb-shadow-${key})"/>
    <rect x="16" y="74" width="88" height="6" rx="3" fill="url(#vb-base-${key})"/>
    <rect x="23" y="66" width="74" height="9" rx="3.5" fill="url(#vb-base-${key})"/>
    <path d="M18 67a42 38 0 0 1 84 0z" fill="url(#vb-dome-${key})"/>
    <path d="M18 67a42 38 0 0 1 84 0" fill="none" stroke="#f6e6b4" stroke-opacity=".5" stroke-width="1.2"/>
    <path d="M32 57a29 26 0 0 1 24-26" fill="none" stroke="#fbeec9" stroke-opacity=".46" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="60" cy="67" rx="42" ry="4.6" fill="#2a2010" fill-opacity=".55"/>
    <rect x="56" y="18" width="8" height="14" rx="2.6" fill="url(#vb-base-${key})"/>
    <ellipse cx="60" cy="17" rx="9" ry="4.4" fill="url(#vb-dome-${key})"/>
    <ellipse cx="58" cy="15.6" rx="4" ry="1.7" fill="#fbf0cd" fill-opacity=".62"/>
  </svg>`
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
    this.pose = { ...POSE }
    this.fov0 = engine.camera.fov
    // 기본은 B안(호텔 외관 이미지). 이미지가 없거나 ?titlebg=render 면 A안(인게임 로비 렌더)으로
    // 떨어진다 — 배경이 사라져 글자만 남는 화면은 나오지 않는다.
    const params = new URLSearchParams(location.search)
    this.bg = BG_IMAGE && params.get('titlebg') !== 'render' ? 'image' : 'render'
    // ?scene= 진입로는 프로브 공간(월드 y=-500)에 플레이어를 세운다. 거기서 카메라를 로비로
    // 끌어오면 그 진입로가 깨진다(AGENTS.md). 씬 모드에서는 카메라를 건드리지 않는다.
    this.freeCamera = params.has('scene')
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
      .virgil-entry{position:fixed;inset:0;z-index:120;overflow:hidden;color:#d8c9a8;font-family:${TYPEFACE};pointer-events:auto}
      .virgil-entry[hidden]{display:none}.virgil-entry *{box-sizing:border-box}
      /* 유리 너머로 로비 렌더(또는 B안 이미지)가 그대로 보인다. 스크림은 글자가 앉는 띠만
         눌러 대비를 벌고, 가운데는 열어 둔다 — 배경을 덮으면 배경을 쓰는 의미가 없다. */
      .virgil-glass{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 62%,rgba(168,112,44,.14),rgba(120,74,26,.05) 42%,transparent 66%),linear-gradient(180deg,rgba(2,3,5,.95) 0%,rgba(2,3,5,.90) 17%,rgba(2,3,5,.52) 33%,rgba(2,3,5,.20) 52%,rgba(2,3,5,.44) 74%,rgba(1,2,3,.92) 100%),radial-gradient(ellipse at 50% 56%,rgba(3,4,6,0) 18%,rgba(2,3,5,.52) 60%,rgba(1,2,3,.94) 100%),repeating-linear-gradient(92deg,rgba(187,170,126,.02) 0 1px,transparent 1px 73px)}
      .virgil-glass:before,.virgil-glass:after{content:'';position:absolute;top:-12%;bottom:-12%;width:1px;background:rgba(179,151,91,.2);box-shadow:0 0 0 1px rgba(20,17,12,.8)}
      .virgil-glass:before{left:18%}.virgil-glass:after{right:18%}
      /* B안: 이미지가 이미 자기 비네트를 갖고 있으므로 스크림을 얕게 깐다. 유리 멀리언은
         정문 안쪽에서 보는 A안의 논리라 사진 위에서는 지운다 */
      .virgil-glass[data-bg="image"]{background:linear-gradient(180deg,rgba(2,3,5,.86) 0%,rgba(2,3,5,.54) 20%,rgba(2,3,5,.10) 44%,rgba(2,3,5,.06) 62%,rgba(1,2,3,.60) 100%),radial-gradient(ellipse at 50% 52%,rgba(3,4,6,0) 30%,rgba(2,3,5,.22) 68%,rgba(1,2,3,.64) 100%)}
      .virgil-glass[data-bg="image"]:before,.virgil-glass[data-bg="image"]:after{display:none}
      .virgil-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 46%}
      /* 호텔 간판 조판 — 작은 업종명 위, 큰 고유명 아래. 파사드 배경의 마키와 같은 관습이다.
         세 줄을 한 덩어리로 쌓는다. 줄마다 top% 를 주면 화면비에 따라 글자 상자가 겹친다 */
      .virgil-signage{position:absolute;left:50%;top:11%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:clamp(12px,1.5vw,22px);text-align:center;white-space:nowrap}
      .virgil-title-kind{font-family:${DISPLAY};font-size:clamp(13px,1.35vw,21px);line-height:1;letter-spacing:.72em;text-indent:.72em;color:#9c8657;text-shadow:0 2px 14px rgba(0,0,0,.92)}
      .virgil-title-mark{font-family:${DISPLAY};font-size:clamp(54px,9vw,126px);line-height:1;letter-spacing:.29em;text-indent:.29em;color:#c2a668;text-shadow:0 1px #efe0a9,0 -1px #392f1d,0 0 24px rgba(176,143,75,.2),0 8px 34px rgba(0,0,0,.9)}
      .virgil-title-sub{font-family:${DISPLAY};font-size:clamp(12px,1.2vw,18px);line-height:1;letter-spacing:.52em;text-indent:.52em;color:#8d7b56;text-shadow:0 2px 12px rgba(0,0,0,.9)}
      /* 벨과 명패는 한 덩어리다 — 벨을 눌러 체크인한다는 행위 하나를 두 요소로 보인다 */
      .virgil-actions{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:clamp(16px,2vw,26px)}
      .virgil-choices{display:flex;gap:clamp(24px,5vw,72px)}
      .virgil-plaque{min-width:210px;padding:15px 32px 13px;border:1px solid #8f7543;outline:1px solid rgba(24,17,8,.9);outline-offset:-5px;background:linear-gradient(165deg,#8a7245,#453620 44%,#93794a);box-shadow:0 9px 22px rgba(0,0,0,.72),inset 0 1px rgba(244,220,159,.3);color:#151007;text-align:center;font-size:14px;letter-spacing:.32em;text-indent:.32em;text-shadow:0 1px rgba(233,211,157,.6);cursor:pointer;transform:rotate(-.35deg);transition:filter 180ms ease,transform 180ms ease}
      .virgil-plaque:nth-child(2){transform:rotate(.45deg)}
      .virgil-plaque:focus,.virgil-plaque:hover{filter:brightness(1.16);outline-color:#d1b775;transform:rotate(-.35deg) translateY(-1px)}
      .virgil-plaque:nth-child(2):focus,.virgil-plaque:nth-child(2):hover{transform:rotate(.45deg) translateY(-1px)}
      .virgil-bell{display:block;width:clamp(64px,6vw,92px);height:auto;filter:drop-shadow(0 7px 10px rgba(0,0,0,.72))}
      .virgil-bell svg{display:block}
      @media (prefers-reduced-motion:reduce){.virgil-plaque{transition:none}}
      .virgil-loading{position:absolute;inset:0;background:radial-gradient(circle at 50% 43%,#10100f,#050608 65%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10vh 12vw}
      .virgil-disclosure{max-width:860px;min-height:5em;color:#b6aa91;font-size:clamp(15px,1.55vw,23px);line-height:2.15;letter-spacing:.12em;text-align:center;text-shadow:0 0 14px rgba(197,173,120,.12)}
      .virgil-disclosure:after{content:'';display:inline-block;width:.56em;height:1.15em;margin-left:.22em;vertical-align:-.18em;background:#8e8065;opacity:.72}
      .virgil-keyrack{position:absolute;left:8vw;right:8vw;bottom:10vh;height:90px;border-top:3px solid #33291b;display:flex;justify-content:center;gap:clamp(8px,1.3vw,20px)}
      .virgil-key{position:relative;width:24px;height:58px;margin-top:-2px;border-left:3px solid #5f4d2b;opacity:.24;transform-origin:top center}
      .virgil-key:before{content:'';position:absolute;left:-8px;top:37px;width:16px;height:24px;border:2px solid #705b32;background:linear-gradient(145deg,#927644,#41331c)}
      .virgil-key.on{opacity:.92;filter:drop-shadow(0 4px 4px rgba(0,0,0,.7))}.virgil-key.on:nth-child(odd){transform:rotate(-2deg)}.virgil-key.on:nth-child(even){transform:rotate(1.5deg)}
      /* 재입장 두 줄은 벽지 띠 위에 앉는다 — 배경이 살아 있으므로 글자 뒤에 어둠을 깐다 */
      .virgil-resume-lines{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(760px,80vw);padding:52px 40px 44px;text-align:center;color:#cdbc97;font-size:clamp(15px,1.55vw,22px);line-height:2.25;letter-spacing:.14em;text-shadow:0 2px 16px rgba(0,0,0,.95);background:radial-gradient(ellipse at 50% 50%,rgba(1,2,3,.9),rgba(1,2,3,.62) 52%,transparent 76%)}
      .virgil-patina{position:absolute;inset:-20%;pointer-events:none;background:linear-gradient(105deg,transparent 42%,rgba(197,171,105,.055) 49%,transparent 55%);mix-blend-mode:screen}
    `
    document.head.appendChild(style)
    this.style = style

    this.layer = el('div', 'virgil-entry')
    document.body.appendChild(this.layer)

    // B안 배경판. 이미지가 없으면 만들지 않는다(빈 <img>의 깨진 아이콘 방지). 로딩 화면보다
    // 먼저 붙여 맨 아래에 깔린다 — 고지문 화면은 순흑 배경 그대로여야 한다.
    if (BG_IMAGE) {
      this.photo = document.createElement('img')
      this.photo.className = 'virgil-photo'
      this.photo.alt = ''
      this.photo.src = BG_IMAGE
      this.photo.style.display = 'none'
      this.layer.appendChild(this.photo)
    }

    this.loading = el('div', 'virgil-loading')
    this.disclosure = el('div', 'virgil-disclosure')
    this.loading.appendChild(this.disclosure)
    this.keys = el('div', 'virgil-keyrack')
    this.loading.appendChild(this.keys)
    this.layer.appendChild(this.loading)

    this.titleScreen = el('div', 'virgil-glass')
    const signage = el('div', 'virgil-signage')
    signage.append(
      el('div', 'virgil-title-kind', 'HOTEL'),
      el('div', 'virgil-title-mark', 'VIRGIL'),
      el('div', 'virgil-title-sub', '1947')
    )
    this.titleScreen.appendChild(signage)
    this.actions = el('div', 'virgil-actions')
    this.actions.appendChild(bell('title'))
    this.choices = el('div', 'virgil-choices')
    this.actions.appendChild(this.choices)
    this.titleScreen.appendChild(this.actions)
    this.layer.appendChild(this.titleScreen)

    this.resumeScreen = el('div', 'virgil-glass')
    const resumeLines = el('div', 'virgil-resume-lines')
    resumeLines.append('돌아오셨습니까', document.createElement('br'), '노트는 두고 가신 그대로입니다.')
    this.resumeScreen.appendChild(resumeLines)
    const resumeActions = el('div', 'virgil-actions')
    resumeActions.appendChild(bell('resume'))
    const resumeChoice = el('div', 'virgil-choices')
    resumeChoice.appendChild(plaque('이어서', 'wake'))
    resumeActions.appendChild(resumeChoice)
    this.resumeScreen.appendChild(resumeActions)
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
    if (this.photo) this.photo.style.display = this.bg === 'image' && which !== 'loading' ? 'block' : 'none'
    this.titleScreen.dataset.bg = this.bg
    this.resumeScreen.dataset.bg = this.bg
    if (which === 'title') this._paintTitle(forceChoices)
    if (which !== 'loading') this._frameCamera(this.qa ? QA_PHASE : this.engine.time)
  },

  // 배경 A/B 전환. 하네스가 변종마다 호출한다 — window.__ENGINE__.get('title').setBg('image')
  setBg (mode) {
    this.bg = mode === 'image' && BG_IMAGE ? 'image' : 'render'
    if (this.active) this._show(this.active, this.saved)
    return { bg: this.bg, src: BG_IMAGE }
  },

  // 로비 렌더를 타이틀 프레임으로 잡는다. 아주 느린 드리프트로 정지화면이 되지 않게 한다.
  // 촬영에서는 위상을 고정한다 — settle 동안 카메라가 움직이면 TAA가 수렴하지 않아 흐려진다.
  _frameCamera (t) {
    if (this.freeCamera) return
    const camera = this.engine.camera
    const [px, py, pz] = this.pose.pos
    const [tx, ty, tz] = this.pose.target
    camera.position.set(
      px + Math.sin(t * 0.13) * 0.14,
      py + Math.sin(t * 0.087 + 1.2) * 0.03,
      pz + Math.cos(t * 0.11) * 0.09
    )
    const fov = this.pose.fov + Math.sin(t * 0.067) * 0.6
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix() }
    camera.lookAt(tx, ty, tz)
    camera.updateMatrixWorld(true)
  },

  _paintTitle (forceChoices) {
    const saved = forceChoices || hasCheckpoint()
    this.saved = saved
    this.choices.textContent = ''
    if (saved) this.choices.append(plaque('이어서', 'resume'), plaque('처음부터', 'new'))
    else this.choices.appendChild(plaque('체크인', 'new'))
  },

  _hideAll () {
    this.layer.hidden = true
    this.active = null
    if (this.photo) this.photo.style.display = 'none'
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
    else if (this.active === 'title' && !this.saved) this._proceed('new')
  },

  _key (e) {
    if (this.engine.qa || !this.active || this.active === 'loading' || e.key === 'Escape') return
    if (this.engine.get('settings')?.isOpen?.()) return
    if (e.key === 'Enter' && e.target?.dataset?.mode) this._proceed(e.target.dataset.mode)
    else if (this.active === 'resume') this._proceed('wake')
    else if (this.active === 'title' && !this.saved) this._proceed('new')
  },

  _proceed (mode) {
    // 카메라 반납이 먼저다. 인트로 시네마틱은 title:proceed 를 받는 자리에서 자기 fov(40)를
    // 잡으므로, 이 복원이 뒤로 가면 인트로 화각을 부팅 기본값으로 덮어쓴다.
    const camera = this.engine.camera
    if (Math.abs(camera.fov - this.fov0) > 1e-4) { camera.fov = this.fov0; camera.updateProjectionMatrix() }
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
    // 타이틀·재입장 화면이 떠 있는 동안은 카메라 주인이 이 모듈이다. player(order 20)가
    // 먼저 자기 위치로 카메라를 옮기므로, order 80인 여기서 매 프레임 되잡아야 한다.
    if (this.active === 'title' || this.active === 'resume') this._frameCamera(this.qa ? QA_PHASE : elapsed)
  },

  dispose () {
    window.removeEventListener('keydown', this._onKey)
    window.removeEventListener('pointerdown', this._onPointer)
    this.layer?.remove()
    this.style?.remove()
  }
}

export default title
