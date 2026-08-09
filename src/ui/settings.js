const STORAGE_KEY = 'virgil.settings'
const TYPEFACE = "'Courier New', Courier, 'AppleMyungjo', Georgia, serif"

const SPEC = {
  quality: { label: '품질 프리셋', values: ['high', 'medium', 'low'] },
  fov: { label: '시야각', values: [60, 65, 70, 75, 80] },
  sensitivity: { label: '마우스 감도', values: [0.5, 0.75, 1, 1.25, 1.5] },
  subtitles: { label: '자막', values: [true, false] },
  volume: { label: '음량', values: [0, 0.25, 0.5, 0.75, 1] }
}

function node (tag, className, text = '') {
  const result = document.createElement(tag)
  result.className = className
  result.textContent = text
  return result
}

function savedSettings (fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return fallback
  }
}

function closestValue (values, value) {
  if (values.includes(value)) return value
  if (typeof value !== 'number') return values[0]
  return values.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best, values[0])
}

function displayValue (key, value) {
  if (key === 'quality') return { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }[value]
  if (key === 'fov') return `${value}°`
  if (key === 'sensitivity') return `${Math.round(value * 100)}%`
  if (key === 'subtitles') return value ? '켬' : '끔'
  return `${Math.round(value * 100)}%`
}

