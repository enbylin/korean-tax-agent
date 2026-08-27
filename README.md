# korean-tax-agent

**한국 세법 AI 검토 스킬** — Claude Code에서 세무 질문을 하면, 법제처 국가법령정보를
실시간 검색해 **조문·판례·예규 근거가 붙은 검토의견**을 작성합니다.

[taxjarvis.com](https://taxjarvis.com)의 세무 검토 파이프라인 방법론을 Claude Code
스킬로 경량화한 공개 버전입니다. 로컬 DB·Python 환경·API 키가 전혀 필요 없습니다 —
설치하면 바로 동작합니다.

```
> /tax 프리랜서에게 3.3% 원천징수했는데 매일 출근시키면 근로소득으로 재분류되나요?
```

## 특징

- **실시간 법령 검색** — [korean-law-mcp](https://korean-law-mcp.fly.dev/mcp)를 통해
  법제처 국가법령정보센터의 현행 법령·판례·국세청 유권해석·조세심판 결정례를 검색
- **근거 기반 답변** — 모든 법적 판단에 조문번호·판례번호 인용, 말미에 출처 링크 목록
- **환각 방지 설계** — 검색으로 확인한 근거만 인용, 확정 단언 금지, 반대 근거 병기 의무
- **적용시점 판단** — 경정청구·과거 과세기간 질문은 그 시점에 시행 중이던 법령으로 판단
  (현행 조문 소급 적용 방지)

## 두 가지 모드

| | **easy** (기본) | **hard** |
|---|---|---|
| 파이프라인 | 검색 → 답변 | 질문 분석 → 근거 검색 → 근거 검증 → 답변 (4단계) |
| 실행 방식 | 메인 컨텍스트 | 단계별 독립 서브에이전트 |
| 소요 시간 | 1~2분 | 5분 이상 |
| 적합한 질문 | 기한·세율·요건 확인, 일반 설명 | 복합 쟁점, 해석 대립, 고액 리스크, 과거 과세기간 판단 |

```
> /tax 부가세 예정신고 기한 언제야?                  # easy로 충분
> /tax hard 가지급금 인정이자 익금산입과 소득처분 리스크 검토해줘   # 정밀 검토
```

hard 모드는 원본 파이프라인의 4단계를 그대로 재현합니다:

1. **Query Analysis** — 쟁점 분해, 검색 의도 도출, 가설 수립, 재질문 필요 판단
2. **Source Search** — 쟁점별 법령·판례·예규 검색, 위임 시행령 추적, 적용시점 확인
3. **FactCheck** — 근거의 강도·충돌·공백 분석, 인용 실존 검증, 보충검색 지시 (1회)
4. **Answer Generation** — 질문 복잡도에 맞춘 검토의견서 작성

각 단계의 상세 방법론은 [`skills/tax/references/`](skills/tax/references/)에
전부 공개되어 있습니다.

## 설치

### 방법 1 — Claude Code 플러그인 (권장)

Claude Code 안에서:

```
/plugin marketplace add freeforeverybody/korean-tax-agent
/plugin install korean-tax-agent@korean-tax-agent
```

플러그인이 켜지면 korean-law MCP 서버가 자동 등록되고 `/tax` 스킬을 쓸 수
있습니다.

### 방법 2 — 스킬 수동 설치

```bash
git clone https://github.com/freeforeverybody/korean-tax-agent.git
cp -r korean-tax-agent/skills/tax ~/.claude/skills/
```

그리고 MCP 서버를 직접 등록합니다 (프로젝트 또는 사용자 스코프):

```bash
claude mcp add korean-law --transport http https://korean-law-mcp.fly.dev/mcp
```

서버는 Streamable HTTP(stateless) 방식이며, API 키나 로컬 DB는 필요 없습니다.

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
├── .mcp.json                 # korean-law MCP 서버 (플러그인 설치 시 자동 등록)
└── skills/
    └── tax/
        ├── SKILL.md          # 오케스트레이터 — 모드 라우팅, 실행 규칙
        └── references/       # 단계별 방법론 (hard 모드 서브에이전트의 시스템 프롬프트)
            ├── query-analysis.md
            ├── source-search.md
            ├── fact-check.md
            └── answer-generation.md
```

## 데이터 소스

[korean-law-mcp](https://korean-law-mcp.fly.dev/mcp)는 법제처 국가법령정보센터
공개 API를 프록시하는 MCP 서버입니다. 이 스킬이 사용하는 주요 도구:

| 도구 | 용도 |
|---|---|
| `search_law` / `get_law_text` | 법령 검색·조문 원문 조회 (세법·비세법 모두) |
| `search_decisions` / `get_decision_text` | 판례·국세청 유권해석·조세심판·법령해석례 검색·전문 조회 |
| `get_annexes` | 별표·서식 조회 (기준금액·세율표) |
| `legal_analysis` | 특정 시점 시행 법령 조회(행위시법), 인용 실존 검증 |

## 원본 프로젝트와의 차이

이 스킬은 [taxjarvis.com](https://taxjarvis.com) 파이프라인의 방법론(단계별 지침)을
그대로 공개하되, 인프라를 경량화한 것입니다:

| | taxjarvis.com | korean-tax-agent (이 저장소) |
|---|---|---|
| 세법 DB | 전용 Neo4j Graph DB (23개 세법 조문·판례·예규 적재, 관계 기반 탐색) | korean-law-mcp 실시간 검색 |
| 실행 | 전용 파이프라인 서버 | Claude Code 스킬 + 서브에이전트 |
| 답변 품질 | 그래프 관계 탐색·조문 시점 버전 관리로 더 정밀 | 공개 API 검색 범위 내 |

## 면책

본 스킬의 답변은 AI가 공개 법령정보를 검색해 작성한 참고 의견이며, 세무대리인의
검토를 대체하지 않습니다. 실제 신고·처분 대응 전 반드시 회계사 또는 세무사와
상담하세요. 답변의 정확성·완전성은 보장되지 않으며, 이를 근거로 한 의사결정의
책임은 사용자에게 있습니다.

## 라이선스

[MIT](LICENSE)
