// [NARRATIVE] 사건 데이터. 코드 없음 — 로직은 interrogation.js/deduction.js가 소유한다.
// 원문은 docs/STORY.md 5·6절. 대사는 한 글자도 바꾸지 않는다. 괄호 지문은 action 필드로 분리한다.
//
// 분기 객체 공통 형태:
//   { detective, action?, text, grants?, spawns?, flags?, burn?, note? }
//   detective = 플레이어 대사(선행), text = NPC 응답, action = 지문(연기 지시, 자막에 쓰지 않는다)
//   grants = 즉시 노트에 들어오는 증거 id, spawns = 월드에 출현하는 증거 id
// 진술 객체: 정답 증거가 둘 이상이면 lieVariants[증거id]가 onLieCorrect를 덮어쓴다.
// 오답 증거 중 전용 대사가 있는 것은 wrongVariants[증거id]가 onLieWrong을 덮어쓴다.
//   소비 측 규약: (s.lieVariants && s.lieVariants[ev]) || s.onLieCorrect
//                (s.wrongVariants && s.wrongVariants[ev]) || s.onLieWrong

export const DETECTIVE = { id: 'detective', name: '형사' }

export const CHARACTERS = {
  deitch: {
    id: 'deitch', name: '마를로 다이치', age: 51, role: '야간 프런트, 16년차',
    act: 1, place: 'lobby-desk',
    hides: '옥상 열쇠를 20달러에 팔았다', motive: '해고 공포. 살인과 무관',
    voice: '습니다체. 문장 끝 음량이 떨어진다. 확언을 "제 기억으론"으로 흐린다',
    tells: {
      lying: ['오른손이 데스크 아래로 내려간다(플라스크)', '문장 끝 음량이 떨어진다', '"제 기억으론"을 붙인다'],
      anxious: ['숙박부 모서리를 반복해서 맞춘다'],
      breaking: ['안경을 벗고 눈두덩을 누른다']
    }
  },
  ruiz: {
    id: 'ruiz', name: '콘수엘라 루이즈', age: 44, role: '하우스키퍼',
    act: 2, place: 'corridor-linen',
    hides: '942호에서 두 사람 목소리를 들었다', motive: '체류 신분. 경찰이 무섭다',
    voice: '어요체. 문장을 짧게 끊는다. 일하던 손을 멈추지 않는다',
    tells: {
      lying: ['말이 빨라지고 스페인어가 섞인다', '시선이 형사가 아니라 문을 본다'],
      anxious: ['손에 쥔 천을 비틀어 짠다'],
      breaking: ['앉는다. 그전까지 서 있었다']
    }
  },
  pryce: {
    id: 'pryce', name: '월터 프라이스', age: 58, role: '944호 장기투숙, 전 하우스 디텍티브',
    act: 2, place: 'room944',
    hides: '아이리스를 옥상으로 보낸 게 자신이다', motive: '죄책감. 그리고 도일이 무섭다',
    voice: '습니다체. 시각과 날짜를 필요 이상으로 정확히 붙인다. 냉소를 한 문장에 하나만 쓴다',
    tells: {
      lying: ['시각을 지나치게 정확히 말한다("10시 41분")', '대답 전 반박자 늦다'],
      anxious: ['피우지도 않으면서 재떨이를 만진다'],
      breaking: ['사진을 뒤집어 놓는다']
    }
  },
  doyle: {
    id: 'doyle', name: '에멧 도일', age: 39, role: '시설관리인, 소유주의 조카',
    act: 3, place: 'rooftop-catwalk',
    hides: '전부', motive: '범인',
    voice: '되묻는다. 웃으면서 말한다. 자기 일 얘기만 한다',
    tells: {
      lying: ['웃는다', '질문을 되묻는다'],
      anxious: ['렌치를 손에서 놓지 않는다'],
      breaking: ['웃음을 멈추지 않는다']
    }
  }
}

