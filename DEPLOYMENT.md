# Gyro MVP 배포 가이드

Gyro는 `apps/web` 정적 프론트엔드와 `apps/api` 백엔드를 별도 컨테이너로 배포하는 대화형 서비스 발견 앱입니다. 웹 번들에는 API 비밀값을 넣지 않으며, 배포 시 웹 컨테이너가 `GYRO_API_URL`로 API 주소를 런타임 주입합니다.

## 로컬 실행

```bash
npm ci
npm run build
docker compose up --build
```

- Web: http://localhost:3002
- API health: http://localhost:3001/health
- PostgreSQL: Docker volume `gyro-postgres`에 영속 저장됩니다.

창업가 스키마는 서버 시작 시 자동 변경되지 않습니다. 먼저 API를 빌드한 뒤 migration을 한 번 실행합니다.

```bash
npm run build
docker compose up -d database
docker compose run --build --rm api npm run db:migrate
docker compose up --build
```

애플리케이션은 `.env` 파일을 자동으로 로드하지 않습니다. 로컬 창업가 로그인을 시험하려면 실제 GitHub OAuth 앱 callback(`http://localhost:3001/api/builder/auth/github/callback`), SMTP 계정, 법적 설정을 프로세스 환경에 명시적으로 전달해야 합니다. `BUILDER_PLATFORM_ENABLED=true`, `LEGAL_REVIEW_APPROVED=true`는 완성된 약관·개인정보 처리방침과 운영자 정보를 검토한 뒤에만 사용하세요. 예시 정책 문구는 정식 법률 문서가 아니며, 빠진 설정은 창업가 기능을 비활성화합니다.

## Azure 배포

`azure.yaml`과 `infra/main.bicep`이 두 Container App, Log Analytics, 시스템 관리 ID 기반 ACR pull 구성을 정의합니다.

```bash
az login
azd env new gyro
azd env set AZURE_SUBSCRIPTION_ID "<subscription-id>"
azd env set AZURE_LOCATION koreacentral
azd up --environment gyro
```

현재 배포 환경에서는 원격 Docker 빌드와 기존 ACR(`acrdu6ob5u24hia6.azurecr.io`)을 사용합니다. ACR이 다른 리소스 그룹에 있으면 각 Container App 시스템 ID에 `AcrPull` 역할을 부여한 뒤 `azd deploy`를 실행해야 합니다.

Actions 배포도 웹 리비전에 `GYRO_API_URL`을 실제 API FQDN으로 주입합니다. 빌드 인수 `VITE_API_URL`만
설정하면 런타임 `config.json`이 기본 localhost 주소로 덮어쓰므로 충분하지 않습니다.

## 공개 API

- `GET /health`
- `GET /api/services`
- `POST /api/assistant/chat`
- `POST /api/events`
- `POST /api/email-leads`
- `/api/builder/*` (GitHub OAuth/매직 링크, 프로필, 제출·검수; 아래 필수 설정이 모두 준비된 경우에만)

실제 학생 작품은 권한이 확인된 공식 링크만 카탈로그에 넣고, iframe이나 원본 복제는 사용하지 않습니다. 이메일은 결과 저장 목적과 소식 수신 동의를 분리합니다.

### 창업가 플랫폼 출시 게이트

창업가 API는 PostgreSQL migration, HTTPS `WEB_ORIGIN`, GitHub OAuth 앱, SMTP, moderator 이메일 목록, 실제 운영 주체/연락처,
개인정보 및 이용약관 버전, AI 처리자 고지, 보유기간, 국내 법률 검토, `BUILDER_PLATFORM_ENABLED=true`와
`LEGAL_REVIEW_APPROVED=true`가 함께 준비되어야 활성화됩니다. 비밀 환경값은 GitHub/Azure secret reference로만 전달하고
웹 번들에는 넣지 않습니다. Azure Bicep은 이 외부 DB·메일·OAuth 자원을 자동으로 만들거나 자격 증명을 설정하지 않습니다.
현재 `privacy.html`/`terms.html`은 처리 흐름 설명용 초안이므로 법적 게시물이나 배포 승인으로 간주하지 마세요.

