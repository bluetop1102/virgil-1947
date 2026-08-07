// 증거 수집 규칙. 데이터의 원본은 narrative/script.js의 EVIDENCE이며, 그 파일이 아직 없을 때만
// docs/STORY.md §3 표를 그대로 옮긴 최소 정의로 부팅한다(대사·본문은 지어내지 않는다).
//
// 획득 경로는 셋뿐이다.
//   pickup  — 상호작용(E/클릭)으로 집는다
//   observe — 근접 + 주시 체류로 관찰된다. 집히지 않는다
//   photos  — 전용 스크럽 모드. 4장을 넘기며 확대해야 두 번째 형체가 드러난다

import { clamp } from '../core/util.js'

// 파일이 없으면 glob 결과가 비어 있다(404 콘솔 오염 없이 안전하게 분기된다)
const SCRIPT = import.meta.glob('../narrative/script.js')

// script.js의 kind는 물건의 성격(document/observation/...)이고, 아래 mode는 획득 방식이다. 둘을 섞지 않는다.
const MODE_BY_KIND = { observation: 'observe', photo: 'photos' }

// [id, 제목, 획득방식, 막, 획득처] — docs/STORY.md §3
const BASE = [
  ['register', '숙박부', 'pickup', 1, '1막 프런트데스크'],
  ['keyrack', '열쇠 걸이', 'observe', 1, '1막 프런트 뒤'],
  ['flask', '위스키 플라스크', 'observe', 1, '1막 데스크 아래'],
  ['pressure-log', '수압 민원 장부', 'pickup', 1, '1막 프런트'],
  ['photos', '엘리베이터 사진 4장', 'photos', 2, '2막 프라이스'],
  ['journal', '찢긴 일기', 'pickup', 2, '2막 942호 침대 밑'],
  ['roofkey', '옥상 열쇠', 'pickup', 2, '2막 942호 매트리스'],
  ['sink-trap', '세면대 트랩 침전물', 'observe', 2, '2막 942호 욕실'],
  ['autopsy', '넬 밴스 부검 사본', 'pickup', 2, '2막 942호 여행가방'],
  ['water-log', '급수 일지', 'pickup', 2, '2막 944호'],
  ['footprints', '젖은 발자국', 'observe', 2, '2막 복도'],
  ['hatch-lock', '탱크 해치 자물쇠', 'observe', 3, '3막 옥상'],
  ['wrench', '도일의 렌치', 'observe', 3, '3막 옥상'],
  ['shoes', '놓인 구두', 'observe', 3, '3막 캣워크']
]

// 조건부 개방. spawn은 레벨이 월드에 실물을 띄우게 하고, grant는 심문에서 손에 들어오는 물건이다.
const CONDITIONALS = [
  { flag: 'two-voices', id: 'footprints', mode: 'spawn', room: 'corridor' },
  { flag: 'photos-4', id: 'photos', mode: 'grant' },
  { flag: 'pryce-confession', id: 'water-log', mode: 'grant' }
]

const GAZE_DIST = 2.6
const GAZE_HOLD = 1.0
const PHOTO_COUNT = 4
const ZOOM_MIN = 1
const ZOOM_MAX = 3.4
// 4번째 사진 유리 반사의 두 번째 형체. UI 렌더가 같은 좌표를 쓰도록 photoLayout()으로만 넘긴다.
const FIGURE = { photo: 3, x: 0.665, y: 0.405, r: 0.115, zoom: 2.4, hold: 0.7 }

const LORE_BY_MEDIUM = {
  'radio-lobby': ['lore.pipes'],
  'register-margin': ['lore.lightwell'],
  'linen-wall': ['lore.linen', 'lore.lightwell'],
  'lobby-frame': ['lore.1912']
}

