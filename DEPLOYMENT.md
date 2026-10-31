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
- 빌더 인증·서비스 제출/수정·대시보드·관리 API와 공개 댓글은 TRD §13의 경로를 참고한다.

실제 학생 작품은 권한이 확인된 공식 링크만 카탈로그에 넣고, iframe이나 원본 복제는 사용하지 않습니다. 이메일은 결과 저장 목적과 소식 수신 동의를 분리합니다.

## 빌더 포털 설정 및 공개 전 검토

빌더 포털은 API에 아래 설정이 있을 때만 작동합니다. `DATABASE_URL`이 없으면 기존 공개 발견 기능은
계속 동작하고, 빌더/댓글 API는 `503`으로 비활성 상태를 반환합니다.

- `DATABASE_URL`: private networking/firewall로 API Container App의 outbound만 허용하는 PostgreSQL 연결 문자열.
- `AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING` 및 `AZURE_COMMUNICATION_EMAIL_SENDER`: 검증된 Azure
  Communication Services Email 발신자 설정. 발신 도메인/주소 검증을 마친 뒤 연결합니다.
- `WEB_ORIGIN`: 웹앱의 정확한 Origin (`https://...`, 경로/끝 `/` 없이). 매직링크와 쿠키 기반 인증에 사용합니다.
- `BUILDER_ADMIN_TOKEN`: 충분히 긴 임의 관리자 비밀값. Container App secret으로 저장하고 웹 번들이나 일반 환경 변수로
  노출하지 않습니다.

현재 `infra/main.bicep`은 PostgreSQL 및 이메일 리소스를 프로비저닝하지 않습니다. 운영 배포 전에 별도 Azure
리소스와 안전한 네트워크 경계를 준비하고, 연결 문자열·메일 비밀·관리자 토큰을 API Container App secret으로
등록해야 합니다. 공개 DB 방화벽에 전체 인터넷이나 광범위한 Azure 주소를 허용하지 마세요. 개발용 `.env`에는
실제 비밀을 입력하지 말고 로컬 secret store를 사용하세요.

기능 배포와 공개 허가는 별개입니다. 공개 전 `VIBE_VENTURE_REVIEW_QUESTIONS.md`의 학생 저작권/공개 권한,
미성년자 계정·댓글, 개인정보 처리 역할 및 보존/삭제, 댓글 신고·삭제 운영 질문을 바이브벤처 담당자와
법률 담당자에게 확인하세요. [`docs/TERMS_DRAFT.md`](docs/TERMS_DRAFT.md) 및
[`docs/PRIVACY_POLICY_DRAFT.md`](docs/PRIVACY_POLICY_DRAFT.md)의 미확정 항목을 해결하고 법률 승인을 받은 뒤
게시하며, 운영 대응 절차도 확정해야 합니다. `docs/PRODUCT_OVERVIEW.md`는 현재 제품 범위와 미승격 아이디어를
요약합니다.

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
