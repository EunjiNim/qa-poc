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
      max_tokens: 1500,
      messages: [
        { role: 'user', content: `${SCHEMA_INSTRUCTION}\n\n요구사항:\n${requirementText}` },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API 호출 실패: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content.map((b) => b.text || '').join('\n');
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  const requirement =
    process.argv[2] ||
    '예약 후 결제에 실패하면 선택했던 시간 슬롯이 다시 예약 가능한 상태로 보여야 한다. ' +
      '정상 결제 시에는 예약 확정 메시지가 노출되어야 한다.';

  const testCases = await generateTestCases(requirement);

  const outPath = path.join(__dirname, '..', 'generated', 'testcases.json');
  fs.writeFileSync(outPath, JSON.stringify(testCases, null, 2));
  console.log(`[generator] ${testCases.length}개 테스트케이스 생성 완료 → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