현재 배포 workflow는 이 builder 자원과 설정을 공급하지 않습니다. 운영 DB/메일/OAuth credentials 및 법률 문서가
준비되기 전에는 builder 기능을 활성화하지 말고, 필수 설정 없이 프로덕션 환경에 연결된 상태라고 주장하지 마세요.

#### 설정 사전 점검 (외부 접속 없음)

API 빌드 후, 비밀 관리 시스템에서 **API 프로세스 환경에만** 값을 주입한 상태로 실행합니다.
아래 명령은 `.env`를 자동으로 읽지 않으며 값·연결 문자열·비밀값을 출력하지 않습니다.

```bash
npm run -w apps/api build
# 준비 단계: 두 승인 플래그는 false로 유지하면서 설정 형식만 점검
npm run -w apps/api builder:preflight -- --configuration-only
# 승인 완료 후: 플래그까지 포함한 최종 설정 점검
npm run -w apps/api builder:preflight
```

점검은 항상 production 기준입니다. 누락·잘못된 이메일/포트/Origin/callback, 비검증 DB TLS,
불완전한 SMTP 인증, moderator 미지정을 종료 코드 1로 보고합니다. API의 가입 게이트도 같은 검사기를
사용합니다. 프로덕션 SMTP는 인증 및 TLS를 요구합니다(465는 implicit TLS, 그 외는 STARTTLS 필수).
DB URL에는 `sslmode` 등 `ssl*` query parameter를 넣지 않고 `DATABASE_SSL=verify`로 검증합니다.
사설 CA가 필요하면 신뢰할 CA를 Node 런타임에 공급하며 인증서 검증을 해제하지 않습니다.

종료 코드 0은 **설정 형식만** 통과한 것입니다. 실제 값의 진위, 정책 게시·법률 승인, DB migration·권한,
OAuth 앱 등록·메일 도달 여부는 검증하지 않고, 자원을 생성하거나 기능을 활성화하지 않습니다.
현재 작업에서 실제 운영자 정보·법률 승인·OAuth 앱·SMTP 계정·운영 DB는 확보/설정되지 않았습니다.

#### 운영자가 확정할 정보와 증빙

운영자 연락처 등 공개할 정보는 정책에 기재하되, 검토자의 개인정보·계약·인증 비밀은 공개 저장소/채팅에
넣지 않습니다. 다음 표는 미확정 항목이며 AI가 내용을 추정하거나 승인 완료로 대신 표시하지 않습니다.

| 항목 | 확정할 내용 / 출시 증빙 | 설정 또는 게시 위치 |
|---|---|---|
| 운영 주체 | 실제 운영 주체, 필요한 사업자 표시, 개인정보 책임자/담당 연락처, 권리 행사·신고·이의 접수 절차 | `LEGAL_OPERATOR_NAME`, `LEGAL_CONTACT_EMAIL`, 두 정책 페이지 |
| 처리 목적·근거 | 계정·인증·검수·발견 이벤트·선택적 이메일·AI별 항목, 법적 근거, 필수/선택 동의 구분 | `privacy.html`, 입력 화면 |
| 위탁·국외 이전 | DB/호스팅/SMTP/GitHub/선택 모델/폰트별 실제 업체·연락처·역할·국가·재위탁·항목·이전 시기/방법·기간·근거·거부 방법/효과 | `privacy.html`, `AI_PROCESSOR_NOTICE`, AI 요청 전 고지 |
| 보관·파기 | 계정·제출·동의·인증·이벤트·이메일·로그·백업별 기간, 파기 작업·모니터링, 법정 예외 근거 | `DATA_RETENTION_POLICY`, `privacy.html`, 운영 절차 |
| 약관 | 한정된 표시 허락, 미성년 권한 확인, 검수·정지·이의·탈퇴·분쟁·변경 고지 | `terms.html`, `TERMS_VERSION` |
| 출시 검토 | 확정 정책 버전·검토 범위·판단 근거·미해결 사항·승인일과 승인 증빙의 비공개 보관 위치 | `PRIVACY_POLICY_VERSION`, `LEGAL_REVIEW_APPROVED` |