const settings = {
  name: 'settings',
  order: 80,

  async init (engine) {
    this.engine = engine
    this.opened = false
    this.rows = new Map()
    this.samples = []
    this.statsAt = 0
    const quality = ['high', 'medium', 'low'].includes(engine.quality?.name) ? engine.quality.name : 'high'
    this.values = savedSettings({ quality, fov: 70, sensitivity: 1, subtitles: true, volume: 1 })
    for (const [key, spec] of Object.entries(SPEC)) this.values[key] = closestValue(spec.values, this.values[key])
    this._build()
    for (const key of Object.keys(SPEC)) this._apply(key, this.values[key])

    this._onKey = e => this._key(e)
    window.addEventListener('keydown', this._onKey, true)
    engine.bus.on('qa:shot', () => { if (engine.qa) this.close(true) })
    engine.bus.on('qa:state', s => { if (engine.qa && s?.ui === 'settings') this.open(true) })
    if (new URLSearchParams(location.search).get('stats') === '1') this._buildStats()
  },

  _build () {
    const style = document.createElement('style')
    style.textContent = `
      .virgil-settings{position:fixed;inset:0;z-index:140;display:none;pointer-events:auto;font-family:${TYPEFACE};color:#211b14;background:radial-gradient(ellipse at 50% 50%,rgba(15,12,9,.28),rgba(2,3,4,.82))}
      .virgil-settings *{box-sizing:border-box}.virgil-file{position:absolute;left:50%;top:50%;width:min(720px,82vw);height:min(590px,82vh);transform:translate(-50%,-50%) rotate(-.35deg);padding:58px 68px 46px;background:linear-gradient(102deg,rgba(128,103,67,.22),transparent 4%),repeating-linear-gradient(0deg,rgba(82,62,39,.035) 0 1px,transparent 1px 5px),#b8a57c;box-shadow:-24px 30px 40px rgba(0,0,0,.72),inset 0 0 70px rgba(66,43,22,.35);border:1px solid #5c4930}
      .virgil-file:before{content:'';position:absolute;left:28px;right:28px;top:28px;bottom:28px;border:1px solid rgba(57,42,26,.36);pointer-events:none}.virgil-file:after{content:'ROOM 942 · GUEST SERVICES';position:absolute;right:54px;top:21px;font-size:9px;letter-spacing:.22em;color:#67533b}
      .virgil-settings-title{font-size:21px;letter-spacing:.34em;text-indent:.34em;text-align:center;padding-bottom:22px;border-bottom:2px solid rgba(54,39,24,.58);text-shadow:0 1px rgba(255,244,208,.45)}
      .virgil-setting-row{height:67px;display:grid;grid-template-columns:1fr 34px 160px 34px;align-items:center;border-bottom:1px solid rgba(67,49,30,.31);font-size:13px;letter-spacing:.12em}
      .virgil-setting-note{height:46px;display:grid;grid-template-columns:1fr auto;align-items:center;border-bottom:1px solid rgba(67,49,30,.31);font-size:13px;letter-spacing:.12em}
      .virgil-setting-keys{padding-right:9px;font-size:12px;letter-spacing:.15em;color:#3f3020}
      .virgil-setting-label{padding-left:9px}.virgil-setting-value{text-align:center;font-size:14px;letter-spacing:.13em;color:#34271a}.virgil-setting-turn{height:30px;line-height:28px;text-align:center;border:1px solid #6f5733;background:linear-gradient(145deg,#a2864d,#614923);color:#21170b;cursor:pointer;box-shadow:inset 0 1px rgba(239,213,151,.5),0 2px 3px rgba(45,29,14,.35);user-select:none}
      .virgil-setting-turn:hover,.virgil-setting-turn:focus{filter:brightness(1.14);outline:1px solid #3d2b18}.virgil-settings-foot{display:flex;justify-content:space-between;align-items:flex-end;padding:26px 8px 0;color:#665239;font-size:10px;letter-spacing:.09em}
      .virgil-settings-close{padding:10px 22px 9px;border:1px solid #705631;background:linear-gradient(155deg,#9d814a,#5d4524);box-shadow:0 4px 8px rgba(50,32,15,.38),inset 0 1px rgba(238,212,151,.48);color:#24190d;font-size:12px;letter-spacing:.2em;cursor:pointer}
      .virgil-settings-close:hover,.virgil-settings-close:focus{filter:brightness(1.14);outline:1px solid #3d2b18}
      .virgil-stats{position:fixed;right:18px;top:18px;z-index:200;pointer-events:none;min-width:250px;padding:12px 15px;border-left:3px solid #9b7a3e;border-top:1px solid rgba(190,161,99,.5);background:rgba(8,9,9,.88);color:#c6b588;font-family:${TYPEFACE};font-size:11px;line-height:1.72;letter-spacing:.08em;white-space:pre;text-shadow:0 0 6px rgba(195,166,98,.22)}
    `
    document.head.appendChild(style)
    this.style = style

    this.layer = node('div', 'virgil-settings')
    const card = node('div', 'virgil-file')
    card.appendChild(node('div', 'virgil-settings-title', '객실 안내 · 조정표'))
    for (const [key, spec] of Object.entries(SPEC)) {
      const row = node('div', 'virgil-setting-row')
      row.appendChild(node('div', 'virgil-setting-label', spec.label))
      const prev = node('div', 'virgil-setting-turn', '‹')
      const value = node('div', 'virgil-setting-value')
      const next = node('div', 'virgil-setting-turn', '›')
      for (const control of [prev, next]) {
        control.tabIndex = 0
        control.setAttribute('role', 'button')
      }
      prev.addEventListener('pointerdown', () => this._step(key, -1))
      next.addEventListener('pointerdown', () => this._step(key, 1))
      prev.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._step(key, -1) })
      next.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._step(key, 1) })
      row.append(prev, value, next)
      card.appendChild(row)
      this.rows.set(key, value)
    }
    // 값이 없는 표시 전용 행. 조작을 알려주는 곳이 게임 안에 벨보이 카드 한 번뿐이라,
    // 놓친 사람이 되돌아와 확인할 자리를 여기 하나 둔다.
    const note = node('div', 'virgil-setting-note')
    note.appendChild(node('div', 'virgil-setting-label', '조작'))
    note.appendChild(node('div', 'virgil-setting-keys', '이동 W·A·S·D   조사 E   수첩 Tab'))
    card.appendChild(note)

    const foot = node('div', 'virgil-settings-foot')
    foot.appendChild(node('div', '', '변경 사항은 프런트 원장에 자동 기록됩니다.'))
    const close = node('div', 'virgil-settings-close', '카드 닫기')
    close.tabIndex = 0
    close.setAttribute('role', 'button')
    close.addEventListener('pointerdown', () => this.close())
    close.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this.close() })
    foot.appendChild(close)
    card.appendChild(foot)
    this.layer.appendChild(card)
    document.body.appendChild(this.layer)
    this._paint()
  },

  _buildStats () {
    this.stats = node('div', 'virgil-stats')
    document.body.appendChild(this.stats)
    this._paintStats()
  },

  _step (key, direction) {
    const values = SPEC[key].values
    const current = values.indexOf(this.values[key])
    this.change(key, values[(current + direction + values.length) % values.length])
  },

  change (key, value) {
    const spec = SPEC[key]
    if (!spec || !spec.values.includes(value)) return false
    this.values[key] = value
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values)) } catch {}
    this._apply(key, value)
    this._paint()
    this.engine.bus.emit('settings:changed', { key, value })
    if (key === 'quality' && !this.engine.qa) {
      const url = new URL(location.href)
      url.searchParams.set('q', value)
      location.assign(url)
    }
    return true
  },

  _apply (key, value) {
    if (key === 'fov') {
      // QA 모드에서는 카메라를 샷 하네스가 소유한다(shotlist 의 fov). 여기서 기본 FOV 를
      // 덮으면 파이프라인이 첫 프레임에 잡아두는 투영 의존 상태가 샷 카메라와 어긋나
      // atmo 프로브에 검은 블록이 남는다 — lobby 머지 후 실측(dark 0.11%→4.4%).
      // 품질 프리셋이 이미 쓰는 !engine.qa 가드와 같은 이유다.
      if (this.engine.qa) return
      this.engine.camera.fov = value
      this.engine.camera.updateProjectionMatrix()
    } else if (key === 'sensitivity') {
      const player = this.engine.get('player')
      if (player) player.sensitivity = value
    } else if (key === 'subtitles') {
      const subtitles = this.engine.get('subtitles')
      if (subtitles) {
        subtitles.enabled = value
        if (subtitles.layer) subtitles.layer.style.display = value ? 'flex' : 'none'
      }
    } else if (key === 'volume') {
      const audio = this.engine.get('audio')
      const gain = audio?.master?.gain
      if (gain) gain.value = value
    }
  },

  _paint () {
    for (const [key, target] of this.rows) target.textContent = displayValue(key, this.values[key])
  },

  // 카드가 닫혀 있을 때 Escape 의 1차 동작은 "위에 열린 것을 내리는 것"이다. 이 리스너는
  // 캡처 단계에서 stopImmediatePropagation 을 하므로, 양보하지 않으면 증거 지목·수사노트·
  // 사진 스크럽의 Escape 가 전부 삼켜지고 그 위에 설정 카드가 겹쳐 뜬다(리뷰 §0-3).
  _ceded () {
    if (this.engine.get('evidence')?.isModal?.()) return true
    return Boolean(this.engine.get('notebook')?.isOpen?.())
  },

  _key (e) {
    if (e.key !== 'Escape' || e.repeat) return
    if (!this.opened && this._ceded()) return
    e.preventDefault()
    e.stopImmediatePropagation()
    if (this.opened) this.close()
    else this.open()
  },

  open (qa = false) {
    if (this.opened) return
    this.opened = true
    document.exitPointerLock?.()
    this.layer.style.display = 'block'
    if (!qa) this.engine.bus.emit('game:pause', { on: true })
  },

  close (qa = false) {
    if (!this.opened) return
    this.opened = false
    this.layer.style.display = 'none'
    if (!qa) {
      this.engine.bus.emit('game:pause', { on: false })
      if (!this.engine.get('title')?.active) {
        try {
          const request = this.engine.canvas.requestPointerLock?.()
          request?.catch?.(() => {})
        } catch {}
      }
    }
  },

  isOpen () { return this.opened },

  update (dt, elapsed) {
    if (!this.stats) return
    this.samples.push(dt * 1000)
    if (this.samples.length > 240) this.samples.shift()
    if (elapsed - this.statsAt < .25) return
    this.statsAt = elapsed
    this._paintStats()
  },

  _paintStats () {
    const sorted = [...this.samples].sort((a, b) => a - b)
    const rank = q => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0
    const p50 = rank(.5)
    const p95 = rank(.95)
    const info = this.engine.renderer.info
    const preset = this.engine.quality?.name || 'unknown'
    const budget = preset === 'high' ? 16.7 : 33.3
    const verdict = p95 && p95 <= budget ? 'PASS' : p95 ? 'OVER' : 'WARMING'
    this.stats.textContent = `FRAME LEDGER · ${preset.toUpperCase()}\nP50  ${p50.toFixed(2)} ms\nP95  ${p95.toFixed(2)} ms  ${verdict}\nDRAW  ${info.render.calls} calls\nMEM   ${info.memory.geometries} geo · ${info.memory.textures} tex`
  },

  dispose () {
    window.removeEventListener('keydown', this._onKey, true)
    this.layer?.remove()
    this.stats?.remove()
    this.style?.remove()
  }
}

export default settings
