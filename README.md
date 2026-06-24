# AI 테스트케이스 생성 × Playwright 통합 PoC

마카롱팩토리(마이클) QA 자동화 엔지니어 면접 준비용 PoC입니다.
"정비소 예약 → 결제 → 확정" 플로우를 데모 앱으로 단순화해서, AI 테스트케이스 생성기와
Playwright 자동화를 템플릿 기반으로 묶는 파이프라인을 구현했습니다.

## 구조

```
public/index.html          데모 앱 (정비소 선택 → 시간 선택 → 결제 → 확정)
server.js                  데모 앱 로컬 정적 서버 (포트 4321)
page-objects/BookingPage.ts AI가 생성하는 TC의 action 어휘(vocabulary)를 정의하는 POM
fixtures/sample-testcases.json  API 키 없이도 파이프라인을 검증할 수 있는 LLM 응답 샘플
generator/generate-testcases.js  요구사항 텍스트 → 구조화된 TC JSON (실제 Claude API 호출, 키 없으면 fixture 폴백)
generator/templates/spec.hbs     TC JSON → Playwright 코드로 찍어내는 핸들바 템플릿
generator/build-spec.js          템플릿 변환 실행 스크립트
tests/booking.generated.spec.ts  실제로 생성된 결과물 (이미 한 번 돌려본 출력)
.github/workflows/playwright.yml PR마다 자동 실행, core 스위트만 배포 게이트로 사용
```

## 실제로 돌려보는 방법 (본인 컴퓨터 또는 Claude Code)

```bash
npm install
npx playwright install        # 브라우저 바이너리 다운로드 (이 환경에선 네트워크 제한으로 불가했음)

npm run demo                  # 데모 앱 구동 (localhost:4321)

# 다른 터미널에서
npm run generate              # ANTHROPIC_API_KEY 있으면 실제 LLM 호출, 없으면 fixture 사용
npm run build:spec            # TC JSON → tests/booking.generated.spec.ts 생성
npx playwright test           # 실제 브라우저로 실행
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

## 알아둘 점

이 PoC는 Claude(claude.ai) 채팅 환경의 코드 실행 샌드박스에서 만들어졌고, 외부 네트워크가
제한되어 있어 `npx playwright install`로 브라우저 바이너리를 받을 수 없었습니다. 그래서
TC 생성 → 템플릿 변환까지는 실제로 실행해서 검증했지만, 마지막 단계인 실제 브라우저 테스트
실행은 본인 컴퓨터나 Claude Code 환경에서 직접 돌려봐야 합니다.
