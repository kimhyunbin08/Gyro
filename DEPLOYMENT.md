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

## 공개 API

- `GET /health`
- `GET /api/services`
- `POST /api/assistant/chat`
- `POST /api/events`
- `POST /api/email-leads`

실제 학생 작품은 권한이 확인된 공식 링크만 카탈로그에 넣고, iframe이나 원본 복제는 사용하지 않습니다. 이메일은 결과 저장 목적과 소식 수신 동의를 분리합니다.

## 대화형 AI 설정

`POST /api/assistant/chat`은 Azure OpenAI 배포가 API 서버에 설정된 경우에만 동작합니다. 다음 값을 `api`
Container App의 환경 변수로 설정하세요.

- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 리소스 endpoint
- `AZURE_OPENAI_DEPLOYMENT`: 배포된 모델의 deployment 이름
- `AZURE_OPENAI_API_VERSION`: 선택 항목, 생략 시 기본값 `2024-10-21` 사용
- `AZURE_OPENAI_API_KEY`: Container Apps secret으로 저장하고, 환경 변수는 해당 secret reference를 가리키도록 설정

키를 웹 앱 환경 변수나 정적 파일에 넣지 마세요. Azure OpenAI 요청에는 사용자가 동의한 채팅 내용과 선택한
공개 GitHub 저장소의 설명·언어·README가 포함될 수 있습니다. 대화와 저장소 내용은 Gyro에 저장하지 않으며,
사용자에게 비밀번호·API 키·개인정보를 입력하지 말라고 안내합니다. Azure 모델 배포의 사용량·비용 알림도
별도로 설정해야 합니다.

## 카탈로그 원본

API 실행 직후와 10분마다 전체 셔플의 원본 URL을 자동 점검합니다(동시 최대 5개). 정상 리다이렉트의
최종 URL은 카드·결과·랭킹·이미지 조회에 자동 반영되고, 실패한 서비스는 새 카드 목록에서 제외됩니다.
이동·실패는 API 로그의 `Catalog health check`에서 확인할 수 있습니다. 카탈로그 파일은 수정하지
않으며 점검 상태는 프로세스별 메모리에만 저장됩니다. 재시작 시 원본부터 다시 확인합니다.
Azure API의 최소 복제본을 1로 유지하므로 방문자가 없어도 점검할 수 있지만 상시 실행 비용이
발생합니다. 다중 복제본은 독립적으로 점검하며, 중지 기간을 소급 점검하지 않습니다.

`apps/api/src/catalog.ts` 및 `apps/api/src/catalogs/`는 검수된 데이터 원본이며 항목 수 상한은 없습니다. 서비스 후보는 공식 API·허용된 공개 피드·공식 사이트/문서·공개 저장소 등 합법적인 경로에서 조사하고, 출처·라이선스·유지 상태를 사람이 확인한 뒤 변경 PR로 등록합니다. Product Hunt·LinkedIn·X·Threads의 ToS 위반 크롤링이나 검수 없는 자동 게시를 하지 않습니다.