export default {
  name: 'evidence',
  order: 21,

  engine: null,
  defs: null,          // id -> {id, kind, title, act, source, body}
  bound: null,         // interactId -> {obj, id, kind}
  byObject: null,      // Object3D -> entry
  dataSource: 'fallback',
  gaze: null,          // {id, t}
  fired: null,         // 이미 처리한 조건부 플래그
  photo: null,
  keyHandler: null,

  async init (engine) {
    this.engine = engine
    this.defs = new Map()
    this.bound = new Map()
    this.byObject = new Map()
    this.fired = new Set()
    this.gaze = { id: null, t: 0 }
    this.photo = { open: false, index: 0, zoom: 1, cx: 0.5, cy: 0.5, dwell: 0, found: false }

    for (const [id, title, mode, act, source] of BASE) {
      this.defs.set(id, { id, title, mode, kind: mode, act, source, body: '' })
    }

    const load = SCRIPT['../narrative/script.js']
    if (load) {
      try {
        const m = await load()
        if (m?.EVIDENCE) { this._ingest(m.EVIDENCE); this.dataSource = 'script' }
      } catch { this.dataSource = 'fallback' }
    }

    engine.bus.on('player:interact', ({ targetId }) => this._onInteract(targetId))
    this._initLore(engine)
    engine.bus.on('qa:state', (s) => { if (s?.ui === 'photos') this.openPhotos() })
  },

  // script.js가 배열이든 맵이든 받는다. 없는 필드는 STORY 표 값을 유지한다.
  _ingest (src) {
    const items = Array.isArray(src) ? src : Object.values(src)
    for (const raw of items) {
      if (!raw?.id) continue
      const prev = this.defs.get(raw.id) ?? { id: raw.id, mode: 'pickup', kind: 'object', act: 1, source: '', body: '' }
      this.defs.set(raw.id, {
        id: raw.id,
        title: raw.title ?? raw.name ?? prev.title ?? raw.id,
        kind: raw.kind ?? prev.kind,
        mode: raw.mode ?? MODE_BY_KIND[raw.kind] ?? prev.mode,
        act: raw.act ?? prev.act,
        source: raw.foundIn ?? raw.source ?? prev.source,
        body: raw.body ?? prev.body ?? ''
      })
    }
  },

  // ── 레벨이 쓰는 등록 API ────────────────────────────────────────
  registerPickup (obj, evidenceId, opts = {}) {
    const def = this.defs.get(evidenceId)
    if (!obj || !def) return null
    const mode = opts.mode ?? def.mode
    const interactId = `ev:${evidenceId}`
    const entry = { obj, id: evidenceId, mode, dist: opts.dist ?? GAZE_DIST, hold: opts.hold ?? GAZE_HOLD }
    obj.userData.interact = { id: interactId, kind: 'evidence', evidence: evidenceId }
    this.bound.set(interactId, entry)
    this.byObject.set(obj, entry)
    if (this.engine?.state.has(evidenceId)) this._hide(entry)
    return entry
  },

  registerObservation (obj, evidenceId, opts = {}) {
    return this.registerPickup(obj, evidenceId, { ...opts, mode: 'observe' })
  },

  unregister (obj) {
    const e = this.byObject.get(obj)
    if (!e) return
    this.byObject.delete(obj)
    this.bound.delete(`ev:${e.id}`)
    delete obj.userData.interact
  },

  // ── 조회 ────────────────────────────────────────────────────────
  def (id) { return this.defs.get(id) ?? null },
  list () { return this.engine?.state.evidenceList() ?? [] },
  has (id) { return !!this.engine?.state.has(id) },
  isModal () { return this.photo.open },

  // 관찰형은 프롬프트를 띄우지 않는다 — 눈으로 찾게 둔다(루브릭 N5의 힌트 금지와 같은 이유)
  promptFor (obj) {
    const e = this.byObject.get(obj)
    if (!e || e.mode === 'observe') return null
    if (e.mode === 'photos') return '사진을 본다'   // 넉 장은 몇 번이고 다시 본다
    return this.has(e.id) ? null : '집는다'
  },

  // ── 획득 ────────────────────────────────────────────────────────
  grant (id, source) {
    const def = this.defs.get(id)
    if (!def || !this.engine) return false
    const ok = this.engine.state.addEvidence({ ...def, source: source ?? def.source })
    if (!ok) return false
    this.engine.bus.emit('sfx', { id: `evidence:${def.mode}` })
    const e = this.bound.get(`ev:${id}`)
    if (e) this._hide(e)
    if (id === 'photos') this.photo.index = 0
    return true
  },

  _hide (entry) {
    if (entry.mode === 'pickup') { entry.obj.visible = false; delete entry.obj.userData.interact }
  },

  _onInteract (targetId) {
    const e = this.bound.get(targetId)
    if (!e) return
    if (e.mode === 'photos') { this.grant(e.id); this.openPhotos(); return }
    if (e.mode === 'observe' || this.has(e.id)) return   // 관찰형은 집히지 않는다
    this.grant(e.id)
  },

  // player가 매 프레임 넘기는 시선 대상
  onFocus (obj, dist) {
    const e = obj ? this.byObject.get(obj) : null
    const id = e && e.mode === 'observe' && !this.has(e.id) && dist <= e.dist ? e.id : null
    if (id !== this.gaze.id) { this.gaze.id = id; this.gaze.t = 0 }
  },

  // ── 사진 스크럽 ─────────────────────────────────────────────────
  openPhotos () {
    if (this.photo.open) return
    this.photo.open = true
    this.photo.zoom = 1
    this.photo.cx = 0.5
    this.photo.cy = 0.5
    this.photo.dwell = 0
    this.engine?.bus.emit('sfx', { id: 'photo:open' })
    if (!this.engine?.qa) this._bindKeys()
  },

  closePhotos () {
    if (!this.photo.open) return
    this.photo.open = false
    this.keyHandler?.()
    this.keyHandler = null
    this.engine?.bus.emit('sfx', { id: 'photo:close' })
  },

  photoNext () { this._goto(this.photo.index + 1) },
  photoPrev () { this._goto(this.photo.index - 1) },

  _goto (i) {
    const n = clamp(i, 0, PHOTO_COUNT - 1)
    if (n === this.photo.index) return
    this.photo.index = n
    this.photo.zoom = 1
    this.photo.cx = 0.5
    this.photo.cy = 0.5
    this.photo.dwell = 0
    this.engine?.bus.emit('sfx', { id: 'photo:flip' })
  },

  photoZoom (dz) { this.photo.zoom = clamp(this.photo.zoom + dz, ZOOM_MIN, ZOOM_MAX) },

  // UI가 자체 위젯으로 스크럽을 몰 때 현재 보고 있는 값을 되돌려 준다. 판정은 여전히 여기서만 한다.
  photoView (v = {}) {
    const p = this.photo
    if (typeof v.index === 'number' && v.index !== p.index) this._goto(v.index)
    if (typeof v.zoom === 'number') p.zoom = clamp(v.zoom, ZOOM_MIN, ZOOM_MAX)
    if (typeof v.cx === 'number') p.cx = clamp(v.cx, 0, 1)
    if (typeof v.cy === 'number') p.cy = clamp(v.cy, 0, 1)
    if (v.open === false) this.closePhotos()
    else if (v.open === true) this.openPhotos()
  },

  photoPan (dx, dy) {
    const lim = 0.5 - 0.5 / Math.max(this.photo.zoom, 1)
    this.photo.cx = clamp(this.photo.cx + dx / this.photo.zoom, 0.5 - lim, 0.5 + lim)
    this.photo.cy = clamp(this.photo.cy + dy / this.photo.zoom, 0.5 - lim, 0.5 + lim)
  },

  // UI 렌더 전용 상태. 정답 위치는 담지 않는다.
  photoState () {
    const p = this.photo
    return { open: p.open, index: p.index, count: PHOTO_COUNT, zoom: p.zoom, cx: p.cx, cy: p.cy, found: p.found }
  },

  // 렌더러가 형체를 같은 좌표에 그리도록 넘기는 배치값. HUD 표시용이 아니다.
  photoLayout () { return { ...FIGURE } },

  _bindKeys () {
    const onKey = (ev) => {
      if (!this.photo.open) return
      switch (ev.code) {
        case 'Escape': case 'KeyQ': this.closePhotos(); break
        case 'ArrowRight': case 'KeyD': this.photoNext(); break
        case 'ArrowLeft': case 'KeyA': this.photoPrev(); break
        case 'Equal': case 'NumpadAdd': this.photoZoom(0.4); break
        case 'Minus': case 'NumpadSubtract': this.photoZoom(-0.4); break
        default: return
      }
      ev.preventDefault()
    }
    const onWheel = (ev) => { if (this.photo.open) this.photoZoom(ev.deltaY < 0 ? 0.25 : -0.25) }
    const onMove = (ev) => {
      if (!this.photo.open || this.photo.zoom <= 1.01) return
      this.photoPan(-ev.movementX * 0.0016, -ev.movementY * 0.0016)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('mousemove', onMove)
    this.keyHandler = () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('mousemove', onMove)
    }
  },

  _photoTick (dt) {
    const p = this.photo
    if (p.found || p.index !== FIGURE.photo || p.zoom < FIGURE.zoom) { p.dwell = 0; return }
    const d = Math.hypot(p.cx - FIGURE.x, p.cy - FIGURE.y)
    if (d > FIGURE.r) { p.dwell = 0; return }
    p.dwell += dt
    if (p.dwell < FIGURE.hold) return
    p.found = true
    this.engine.state.flag('second-figure')
    this.engine.bus.emit('evidence:flag', { flag: 'second-figure', id: 'photos' })
  },

  // ── QA 관측·lore:heard ────────────────────────────────────────
  _initLore (engine) {
    this.heardLore = new Set()
    this.loreOff = engine.bus.on('player:interact', ({ targetId }) => this._hearLore(targetId))
  },

  _loreTarget (targetId) {
    const bound = this.bound.get(targetId)?.obj
    if (bound) return bound
    let found = null
    const visit = (obj) => {
      if (found || obj.visible === false) return
      const raw = obj.userData?.interact
      const id = typeof raw === 'string' ? raw : raw?.id
      if (id === targetId) { found = obj; return }
      for (const child of obj.children ?? []) visit(child)
    }
    visit(this.engine.scene)
    return found
  },

  _hearLore (targetId) {
    const obj = this._loreTarget(targetId)
    if (!obj) return
    const interaction = obj.userData?.interact
    const tagged = obj.userData?.lore
    const medium = tagged?.medium ?? interaction?.medium ?? targetId
    const canonical = LORE_BY_MEDIUM[medium]
    if (!canonical) return
    const supplied = tagged?.id ?? interaction?.lore
    const ids = supplied == null ? canonical : (Array.isArray(supplied) ? supplied : [supplied])
    for (const id of ids) {
      if (!canonical.includes(id)) continue
      const key = `${id}:${medium}`
      if (this.heardLore.has(key)) continue
      this.heardLore.add(key)
      this.engine.bus.emit('lore:heard', { id, medium })
    }
  },

  update (dt) {
    const e = this.engine
    if (!e) return

    for (const c of CONDITIONALS) {
      if (this.fired.has(c.flag) || !e.state.is(c.flag)) continue
      this.fired.add(c.flag)
      if (c.mode === 'grant') this.grant(c.id)
      else e.bus.emit('evidence:spawn', { id: c.id, room: c.room })
    }

    if (this.photo.open) { this._photoTick(dt); return }

    if (!this.gaze.id) return
    this.gaze.t += dt
    const entry = this.bound.get(`ev:${this.gaze.id}`)
    if (!entry || this.gaze.t < entry.hold) return
    const id = this.gaze.id
    this.gaze.id = null
    this.gaze.t = 0
    this.grant(id)
  },

  dispose () { this.keyHandler?.(); this.loreOff?.() }
}
