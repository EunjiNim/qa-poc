# AI 테스트케이스 생성 × Playwright 통합 PoC

마카롱팩토리(마이클) QA 자동화 엔지니어 면접 준비용 PoC입니다.
"정비소 예약 → 결제 → 확정" 플로우를 데모 앱으로 단순화해서, AI 테스트케이스 생성기와
Playwright 자동화를 템플릿 기반으로 묶는 파이프라인을 구현했습니다.

## 구조

```
public/index.html          데모 앱 (정비소 선택 → 시간 선택 → 결제 → 확정)
public/report.html         정비 리포트 데모 (조회형 화면, scenario 쿼리로 데이터 상태 전환)
server.js                  데모 앱 로컬 정적 서버 (포트 4321)
page-objects/BookingPage.ts AI가 생성하는 TC의 action 어휘(vocabulary)를 정의하는 POM (흐름형)
page-objects/ReportPage.ts  조회형 화면용 POM (데이터 상태 검증 + 스크린샷 비교)
fixtures/sample-testcases.json         흐름형 TC 샘플 (steps 기반)
fixtures/sample-testcases-report.json  조회형 TC 샘플 (fixture_data/expected_display 기반)
generator/generate-testcases.js        흐름형 TC 생성기
generator/generate-report-testcases.js 조회형 TC 생성기
generator/templates/spec.hbs           흐름형 → Playwright 코드 템플릿
generator/templates/report-spec.hbs    조회형 → Playwright 코드 템플릿
generator/build-spec.js / build-report-spec.js  각 템플릿 변환 실행 스크립트
tests/core/booking.smoke.spec.ts        승격된 booking 테스트 (배포 게이트 권한 O)
tests/ai-candidates/booking.generated.spec.ts  생성기가 막 찍어낸 흐름형 결과물 (배포 게이트 권한 X)
tests/ai-candidates/report.generated.spec.ts   생성기가 막 찍어낸 조회형 결과물 (배포 게이트 권한 X)
.github/workflows/playwright.yml PR마다 자동 실행 + 결과 리포트를 GitHub Pages로 배포
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

booking 테스트는 이 PoC를 만드는 과정에서 실제로 결제 실패 시 에러 메시지가 안 보이는 진짜 UI
버그를 한 번 잡아냈고, 수정 후 재실행에서 안정적으로 통과했습니다. 그래서 `tests/core/booking.smoke.spec.ts`로
승격해뒀고, 막 만든 report 테스트는 아직 `tests/ai-candidates/`에 남아있습니다.

## CI 리포트 확인 (GitHub Pages)

워크플로우가 PR/push마다 core·candidates 리포트를 각각 만들어서 `gh-pages` 브랜치로 배포합니다.
repo에서 한 번만 설정하면 됩니다: Settings → Pages → Source를 `gh-pages` 브랜치로 지정.
이후 `https://<username>.github.io/<repo>/`에서 두 리포트를 확인할 수 있습니다.

core와 candidates를 같은 `npx playwright test` 호출로 합치지 않고 분리한 이유는, 합치면 두 번째
실행이 HTML 리포트 폴더를 덮어써서 먼저 실행한 쪽의 결과가 사라지기 때문입니다. 그래서
`PLAYWRIGHT_HTML_REPORT` 환경변수로 출력 폴더를 분리하고, 둘을 연결하는 `index.html`을 따로 만듭니다.

## 알아둘 점

이 PoC는 Claude(claude.ai) 채팅 환경의 코드 실행 샌드박스에서 만들어졌고, 외부 네트워크가
제한되어 있어 `npx playwright install`로 브라우저 바이너리를 받을 수 없었습니다. 그래서
TC 생성 → 템플릿 변환까지는 실제로 실행해서 검증했지만, 마지막 단계인 실제 브라우저 테스트
실행은 본인 컴퓨터나 Claude Code 환경에서 직접 돌려봐야 합니다.
