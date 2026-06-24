// AI 테스트케이스 생성기
// - ANTHROPIC_API_KEY가 있으면 실제 Claude API를 호출해 구조화된 TC를 생성
// - 없으면 fixtures/sample-testcases.json으로 폴백 (오프라인 개발/CI 비용 절감용)
//
// 핵심 설계 포인트: action 어휘를 Page Object 메서드로 제한해서 프롬프트에 같이 넘긴다.
// → AI가 존재하지 않는 selector/동작을 임의로 만들어내지 못하게 막는 가드레일.

const fs = require('fs');
const path = require('path');

const AVAILABLE_ACTIONS = [
  'selectShop(name)',
  'selectSlot(time)',
  'payWithCard(cardNumber)',
  'expectConfirmed()',
  'expectPaymentFailed()',
  'expectSlotReopened(time)',
];

const DOMAIN_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'domain-data.json'), 'utf8')
).booking;

const SCHEMA_INSTRUCTION = `
다음 요구사항을 바탕으로 회귀 테스트케이스를 JSON 배열로만 응답해. 설명 텍스트는 절대 붙이지 마.

각 항목 스키마:
{
  "id": "TC-XXX",
  "title": "string",
  "risk": "high" | "medium" | "low",
  "steps": [ { "action": "string", "args": ["string"] } ],
  "verify": [ { "action": "string", "args": ["string"] } ]
}

steps와 verify의 action은 반드시 아래 목록에 있는 이름만 사용해. 목록 밖의 동작이 필요하면
verify에 risk:"low"로 표시하고 title에 "[POM 확장 필요]"를 접두로 붙여.

사용 가능한 action 목록:
${AVAILABLE_ACTIONS.map((a) => '- ' + a).join('\n')}

아래는 실제 앱에서 유효한 값이야. 이 값 밖의 매장명/시간을 절대 지어내지 마.
- 유효한 정비소 이름: ${DOMAIN_DATA.validShopNames.join(', ')}
- 유효한 시간 슬롯: ${DOMAIN_DATA.validSlotTimes.join(', ')}
- 결제 실패 트리거: ${DOMAIN_DATA.paymentFailureTrigger}
  (일반적인 PG사 테스트 카드번호 관례를 가져다 쓰지 말고, 위 규칙 그대로 따라야 해)
`;

async function generateTestCases(requirementText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('[generator] ANTHROPIC_API_KEY 없음 → fixture로 폴백합니다.');
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample-testcases.json');
    return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: `${SCHEMA_INSTRUCTION}\n\n요구사항:\n${requirementText}` },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API 호출 실패: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  // 추측 대신 API가 직접 알려주는 신호로 "응답이 잘렸는지" 먼저 확인한다.
  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'LLM 응답이 max_tokens 제한에 걸려 중간에 잘렸습니다. generate-testcases.js의 max_tokens 값을 더 늘려보세요.'
    );
  }

  const text = data.content.map((b) => b.text || '').join('\n');
  const cleaned = text
    .replace(/```json|```/g, '')
    .replace(/,\s*([\]}])/g, '$1') // trailing comma 제거 (LLM이 자주 흘리는 JSON 문법 오류)
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const debugPath = path.join(__dirname, '..', 'generated', '_raw-response-debug.txt');
    fs.writeFileSync(debugPath, text);
    throw new Error(
      `LLM 응답을 JSON으로 파싱하지 못했습니다 (${err.message}). 원본 응답을 ${debugPath}에 저장했으니 확인해보세요.`
    );
  }
}

// 프롬프트로 규칙을 알려주는 것만으로는 LLM이 100% 따른다는 보장이 없다.
// 그래서 생성 직후 기계적으로 검증해서, Playwright가 30초씩 기다리다 실패하기 전에
// "값 자체가 틀렸다"는 걸 1초 안에 잡아낸다 (fail fast).
function validateTestCases(testCases) {
  const errors = [];
  for (const tc of testCases) {
    const allSteps = [...(tc.steps || []), ...(tc.verify || [])];
    for (const step of allSteps) {
      if (step.action === 'selectShop' && !DOMAIN_DATA.validShopNames.includes(step.args[0])) {
        errors.push(
          `${tc.id} (${tc.title}): selectShop에 존재하지 않는 매장명 "${step.args[0]}" 사용 ` +
            `(유효한 값: ${DOMAIN_DATA.validShopNames.join(', ')})`
        );
      }
      if (
        (step.action === 'selectSlot' || step.action === 'expectSlotReopened') &&
        !DOMAIN_DATA.validSlotTimes.includes(step.args[0])
      ) {
        errors.push(
          `${tc.id} (${tc.title}): ${step.action}에 존재하지 않는 시간 "${step.args[0]}" 사용 ` +
            `(유효한 값: ${DOMAIN_DATA.validSlotTimes.join(', ')})`
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '생성된 테스트케이스가 도메인 데이터를 위반했습니다:\n' +
        errors.map((e) => '  - ' + e).join('\n') +
        '\n\n같은 요구사항으로 generate를 다시 실행해보세요 (LLM 응답은 매번 달라질 수 있습니다).'
    );
  }
}

async function main() {
  const requirement =
    process.argv[2] ||
    '예약 후 결제에 실패하면 선택했던 시간 슬롯이 다시 예약 가능한 상태로 보여야 한다. ' +
      '정상 결제 시에는 예약 확정 메시지가 노출되어야 한다.';

  const testCases = await generateTestCases(requirement);
  validateTestCases(testCases);

  const outPath = path.join(__dirname, '..', 'generated', 'testcases.json');
  fs.writeFileSync(outPath, JSON.stringify(testCases, null, 2));
  console.log(`[generator] ${testCases.length}개 테스트케이스 생성 완료 → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});