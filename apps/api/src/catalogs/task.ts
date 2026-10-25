import type { CatalogService } from '../catalog.js';

type TaskEntry = Pick<CatalogService, 'id' | 'name' | 'tagline' | 'description' | 'serviceUrl' | 'tags' | 'kind' | 'tasks' | 'connection' | 'verification'>;

const skillGuide = (docsUrl: string, exampleUsage: string) => ({
  agents: [],
  permissions: [],
  installSteps: [
    '공식 저장소에서 안내와 라이선스를 확인하세요.',
    '사용 중인 에이전트가 Agent Skills 형식을 지원하는지 확인하세요.',
    '지원되는 경우 skill 디렉터리를 해당 에이전트의 skills 경로에 직접 복사하세요.',
  ],
  exampleUsage,
  docsUrl,
});

const mcpGuide = (docsUrl: string, permissions: string[], installSteps: string[]) => ({
  agents: [],
  auth: 'unknown' as const,
  permissions,
  installSteps,
  exampleUsage: '에이전트에서 연결한 도구의 이름과 입력을 먼저 확인한 뒤 필요한 작업만 요청하세요.',
  docsUrl,
});

const linkVerification = (sources: string[]) => ({ level: 'link' as const, sources });

const entries: TaskEntry[] = [
  { id: 'task-notion', name: 'Notion', tagline: '문서와 프로젝트 지식을 한곳에서 정리해요', description: '문서, 위키, 프로젝트 정보를 작성하고 팀과 공유하는 작업 공간입니다.', serviceUrl: 'https://www.notion.so/', tags: ['문서 작성', '회의 정리', '팀 협업'], kind: 'product', tasks: ['document-writing', 'meeting-notes', 'team-collaboration'], verification: linkVerification(['https://www.notion.so/']) },
  { id: 'task-google-sheets', name: 'Google Sheets', tagline: '표와 데이터를 함께 정리해요', description: '스프레드시트에서 데이터를 정리하고 수식과 차트로 분석할 수 있습니다.', serviceUrl: 'https://workspace.google.com/products/sheets/', tags: ['반복 보고서', '데이터 분석', '팀 협업'], kind: 'product', tasks: ['report-automation', 'data-analysis', 'team-collaboration'], verification: linkVerification(['https://workspace.google.com/products/sheets/']) },
  { id: 'task-google-docs', name: 'Google Docs', tagline: '문서를 실시간으로 함께 작성해요', description: '브라우저에서 문서를 작성하고 댓글과 공동 편집으로 검토할 수 있습니다.', serviceUrl: 'https://workspace.google.com/products/docs/', tags: ['문서 작성', '회의 정리', '팀 협업'], kind: 'product', tasks: ['document-writing', 'meeting-notes', 'team-collaboration'], verification: linkVerification(['https://workspace.google.com/products/docs/']) },
  { id: 'task-canva', name: 'Canva', tagline: '발표 자료와 시각 콘텐츠를 만들어요', description: '템플릿을 바탕으로 프레젠테이션과 시각 자료를 제작할 수 있습니다.', serviceUrl: 'https://www.canva.com/', tags: ['발표 자료', '콘텐츠 제작'], kind: 'product', tasks: ['presentation-design', 'content-creation'], verification: linkVerification(['https://www.canva.com/']) },
  { id: 'task-github', name: 'GitHub', tagline: '코드와 이슈를 프로젝트 단위로 관리해요', description: '저장소, 이슈, 코드 검토 기능으로 소프트웨어 작업을 협업합니다.', serviceUrl: 'https://github.com/', tags: ['코드 검토', '팀 협업'], kind: 'product', tasks: ['code-review', 'team-collaboration'], verification: linkVerification(['https://github.com/']) },
  { id: 'task-slack', name: 'Slack', tagline: '팀 대화를 주제별 채널로 모아요', description: '채널과 메시지로 팀 소통 및 업무 알림을 정리하는 협업 서비스입니다.', serviceUrl: 'https://slack.com/', tags: ['팀 협업', '고객 응대'], kind: 'service', tasks: ['team-collaboration', 'customer-support'], verification: linkVerification(['https://slack.com/']) },
  { id: 'task-zapier', name: 'Zapier', tagline: '반복 업무를 앱 사이에서 연결해요', description: '앱 간 트리거와 작업을 연결해 반복적인 워크플로를 자동화합니다.', serviceUrl: 'https://zapier.com/', tags: ['업무 자동화', '반복 보고서'], kind: 'service', tasks: ['workflow-automation', 'report-automation'], verification: linkVerification(['https://zapier.com/']) },
  { id: 'task-make', name: 'Make', tagline: '시각적인 흐름으로 앱 작업을 자동화해요', description: '앱과 서비스를 시각적인 시나리오로 연결해 업무 흐름을 자동화합니다.', serviceUrl: 'https://www.make.com/', tags: ['업무 자동화', '데이터 분석'], kind: 'service', tasks: ['workflow-automation', 'data-analysis'], verification: linkVerification(['https://www.make.com/']) },
  { id: 'task-n8n', name: 'n8n', tagline: '유연한 워크플로 자동화를 구성해요', description: '노드 기반 워크플로를 구성해 여러 서비스와 작업을 연결합니다.', serviceUrl: 'https://n8n.io/', tags: ['업무 자동화', '반복 보고서'], kind: 'service', tasks: ['workflow-automation', 'report-automation'], verification: linkVerification(['https://n8n.io/']) },
  { id: 'task-google-calendar', name: 'Google Calendar', tagline: '일정과 회의를 공유해요', description: '일정을 만들고 공유하며 회의 시간을 조율할 수 있습니다.', serviceUrl: 'https://calendar.google.com/', tags: ['회의 정리', '팀 협업'], kind: 'service', tasks: ['meeting-notes', 'team-collaboration'], verification: linkVerification(['https://calendar.google.com/']) },
  { id: 'task-kakao-channel', name: '카카오톡 채널', tagline: '고객 문의를 카카오톡에서 받아요', description: '비즈니스 채널을 만들어 고객과 소통하고 문의를 관리하는 카카오 서비스입니다.', serviceUrl: 'https://business.kakao.com/info/kakaotalkchannel/', tags: ['고객 응대', '국내 메신저'], kind: 'service', tasks: ['customer-support'], verification: linkVerification(['https://business.kakao.com/info/kakaotalkchannel/']) },
  { id: 'task-public-data', name: '공공데이터포털', tagline: '공공데이터를 찾아 활용해요', description: '중앙부처와 지방자치단체 등의 공공데이터를 검색하고 이용 신청할 수 있는 포털입니다.', serviceUrl: 'https://www.data.go.kr/', tags: ['데이터 분석', '공공 API'], kind: 'service', tasks: ['data-analysis', 'report-automation'], verification: linkVerification(['https://www.data.go.kr/']) },
  { id: 'task-tosspayments', name: '토스페이먼츠', tagline: '온라인 결제 도입 정보를 확인해요', description: '온라인 결제 서비스를 위한 제품과 개발자 문서를 제공하는 국내 결제 사업자입니다.', serviceUrl: 'https://www.tosspayments.com/', tags: ['국내 결제', '온라인 결제'], kind: 'service', tasks: ['payment-processing'], verification: linkVerification(['https://www.tosspayments.com/', 'https://docs.tosspayments.com/']) },
  { id: 'task-claude-pdf-skill', name: 'PDF 문서 스킬', tagline: 'PDF 읽기·작성 작업을 위한 안내를 제공해요', description: 'Anthropic의 공개 스킬 저장소에 있는 PDF 문서 작업용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/pdf', tags: ['문서 작성', '반복 보고서'], kind: 'skill', tasks: ['document-writing', 'report-automation'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/pdf', 'PDF 파일의 핵심 내용을 요약하고 표를 추출해줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/pdf']) },
  { id: 'task-claude-docx-skill', name: 'Word 문서 스킬', tagline: 'DOCX 문서 작성·편집 작업을 도와요', description: 'Anthropic의 공개 스킬 저장소에 있는 Word 문서 작업용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/docx', tags: ['문서 작성', '반복 보고서'], kind: 'skill', tasks: ['document-writing', 'report-automation'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/docx', '이 내용을 편집 가능한 DOCX 보고서 초안으로 정리해줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/docx']) },
  { id: 'task-claude-xlsx-skill', name: '스프레드시트 스킬', tagline: 'XLSX 데이터 정리 작업을 지원해요', description: 'Anthropic의 공개 스킬 저장소에 있는 스프레드시트 작업용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/xlsx', tags: ['반복 보고서', '데이터 분석'], kind: 'skill', tasks: ['report-automation', 'data-analysis'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/xlsx', '이 스프레드시트에서 월별 합계와 이상치를 찾아줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/xlsx']) },
  { id: 'task-claude-pptx-skill', name: '프레젠테이션 스킬', tagline: 'PPTX 자료 초안 작성을 도와요', description: 'Anthropic의 공개 스킬 저장소에 있는 프레젠테이션 작업용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/pptx', tags: ['발표 자료', '문서 작성'], kind: 'skill', tasks: ['presentation-design', 'document-writing'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/pptx', '이 보고서의 핵심을 5장 분량의 발표 자료 구조로 바꿔줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/pptx']) },
  { id: 'task-frontend-design-skill', name: '프런트엔드 디자인 스킬', tagline: '웹 화면 설계와 구현 작업을 구체화해요', description: 'Anthropic의 공개 스킬 저장소에 있는 프런트엔드 디자인 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/frontend-design', tags: ['화면 설계', '코드 검토'], kind: 'skill', tasks: ['ui-design', 'code-review'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/frontend-design', '요구사항을 바탕으로 접근성 있는 반응형 화면을 설계해줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/frontend-design']) },
  { id: 'task-webapp-testing-skill', name: '웹 앱 테스트 스킬', tagline: '브라우저 기반 웹 앱 점검 흐름을 안내해요', description: 'Anthropic의 공개 스킬 저장소에 있는 웹 앱 테스트용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/webapp-testing', tags: ['코드 검토', '업무 자동화'], kind: 'skill', tasks: ['code-review', 'workflow-automation'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/webapp-testing', '주요 사용자 흐름을 브라우저에서 확인하는 테스트 계획을 만들어줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/webapp-testing']) },
  { id: 'task-skill-creator-skill', name: '스킬 제작 가이드', tagline: '반복 작업을 재사용 가능한 스킬로 정리해요', description: 'Anthropic의 공개 스킬 저장소에 있는 skill 제작 가이드입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/skill-creator', tags: ['업무 자동화', '문서 작성'], kind: 'skill', tasks: ['workflow-automation', 'document-writing'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/skill-creator', '이 반복 작업을 재사용 가능한 skill의 단계와 입력으로 정리해줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/skill-creator']) },
  { id: 'task-brand-guidelines-skill', name: '브랜드 가이드 스킬', tagline: '디자인 결과물에 브랜드 기준을 적용해요', description: 'Anthropic의 공개 스킬 저장소에 있는 브랜드 가이드라인 기반 제작용 skill입니다.', serviceUrl: 'https://github.com/anthropics/skills/tree/main/skills/brand-guidelines', tags: ['발표 자료', '콘텐츠 제작'], kind: 'skill', tasks: ['presentation-design', 'content-creation'], connection: skillGuide('https://github.com/anthropics/skills/tree/main/skills/brand-guidelines', '브랜드 가이드에 맞게 이 자료의 색상과 문체를 점검해줘.'), verification: linkVerification(['https://github.com/anthropics/skills/tree/main/skills/brand-guidelines']) },
  { id: 'task-github-mcp', name: 'GitHub MCP Server', tagline: '저장소와 이슈를 에이전트 도구로 연결해요', description: 'GitHub 저장소·이슈 등 GitHub 작업을 MCP 클라이언트에 연결하는 서버입니다.', serviceUrl: 'https://github.com/github/github-mcp-server', tags: ['코드 검토', '팀 협업'], kind: 'mcp', tasks: ['code-review', 'team-collaboration'], connection: mcpGuide('https://github.com/github/github-mcp-server', ['연결한 GitHub 리소스 접근 권한; 세부 범위는 설정에 따라 달라집니다.'], ['공식 저장소에서 요구사항과 보안 안내를 확인하세요.', 'MCP 지원 클라이언트에서 공식 설치 설명을 따르고 권한 범위를 최소화하세요.', '토큰은 Gyro에 입력하지 말고 클라이언트의 안전한 자격 증명 경로에서만 설정하세요.']), verification: linkVerification(['https://github.com/github/github-mcp-server']) },
  { id: 'task-notion-mcp', name: 'Notion MCP Server', tagline: 'Notion 작업 공간을 MCP 클라이언트에 연결해요', description: 'Notion 페이지와 작업 공간에 연결하는 공개 MCP 서버입니다.', serviceUrl: 'https://github.com/makenotion/notion-mcp-server', tags: ['문서 작성', '팀 협업'], kind: 'mcp', tasks: ['document-writing', 'team-collaboration'], connection: mcpGuide('https://github.com/makenotion/notion-mcp-server', ['허용한 Notion 페이지와 작업 공간 데이터.'], ['공식 저장소의 현재 설치·인증 안내를 확인하세요.', '호환 클라이언트에서 서버를 직접 설정하고 접근 가능한 페이지를 제한하세요.', '인증 토큰은 Gyro에 입력하지 마세요.']), verification: linkVerification(['https://github.com/makenotion/notion-mcp-server']) },
  { id: 'task-playwright-mcp', name: 'Playwright MCP', tagline: '브라우저 작업을 에이전트와 연결해요', description: '브라우저 자동화 작업을 MCP 클라이언트에서 사용할 수 있게 하는 Microsoft 프로젝트입니다.', serviceUrl: 'https://github.com/microsoft/playwright-mcp', tags: ['업무 자동화', '코드 검토'], kind: 'mcp', tasks: ['workflow-automation', 'code-review'], connection: mcpGuide('https://github.com/microsoft/playwright-mcp', ['브라우저가 접근하는 웹 페이지와 로컬 브라우저 세션.'], ['공식 저장소에서 실행 요구사항과 브라우저 권한을 확인하세요.', 'MCP 지원 클라이언트에 공식 설치 안내대로 연결하세요.', '민감한 계정으로 로그인된 브라우저에서 사용하지 마세요.']), verification: linkVerification(['https://github.com/microsoft/playwright-mcp']) },
  { id: 'task-sentry-mcp', name: 'Sentry MCP', tagline: '오류와 이슈 정보를 에이전트에서 살펴봐요', description: 'Sentry 프로젝트 데이터를 MCP를 통해 조회하는 공식 서버입니다.', serviceUrl: 'https://github.com/getsentry/sentry-mcp', tags: ['코드 검토', '데이터 분석'], kind: 'mcp', tasks: ['code-review', 'data-analysis'], connection: mcpGuide('https://github.com/getsentry/sentry-mcp', ['연결한 Sentry 조직·프로젝트의 오류 및 이슈 데이터.'], ['공식 저장소에서 인증 방식과 지원 기능을 확인하세요.', 'MCP 지원 클라이언트에서 공식 설정 안내를 따르세요.', '접근 범위가 제한된 자격 증명을 사용하고 Gyro에는 공유하지 마세요.']), verification: linkVerification(['https://github.com/getsentry/sentry-mcp']) },
  { id: 'task-atlassian-mcp', name: 'Atlassian MCP Server', tagline: 'Jira와 Confluence 정보를 연결해요', description: 'Atlassian 제품을 MCP 지원 클라이언트에 연결하는 공식 서버입니다.', serviceUrl: 'https://github.com/atlassian/atlassian-mcp-server', tags: ['팀 협업', '회의 정리'], kind: 'mcp', tasks: ['team-collaboration', 'meeting-notes'], connection: mcpGuide('https://github.com/atlassian/atlassian-mcp-server', ['연결한 Jira·Confluence 사이트의 허용된 콘텐츠.'], ['공식 저장소에서 지원 제품과 인증 요구사항을 확인하세요.', 'MCP 지원 클라이언트에서 공식 연결 가이드를 따르세요.', '조직 관리자가 허용한 범위에서만 연결하고 인증 정보는 Gyro에 보내지 마세요.']), verification: linkVerification(['https://github.com/atlassian/atlassian-mcp-server']) },
  { id: 'task-slack-mcp', name: 'Slack MCP Server', tagline: 'Slack 대화와 채널 작업을 연결해요', description: 'Slack API 기반 기능을 MCP 지원 클라이언트에서 이용하도록 돕는 공개 서버입니다.', serviceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', tags: ['팀 협업', '고객 응대'], kind: 'mcp', tasks: ['team-collaboration', 'customer-support'], connection: mcpGuide('https://github.com/modelcontextprotocol/servers/tree/main/src/slack', ['선택한 워크스페이스와 승인된 채널·메시지 범위.'], ['공식 저장소의 유지 상태와 현재 설치 지침을 확인하세요.', 'MCP 클라이언트에서 지원되는 Slack 서버 구현을 선택해 설정하세요.', '워크스페이스 관리자가 승인한 최소 권한만 부여하고 토큰을 Gyro에 제공하지 마세요.']), verification: linkVerification(['https://github.com/modelcontextprotocol/servers/tree/main/src/slack']) },
  { id: 'task-postgres-mcp', name: 'PostgreSQL MCP Server', tagline: '데이터베이스 조회 흐름을 연결해요', description: 'PostgreSQL 데이터베이스와 MCP 클라이언트를 연결하는 공개 서버 구현입니다.', serviceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', tags: ['데이터 분석', '반복 보고서'], kind: 'mcp', tasks: ['data-analysis', 'report-automation'], connection: mcpGuide('https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', ['설정한 PostgreSQL 데이터베이스의 허용된 스키마와 데이터.'], ['공식 저장소의 유지 상태와 보안 요구사항을 먼저 확인하세요.', '테스트용 데이터베이스와 읽기 전용 계정으로 연결을 검토하세요.', 'DB 연결 문자열이나 비밀번호를 Gyro에 입력하지 마세요.']), verification: linkVerification(['https://github.com/modelcontextprotocol/servers/tree/main/src/postgres']) },
  { id: 'task-google-maps-mcp', name: 'Google Maps MCP Server', tagline: '장소 검색 도구를 연결해요', description: 'Google Maps Platform 기능을 MCP 클라이언트에 연결하는 공개 서버 구현입니다.', serviceUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps', tags: ['데이터 분석', '업무 자동화'], kind: 'mcp', tasks: ['data-analysis', 'workflow-automation'], connection: mcpGuide('https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps', ['장소 검색 요청과 사용량에 따른 Google Maps Platform 과금.'], ['공식 저장소와 Google Maps Platform의 최신 정책·요금·키 제한을 확인하세요.', 'MCP 클라이언트에서 공식 설치 안내를 따라 직접 연결하세요.', 'API 키는 제한된 용도로 발급하고 Gyro에 입력하지 마세요.']), verification: linkVerification(['https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps']) },
];

export const taskCatalog: CatalogService[] = entries.map((entry, index) => ({
  ...entry,
  imageUrl: '',
  audiences: ['student', 'teacher', 'parent', 'other'],
  room: '작업',
  roomKey: 'task',
  number: String(index + 1),
}));

export const TASK_OPTIONS = [
  { id: 'report-automation', label: '반복 보고서 자동화' },
  { id: 'document-writing', label: '문서 작성·정리' },
  { id: 'team-collaboration', label: '팀 협업·공유' },
  { id: 'customer-support', label: '고객 문의 응대' },
  { id: 'workflow-automation', label: '반복 업무 자동화' },
  { id: 'code-review', label: '코드 검토·테스트' },
  { id: 'meeting-notes', label: '회의·일정 정리' },
  { id: 'data-analysis', label: '데이터 분석' },
  { id: 'presentation-design', label: '발표 자료 만들기' },
  { id: 'content-creation', label: '콘텐츠 제작' },
  { id: 'ui-design', label: '화면 설계' },
  { id: 'payment-processing', label: '온라인 결제 받기' },
] as const;

export type TaskId = (typeof TASK_OPTIONS)[number]['id'];
export function isTaskId(value: unknown): value is TaskId {
  return typeof value === 'string' && TASK_OPTIONS.some((task) => task.id === value);
}
