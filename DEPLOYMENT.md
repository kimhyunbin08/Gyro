# Gyro MVP 배포 가이드

Gyro는 `apps/web` 정적 프론트엔드와 `apps/api` 백엔드를 별도 컨테이너로 배포하는 서비스 발견 MVP입니다. 웹 번들에는 API 비밀값을 넣지 않으며, 배포 시 웹 컨테이너가 `GYRO_API_URL`로 API 주소를 런타임 주입합니다.

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
- `POST /api/events`
- `POST /api/email-leads`

실제 학생 작품은 권한이 확인된 공식 링크만 카탈로그에 넣고, iframe이나 원본 복제는 사용하지 않습니다. 이메일은 결과 저장 목적과 소식 수신 동의를 분리합니다.

## 카탈로그 원본

`apps/api/src/catalog.ts`는 2026-10-10에 제공된 [바이브 벤처 전시관](https://buly.kr/450Zn6j)의 공개 API `action=all`에서 공개 전시실 4개, 작품 98개의 이름·설명·공식 링크·전시 월·번호를 추출해 생성한 파일입니다. 전시관의 학생 실명·학교 정보는 수집하지 않습니다. 원본 전시관의 작품이 추가·수정되면 카탈로그를 다시 추출하고 `npm test` 및 `azd up`을 실행합니다.
