// 템플릿 기반 변환기: TC JSON을 순회하며 Playwright spec 파일을 기계적으로 생성한다.
// LLM은 여기에 전혀 개입하지 않는다 (결정론적 변환 → 안정적, 비용 없음).
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const tcPath = path.join(__dirname, '..', 'generated', 'testcases.json');
const templatePath = path.join(__dirname, 'templates', 'spec.hbs');
const outPath = path.join(__dirname, '..', 'tests', 'booking.generated.spec.ts');

const testCases = JSON.parse(fs.readFileSync(tcPath, 'utf8'));
const template = Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));

fs.writeFileSync(outPath, template(testCases));
console.log(`[build-spec] ${testCases.length}개 케이스 → ${outPath}`);
