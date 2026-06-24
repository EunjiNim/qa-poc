// 조회형 화면 전용 변환기. build-spec.js와 분리한 이유:
// 흐름형(steps)과 조회형(fixture_data/expected_display)은 스키마가 달라서
// 템플릿도, 그 템플릿이 참조하는 POM도 다르기 때문에 변환 로직을 같이 두면
// 둘 다 어설프게 처리하는 범용 템플릿이 되어버린다. 화면 유형별로 파이프라인을 분리해서
// 각각은 단순하게 유지하는 쪽을 선택했다.
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const tcPath = path.join(__dirname, '..', 'generated', 'testcases-report.json');
const templatePath = path.join(__dirname, 'templates', 'report-spec.hbs');
const outPath = path.join(__dirname, '..', 'tests', 'report.generated.spec.ts');

const testCases = JSON.parse(fs.readFileSync(tcPath, 'utf8'));
const template = Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));

fs.writeFileSync(outPath, template(testCases));
console.log(`[build-report-spec] ${testCases.length}개 케이스 → ${outPath}`);