`LEGAL_REVIEW_APPROVED=true`는 검토 완료 증빙을 확인한 운영자의 승인 표현이며, AI 초안·설정 검사·테스트
성공으로 자동 부여하지 않습니다. 정책 버전 문자열과 환경변수를 채워도 정적 `privacy.html`/`terms.html`의
초안 문구는 바뀌지 않습니다. 최종 내용을 페이지에 실제 반영하고 버전·시행일·변경 이력을 일치시켜야 합니다.

#### 프로덕션 연결 순서 (승인 전 가입 차단 유지)

1. 대상 환경과 Web/API 도메인을 확정합니다. `BUILDER_PLATFORM_ENABLED=false`,
   `LEGAL_REVIEW_APPROVED=false`를 유지하고 운영 비용·DB/메일 처리 지역을 먼저 확인합니다.
   세션 쿠키가 `SameSite=Lax`이므로 Web/API는 동일 site의 HTTPS 도메인으로 구성합니다.
   서로 다른 site에서는 쿠키가 차단될 수 있으며 CORS 허용만으로 해결되지 않습니다.
2. PostgreSQL은 비공개 접근·TLS·백업/PITR·복구 시험·권한 분리를 설정합니다. migration용 자격 증명으로
   `npm run -w apps/api db:migrate`를 명시 실행하고 `schema_migrations`의 `001_builder_platform` 및
   모든 테이블을 확인합니다. API에는 스키마 생성 권한 없는 최소 실행 권한만 부여합니다.
   DB를 환경에 연결하면 발견 API도 승인 카탈로그를 조회하므로 **migration 전에 API에 연결하지 않습니다**.
3. GitHub Settings → Developer settings → OAuth Apps에서 환경별 앱을 등록합니다. Homepage는 Web,
   callback은 API의 `https://<API-domain>/api/builder/auth/github/callback`과 정확히 일치시킵니다.
   OAuth client secret은 Copilot용 PAT와 다릅니다. 로그인 범위는 `read:user user:email`이며 repo 권한을
   추가하지 않습니다. 실제 연결 확인은 검증된 primary email 계정으로 수행합니다.
4. SMTP 공급자에서 발송 도메인과 발신 주소를 인증하고 SPF/DKIM/DMARC·발송 한도·배달 실패 확인 절차를
   준비합니다. `SMTP_HOST/PORT/USER/PASSWORD/FROM`을 설정하고 테스트 수신함으로 링크 도달·15분 만료·
   1회 사용을 확인합니다. 로그인 메일은 마케팅 동의를 요구하거나 마케팅 수신자 목록에 추가하지 않습니다.
5. DB URL, OAuth secret, SMTP 자격 증명은 Azure Key Vault/Container App secret reference로 API에만
   주입합니다. 일반 설정도 API 환경에 명시적으로 연결합니다. GitHub Actions secret을 등록하는 것만으로
   현재 workflow가 builder 설정을 전달하지는 않습니다. 웹의 `VITE_*`, 이미지 build args, 로그에 넣지 않습니다.
   moderator allowlist는 실제 인증 가능한 담당 계정 이메일로 제한하고 접근·회수·교체 절차를 확인합니다.
6. 격리된 테스트 환경에서 설정 점검·인증·CSRF·내 제출 소유권·검수 승인/정지·계정/제출 삭제·백업 복구를
   확인합니다. 운영 로그에서 OAuth code/state·메일 링크·대화·이메일 원문이 수집되지 않게 프록시/진단 설정도
   확인합니다. `/health` 성공은 DB/메일/OAuth 정상이나 법률 승인 증빙이 아닙니다.
7. 최종 정책 게시와 검토 증빙이 모두 확보된 후에만 두 승인 플래그를 활성화하고 최종 사전 점검 및
   `GET /api/builder/auth/providers`의 `enabled/github/email=true`를 확인합니다. 실제 로그인·삭제까지 확인해
   출시합니다. 장애 시 `BUILDER_PLATFORM_ENABLED=false`로 신규 로그인/쓰기부터 차단하며, 이 스위치는 이미
   승인된 공개 카탈로그의 긴급 비공개를 대신하지 않습니다(항목 정지/별도 대응 필요).