export const EVIDENCE = {
  register: { id: 'register', title: '숙박부', kind: 'document', act: 1, foundIn: 'lobby/front-desk',
    body: '10월 2일 입실, 밴다이버 명의. 2주치 현금 선납. 10일과 11일에도 942호에 객실 청구가 붙어 있다.' },
  keyrack: { id: 'keyrack', title: '열쇠 걸이', kind: 'observation', act: 1, foundIn: 'lobby/behind-desk',
    body: '942 고리가 비었다. 옆의 ROOF 고리도 비었다. 먼지 자국은 942 쪽만 남았다.' },
  flask: { id: 'flask', title: '위스키 플라스크', kind: 'observation', act: 1, foundIn: 'lobby/under-desk',
    body: '데스크 아래 선반. 은도금이 손 닿는 자리만 벗겨졌다.' },
  'pressure-log': { id: 'pressure-log', title: '수압 민원 장부', kind: 'document', act: 1, foundIn: 'lobby/front-desk',
    body: '10월 9일부터 3층 위로 물이 오르지 않는다는 민원. 9일 밤 11시 902호 접수. 서명은 C. 루이즈.' },
  photos: { id: 'photos', title: '엘리베이터 사진 4장', kind: 'photo', act: 2, foundIn: 'room944/pryce',
    body: '14개월 전 인화. 9층 엘리베이터 안. 넉 장째 유리 반사에 형체가 하나 더 있다.' },
  journal: { id: 'journal', title: '찢긴 일기', kind: 'document', act: 2, foundIn: 'room942/under-bed',
    body: '침대 밑. 프라이스라는 이름이 세 번. 마지막 장에 944라는 숫자.' },
  roofkey: { id: 'roofkey', title: '옥상 열쇠', kind: 'object', act: 2, foundIn: 'room942/mattress',
    body: '매트리스 밑. 태그의 필적이 프런트 장부와 같다.' },
  'sink-trap': { id: 'sink-trap', title: '세면대 트랩 침전물', kind: 'sample', act: 2, foundIn: 'room942/bathroom',
    body: '검은 침전물. 냄새는 물이 아니라 고인 것에서 난다.' },
  autopsy: { id: 'autopsy', title: '넬 밴스 부검 사본', kind: 'document', act: 2, foundIn: 'room942/suitcase',
    body: '여행가방 안감 밑. 폐의 물은 낙하 시 흡인으로 적혀 있다. 유족에게는 나가지 않는 서류다.' },
  'water-log': { id: 'water-log', title: '급수 일지', kind: 'document', act: 2, foundIn: 'room944',
    body: '탱크 점검 기록. 10월 9일 밤 점검자 서명이 하나. 필적은 E. 도일.' },
  footprints: { id: 'footprints', title: '젖은 발자국', kind: 'observation', act: 2, foundIn: 'corridor9/942-to-stairs',
    body: '942호 앞에서 계단 쪽으로. 작업화. 265mm.' },
  'hatch-lock': { id: 'hatch-lock', title: '탱크 해치 자물쇠', kind: 'observation', act: 3, foundIn: 'rooftop/tank-4',
    body: '걸쇠가 바깥에 있다. 안에서는 잠글 수 없다.' },
  wrench: { id: 'wrench', title: '도일의 렌치', kind: 'object', act: 3, foundIn: 'rooftop/toolbox',
    body: '자루에 감은 테이프가 두 겹. 손 크기에 맞춰 감았다.' },
  shoes: { id: 'shoes', title: '놓인 구두', kind: 'observation', act: 3, foundIn: 'rooftop/catwalk',
    body: '캣워크에 나란히. 젖지 않은 자리에 놓였다. 비는 밤새 왔다.' }
}

