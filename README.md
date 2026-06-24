# AI 테스트케이스 생성 × Playwright 통합 PoC

마카롱팩토리(마이클) QA 자동화 엔지니어 면접 준비용 PoC입니다.
"정비소 예약 → 결제 → 확정" 플로우를 데모 앱으로 단순화해서, AI 테스트케이스 생성기와
Playwright 자동화를 템플릿 기반으로 묶는 파이프라인을 구현했습니다.

## 구조

```
public/index.html                               데모 앱 (정비소 선택 → 시간 선택 → 결제 → 확정)
public/report.html                              정비 리포트 데모 (조회형 화면, scenario 쿼리로 데이터 상태 전환)
server.js                                       데모 앱 로컬 정적 서버 (포트 4321)
page-objects/BookingPage.ts                     AI가 생성하는 TC의 action 어휘(vocabulary)를 정의하는 POM (흐름형)
page-objects/ReportPage.ts                      조회형 화면용 POM (데이터 상태 검증 + 스크린샷 비교)
fixtures/sample-testcases.json                  흐름형 TC 샘플 (steps 기반)
fixtures/sample-testcases-report.json           조회형 TC 샘플 (fixture_data/expected_display 기반)
generator/generate-testcases.js                 흐름형 TC 생성기
generator/generate-report-testcases.js          조회형 TC 생성기
generator/templates/spec.hbs                    흐름형 → Playwright 코드 템플릿
generator/templates/report-spec.hbs             조회형 → Playwright 코드 템플릿
generator/build-spec.js / build-report-spec.js  각 템플릿 변환 실행 스크립트
tests/core/booking.smoke.spec.ts                승격된 booking 테스트 (배포 게이트 권한 O)
tests/ai-candidates/booking.generated.spec.ts   생성기가 막 찍어낸 흐름형 결과물 (배포 게이트 권한 X)
tests/ai-candidates/report.generated.spec.ts    생성기가 막 찍어낸 조회형 결과물 (배포 게이트 권한 X)
.github/workflows/playwright.yml                PR마다 자동 실행 + 결과 리포트를 GitHub Pages로 배포
```

## 화면 유형별 TC 스키마가 다른 이유

흐름형 화면(예약/결제)과 조회형 화면(리포트)은 검증하고 싶은 게 본질적으로 다릅니다.

| | 흐름형 (예약/결제) | 조회형 (리포트) |
|---|---|---|
| 핵심 질문 | 클릭하면 다음 단계로 잘 넘어가는가 | 이 데이터가 주어지면 화면에 맞게 보이는가 |
| TC 구조 | `steps` (행동 시퀀스) | `fixture_data` (데이터 상태) + `expected_display` (표시 검증) |
| 대표 검증 | 결제 실패 → 슬롯 재오픈 | 빈 상태 안내, 접근 권한, 시각적 회귀 |

그래서 생성기·템플릿·POM을 화면 유형별로 분리했습니다. 하나의 범용 스키마로 억지로 합치면
양쪽 다 어설프게 표현하는 스키마가 되기 쉽습니다.

## 실제로 돌려보는 방법 (본인 컴퓨터 또는 Claude Code)

```bash
npm install
npx playwright install        # 브라우저 바이너리 다운로드 (이 환경에선 네트워크 제한으로 불가했음)

npm run demo                  # 데모 앱 구동 (localhost:4321)

# 다른 터미널에서
npm run generate              # ANTHROPIC_API_KEY 있으면 실제 LLM 호출, 없으면 fixture 사용
npm run build:spec            # TC JSON → tests/ai-candidates/booking.generated.spec.ts 생성
npm run generate:report       # 조회형 TC 생성 (마찬가지로 키 없으면 fixture 폴백)
npm run build:spec:report     # tests/ai-candidates/report.generated.spec.ts 생성
npx playwright test --update-snapshots   # 첫 실행 시 스크린샷 baseline 생성
npx playwright test           # 실제 브라우저로 실행 (tests/ 전체: core + ai-candidates)
```