#### 정책 초안 대조 검토

로그인 유무가 아니라 실제 개인정보 처리에 따라 고지·적법 근거를 판단합니다. 참고 원문은
[개인정보 보호법 제30조](https://www.law.go.kr/법령/개인정보보호법/제30조)(처리방침),
[제28조의8](https://www.law.go.kr/법령/개인정보보호법/제28조의8)(국외 이전)입니다.
이는 특정 사업의 법률 적합성 판단이나 모든 처리에 일괄 동의가 필요하다는 결론이 아닙니다.
로그인 없는 발견 기능에도 이메일·의견·접속 정보·AI 전송·외부 폰트 요청을 검토해야 합니다.

현재 구현과 초안을 대조했을 때 아래는 출시 전 남아 있는 조건입니다.

- 인증 만료(15분/10분/7일)는 물리적 파기 기한이 아닙니다. 만료 행 정리는 후속 인증 요청에 의존하므로,
  트래픽이 없어도 동작하는 정리와 백업/로그 삭제를 운영 절차로 준비해야 합니다.
- 탈퇴의 FK 연쇄 삭제는 계정 외부의 로그인 토큰·메일 공급자 기록·백업까지 삭제하지 않습니다.
  실제 파기 범위와 복원 후 재삭제를 확인해야 하며 “탈퇴 즉시 모든 사본 삭제”라고 고지하지 않습니다.
- 일반 이메일 리드는 정규화 이메일 중복 방지만 저장하며 소식 수신 동의·시각은 보존하지 않습니다.
  인증용 SMTP를 설정했다고 마케팅 발송을 시작할 수 없습니다.
- 방침 열람 확인은 모든 처리의 포괄 동의가 아니며, 국외 이전의 법적 근거와 필요한 별도 고지를
  실제 공급자 계약에 맞춰 확정해야 합니다. 미성년자의 제출 권리 허락 검토도 아직 완료되지 않았습니다.

## 대화형 AI 설정

`POST /api/assistant/chat`은 GitHub Copilot SDK를 API 서버에서만 호출합니다. Azure OpenAI 리소스는
필요하지 않지만, 기존 Azure 컨테이너 실행료는 그대로 발생합니다. Node.js ^20.19 또는 >=22.12가 필요하며
SDK와 함께 설치되는 플랫폼별 런타임을 사용합니다. optional dependencies를 제외하지 마세요.

### 로컬 개발

본인 Copilot 이용권이 있는 GitHub 계정으로 `gh auth login`한 뒤 계정에서 허용된 모델 ID를 지정합니다.
`.env`를 자동 로드하지 않으므로 다음 환경 변수를 명시적으로 전달합니다.

```bash
NODE_ENV=development GYRO_ASSISTANT_PROVIDER=copilot-local COPILOT_MODEL="<allowed-model-id>" npm run dev:api
npm run dev:web
```

로컬 모드는 API를 `127.0.0.1`에만 바인딩하며 AI 요청의 실제 소켓 주소·Host·Origin을 검사합니다.
외부 프록시나 공개 컨테이너에서는 이 모드를 사용하지 마세요.

### GitHub Actions로 공개 서버 PAT 주입

1. Copilot 이용권이 있는 계정에서 **fine-grained PAT**를 발급하고 계정 권한 **Copilot Requests**를
   허용합니다. classic PAT(`ghp_`)는 지원하지 않습니다. 조직 정책에 따라 추가 승인이나 모델 제한이
   있을 수 있습니다. 토큰에는 불필요한 저장소 권한을 부여하지 마세요.
2. 저장소 Settings → Secrets and variables → Actions에서 `COPILOT_GITHUB_TOKEN` **secret**에 PAT를,
   `COPILOT_MODEL` **variable**에 허용된 모델 ID를 등록합니다. 환경별로 분리하려면 워크플로가 사용하는
   `staging`/`production` environment에 같은 이름으로 등록합니다. PAT를 채팅·소스·웹 변수로 전달하지 마세요.
3. 기존 Azure OIDC secrets(`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)와 배포 대상
   리소스 그룹·앱을 확인한 뒤 main에 병합합니다. 워크플로의 production 대상은
   `rg-production`의 `ca-api-du6ob5u24hia6`/`ca-web-du6ob5u24hia6`입니다.
   `rg-gyro`의 `gyro-api`/`gyro-web`은 별도 환경이며 이 워크플로가 자동 갱신하지 않습니다.
4. `.github/scripts/configure-copilot.sh`가 PAT를 API의 `copilot-github-token` secret에 저장하고
   `COPILOT_GITHUB_TOKEN=secretref:copilot-github-token`, `COPILOT_MODEL`,
   `GYRO_ASSISTANT_PROVIDER=copilot`, `NODE_ENV=production`을 설정합니다. 출력은 숨기며 PAT를
   이미지 빌드 인수·`GITHUB_ENV`·웹 컨테이너로 전달하지 않습니다. 설정 누락은 배포 실패로 표시합니다.
5. PAT 만료·회수 전 새 토큰으로 Actions secret을 교체하고 재배포해 리비전을 갱신합니다.
   공개 서버는 명시적으로 주입된 PAT만 사용하고 로컬 로그인이나 Actions 기본 `GITHUB_TOKEN`으로
   대체하지 않습니다. 인증 오류는 사용자에게 `503`/`502`로 표시합니다.

Copilot SDK는 인증 계정의 사용량·과금·조직 정책을 따릅니다. 조직 Business 이용권이 공개 서비스
운영까지 허용한다는 의미는 아니므로 운영자가 허용 범위와 초과 사용 예산을 확인해야 합니다.
IP별 15분당 12회 및 프로세스당 한 건 제한은 비용 상한이 아닙니다. 다중 복제본에서도 적용되는
GitHub 사용량 예산·알림을 설정하세요.

사용자가 동의한 대화·공개 GitHub 설명/언어/README는 GitHub Copilot 및 선택한 모델 제공자에게
전송됩니다. SDK 기본 도구·셸·MCP·스킬을 비활성화하고 모든 도구 권한을 거부합니다. SDK는 요청별
임시 디렉터리에서 실행하며 성공·실패 후 런타임을 종료하고 대화 상태를 삭제합니다.
프로세스 강제 종료 시 운영체제 임시 영역에 잔여 파일이 남을 수 있으므로 호스트 임시 저장소의 수명·
정리 정책도 적용하세요. 사용자에게 개인정보·비밀번호·API 키를 입력하지 않도록 안내합니다.

참고: [SDK 인증](https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md),
[SDK 사용량](https://github.com/github/copilot-sdk#how-does-billing-work-for-sdk-usage).

## 카탈로그 원본

API 실행 직후와 10분마다 전체 셔플의 원본 URL을 자동 점검합니다(동시 최대 5개). 정상 리다이렉트의
최종 URL은 카드·결과·랭킹·이미지 조회에 자동 반영되고, 실패한 서비스는 새 카드 목록에서 제외됩니다.
이동·실패는 API 로그의 `Catalog health check`에서 확인할 수 있습니다. 카탈로그 파일은 수정하지
않으며 점검 상태는 프로세스별 메모리에만 저장됩니다. 재시작 시 원본부터 다시 확인합니다.
Azure API의 최소 복제본을 1로 유지하므로 방문자가 없어도 점검할 수 있지만 상시 실행 비용이
발생합니다. 다중 복제본은 독립적으로 점검하며, 중지 기간을 소급 점검하지 않습니다.

`apps/api/src/catalog.ts` 및 `apps/api/src/catalogs/`는 검수된 데이터 원본이며 항목 수 상한은 없습니다. 서비스 후보는 공식 API·허용된 공개 피드·공식 사이트/문서·공개 저장소 등 합법적인 경로에서 조사하고, 출처·라이선스·유지 상태를 사람이 확인한 뒤 변경 PR로 등록합니다. Product Hunt·LinkedIn·X·Threads의 ToS 위반 크롤링이나 검수 없는 자동 게시를 하지 않습니다.