export const INTERROGATIONS = {
  deitch: {
    npc: 'deitch', act: 1, place: 'lobby-desk',
    setting: '새벽 2시. 로비. 다이치는 카운터 뒤에 서 있다. 형사가 배지를 놓는다.',
    intro: [
      { speaker: 'detective', text: '942호.' },
      { speaker: 'deitch', text: '그 방은 열려 있습니다. 청소도 안 들어갔고요. 필요하신 게 뭡니까.' }
    ],
    statements: [
      {
        id: 'S1', truth: true, correct: 'TRUTH', camera: 'pull',
        text: '밴다이버 양은 10월 2일에 들어왔습니다. 2주치를 현금으로 내셨죠. 그런 손님이 요샌 드물어요.',
        onTruth: { detective: '2주는 긴 시간입니다.', text: '여기 손님들은 보통 사흘을 못 넘깁니다. 2주치를 미리 내는 사람은 뭔가를 기다리는 겁니다.' },
        onDoubt: { detective: '장부는 나중에도 씁니다.', text: '장부에 그렇게 적혀 있습니다. 제가 지어낸 게 아니고요.' },
        onLieCorrect: null,
        onLieWrong: { detective: '이걸 보시죠.', text: '…저는 장부에 있는 걸 말했습니다. 그게 답니다.', burn: true, flags: ['deitch-clammed'], note: '이후 진술이 전부 한 문장으로 줄어든다' },
        wrongVariants: {
          flask: { detective: '데스크 아래 손을 보여주시죠.', text: '…근무 중에 마신 적 없습니다.', burn: true, flags: ['deitch-clammed'], note: '이후 진술이 전부 한 문장으로 줄어든다' }
        }
      },
      {
        id: 'S2', truth: false, correct: 'LIE', evidence: ['register'], camera: 'push', key: true,
        text: '9일 밤에 나가시는 걸 봤습니다. 열한 시쯤이었을 겁니다. 제 기억으론.',
        onTruth: { detective: '알겠습니다.', text: '그렇게 적어두시면 됩니다. 제 기억으론 그렇습니다.' },
        onDoubt: { detective: '열한 시.', text: '…열한 시였는지는 확실치 않습니다. 그 시간대는 다 비슷해서요.' },
        onLieCorrect: { detective: '…객실 청구가 붙었죠. 10일에도, 11일에도. 나간 사람 방에 왜 물수건 값이 붙습니까.', text: '…제가 봤다고 한 건 그 여자가 아닐 수도 있습니다. 로비가 어둡습니다. 그 시간엔 다들 비슷해 보여요.', flags: ['deitch-recanted'] },
        onLieWrong: { detective: '이건 어떻습니까.', text: '형사님이 뭘 들고 오시든 저는 본 걸 말한 겁니다.', burn: true }
      },
      {
        id: 'S3', truth: true, correct: 'TRUTH', camera: 'pull',
        text: '9일부터 수압이 떨어졌습니다. 3층 위로는 물이 안 올라갔어요. 민원 장부가 여기 있습니다.',
        onTruth: { detective: '보겠습니다.', action: '장부를 내준다', text: '도일 씨가 봤습니다. 늘 그 사람이 봅니다.', grants: ['pressure-log'], flags: ['doyle-named'] },
        onDoubt: { detective: '장부부터 봅시다.', action: '장부를 밀어 놓는다', text: '…보시죠. 저는 접수만 합니다.', grants: ['pressure-log'], note: '도일 이야기는 나오지 않는다' },
        onLieCorrect: null,
        onLieWrong: { detective: '물이 안 나온 건 다른 얘기죠.', text: '…물이 안 나온 건 손님들이 압니다. 저한테 따질 일이 아닙니다.', burn: true }
      },
      {
        id: 'S4', truth: false, correct: 'LIE', evidence: ['keyrack', 'roofkey'], camera: 'push', key: true,
        text: '옥상 열쇠는 관리인만 가집니다. 손님한테 나갈 물건이 아닙니다.',
        onTruth: { detective: '관리인만.', text: '…네. 그런 겁니다.' },
        onDoubt: { detective: '규정 얘기를 듣자는 게 아닙니다.', text: '…제 기억으론 그렇습니다. 규정이 그렇다는 얘깁니다.' },
        onLieCorrect: { detective: '고리가 비었더군요.', text: '…분실입니다. 그런 건 늘 있습니다.', flags: ['deitch-partial'], note: '부분 성공 — 2막 재심문 개방' },
        lieVariants: {
          keyrack: { detective: '고리가 비었더군요.', text: '…분실입니다. 그런 건 늘 있습니다.', flags: ['deitch-partial'], note: '부분 성공 — 2막 재심문 개방' },
          roofkey: { detective: '그 여자 매트리스 밑에서 나왔습니다. 당신 필적으로 태그가 붙어 있고.', action: '안경을 벗는다', text: '…20달러였습니다. 딸 학비가 밀렸습니다. 그 여자가 옥상에서 뭘 하려는지 내가 어떻게 압니까. 사진을 찍는다고 했습니다. 야경을.', flags: ['deitch-confession'], act: 2, note: '3막 도일 지목 시 정황 보강' }
        },
        onLieWrong: { detective: '이겁니다.', text: '…열쇠 얘기는 여기까지 하겠습니다.', burn: true, flags: ['deitch-sealed'], note: '2막 재심문 불가' }
      },
      {
        id: 'S5', truth: true, correct: 'TRUTH', camera: 'slide',
        text: '944호 프라이스 씨. 그 양반은 여기 4년 살았습니다. 전에는 호텔에서 일했고요.',
        onTruth: { detective: '전에는.', text: '왜 그만뒀는지는 안 묻는 게 좋습니다. 물어보면 대답을 해버리거든요.', flags: ['pryce-known'] },
        onDoubt: { detective: '4년.', text: '…4년입니다. 그건 장부에 있습니다.' },
        onLieCorrect: null,
        onLieWrong: { detective: '그 양반 얘기를 해보시죠.', text: '…그 양반 얘기는 제가 할 게 아닙니다.', burn: true }
      }
    ]
  },

  ruiz: {
    npc: 'ruiz', act: 2, place: 'corridor-linen',
    setting: '린넨 카트. 그녀는 일하던 손을 멈추지 않는다.',
    intro: [
      { speaker: 'detective', text: '942호 담당이시죠.' },
      { speaker: 'ruiz', text: '일하면서 들을게요. 손을 멈추면 늦어져요.' }
    ],
    statements: [
      {
        id: 'S1', truth: true, correct: 'TRUTH', camera: 'pull',
        text: '942호는 8일부터 안 들어갔어요. 문에 팻말이 걸려 있었으니까.',
        onTruth: { detective: '팻말.', text: '그 팻말, 손님이 건 게 아니에요. 우리 팻말은 파란색인데 그건 회색이었어요. 창고 거예요.', flags: ['grey-tag'] },
        onDoubt: { detective: '팻말이 걸리면 그냥 지나갑니까.', text: '…팻말이 걸리면 안 들어가요. 그게 규칙이에요.' },
        onLieCorrect: null,
        onLieWrong: { detective: '문 안은 보셨겠죠.', text: '…저는 문 앞까지만 가요. 그 이상은 몰라요.', burn: true }
      },
      {
        id: 'S2', truth: false, correct: 'LIE', evidence: ['pressure-log'], camera: 'push', key: true,
        text: '그날 밤엔 아무 소리도 못 들었어요. 저는 6시면 퇴근하니까.',
        onTruth: { detective: '알겠습니다.', text: '…네. 6시예요.' },
        onDoubt: { detective: '6시.', text: '…늦게까지 있는 날도 있어요. 그날이 그날인지는 모르겠어요.' },
        onLieCorrect: { detective: '9일 밤 열한 시에 902호 민원을 당신이 받았습니다. 여기 서명이 있고.', action: '천을 비튼다', text: '…네. 남아 있었어요. 물 때문에. 위층에서 소리가 났어요. 두 사람이었어요. 한 사람은 여자였고, 다른 사람은… 말을 안 했어요. 걷는 소리만 났어요.', flags: ['two-voices'], spawns: ['footprints'] },
        onLieWrong: { detective: '이건 어떻습니까.', text: '…저는 모르는 일이에요. 진짜예요.', burn: true, flags: ['footprints-lost'], note: '발자국 증거를 영영 못 얻는다' }
      },
      {
        id: 'S3', truth: true, correct: 'TRUTH', camera: 'slide', requires: ['two-voices'],
        text: '카펫이 젖어 있었어요. 942호 앞에서 계단 쪽으로요. 아침에 제가 닦았어요. 그게 제 일이니까.',
        onTruth: { detective: '닦으면서 생각한 게 있겠죠.', text: '닦으면서 생각했어요. 이 물은 위에서 내려온 게 아니라, 위로 올라간 거구나.', flags: ['water-upward'] },
        onDoubt: { detective: '닦은 게 확실합니까.', text: '…닦은 건 저예요. 그건 확실해요.' },
        onLieCorrect: null,
        onLieWrong: { detective: '그 자리를 봅시다.', text: '…보여드릴 수가 없어요. 닦았으니까요.', burn: true }
      },
      {
        id: 'S4', truth: false, correct: 'LIE', evidence: ['footprints'], doubtAccepted: true, camera: 'push',
        text: '도일 씨요? 그냥 관리인이에요. 저는 그 사람이랑 말도 잘 안 해요.',
        onTruth: { detective: '알겠습니다.', text: '…네. 그냥 관리인이에요.' },
        onDoubt: { detective: '말을 안 하는 이유가 있겠죠.', text: '…무섭냐고 물으시면, 네. 이유는 말 못 해요.', flags: ['ruiz-afraid'] },
        onLieCorrect: { detective: '이 발자국은 작업화입니다. 265mm. 여기 사람 중에 이 신발 신는 사람은 하나뿐이고.', action: '앉는다', text: '…작년에도 그랬어요. 밴스 아가씨 때도요. 그때도 물이 이상했어요. 아무도 안 물어봤어요.', flags: ['doyle-pattern'], note: '3막 지목 필수는 아니나 엔딩 텍스트가 달라진다' },
        onLieWrong: { detective: '이겁니다.', text: '…그 사람 얘기는 안 할래요. 저 일해야 해요.', burn: true, flags: ['ruiz-closed'] }
      }
    ]
  },

  pryce: {
    npc: 'pryce', act: 2, place: 'room944',
    setting: '커튼이 닫힌 방. 스탠드 하나. 재떨이에 꽁초는 없는데 재떨이는 닳아 있다.',
    intro: [
      { speaker: 'detective', text: '944호 월터 프라이스.' },
      { speaker: 'pryce', text: '문은 10시 41분부터 열어놨습니다. 오실 줄 알았습니다.' }
    ],
    statements: [
      {
        id: 'S1', truth: false, correct: 'LIE', evidence: ['journal'], camera: 'push', key: true,
        text: '그 아가씨하고는 인사만 했습니다. 복도에서 두어 번. 그게 답니다.',
        onTruth: { detective: '알겠습니다.', text: '…그게 답니다.' },
        onDoubt: { detective: '두어 번.', text: '복도에서 마주친 사람 얼굴을 다 기억할 나이는 지났습니다.' },
        onLieCorrect: { detective: '당신 이름이 세 번 나옵니다. 마지막 장에는 이 방 호수가 적혀 있고.', action: '반박자 늦게', text: '…들어온 적 있습니다. 두 번. 세 번인가.', grants: ['photos'], flags: ['pryce-admits'] },
        onLieWrong: { detective: '이건 어떻습니까.', text: '…그 아가씨 얼굴도 잘 기억 안 납니다. 이제 그만하시죠.', burn: true, flags: ['photos-lost'], note: '사진을 얻지 못한다. 게임 최대의 손실' }
      },
      {
        id: 'S2', truth: true, correct: 'TRUTH', camera: 'pull',
        text: '저는 여기 하우스 디텍티브였습니다. 4년 전까지. 지금은 그냥 세입자고요.',
        onTruth: { detective: '4년 전.', text: '그만둔 게 아니라 잘렸습니다. 이유는 서류에 안 적혀 있습니다. 그런 건 원래 안 적습니다.', flags: ['pryce-fired'] },
        onDoubt: { detective: '세입자.', text: '…4년 전 3월입니다. 날짜까지 필요하시면 적어드리죠.' },
        onLieCorrect: null,
        onLieWrong: { detective: '경력을 확인해보죠.', text: '…인사기록을 떼십시오. 저는 도와드릴 게 없습니다.', burn: true }
      },
      {
        id: 'S3', truth: false, correct: 'LIE', evidence: ['photos'], camera: 'push', key: true,
        text: '넬 밴스 사건은 제 소관이 아니었습니다. 그때 저는 이미 나온 뒤였고요.',
        note: 'photos는 S1을 통과해야 얻는다. S1 실패 시 DOUBT이 최선이며 자백에 도달하지 못한다',
        onTruth: { detective: '알겠습니다.', text: '…네. 나온 뒤였습니다.' },
        onDoubt: { detective: '나온 뒤였다.', text: '…제 소관이 아니었다는 말은 취소하겠습니다. 그 이상은 말 안 합니다.', flags: ['pryce-retracts'] },
        onLieCorrect: { detective: '이 사진들, 당신 카메라입니다. 그리고 넬 밴스가 죽은 날 찍혔고.', action: '사진을 뒤집는다', text: '…제가 찍었습니다. 아무도 안 봤습니다. 제출했더니 이틀 뒤에 잘렸습니다. 4장을 빼돌린 건 그때가 처음이자 마지막입니다.', flags: ['photos-4'], note: '넉 장째 유리 반사의 두 번째 형체를 플레이어가 스크럽하며 발견한다' },
        onLieWrong: { detective: '이겁니다.', text: '…그 사건에 제 이름을 붙이지 마십시오.', burn: true }
      },
      {
        id: 'S4', truth: false, correct: 'LIE', evidence: ['autopsy', 'water-log'], camera: 'push', key: true,
        text: '저는 그 아가씨한테 아무것도 준 적 없습니다.',
        onTruth: { detective: '알겠습니다.', text: '…아무것도 없습니다.' },
        onDoubt: { detective: '아무것도.', text: '…준 게 있다면 제가 기억하겠죠. 10월 9일까지는 아무것도 안 줬습니다.' },
        onLieCorrect: { detective: '언니 부검 사본이 그 방에 있었습니다. 유족한테는 안 나가는 서류입니다. 나갈 수 있는 사람은 이 호텔에 하나뿐이고.', text: '…줬습니다. 급수 일지도 줬습니다. 그 아가씨가 그걸 들고 뭘 할지 알면서 줬습니다. 나는 늙었고 그 아가씨는 젊었습니다. 그게 다입니다. 그게 제가 한 겁니다.', grants: ['water-log'], flags: ['pryce-confession'] },
        lieVariants: {
          autopsy: { detective: '언니 부검 사본이 그 방에 있었습니다. 유족한테는 안 나가는 서류입니다. 나갈 수 있는 사람은 이 호텔에 하나뿐이고.', text: '…줬습니다. 급수 일지도 줬습니다. 그 아가씨가 그걸 들고 뭘 할지 알면서 줬습니다. 나는 늙었고 그 아가씨는 젊었습니다. 그게 다입니다. 그게 제가 한 겁니다.', grants: ['water-log'], flags: ['pryce-confession'] },
          'water-log': { detective: '급수 일지 여백이 당신 필적입니다.', text: '…옮겨 적은 건 접니다. 원본은 그 아가씨한테 줬습니다. 언니 부검 사본도 같이 줬습니다. 알면서 줬습니다. 나는 늙었고 그 아가씨는 젊었습니다. 그게 제가 한 겁니다.', flags: ['pryce-confession'] }
        },
        onLieWrong: { detective: '이겁니다.', text: '…없습니다. 그 얘기는 끝입니다.', burn: true, flags: ['water-log-hidden'], note: 'water-log는 944호 수색으로만 얻어야 한다' }
      },
      {
        id: 'S5', truth: true, correct: 'TRUTH', camera: 'slide',
        text: '탱크 해치는 안에서 못 잠급니다. 걸쇠가 바깥에 있습니다. 4년간 매달 봤습니다.',
        onTruth: { detective: '바깥에.', text: '그러니 형사님, 그 아가씨가 혼자 들어갔다면, 뚜껑은 열려 있어야 합니다.', flags: ['hatch-rule'], note: '3막 hatch-lock 관찰 시 자살 배제가 성립한다' },
        onDoubt: { detective: '매달 봤다.', text: '…믿고 안 믿고는 형사님 몫입니다. 걸쇠는 그대로 있습니다.' },
        onLieCorrect: null,
        onLieWrong: { detective: '4년간 본 게 그겁니까.', text: '…제가 4년간 본 걸 뒤집으시겠다면 그러시죠.', burn: true }
      }
    ]
  },

  doyle: {
    npc: 'doyle', act: 3, place: 'rooftop-catwalk', mode: 'accusation',
    setting: '비. 탱크 캣워크 아래. 도일이 렌치를 들고 서 있다. 심문이 아니라 지목이다.',
    intro: [
      { speaker: 'doyle', text: '형사님이 여기까지 올라오실 줄은 몰랐습니다. 사다리가 미끄럽죠.' },
      { speaker: 'doyle', text: '그 아가씨요? 못 봤습니다. 저는 밸브만 봅니다.' }
    ],
    statements: []
  }
}