실제 LLM 호출을 쓰려면:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate "예약 후 결제에 실패하면 슬롯이 다시 열려야 한다"
```

## 이 PoC가 보여주는 설계 포인트

1. **action 어휘 제한**: 생성기가 LLM에 넘기는 프롬프트에 Page Object 메서드 목록을 같이 전달해서,
   LLM이 존재하지 않는 selector나 동작을 임의로 만들지 못하게 가드레일을 둠.
2. **템플릿 기반 변환은 결정론적**: TC JSON → spec 코드 변환에 LLM이 개입하지 않음 (안정적, 비용 없음).
   POM에 없는 동작이 필요하면 `risk: "low"` + `"[POM 확장 필요]"` 태그로 표시되도록 프롬프트에 명시해서,
   "LLM 재호출 경로로 넘겨야 할 케이스"를 자동으로 구분.
3. **오프라인 폴백**: API 키가 없으면 fixture로 동작 — 개발/CI 비용을 아끼면서도 파이프라인 자체는
   언제든 검증 가능하게 설계.
4. **CI 게이트 분리**: `tests/ai-candidates`는 실패해도 배포를 막지 않고, `tests/core`로 승격된
   테스트만 배포 게이트 권한을 가짐 (위 운영 모델 설계 문서의 1번 항목과 동일한 구조).

### 이 분리를 PoC에 실제로 적용한 예시

booking 테스트는 이 PoC를 만드는 과정에서 실제로 문제를 잡아내고 고친 적이 있어서
`tests/core/booking.smoke.spec.ts`로 승격해뒀고, 막 만든 report 테스트는 아직
`tests/ai-candidates/`에 남아있습니다. 아래는 그 과정에서 실제로 마주친 이슈 3건입니다.

---

**버그 #1. 결제 실패 메시지가 화면에 표시되지 않음**

| | |
|---|---|
| 증상 | `expectPaymentFailed()` 단언이 `toBeVisible()` 실패 — locator는 존재하지만 `hidden` 상태 |
| 원인 | `payment-error` 엘리먼트가 `hidden` 처리되는 `step-payment` 섹션 **내부**에 위치. 자기 자신의 `hidden`을 `false`로 바꿔도, 부모 컨테이너가 숨겨지면 자식도 같이 사라짐 |
| 발견 경로 | Playwright의 actionability 체크 (존재 여부가 아니라 실제 가시성까지 확인) |
| 조치 | `payment-error`를 `step-payment` 밖으로 빼서 `step-slot` 섹션 내부로 이동 (`public/index.html`) |
| 결과 | 재실행 후 안정적으로 통과 → `tests/core`로 승격 |

**버그 #2. AI가 존재하지 않는 매장명·카드번호를 임의로 생성**

| | |
|---|---|
| 증상 | `selectShop('테스트 매장')` 클릭 대기 중 30초 타임아웃 × 재시도까지 5개 테스트 연속 실패 (총 5분 소요). `payWithCard`에는 PG사의 일반적인 "결제 거절 테스트 카드" 번호(`4000000000000002`)를 사용 |
| 원인 | 프롬프트에 action 어휘(메서드명)는 제한했지만, **그 메서드에 넣을 유효한 값**은 알려주지 않음. AI가 그럴듯하지만 실제 앱엔 없는 매장명과, 실제 앱 로직과 무관한 일반적인 PG 테스트 카드 관례를 가져다 씀 |
| 발견 경로 | 매번 똑같이 재현되는 결정적(deterministic) 실패 — 진짜 flaky가 아니라는 점에서 데이터 불일치임을 역추적 |
| 조치 | `fixtures/domain-data.json`을 단일 진실 공급원으로 만들어 프롬프트에 실제 유효 값(매장명/시간/결제 실패 트리거)을 명시. 그래도 LLM이 100% 따른다는 보장이 없어서, 생성 직후 결과를 도메인 데이터와 대조하는 `validateTestCases()` 검증 게이트를 추가해 위반 시 파일 생성 전에 즉시 실패하도록 함 |
| 결과 | report 쪽은 즉시 해결. booking 쪽은 한 번 더 같은 패턴이 재발해서 "프롬프트 지시만으론 보장이 안 된다"는 게 확인됨 — 그래서 검증 게이트가 의미 있는 추가 방어선이라는 결론 |

**버그 #3. LLM 응답이 깨진 JSON으로 와서 파싱 실패**

| | |
|---|---|
| 증상 | 두 차례, 서로 다른 양상의 `JSON.parse` 실패. ① `Expected double-quoted property name` ② `Unterminated string in JSON` |
| 원인 | ① LLM이 마지막 항목 뒤에 trailing comma(JS에서는 허용, 엄격한 JSON에서는 오류)를 흘림. ② `max_tokens: 1500`이 도메인 데이터까지 포함된 풍부한 응답엔 부족해서 문자열 중간에서 응답이 끊김 |
| 발견 경로 | 에러 메시지만으론 원인이 모호해서, 처음엔 추측에 의존 |
| 조치 | trailing comma 제거 정규식 추가, 파싱 실패 시 원본 응답을 `generated/_raw-response-debug.txt`에 저장, `max_tokens`를 4096으로 상향, API가 직접 알려주는 `stop_reason === 'max_tokens'`를 체크해서 모호한 파싱 에러 대신 정확한 원인을 즉시 표시 |
| 결과 | 같은 부류 실패가 재발해도 추측 없이 1초 안에 원인 파악 가능 |

## CI 리포트 확인 (GitHub Pages)

워크플로우가 PR/push마다 core·candidates 리포트를 각각 만들어서 `gh-pages` 브랜치로 배포합니다.
repo에서 한 번만 설정하면 됩니다: Settings → Pages → Source를 `gh-pages` 브랜치로 지정.
이후 `https://<username>.github.io/<repo>/`에서 두 리포트를 확인할 수 있습니다.

core와 candidates를 같은 `npx playwright test` 호출로 합치지 않고 분리한 이유는, 합치면 두 번째
실행이 HTML 리포트 폴더를 덮어써서 먼저 실행한 쪽의 결과가 사라지기 때문입니다. 그래서
`PLAYWRIGHT_HTML_REPORT` 환경변수로 출력 폴더를 분리하고, 둘을 연결하는 `index.html`을 따로 만듭니다.
