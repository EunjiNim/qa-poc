// 조회형(read-only) 화면용 AI 테스트케이스 생성기.
// generate-testcases.js(흐름형)와 스키마가 다르다: steps 대신 fixture_data + expected_display.
// "어떤 데이터가 주어졌을 때 화면에 무엇이 보여야 하는가"를 검증하는 용도이기 때문에,
// 클릭 시퀀스가 아니라 데이터 상태(fixture)와 표시 검증(display) 두 축으로만 구성한다.

const fs = require('fs');
const path = require('path');

const AVAILABLE_DISPLAY_ACTIONS = [
  'expectMileageDisplayed(text)',
  'expectEmptyState()',
  'expectAccessDenied()',
  'expectVisualMatch(snapshotName)',
];

const REPORT_SCENARIOS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'domain-data.json'), 'utf8')
).reportScenarios;

const SCHEMA_INSTRUCTION = `
다음 화면 요구사항을 바탕으로 "조회형 화면" 테스트케이스를 JSON 배열로만 응답해. 설명 텍스트는 붙이지 마.

이 화면은 클릭으로 단계가 넘어가는 화면이 아니라, 데이터가 주어지면 그대로 표시만 하는 화면이야.
그래서 steps(행동 시퀀스) 대신 fixture_data(어떤 데이터 상태인지)와 expected_display(무엇이 보여야 하는지)로 구성해.

각 항목 스키마:
{
  "id": "TC-1XX",
  "type": "display",
  "title": "string",
  "risk": "high" | "medium" | "low",
  "fixture_data": { "scenario": "normal" | "empty" | "large" | "unauthorized" },
  "expected_display": [ { "action": "string", "args": ["string"] } ]
}

expected_display의 action은 반드시 아래 목록에 있는 이름만 사용해.

사용 가능한 display action 목록:
${AVAILABLE_DISPLAY_ACTIONS.map((a) => '- ' + a).join('\n')}

각 시나리오의 실제 데이터는 아래와 같아. expectMileageDisplayed에 들어갈 값은
반드시 여기 적힌 값과 정확히 일치해야 해. 절대 추측하거나 임의의 숫자를 만들어내지 마.
${JSON.stringify(REPORT_SCENARIOS, null, 2)}
`;

async function generateDisplayTestCases(requirementText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('[generator:report] ANTHROPIC_API_KEY 없음 → fixture로 폴백합니다.');
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample-testcases-report.json');
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
        { role: 'user', content: `${SCHEMA_INSTRUCTION}\n\n화면 요구사항:\n${requirementText}` },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API 호출 실패: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'LLM 응답이 max_tokens 제한에 걸려 중간에 잘렸습니다. generate-report-testcases.js의 max_tokens 값을 더 늘려보세요.'
    );
  }

  const text = data.content.map((b) => b.text || '').join('\n');
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  const requirement =
    process.argv[2] ||
    '정비 리포트 화면은 누적 주행거리와 이번 달 정비 내역을 보여준다. ' +
      '정비 내역이 없으면 빈 상태 안내가 보여야 하고, 본인 차량이 아니면 접근이 차단되어야 한다.';

  const testCases = await generateDisplayTestCases(requirement);

  const outPath = path.join(__dirname, '..', 'generated', 'testcases-report.json');
  fs.writeFileSync(outPath, JSON.stringify(testCases, null, 2));
  console.log(`[generator:report] ${testCases.length}개 조회형 테스트케이스 생성 완료 → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