// 증거판. 3개 링크를 모두 걸어야 완전 엔딩. 하나라도 없으면 미제.
export const LINKS = [
  {
    id: 'L1', needs: ['hatch-lock', 'shoes'],
    claim: '자살이 아니다 — 해치는 바깥에서 잠겼고 구두는 가지런히 놓여 있었다',
    reaction: '가지런히요. 그건 그 여자가 그렇게 해놓은 겁니다. 요새 애들이 그럽디다.',
    reactionAction: null, camera: 'push'
  },
  {
    id: 'L2', needs: ['water-log', 'pressure-log'],
    claim: '10월 9일 밤 탱크에 접근한 사람은 한 명뿐이다',
    reaction: '일지는 제가 씁니다. 제가 쓴 걸 저한테 들이대시는 겁니까.',
    reactionAction: '웃는다', camera: 'slide'
  },
  {
    id: 'L3', needs: ['photos', 'wrench'],
    claim: '14개월 전에도 같은 사람이 같은 자리에 있었다',
    reaction: '…삼촌한테 전화 좀 하겠습니다.',
    reactionAction: '웃음을 멈추지 않는다', camera: 'push',
    followUp: { speaker: 'detective', text: '받는 사람이 없을 겁니다.' }
  }
]

export const ENDINGS = {
  full: {
    id: 'full', title: '완전', links: 3,
    text: '도일 체포. 넬 밴스 사건 재수사 개시.',
    finalShot: '물탱크의 물이 빠지는 소리',
    subtitle: null
  },
  partial: {
    id: 'partial', title: '부분', links: 2,
    text: '도일 구금 48시간. 소유주 변호사가 온다.',
    finalShot: '프런트에 걸린 942호 열쇠',
    subtitle: null
  },
  cold: {
    id: 'cold', title: '미제', links: 1,
    text: '사건 종결.',
    finalShot: '새 손님이 942호 열쇠를 받아 간다',
    subtitle: '세실은 계속 영업했다.',
    note: '미제 엔딩은 실패가 아니라 정식 엔딩이다. 재시도를 강요하지 않는다'
  }
}

