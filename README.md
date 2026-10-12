# korean-tax-agent

**한국 세법 AI 검토 스킬** — Claude Code에서 세무 질문을 하면,
[택스닥터 세법 MCP](https://github.com/minsooparkk/korea-tax-law-mcp)로 현행 조문·판례·
해석례 원문을 직접 조회해 **근거가 붙은 검토의견**을 작성합니다.

[taxdoctorai.com](https://taxdoctorai.com)의 세무 검토 파이프라인 방법론을 Claude Code
스킬로 경량화한 공개 버전입니다. 로컬 DB·Python 환경·API 키가 전혀 필요 없습니다 —
설치하면 바로 동작합니다.

```
> /tax 프리랜서에게 3.3% 원천징수했는데 매일 출근시키면 근로소득으로 재분류되나요?
```

## 특징

- **기억이 아니라 원문으로 답합니다** — 조문 번호·세율·한도를 AI가 기억으로 쓰지 않고,
  답하기 전에 현행 시행본 원문을 조회합니다. 조문마다 시행일이 붙습니다
- **조문에서 근거까지 한 번에** — 출발 조문에서 위임 시행령·시행규칙, 그 조문을 인용한
  판례·심판례·해석례, 별표, 부칙 적용례까지 그래프 관계를 따라 모읍니다
- **유권해석·결정례 본문** — 국세청·법제처·행안부 해석례, 조세심판원 결정례, 국세청
  심사·이의·과세전적부심사 결정례를 요지가 아닌 본문으로 읽습니다
- **적용시점 판단** — 경정청구·과거 과세기간 질문은 그 시점에 시행 중이던 조문과 부칙
  적용례로 판단하고, 내년 이후 질문은 시행예정 개정을 확인합니다 (현행 조문 소급 적용 방지)
- **조세조약** — 107개국 조약 조문(국문·영문)과 그 조문을 개정한 의정서까지
- **인용 검증** — 답변에 적힌 조문·판례·문서번호가 실제로 있는지 마지막에 한 번 더
  대조합니다. 옛 조문 번호, 틀린 조문 제목, 파기환송된 판결을 걸러냅니다
- **환각 방지 설계** — 검색으로 확인한 근거만 인용, 확정 단언 금지, 반대 근거 병기 의무

## 두 가지 모드

| | **easy** (기본) | **hard** |
|---|---|---|
| 파이프라인 | 검색 → 답변 → 인용 검증 | 질문 분석 → 근거 검색 → 근거 검증 → 답변 → 인용 검증 |
| 실행 방식 | 메인 컨텍스트 | 단계별 독립 서브에이전트 |
| 소요 시간 | 2~5분 | 10분 이상 |
| 적합한 질문 | 기한·세율·요건 확인, 일반 설명 | 복합 쟁점, 해석 대립, 고액 리스크, 과거 과세기간 판단 |

```
> /tax 부가세 예정신고 기한 언제야?                  # easy로 충분
> /tax hard 가지급금 인정이자 익금산입과 소득처분 리스크 검토해줘   # 정밀 검토
```

hard 모드는 원본 파이프라인의 4단계를 그대로 재현합니다:

1. **Query Analysis** — 쟁점 분해, 검색 의도 도출, 가설 수립, 재질문 필요 판단
2. **Source Search** — 쟁점별 통합 그래프 탐색(`search_tax`), 위임 조문 추적, 적용시점 확인
3. **FactCheck** — 근거의 강도·충돌·공백 분석, 인용 실존 검증, 보충검색 지시 (1회)
4. **Answer Generation** — 질문 복잡도에 맞춘 검토의견서 작성

각 단계의 상세 방법론은 [`skills/tax/references/`](skills/tax/references/)에
전부 공개되어 있습니다.

## 설치

### 방법 1 — Claude Code 플러그인 (권장)

Claude Code 안에서:

```
/plugin marketplace add minsooparkk/korean-tax-agent
/plugin install korean-tax-agent@korean-tax-agent
```

플러그인이 켜지면 MCP 서버가 자동 등록되고 `/tax` 스킬을 쓸 수 있습니다.

### 방법 2 — 스킬 수동 설치

```bash
git clone https://github.com/minsooparkk/korean-tax-agent.git
cp -r korean-tax-agent/skills/tax ~/.claude/skills/
```

그리고 MCP 서버를 직접 등록합니다 (프로젝트 또는 사용자 스코프):

```bash
claude mcp add --transport http korea-tax-law https://mcp.taxdoctorai.com/mcp

# 선택 — 민법·상법 등 세법 밖 법령까지 조회하려면
claude mcp add --transport http korean-law https://korean-law-mcp.fly.dev/mcp
```

서버는 Streamable HTTP(stateless) 방식이며, API 키나 로컬 DB는 필요 없습니다.

### 이미 택스닥터 MCP를 쓰고 있다면

claude.ai 커넥터나 다른 이름으로 `https://mcp.taxdoctorai.com/mcp`를 연결해 두었다면
그대로 동작합니다. 스킬은 서버 이름이 아니라 도구 이름(`search_tax`, `get_article` …)으로
찾습니다.

## 사용법

```
/tax [easy|hard] <세무 질문>
```

- 모드를 생략하면 easy로 동작하고, 질문이 복합 쟁점이면 답변 말미에 hard 모드를 권합니다.
- 파이프라인이 판단에 필요한 사실(취득일·거래 구조 등)을 되물으면, 답해주는 대로
  본 검토가 이어집니다.
- 스킬 없이 그냥 세무 질문을 해도 description 매칭으로 자동 트리거됩니다.

## 구조

```
korean-tax-agent/
├── .claude-plugin/
│   ├── plugin.json           # 플러그인 매니페스트
│   └── marketplace.json      # 마켓플레이스 정의
├── .mcp.json                 # MCP 서버 (플러그인 설치 시 자동 등록)
└── skills/
    └── tax/
        ├── SKILL.md          # 오케스트레이터 — 모드 라우팅, 실행 규칙, 인용 검증
        └── references/       # 단계별 방법론 (hard 모드 서브에이전트의 시스템 프롬프트)
            ├── query-analysis.md
            ├── source-search.md
            ├── fact-check.md
            └── answer-generation.md
```

## 데이터 소스

### 택스닥터 세법 MCP — korea-tax-law ([리포](https://github.com/minsooparkk/korea-tax-law-mcp))

```
https://mcp.taxdoctorai.com/mcp
```

국세청 조세법령 목록의 현행 90개 법·령·칙, 판례·조세심판원·국세청 불복 결정례 15만여 건,
국세청·법제처·행정안전부 해석례 14만여 건, 107개국 조세조약을 그래프 DB에 적재해
**본문까지** 검색합니다. 조문마다 시행일과 개정 연혁이 붙어 있고, 위임·인용 관계는
검증된 것만 따라갑니다. 세법 안의 일은 전부 이 서버 하나로 처리합니다.

| 도구 | 스킬에서의 용도 |
|---|---|
| `search_tax` | **쟁점별 통합 탐색** — 출발 조문에서 위임·인용을 따라 판례·결정례·해석례·별표·부칙 적용근거를 모으고, 결과마다 실제 경로·원문·시점을 반환. `detail: "list"`로 목록부터, `as_of`로 과거 시점 조문 조회 |
| `get_evidence` | 긴 원문 이어 읽기 |
| `search_articles` / `get_article` | 조문 번호 찾기 · 조문 원문 + 위임 조문 + 별표 + 인용 문서 목록 |
| `get_article_history` | 조문 개정 연혁 |
| `search_annexes` / `get_annex` | 별표·서식 (세율표·기준금액·분류표) |
| `list_upcoming` | 공포됐으나 시행 전인 개정 |
| `search_cases` | 판례·조세심판원·국세청 심사·이의·적부 결정례 |
| `search_interpretations` | 국세청·법제처·행안부 해석례 |
| `list_treaties` / `search_treaties` / `get_treaty_article` | 조세조약 조문 + 개정의정서 |
| `verify_citations` | 답변에 적힌 조문·판례·문서번호의 실존 확인, 옛 번호 → 현행 번호, 판례 심급 |
| `list_laws` | 수록 법령과 시행일 |

### korean-law — 법제처 실시간 API (보조, 선택)

택스닥터 세법 MCP는 세법만 수록합니다. 상속 지분(민법), 합병·감자(상법), 근로자성
(근로기준법)처럼 세무 쟁점의 **전제가 세법 밖 법령**일 때만 이 서버로 조문을 조회합니다.

| 도구 | 용도 |
|---|---|
| `search_law` / `get_law_text` | 세법 밖 법령·조례 검색과 조문 조회 |
| `legal_analysis` | 세법 DB 수록 범위(대략 2015년) 이전 시점의 조문 |

연결돼 있지 않아도 스킬은 동작하며, 그 경우 세법 밖 법령은 "확인하지 못했다"고 답변에
밝힙니다.

## 버전

- **v2.0.0** — 택스닥터 세법 MCP(`mcp.taxdoctorai.com`, v0.13.0 이상) 중심으로 전환. 통합 그래프 탐색
  (`search_tax`), 별표·시행예정 개정·과거 시점 조문, 답변 인용 검증 추가. 검색 의도에
  심판·결정례(`tribunal`)·조세조약(`treaty`)·별표(`annex`) 유형 추가. korean-law는 세법 밖
  법령 전용 보조로 축소
- **v1.0.0** — 최초 공개. korean-law MCP 기반

## 원본 프로젝트와의 차이

이 스킬은 [taxdoctorai.com](https://taxdoctorai.com) 파이프라인의 방법론(단계별 지침)을
그대로 공개하되, 인프라를 경량화한 것입니다:

| | taxdoctorai.com | korean-tax-agent (이 저장소) |
|---|---|---|
| 세법 DB | 전용 Neo4j Graph DB (웹앱 UX·전용 적재 파이프라인 포함) | 같은 DB를 읽는 공개 MCP |
| 실행 | 전용 파이프라인 서버 | Claude Code 스킬 + 서브에이전트 |
| 화면 | 근거 원문 패널, 세법 3단 보기, 답변 공유 | 터미널 텍스트 |

## 면책

본 스킬의 답변은 AI가 공개 법령정보를 검색해 작성한 참고 의견이며, 세무대리인의
검토를 대체하지 않습니다. 실제 신고·처분 대응 전 반드시 회계사 또는 세무사와
상담하세요. 답변의 정확성·완전성은 보장되지 않으며, 이를 근거로 한 의사결정의
책임은 사용자에게 있습니다.

## 라이선스

[MIT](LICENSE)
