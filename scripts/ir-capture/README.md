# IR 캡처 스크립트

로컬에서 실행 중인 Gyro(웹 `http://localhost:4173`, API `http://localhost:3001`)의 **실제 화면**을
`presentations/gyro-ir-v3/captures/`에 PNG(3200×1800, 16:9)로 저장한다. 응답을 흉내 내거나 화면을 합성하지 않는다.

| 파일 | 화면 |
| --- | --- |
| 01-landing.png | 랜딩 |
| 02-home-assistant.png | 홈 · AI 대화 입력 + 예시 문제 |
| 03-discovery-catalog.png | 발견 · 서비스 목록 |
| 04-profile.png | 카드 셔플 전 유형·관심사 선택 |
| 05-card.png | 서비스 카드 |
| 06-results.png | 관심 결과 |
| 08-chat-first-reply.png | (`--chat`) Gyro 첫 응답 |
| 09-chat-recommendations.png | (`--chat`) 추천 이유가 붙은 후보 |

- `--chat`은 API가 실제 Copilot으로 설정돼 있을 때만 쓴다. “모의 응답” 표시가 있으면 저장하지 않는다.
- 입력 문장 변경: `GYRO_CHAT_MESSAGE`, `GYRO_CHAT_FOLLOWUP` 환경 변수
- 캡처 중 클릭은 관심·랭킹 집계로 보내지 않는다(이벤트 전송 차단). 랭킹 화면은 실제 이용 데이터가 생기기 전까지 캡처하지 않는다.
- 처음 한 번: `npm install` 후 `npx playwright install chromium`