// 대사 없이 읽혀야 하는 배치 (루브릭 N6). placement는 레벨 에이전트를 위한 위치 힌트다.
export const ENVIRONMENT_STORY = [
  { id: 'sofa-wear', room: 'lobby', text: '로비 소파 팔걸이 한쪽만 닳아 있다. 프런트가 보이는 쪽.',
    placement: '로비 중앙 소파, 프런트를 향한 팔걸이만 러프니스·색을 낮춘다', reads: '누군가 프런트를 오래 지켜봤다' },
  { id: 'keyrack-gap', room: 'lobby', text: '열쇠 걸이 942 고리에 열쇠가 없다. 옆의 ROOF 고리도 비었다.',
    placement: '프런트 뒤 벽 열쇠 걸이. 942와 ROOF 고리를 인접 배치하고 942 자리에만 먼지 자국', reads: '옥상 열쇠가 나갔다', evidence: 'keyrack' },
  { id: 'carpet-band', room: 'corridor9', text: '9층 복도 카펫에 942호 앞에서 계단 쪽으로 색이 옅어진 띠(닦인 자국).',
    placement: '942호 문 앞에서 계단까지 폭 40cm 띠. 카펫 알베도 밝기만 올리고 파일 방향은 반대로', reads: '무언가가 계단 쪽으로 옮겨졌다', evidence: 'footprints' },
  { id: 'bed-one-side', room: 'room942', text: '942호 침대는 한쪽만 눌려 있다. 베개는 두 개인데 하나만 썼다.',
    placement: '창 쪽 절반만 매트리스 눌림. 베개 하나는 각을 세워둔 채', reads: '혼자 묵었다' },
  { id: 'frame-mark', room: 'room942', text: '942호 벽에 액자를 뗀 자국 — 아이리스가 뗐고, 뒷면에 뭔가를 붙였다가 가져갔다.',
    placement: '침대 머리맡 벽. 주변보다 변색이 덜한 직사각형과 못 구멍 두 개', reads: '숨긴 것을 회수해 갔다' },
  { id: 'clippings', room: 'room944', text: '944호 벽 전체가 신문 스크랩. 전부 14개월 전 날짜. 한 장만 최근 것.',
    placement: '창 맞은편 벽 전면. 최근 한 장은 스탠드 광원이 닿는 위치에', reads: '프라이스는 14개월 전에서 멈춰 있다', evidence: 'photos' },
  { id: 'dry-sink', room: 'room942', text: '욕실 세면대 물이 안 나온다. 트랩 아래 양동이가 받쳐져 있다.',
    placement: '욕실 세면대 하부. 양동이 안쪽에 검은 침전물 링', reads: '수압이 끊긴 지 며칠 됐다', evidence: 'sink-trap' },
  { id: 'tank-row', room: 'rooftop', text: '옥상 탱크 4개 중 3개는 뚜껑이 열려 있고 하나만 닫혀 잠겨 있다.',
    placement: '탱크 4기 일렬. 잠긴 하나는 끝에서 두 번째, 걸쇠가 바깥으로 보이게', reads: '한 탱크만 다르게 취급됐다', evidence: 'hatch-lock' },
  { id: 'catwalk-shoes', room: 'rooftop', text: '캣워크에 구두 한 켤레가 나란히 놓여 있다. 젖지 않은 자리에.',
    placement: '잠긴 탱크 옆 캣워크. 구두 아래만 마른 자국을 남긴다', reads: '연출된 자살', evidence: 'shoes' }
]
