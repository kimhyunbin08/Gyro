// `tier` only applies to theme shuffles (sns/dating/productivity/game): prd.md §9-4 #7's
// mainstream/emerging split. It's optional because the vibe-venture catalog has no such
// concept; absent entries are treated as 'mainstream' (see shuffles.ts#filterByTier).
export type CatalogKind = 'product' | 'service' | 'skill' | 'mcp';
export type ConnectionGuide = {
  agents: { name: string; versionNote?: string }[];
  transport?: 'stdio' | 'http' | 'sse';
  runtime?: 'local' | 'remote';
  auth?: 'none' | 'api_key' | 'oauth' | 'unknown';
  permissions: string[];
  installSteps: string[];
  exampleUsage?: string;
  docsUrl: string;
};
export type ServiceVerification = {
  level: 'link' | 'docs' | 'install';
  verifiedAt?: string;
  environment?: string;
  sources: string[];
};
export type CatalogService = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  serviceUrl: string;
  tags: string[];
  audiences: ('student'|'teacher'|'parent'|'other')[];
  room: string;
  roomKey: string;
  number: string;
  tier?: 'mainstream'|'emerging';
  kind?: CatalogKind;
  tasks?: string[];
  connection?: ConnectionGuide;
  verification?: ServiceVerification;
};

export const catalog: CatalogService[] = [
  {
    "id": "2026-06-1",
    "name": "영공이",
    "tagline": "이 앱은 학교 생활에 필요한 기능을 한 곳에 모은 학생용 앱입니다",
    "description": "이 앱은 학교 생활에 필요한 기능을 한 곳에 모은 학생용 앱입니다. 시간표, 급식, 공지, 출결, 동아리, 시설 예약 같은 정보를 쉽고 빠르게 확인할 수 있도록 만들었습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://stvibeventure21654.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://stvibeventure21654.z12.web.core.windows.net/",
    "tags": [
      "학습",
      "창작",
      "생활",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "1"
  },
  {
    "id": "2026-06-2",
    "name": "bidardo",
    "tagline": "옥외광고매체 판매, 관리, 구매, 부스팅 등",
    "description": "옥외광고매체 판매, 관리, 구매, 부스팅 등",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-web-hyunbin-e2-1-l2n3vima-v4.calmmeadow-ba80a880.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-web-hyunbin-e2-1-l2n3vima-v4.calmmeadow-ba80a880.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "2"
  },
  {
    "id": "2026-06-3",
    "name": "CAN",
    "tagline": "이 앱은 명언으로 여러 동기부여를 해주는 앱입니다",
    "description": "이 앱은 명언으로 여러 동기부여를 해주는 앱입니다. 오늘의 명언으로 하루를 시작하고, 감정상태에 맞는 명언을 추천받고, 알람과 커뮤니티 기능을 포함합니다. *구글 로그인 지원*",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://canweb125962.z7.web.core.windows.net/?w=1200",
    "serviceUrl": "https://canweb125962.z7.web.core.windows.net/",
    "tags": [
      "창작",
      "협업",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "3"
  },
  {
    "id": "2026-06-4",
    "name": "School Log X",
    "tagline": "School Log X는 학교 생활 기록을 자동화하고 경험치·레벨·성장 그래프로 학업 동기를 높여주는 올인원 성장 관리 앱입니다",
    "description": "School Log X는 학교 생활 기록을 자동화하고 경험치·레벨·성장 그래프로 학업 동기를 높여주는 올인원 성장 관리 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://icy-tree-0897f3900.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://icy-tree-0897f3900.7.azurestaticapps.net",
    "tags": [
      "학습",
      "생산성",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "4"
  },
  {
    "id": "2026-06-5",
    "name": "킵잇",
    "tagline": "이앱은공부용도",
    "description": "이앱은공부용도",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://frontend.blackpond-7507d149.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://frontend.blackpond-7507d149.koreacentral.azurecontainerapps.io/",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "5"
  },
  {
    "id": "2026-06-6",
    "name": "내 계좌 자산 도우미",
    "tagline": "내 계좌와 연동해 소비 시 캐릭터·식물의 HP가 줄고, 미션 성공률 기반으로 랭킹이 매겨지는 앱입니다",
    "description": "내 계좌와 연동해 소비 시 캐릭터·식물의 HP가 줄고, 미션 성공률 기반으로 랭킹이 매겨지는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-danker-e2-20260601-web.salmonforest-66a190e0.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-danker-e2-20260601-web.salmonforest-66a190e0.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "6"
  },
  {
    "id": "2026-06-7",
    "name": "newmap",
    "tagline": "지하나 산 같이 지도에 없는 경로를 직접 만들어가며 장소를 등록할 수 있는 앱입니다",
    "description": "지하나 산 같이 지도에 없는 경로를 직접 만들어가며 장소를 등록할 수 있는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://newmapweb06211053.azurewebsites.net/?w=1200",
    "serviceUrl": "https://newmapweb06211053.azurewebsites.net/",
    "tags": [
      "창작",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "7"
  },
  {
    "id": "2026-06-8",
    "name": "MAITO",
    "tagline": "팀원 매칭부터 협업, 완주 후 포트폴리오 등록까지 연결하는 사이드프로젝트 플랫폼입니다",
    "description": "팀원 매칭부터 협업, 완주 후 포트폴리오 등록까지 연결하는 사이드프로젝트 플랫폼입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://blue-dune-090954c00.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://blue-dune-090954c00.7.azurestaticapps.net",
    "tags": [
      "협업",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "8"
  },
  {
    "id": "2026-06-9",
    "name": "Fit Check",
    "tagline": "물 마시기, 10분 걷기, 식단 기록하기 3가지 체크리스트로 건강을 간단히 기록하는 웹 앱입니다",
    "description": "물 마시기, 10분 걷기, 식단 기록하기 3가지 체크리스트로 건강을 간단히 기록하는 웹 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://fitcheckapi5525.azurewebsites.net/?w=1200",
    "serviceUrl": "https://fitcheckapi5525.azurewebsites.net/",
    "tags": [
      "생산성",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "9"
  },
  {
    "id": "2026-06-10",
    "name": "독서 앱(임시)",
    "tagline": "책을 짧고 재밌게 읽을 수 있는 앱입니다",
    "description": "책을 짧고 재밌게 읽을 수 있는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://reading-app-viveventure202606-web.azurewebsites.net?w=1200",
    "serviceUrl": "https://reading-app-viveventure202606-web.azurewebsites.net",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "10"
  },
  {
    "id": "2026-06-11",
    "name": "스쿨줍줍",
    "tagline": "분실물을 등록하고 카테고리별로 분류해 찾을 수 있게 연결해주는 앱입니다",
    "description": "분실물을 등록하고 카테고리별로 분류해 찾을 수 있게 연결해주는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://app-shcoollfind-ginzls2fn6plo.azurewebsites.net/?w=1200",
    "serviceUrl": "https://app-shcoollfind-ginzls2fn6plo.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "11"
  },
  {
    "id": "2026-06-12",
    "name": "푸드클리너",
    "tagline": "냉장고 사진 한 장으로 식재료를 인식해 요리를 추천해주는 AI 요리 도우미 서비스입니다",
    "description": "냉장고 사진 한 장으로 식재료를 인식해 요리를 추천해주는 AI 요리 도우미 서비스입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://foodcleaner-33759.azurewebsites.net/?w=1200",
    "serviceUrl": "https://foodcleaner-33759.azurewebsites.net/",
    "tags": [
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "12"
  },
  {
    "id": "2026-06-13",
    "name": "오답똑똑",
    "tagline": "수작업 오답노트의 불편함을 해소한 온라인 오답노트로, 과목·단원별 분류와 주기적 복습을 지원합니다",
    "description": "수작업 오답노트의 불편함을 해소한 온라인 오답노트로, 과목·단원별 분류와 주기적 복습을 지원합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://icy-meadow-019342f00.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://icy-meadow-019342f00.7.azurestaticapps.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "13"
  },
  {
    "id": "2026-06-14",
    "name": "스마트 스케줄 노티스 (SSN)",
    "tagline": "선생님이 입력한 공지를 교실 화면에 크게 보여주고 음성으로도 안내하는 교실용 자동 안내판입니다",
    "description": "선생님이 입력한 공지를 교실 화면에 크게 보여주고 음성으로도 안내하는 교실용 자동 안내판입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ssn63019922.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://ssn63019922.z12.web.core.windows.net/",
    "tags": [
      "학습",
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "14"
  },
  {
    "id": "2026-06-15",
    "name": "Readier",
    "tagline": "이동시간과 사용자 패턴을 분석해 준비시간까지 알려주는 약속시간 관리 앱입니다",
    "description": "이동시간과 사용자 패턴을 분석해 준비시간까지 알려주는 약속시간 관리 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://readier-web-6245.azurewebsites.net/?w=1200",
    "serviceUrl": "https://readier-web-6245.azurewebsites.net/",
    "tags": [
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "15"
  },
  {
    "id": "2026-06-16",
    "name": "영공이",
    "tagline": "학교 생활에 필요한 시간표·급식·공지·출결·동아리·시설 예약 기능을 모은 학생용 앱입니다",
    "description": "학교 생활에 필요한 시간표·급식·공지·출결·동아리·시설 예약 기능을 모은 학생용 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://stvibeventure21654.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://stvibeventure21654.z12.web.core.windows.net/",
    "tags": [
      "학습",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "16"
  },
  {
    "id": "2026-06-17",
    "name": "패밀리톡",
    "tagline": "가족 일정 공유와 투표로 갈등과 오해를 줄여주는 가족 소통 앱입니다",
    "description": "가족 일정 공유와 투표로 갈등과 오해를 줄여주는 가족 소통 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://delightful-sea-0ee597900.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://delightful-sea-0ee597900.7.azurestaticapps.net",
    "tags": [
      "생산성",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "17"
  },
  {
    "id": "2026-06-18",
    "name": "Virture Program Runner, VPR",
    "tagline": "18개 정도의 프로그래밍 언어를 웹에서 사용해볼 수 있고 AI·에러 수정기 기능도 포함된 베타 서비스입니다",
    "description": "18개 정도의 프로그래밍 언어를 웹에서 사용해볼 수 있고 AI·에러 수정기 기능도 포함된 베타 서비스입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://vpr-test-260620121649.azurewebsites.net?w=1200",
    "serviceUrl": "https://vpr-test-260620121649.azurewebsites.net",
    "tags": [
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "18"
  },
  {
    "id": "2026-06-19",
    "name": "학급 공알",
    "tagline": "학급방을 만들어 선생님·반장이 공지사항을 전달하는 애플리케이션입니다",
    "description": "학급방을 만들어 선생님·반장이 공지사항을 전달하는 애플리케이션입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://proud-glacier-0878f7900.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://proud-glacier-0878f7900.7.azurestaticapps.net",
    "tags": [
      "학습",
      "창작"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "19"
  },
  {
    "id": "2026-06-20",
    "name": "급식GO!",
    "tagline": "급식 투표와 결과 표시, 급식 시작까지 남은 시간을 보여주는 급식 앱입니다",
    "description": "급식 투표와 결과 표시, 급식 시작까지 남은 시간을 보여주는 급식 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://meal-go-app.azurewebsites.net?w=1200",
    "serviceUrl": "https://meal-go-app.azurewebsites.net",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "20"
  },
  {
    "id": "2026-06-21",
    "name": "우리동네스마트건강지도",
    "tagline": "동네 건강 위험수치와 병원 대기시간을 알려주고 증상에 맞는 병원을 추천하는 앱입니다",
    "description": "동네 건강 위험수치와 병원 대기시간을 알려주고 증상에 맞는 병원을 추천하는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://shm260620102228khajr.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://shm260620102228khajr.z12.web.core.windows.net/",
    "tags": [
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "21"
  },
  {
    "id": "2026-06-22",
    "name": "버스 도우미",
    "tagline": "버스 탑승 전 몇 명이 타고 있는지 알 수 있게 해주는 어르신·어린이용 앱입니다",
    "description": "버스 탑승 전 몇 명이 타고 있는지 알 수 있게 해주는 어르신·어린이용 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://bushelper641710.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://bushelper641710.z12.web.core.windows.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "22"
  },
  {
    "id": "2026-06-23",
    "name": "백준기 sns 앱",
    "tagline": "바이브벤처에서 만든 서비스",
    "description": "바이브벤처에서 만든 서비스예요.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://bjgaiprject.web.app/?w=1200",
    "serviceUrl": "https://bjgaiprject.web.app/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "6월",
    "roomKey": "2026-06",
    "number": "23"
  },
  {
    "id": "2026-07-1",
    "name": "스마트 스케줄 노티스",
    "tagline": "선생님 화면 앱은 교실 공지를 관리하는 관리자용 화면입니다",
    "description": "선생님 화면 앱은 교실 공지를 관리하는 관리자용 화면입니다.\n 쉽게 말해, 선생님이 공지판 내용을 정리하고 보내는 \"운영실\" 같은 역할을 합니다.\n 선생님 화면이 하는 일\n 시간표 관리: 반별 시간표를 등록하고 수정합니다. 엑셀 파일로 한 번에 불러올 수 있습니다. 시간표가 있으면 공지를 교시와 연결해 더 정확하게 보낼 수 있습니다.\n 공지 작성과 전송: 반, 날짜, 교시, 과목, 내용, 중요도를 입력해 공지를 만듭니다. 만든 공지는 학생 화면으로 전달됩니다. 공지 수정/삭제도 선생님 화면에서 처리합니다.\n 공지 우선순위 관리: 일반 안내와 중요 공지를 구분합니다. 중요 공지는 학생에게 먼저 보이도록 우선 전달됩니다.\n 현재 공지 미리보기: 학생이 보게 될 공지를 선생님 화면 왼쪽 큰 영역에서 바로 확인할 수 있습니다. 자동 전환(공지 순환), 중지, 다시 듣기(음성) 같은 표시 제어도 여기서 합니다.\n 날짜 기반 공지 관리: 달력/날짜 선택으로 특정 날짜 공지를 확인합니다. 오늘 공지뿐 아니라 지난 날짜, 미래 날짜 공지도 미리 등록 가능합니다.\n 운영 상태 확인: 동기화 상태 메시지로 앱이 정상 동작하는지 확인합니다. 오류가 생기면 안내 문구를 통해 바로 알 수 있습니다.\n 한 줄 요약: 선생님 화면은 \"시간표 + 공지 + 전송\"을 한 곳에서 처리하는 교실 공지 운영용 관리자 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ssnstatic504431.z12.web.core.windows.net/index.html?w=1200",
    "serviceUrl": "https://ssnstatic504431.z12.web.core.windows.net/index.html",
    "tags": [
      "학습",
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "1"
  },
  {
    "id": "2026-07-2",
    "name": "스마트 스케줄 노티즈",
    "tagline": "학생이 보는 전자 공지판 화면으로, 공지와 오늘 시간표를 크게 보여주며 선생님 화면과 연동되어 공지 등록·수정 내용이 반영됩니다",
    "description": "학생이 보는 전자 공지판 화면으로, 공지와 오늘 시간표를 크게 보여주며 선생님 화면과 연동되어 공지 등록·수정 내용이 반영됩니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ssnstatic504431.z12.web.core.windows.net/student.html?w=1200",
    "serviceUrl": "https://ssnstatic504431.z12.web.core.windows.net/student.html",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "2"
  },
  {
    "id": "2026-07-3",
    "name": "future letter",
    "tagline": "Future Letter는 고민을 입력하면 AI가 미래의 나처럼 답장을 보내주는 앱입니다",
    "description": "Future Letter는 고민을 입력하면 AI가 미래의 나처럼 답장을 보내주는 앱입니다. 마음에 드는 답장은 타임캡슐에 저장하고 공유·복사·재생성할 수 있으며, 임시저장 기능도 제공합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://futureletter74262.azurewebsites.net?w=1200",
    "serviceUrl": "https://futureletter74262.azurewebsites.net",
    "tags": [
      "협업",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "3"
  },
  {
    "id": "2026-07-4",
    "name": "코코파우",
    "tagline": "가지고 있는 화장품을 온라인에서 확인하고 유통기한을 관리할 수 있는 앱입니다",
    "description": "가지고 있는 화장품을 온라인에서 확인하고 유통기한을 관리할 수 있는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://cocopaustkue03q.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://cocopaustkue03q.z12.web.core.windows.net/",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "4"
  },
  {
    "id": "2026-07-5",
    "name": "HomeStock",
    "tagline": "HomeStock은 휴지·세제·샴푸 등 생활용품 재고를 관리하고 부족해지기 전에 장보기 리스트를 만들어주는 앱입니다",
    "description": "HomeStock은 휴지·세제·샴푸 등 생활용품 재고를 관리하고 부족해지기 전에 장보기 리스트를 만들어주는 앱입니다. 가족과 함께 재고를 관리하고 AI 도우미의 구매 추천을 받을 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://homestock61555.azurewebsites.net/?w=1200",
    "serviceUrl": "https://homestock61555.azurewebsites.net/",
    "tags": [
      "생산성",
      "창작",
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "5"
  },
  {
    "id": "2026-07-6",
    "name": "직업 환경 추천자",
    "tagline": "활동적인 직업과 그렇지 않은 직업 중 선택하고 환경 및 20개 문항에 답하면 자신에게 맞는 직업 TOP5와 상세 직업 정보를 추천해주는 앱입니다",
    "description": "활동적인 직업과 그렇지 않은 직업 중 선택하고 환경 및 20개 문항에 답하면 자신에게 맞는 직업 TOP5와 상세 직업 정보를 추천해주는 앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://july-project.calmriver-3057d1c6.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://july-project.calmriver-3057d1c6.koreacentral.azurecontainerapps.io/",
    "tags": [
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "6"
  },
  {
    "id": "2026-07-7",
    "name": "HabitQuest",
    "tagline": "학부모를 위한 보드게임 형식의 할 일 관리 앱입니다",
    "description": "학부모를 위한 보드게임 형식의 할 일 관리 앱입니다. 아이가 할 일을 완료하면 보석을 얻고 보상으로 교환할 수 있으며, 부모님만 접근할 수 있는 관리 화면에서 할 일 사진을 확인하고 체크할 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://thankful-hill-00146de00.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://thankful-hill-00146de00.7.azurestaticapps.net/",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "7"
  },
  {
    "id": "2026-07-8",
    "name": "빨래도우미",
    "tagline": "빨래를 도와주는 애플리케이션으로, 지역별 날씨·강수확률·강수량·습도·미세먼지 정보를 알려주고 실내 건조를 추천합니다",
    "description": "빨래를 도와주는 애플리케이션으로, 지역별 날씨·강수확률·강수량·습도·미세먼지 정보를 알려주고 실내 건조를 추천합니다. 빨래 계획, 옷 소재별 세탁 방법, 세제·유연제 재고 관리와 가족 간 계획 공유를 지원합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://blue-flower-0c0cf4a00.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://blue-flower-0c0cf4a00.7.azurestaticapps.net",
    "tags": [
      "생산성",
      "생활",
      "협업",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "8"
  },
  {
    "id": "2026-07-9",
    "name": "스쿨줍줍",
    "tagline": "학교에서 분실물을 등록하고 찾는 앱",
    "description": "학교에서 분실물을 등록하고 찾는 앱",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://app-shcoollfind-ginzls2fn6plo.azurewebsites.net?w=1200",
    "serviceUrl": "https://app-shcoollfind-ginzls2fn6plo.azurewebsites.net",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "9"
  },
  {
    "id": "2026-07-10",
    "name": "Readier 일정 준비시간 알리미",
    "tagline": "사용자의 정보를 참고하여 준비시간을 계산하고, 약속 일정에 맞춰 이동시간까지 계산해 알려주는 웹앱입니다",
    "description": "사용자의 정보를 참고하여 준비시간을 계산하고, 약속 일정에 맞춰 이동시간까지 계산해 알려주는 웹앱입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://readier-web-6245.azurewebsites.net/?w=1200",
    "serviceUrl": "https://readier-web-6245.azurewebsites.net/",
    "tags": [
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "10"
  },
  {
    "id": "2026-07-11",
    "name": "menu matcher",
    "tagline": "여러 사람이 모였을 때 메뉴 선정의 어려움을 해결하는 앱입니다",
    "description": "여러 사람이 모였을 때 메뉴 선정의 어려움을 해결하는 앱입니다. 선호하거나 싫어하는 음식을 입력하면 1·2·3순위 메뉴를 선정해 줍니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://menumatcherweb298852.azurewebsites.net/?w=1200",
    "serviceUrl": "https://menumatcherweb298852.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "11"
  },
  {
    "id": "2026-07-12",
    "name": "스쿨스페이스",
    "tagline": "스쿨스페이스는 학교 안 스터디룸을 공정하고 편하게 쓰기 위한 예약 앱입니다",
    "description": "스쿨스페이스는 학교 안 스터디룸을 공정하고 편하게 쓰기 위한 예약 앱입니다. 공간 현황 확인, 예약·입실·퇴실, 담당자 승인과 관리, 이용 기록 및 패널티 관리를 제공합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://mango-pebble-0d76ff000.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://mango-pebble-0d76ff000.7.azurestaticapps.net",
    "tags": [
      "학습",
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "12"
  },
  {
    "id": "2026-07-13",
    "name": "bike navi",
    "tagline": "주변에 원하는 곳도 찍어서 갈 수 있고 또 추천 경로로도 갈 수 있도록 길을 알려주는 네비입니다",
    "description": "주변에 원하는 곳도 찍어서 갈 수 있고 또 추천 경로로도 갈 수 있도록 길을 알려주는 네비입니다",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://bikenavi26217228.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://bikenavi26217228.z12.web.core.windows.net/",
    "tags": [
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "13"
  },
  {
    "id": "2026-07-14",
    "name": "LMN(Life Map Navigator, 생활 지도 네비게이션)",
    "tagline": "이 앱은 지도앱이다",
    "description": "이 앱은 지도앱이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://lmnstatic74527.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://lmnstatic74527.z12.web.core.windows.net/",
    "tags": [
      "생활",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "14"
  },
  {
    "id": "2026-07-15",
    "name": "PAWMENUAL",
    "tagline": "PAWMENUAL은 반려견의 식생활, 건강, 훈련을 한곳에서 관리하는 맞춤 케어 앱입니다",
    "description": "PAWMENUAL은 반려견의 식생활, 건강, 훈련을 한곳에서 관리하는 맞춤 케어 앱입니다. 프로필을 한 번 입력하면 상황에 맞는 급여 가이드와 훈련 방향을 확인할 수 있고, 위치 기반 동물병원 안내와 식사·건강·훈련 기록을 제공합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://thankful-sand-0954bbe00.7.azurestaticapps.net/profile?w=1200",
    "serviceUrl": "https://thankful-sand-0954bbe00.7.azurestaticapps.net/profile",
    "tags": [
      "생산성",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "15"
  },
  {
    "id": "2026-07-16",
    "name": "DuoNow",
    "tagline": "듀오나우(DuoNow)는 게임·티어·플레이 스타일이 맞는 팀원을 빠르게 찾아주는 실시간 1:1 듀오 매칭 앱입니다",
    "description": "듀오나우(DuoNow)는 게임·티어·플레이 스타일이 맞는 팀원을 빠르게 찾아주는 실시간 1:1 듀오 매칭 앱입니다. 매칭이 성사되면 즉시 채팅방이 열려 바로 플레이를 시작할 수 있고, 저트래픽 시간대에는 조건 완화·예약 알림·커뮤니티 모집 기능으로 매칭 공백을 줄입니다. 즉, \"기다림은 짧게, 팀워크는 정확하게\" 만드는 게이머 전용 매칭 유틸리티입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://duonowweb42043.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://duonowweb42043.z12.web.core.windows.net/",
    "tags": [
      "생산성",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "16"
  },
  {
    "id": "2026-07-17",
    "name": "school-check-ai",
    "tagline": "스쿨 체크 AI는 중학생들이 학교생활을 더 효율적으로 관리하고 시험 준비를 체계적으로 할 수 있도록 돕는 웹서비스입니다",
    "description": "스쿨 체크 AI는 중학생들이 학교생활을 더 효율적으로 관리하고 시험 준비를 체계적으로 할 수 있도록 돕는 웹서비스입니다. 준비물·일정 관리, 알람, 예상 문제 풀이와 Azure OpenAI 기반 답안 피드백을 제공하며 학생들의 학교생활과 공부를 한곳에서 관리하도록 돕습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://school-check-ai-linux.azurewebsites.net/?w=1200",
    "serviceUrl": "https://school-check-ai-linux.azurewebsites.net/",
    "tags": [
      "학습",
      "생산성",
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "17"
  },
  {
    "id": "2026-07-18",
    "name": "패밀리톡",
    "tagline": "가족 간의 대화가 부족한 요즘, 가족들과의 갈등, 오해를 해결할 수 있는 애플리케이션",
    "description": "가족 간의 대화가 부족한 요즘, 가족들과의 갈등, 오해를 해결할 수 있는 애플리케이션. 일정을 추가해 가족들과 공유하고, 가족들의 중요한 일을 투표로 결정, 그리고 오늘의 기분을 표시할 수 있다. 일정이 다가오면 알림을 보내주고, 달력에서 확인 할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://green-river-0ba37000f.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://green-river-0ba37000f.7.azurestaticapps.net",
    "tags": [
      "생산성",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "18"
  },
  {
    "id": "2026-07-19",
    "name": "Aceapp",
    "tagline": "1",
    "description": "1. 문제 (Problem)\n 상황: 고등학교 야간자율학습(야자) 감독 시, 많은 학생의 출결을 수기로 확인하고 자리 이탈을 관리하는 데 상당한 시간과 에너지가 소요됩니다.\n Pain Point: 교사들은 야자 감독 중에도 내일 제출할 서류나 채점 등 밀린 행정 업무를 처리해야 하지만, 번거로운 학생 관리 탓에 업무에 집중하지 못하고 밤늦게까지 이중고(야근)를 겪으며 피로감을 느낍니다.\n 2. 가설 (Hypothesis)\n 핵심 가설: 학생 출결 및 자리 확인 과정을 AI와 시스템을 통해 자동화하여 시각적으로 제공한다면, 교사가 학생 관리에 쏟는 불필요한 시간이 획기적으로 단축될 것이다.\n 기대 효과: 관리 시간이 단축되면 교사는 야자 감독 시간 동안 본연의 업무에 온전히 집중할 수 있어, 퇴근 전까지 업무를 마치고 신체적·심리적 여유를 되찾을 수 있을 것이다.\n 3. 솔루션 (Solution)\n 서비스명: aceapp (AI 얼굴인식 야자 출석 서비스)\n 웹 링크: https://web-aceapp-dev.thankfulstone-e7ff4fd9.koreacentral.azurecontainerapps.io/\n 핵심 기능: AI 얼굴인식 출석체크: 학생들이 태블릿이나 기기에 얼굴을 비추기만 하면 자동으로 출석이 인증되어 교사의 수기 확인 프로세스를 생략합니다.\n 4. 추후 추가 예정\n IP 기반 출석 확인 및 자리 등록: 스터디카페 시스템처럼 좌석을 등록하고 IP를 기반으로 연동하여, 학생이 실제 해당 자리에 있는지 신뢰도 높은 데이터를 제공합니다.\n 직관적인 관리 대시보드: 교사가 교실을 일일이 돌아다니지 않아도, 내 자리에서 전체 학생의 출석 및 이탈 현황을 한눈에 파악하고 간편하게 관리할 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://web-aceapp-dev.thankfulstone-e7ff4fd9.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://web-aceapp-dev.thankfulstone-e7ff4fd9.koreacentral.azurecontainerapps.io",
    "tags": [
      "학습",
      "생산성",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "19"
  },
  {
    "id": "2026-07-20",
    "name": "recomcody",
    "tagline": "recommend+cody의 합성어로 코디를 연출해주는 앱입니다",
    "description": "recommend+cody의 합성어로 코디를 연출해주는 앱입니다",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://recomcody-frontend.azurewebsites.net?w=1200",
    "serviceUrl": "https://recomcody-frontend.azurewebsites.net",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "20"
  },
  {
    "id": "2026-07-21",
    "name": "냉장고알리미",
    "tagline": "냉장고 안에 있는 식재료를 까먹어, 먹지 못하고 유통기한이 지나가 버리는 경우가 있는 데 이를 방지하는 앱입니다",
    "description": "냉장고 안에 있는 식재료를 까먹어, 먹지 못하고 유통기한이 지나가 버리는 경우가 있는 데 이를 방지하는 앱입니다. 식재료명과 유통기한이 나와있는 모바일로 사진을 찍거나 파일을 올리면 자동으로 입력하여 저장하며, 유통기한 지나기 3일 전부터 알림이 가는 앱이다. 현재 로그인이 되어있다는 가정하에 만든 웹 서비스이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://web.graymoss-9ad7ec52.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://web.graymoss-9ad7ec52.koreacentral.azurecontainerapps.io",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "21"
  },
  {
    "id": "2026-07-22",
    "name": "노트랩",
    "tagline": "노트로 사용할 수 있는 웹앱 애플리케이션입니다",
    "description": "노트로 사용할 수 있는 웹앱 애플리케이션입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-notelabs-web.whiteisland-56fab21a.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-notelabs-web.whiteisland-56fab21a.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "22"
  },
  {
    "id": "2026-07-23",
    "name": "E-dream",
    "tagline": "이 애플리케이션은 학생들이 선택한 진로에 관해 연계된 대회 또는 프로그램을 소개해주는 진로 맞춤형 연계 시스템 입니다",
    "description": "이 애플리케이션은 학생들이 선택한 진로에 관해 연계된 대회 또는 프로그램을 소개해주는 진로 맞춤형 연계 시스템 입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ashy-moss-055145f00.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://ashy-moss-055145f00.7.azurestaticapps.net/",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "23"
  },
  {
    "id": "2026-07-24",
    "name": "오늘의 무드 큐레이션",
    "tagline": "이 서비스는 사용자의 현재 지역 날씨와 간단한 무드 질문 응답을 함께 분석해 오늘의 선택을 더 쉽게 만들어주는 무드 큐레이션 앱입니다",
    "description": "이 서비스는 사용자의 현재 지역 날씨와 간단한 무드 질문 응답을 함께 분석해 오늘의 선택을 더 쉽게 만들어주는 무드 큐레이션 앱입니다. 사용자가 시/도와 구/군/시를 선택하면 날씨 데이터를 불러오고, 이어지는 질문을 통해 에너지·안정·산뜻함 같은 성향 태그를 계산한 뒤 옷·음식·음악을 한 번에 추천해 주며, 각 추천에는 왜 이 결과가 나왔는지 이유와 관련 태그가 함께 제공됩니다. 또한 날씨 데이터가 실시간인지 기본값인지를 화면에서 확인할 수 있어 결과의 신뢰도를 이해하기 쉽고, 필요하면 답변을 보정해 추천을 다시 맞출 수 있어 하루 컨디션과 상황에 맞는 개인화된 결정을 빠르게 돕는 것이 핵심 가치입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://web-envidthof.victoriousbay-9637f134.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://web-envidthof.victoriousbay-9637f134.koreacentral.azurecontainerapps.io",
    "tags": [
      "생산성",
      "창작",
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "24"
  },
  {
    "id": "2026-07-25",
    "name": "SlideWave",
    "tagline": "PPT의 새로운 패러다임\n SlideWave는 발표 자료를 HTML로 만들면 좋을것 같다는 생각에서 출발했습니다",
    "description": "PPT의 새로운 패러다임\n SlideWave는 발표 자료를 HTML로 만들면 좋을것 같다는 생각에서 출발했습니다. HTML과 리엑트를 섞으면 시각화 자료 같은것들을 더 퀄리티 있게 만들 수 있기 때문이죠.\n SlideWave는 글과 자료를 통해 PPT를 만들어 주는 서비스 입니다. 지금은 파일을 올리지 못하지만 후에 추가할 생각입니다. 또한 PPT를 제작하고 난 후 지시를 통해 수정을 할 수도 있습니다.\n 다만 Microsoft Foundary에서 Claude를 지원해지주지 않아 모델을 GPT-5.5를 사용하게 되었습니다. 클로드가 디자인을 잘 하는데 그 느낌이 나지 않아 아쉽습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://slidewave-web-2ihb7.azurewebsites.net/?w=1200",
    "serviceUrl": "https://slidewave-web-2ihb7.azurewebsites.net/",
    "tags": [
      "창작"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "25"
  },
  {
    "id": "2026-07-26",
    "name": "독서앱",
    "tagline": "6월에 만든 앱에서 로그인 기능을 강화해서 이메일 인증 기능을 도입했습니다",
    "description": "6월에 만든 앱에서 로그인 기능을 강화해서 이메일 인증 기능을 도입했습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://reading-app-vibeventure202607-web.azurewebsites.net/?w=1200",
    "serviceUrl": "https://reading-app-vibeventure202607-web.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "26"
  },
  {
    "id": "2026-07-27",
    "name": "냉장고 앱",
    "tagline": "이 앱은 냉장고에 있는 재료들을 입력하면 그 재료와 관련된 음식을 추천해주고 음식들의 레시피도 알려준다",
    "description": "이 앱은 냉장고에 있는 재료들을 입력하면 그 재료와 관련된 음식을 추천해주고 음식들의 레시피도 알려준다",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://fridgeapp-07111130.azurewebsites.net?w=1200",
    "serviceUrl": "https://fridgeapp-07111130.azurewebsites.net",
    "tags": [
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "27"
  },
  {
    "id": "2026-07-28",
    "name": "포메뉴얼",
    "tagline": "오늘의 반려견 케어 결정을 빠르게 도와주는 맞춤형 반려견 생활 관리 웹앱입니다",
    "description": "오늘의 반려견 케어 결정을 빠르게 도와주는 맞춤형 반려견 생활 관리 웹앱입니다. 프로필 기반 식생활 가이드, 건강 상태 기록, 위치 기반 주변 동물병원 안내, 훈련 기록을 한곳에서 관리할 수 있도록 만든 프로젝트입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://thankful-sand-0954bbe00.7.azurestaticapps.net/profile?w=1200",
    "serviceUrl": "https://thankful-sand-0954bbe00.7.azurestaticapps.net/profile",
    "tags": [
      "생산성",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "28"
  },
  {
    "id": "2026-07-29",
    "name": "DuoNow(듀오나우)",
    "tagline": "듀오나우 피드백 및 수정본",
    "description": "듀오나우 피드백 및 수정본",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://duonowweb42043.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://duonowweb42043.z12.web.core.windows.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "29"
  },
  {
    "id": "2026-07-30",
    "name": "학급 공알",
    "tagline": "이 애플리케이션은 학급의 공지사항을 전달해줍니다",
    "description": "이 애플리케이션은 학급의 공지사항을 전달해줍니다. 애플리케이션을 키면 먼저 로그인/회원가입을 먼저 해야 합니다. 어떤 학급의 학생 중 한 명이 방(그 학급에 대한 방)을 만들 수 있고, 거기에서 선생님 또는 반장, 부반장이 공지사항을 올릴 수 있습니다. 역할(예컨대 선생님이나 반장, 부반장)은 방 생성자가 직접 지정할 수 있습니다. 역할이 학생인 사람은 그 방에 질문을 올릴 수 있습니다. 세세한 기능들은 생략하겠습니다.\n ** 아직 고치지 못한 버그들이 많을 수 있습니다. **\n ** 아직 주된 기능을 만들지 못하였습니다. **",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://classnotice07291232.z7.web.core.windows.net?w=1200",
    "serviceUrl": "https://classnotice07291232.z7.web.core.windows.net",
    "tags": [
      "학습",
      "창작",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "7월",
    "roomKey": "2026-07",
    "number": "30"
  },
  {
    "id": "2026-08-1",
    "name": "스쿨스페이스",
    "tagline": "학교 공간 예약 사용",
    "description": "학교 공간 예약 사용",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://mango-pebble-0d76ff000.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://mango-pebble-0d76ff000.7.azurestaticapps.net/",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "1"
  },
  {
    "id": "2026-08-2",
    "name": "어디에 뒀더라?",
    "tagline": "가족이 집 안 물건 위치와 이동 기록을 함께 관리하는 생활 편의 앱",
    "description": "가족이 집 안 물건 위치와 이동 기록을 함께 관리하는 생활 편의 앱. 공구·서류·리모컨·계절용품 등을 이름·카테고리·보관장소·사진·상태로 등록, 자연어 검색 및 이동 기록·음성 기록 지원. 위치 변경/분실 알림 기능 포함.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://vibecodingweb26062801.azurewebsites.net/?w=1200",
    "serviceUrl": "https://vibecodingweb26062801.azurewebsites.net/",
    "tags": [
      "생산성",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "2"
  },
  {
    "id": "2026-08-3",
    "name": "일정모아",
    "tagline": "JPG, PNG, PDF, TXT 문서에서 AI가 텍스트를 추출해 캘린더에 등록해주는 일정 통합 앱",
    "description": "JPG, PNG, PDF, TXT 문서에서 AI가 텍스트를 추출해 캘린더에 등록해주는 일정 통합 앱. 구글 로그인 지원.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://green-glacier-05c88a70f.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://green-glacier-05c88a70f.7.azurestaticapps.net",
    "tags": [
      "생산성",
      "창작",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "3"
  },
  {
    "id": "2026-08-4",
    "name": "Trip-One",
    "tagline": "AI 여행 플래너",
    "description": "AI 여행 플래너. 해외여행이 처음이거나 정보 검색이 힘든 사용자를 위해 여행 준비를 단계별로 지원.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://triponeweb2608231246.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://triponeweb2608231246.z12.web.core.windows.net/",
    "tags": [
      "생산성",
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "4"
  },
  {
    "id": "2026-08-5",
    "name": "HabitQuest (습관 만들기 앱)",
    "tagline": "선택한 습관을 퀘스트 형식으로 클리어하며 보상·경험치를 얻어 레벨업하고 랭킹으로 경쟁하는 앱",
    "description": "선택한 습관을 퀘스트 형식으로 클리어하며 보상·경험치를 얻어 레벨업하고 랭킹으로 경쟁하는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://habitquest-web-aca-50887.whitegrass-9925aedb.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://habitquest-web-aca-50887.whitegrass-9925aedb.koreacentral.azurecontainerapps.io/",
    "tags": [
      "창작"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "5"
  },
  {
    "id": "2026-08-6",
    "name": "원데이 (매일 일기)",
    "tagline": "혼자 일기를 쓰기보다 여러 사람의 일기를 보고 나도 공유하며 여러 일상을 한번에 즐기는 앱",
    "description": "혼자 일기를 쓰기보다 여러 사람의 일기를 보고 나도 공유하며 여러 일상을 한번에 즐기는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-harucheck-dev-web.wonderfuldune-e838d696.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://ca-harucheck-dev-web.wonderfuldune-e838d696.koreacentral.azurecontainerapps.io",
    "tags": [
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "6"
  },
  {
    "id": "2026-08-7",
    "name": "뭐 먹을래? (반경 내 식당 알림)",
    "tagline": "내 반경 주위 식당 추천",
    "description": "내 반경 주위 식당 추천. 리뷰를 분석해 평점 기준 추천 상위 10개 제공.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-frontend-z3blp7avst2sm.orangebay-311cd1b9.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-frontend-z3blp7avst2sm.orangebay-311cd1b9.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생산성",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "7"
  },
  {
    "id": "2026-08-8",
    "name": "주기율표 퀴즈",
    "tagline": "원소 주기율표를 퀴즈로 학습하는 앱",
    "description": "원소 주기율표를 퀴즈로 학습하는 앱. 기호/번호 맞추기 등 다양한 퀴즈 모드와 순위 기능, 난이도별(쉬움 1~20번/보통/어려움 1~118번) 단계 제공.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://zealous-coast-052088c00.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://zealous-coast-052088c00.7.azurestaticapps.net/",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "8"
  },
  {
    "id": "2026-08-9",
    "name": "LUGGY (캐리어 렌탈 B2C)",
    "tagline": "캐리어 보관+렌탈 플랫폼",
    "description": "캐리어 보관+렌탈 플랫폼. Provider는 안 쓰는 캐리어를 맡기고 리워드 획득, Renter는 필요한 기간만 저렴하게 대여, Platform이 검수·정산까지 책임.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-web-du6ob5u24hia6.politeriver-eecb7bef.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://ca-web-du6ob5u24hia6.politeriver-eecb7bef.koreacentral.azurecontainerapps.io",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "9"
  },
  {
    "id": "2026-08-10",
    "name": "LPS AI (Life Plan Scheduler AI, 생활 계획 스케줄러 AI)",
    "tagline": "AI와 채팅하며 일정을 만들고 계획·관리할 수 있도록 돕는 프로그램",
    "description": "AI와 채팅하며 일정을 만들고 계획·관리할 수 있도록 돕는 프로그램.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://lps-scheduler-ai-krc01.azurewebsites.net?w=1200",
    "serviceUrl": "https://lps-scheduler-ai-krc01.azurewebsites.net",
    "tags": [
      "생산성",
      "창작",
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "10"
  },
  {
    "id": "2026-08-11",
    "name": "docs 담현 (마크다운 블로그)",
    "tagline": "마크다운 형식의 블로그 작성 사이트",
    "description": "마크다운 형식의 블로그 작성 사이트. 포트폴리오 제작 과정에서 웹/DB 서버를 분리하고 SQLite, Spotify 실시간 연동(SSE) 등 기술적 실험을 정리.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://docs-damhxun-20260823112310.azurewebsites.net?w=1200",
    "serviceUrl": "https://docs-damhxun-20260823112310.azurewebsites.net",
    "tags": [
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "11"
  },
  {
    "id": "2026-08-12",
    "name": "25분 스킬트리",
    "tagline": "공부·운동·독서 등 목표를 25분 단위 퀘스트로 만들어 실천하는 습관 형성 앱",
    "description": "공부·운동·독서 등 목표를 25분 단위 퀘스트로 만들어 실천하는 습관 형성 앱. 경험치·레벨업·아바타 성장 시스템으로 게임처럼 목표를 달성.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://skilltree.ashyglacier-419f7c97.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://skilltree.ashyglacier-419f7c97.koreacentral.azurecontainerapps.io/",
    "tags": [
      "학습",
      "창작",
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "12"
  },
  {
    "id": "2026-08-13",
    "name": "TIMEMASTER (시계)",
    "tagline": "아날로그 시계를 공부하고 문제를 풀 수 있는 게임형식 앱",
    "description": "아날로그 시계를 공부하고 문제를 풀 수 있는 게임형식 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://polite-plant-08323d100.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://polite-plant-08323d100.7.azurestaticapps.net/",
    "tags": [
      "학습"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "13"
  },
  {
    "id": "2026-08-14",
    "name": "Loreka (번역 서비스)",
    "tagline": "AI 기반 저비용 소설 번역 서비스",
    "description": "AI 기반 저비용 소설 번역 서비스. 정확성·일관성을 높이기 위한 자체 'Bible 시스템' 적용. (현재 링크는 테스트 사이트, 메인 사이트로 안내)",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://loreka-web-staging.braverock-62f58213.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://loreka-web-staging.braverock-62f58213.koreacentral.azurecontainerapps.io",
    "tags": [
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "14"
  },
  {
    "id": "2026-08-15",
    "name": "익명 이메일 전송 서비스",
    "tagline": "익명으로 이메일을 보내고 싶을 때 사용하는 앱",
    "description": "익명으로 이메일을 보내고 싶을 때 사용하는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://amr-web-vibeventure202608-dn6e5purss4y6.azurewebsites.net/?w=1200",
    "serviceUrl": "https://amr-web-vibeventure202608-dn6e5purss4y6.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "15"
  },
  {
    "id": "2026-08-16",
    "name": "BOOK MIND",
    "tagline": "책 내용을 오래 기억하도록 돕는 독서 도우미 앱",
    "description": "책 내용을 오래 기억하도록 돕는 독서 도우미 앱. 책 검색 시 저자·카테고리 자동 완성, PDF/TXT 업로드로 퀴즈·필사 정확도 향상, 기록 탭 AI 피드백, 독후감 비교·첨삭, 복습 탭에서 항목별 기억 상태 확인.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://purple-flower-03a717200.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://purple-flower-03a717200.7.azurestaticapps.net",
    "tags": [
      "생산성",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "16"
  },
  {
    "id": "2026-08-17",
    "name": "스터디 플래너 (study planner)",
    "tagline": "스스로 공부할 때 일정을 짜주는 앱",
    "description": "스스로 공부할 때 일정을 짜주는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://gray-tree-088a45400.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://gray-tree-088a45400.7.azurestaticapps.net",
    "tags": [
      "학습",
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "17"
  },
  {
    "id": "2026-08-18",
    "name": "꿀주차 (Kkul-Parking)",
    "tagline": "목적지 주변 무료/조건부 무료/공영 주차장을 지도에서 한눈에 찾아주는 모바일 우선 웹앱",
    "description": "목적지 주변 무료/조건부 무료/공영 주차장을 지도에서 한눈에 찾아주는 모바일 우선 웹앱. 여러 공공데이터 소스를 통합, 절약 금액 자동 계산 기능 포함.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://app-kkulparking-prod-vjsa7o.azurewebsites.net?w=1200",
    "serviceUrl": "https://app-kkulparking-prod-vjsa7o.azurewebsites.net",
    "tags": [
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "18"
  },
  {
    "id": "2026-08-19",
    "name": "물고기도감",
    "tagline": "사진을 찍어 올리면 어종과 위험도를 분류해주는 앱",
    "description": "사진을 찍어 올리면 어종과 위험도를 분류해주는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://fish-guide-16825.azurewebsites.net/?w=1200",
    "serviceUrl": "https://fish-guide-16825.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "19"
  },
  {
    "id": "2026-08-20",
    "name": "식물 키우기",
    "tagline": "식물 사진을 넣으면 이름을 알려주고, 설명과 성장 과정 정보를 검색해 보여주는 앱",
    "description": "식물 사진을 넣으면 이름을 알려주고, 설명과 성장 과정 정보를 검색해 보여주는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://web.ashybeach-4ee59870.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://web.ashybeach-4ee59870.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생산성",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "20"
  },
  {
    "id": "2026-08-21",
    "name": "긴급 옷 코디",
    "tagline": "날씨·상황·사용자 요청을 반영해 옷을 코디해주는 앱",
    "description": "날씨·상황·사용자 요청을 반영해 옷을 코디해주는 앱. 자신의 옷장 정보 입력 시 더 정확한 추천, 코디 기록 저장·취향 설정 기능 포함.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://app-tvnmajmnaeh2c.azurewebsites.net/?w=1200",
    "serviceUrl": "https://app-tvnmajmnaeh2c.azurewebsites.net/",
    "tags": [
      "생산성",
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "21"
  },
  {
    "id": "2026-08-22",
    "name": "StudyRange (시험 공부 도우미)",
    "tagline": "시험범위를 등록하면 AI가 요약·퀴즈를 생성해주는 학습 도우미 앱",
    "description": "시험범위를 등록하면 AI가 요약·퀴즈를 생성해주는 학습 도우미 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://studyrange-07260935.azurewebsites.net/?w=1200",
    "serviceUrl": "https://studyrange-07260935.azurewebsites.net/",
    "tags": [
      "학습",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "22"
  },
  {
    "id": "2026-08-23",
    "name": "ccpau (화장품파우치)",
    "tagline": "보유한 화장품을 온라인으로 쉽게 파악하고 유통기한을 관리할 수 있는 앱",
    "description": "보유한 화장품을 온라인으로 쉽게 파악하고 유통기한을 관리할 수 있는 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://cocopaustkue03q.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://cocopaustkue03q.z12.web.core.windows.net/",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "23"
  },
  {
    "id": "2026-08-24",
    "name": "Quiet Window",
    "tagline": "힐링을 위한 앱",
    "description": "힐링을 위한 앱. 배경 사진 변경, 소리 믹서 조절 기능 제공.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://witty-meadow-09c12af00.7.azurestaticapps.net?w=1200",
    "serviceUrl": "https://witty-meadow-09c12af00.7.azurestaticapps.net",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "8월",
    "roomKey": "2026-08",
    "number": "24"
  },
  {
    "id": "2026-09-1",
    "name": "미션 파서블",
    "tagline": "이 앱은 할일을 미루는 사람들을 위해 시간을 정해서 그 시간안에 할일을 마무리해야하는 앱이고 할일을 적고 에상시간을 적은 뒤 우선순위를 누르면 밑에 목표가 뜨고 내가 오늘 할 일을",
    "description": "이 앱은 할일을 미루는 사람들을 위해 시간을 정해서 그 시간안에 할일을 마무리해야하는 앱이고 할일을 적고 에상시간을 적은 뒤 우선순위를 누르면 밑에 목표가 뜨고 내가 오늘 할 일을 누르고 시작을 누르면 타이머가 뜨면서 그시간을 다 끝내야 나갈 수 있고 중도 포기를 할 수있습니다 그리고 시간이 끝나면 소리와 함께 알림창이 뜹니다 완료했으면 메모를 하고 포기 했으면 왜 했는지 이유를 선택합니다.오른쪽위에 기록을 누르고 보면 오늘 완료한 목표와 일주일동안 완료한 목표들의 수를 알려줍니다.그밑엔 실패한 사유와 다음주에 할 목표를 정하는게 있고 마지막으로 포인트제와 다크모드로 바꿀수 있는 게 있고 포인트는 휴식권과 쉴드,타이머가 떴을 때 완료하면 포인트를 써서 완료시킬수 있고 포인트는 할일을 완료하면 10개를 얻고 포기하면 5개를 뺏깁니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://yellow-bay-074680900.2.azurestaticapps.net?w=1200",
    "serviceUrl": "https://yellow-bay-074680900.2.azurestaticapps.net",
    "tags": [
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "1"
  },
  {
    "id": "2026-09-2",
    "name": "Science Studio",
    "tagline": "선생님들이 수업 중 시뮬레이션을 자유롭게 만들어서 사용하거나 다른 사람이 만든 시뮬레이션을 쓸 수 있는 사이트 입니다",
    "description": "선생님들이 수업 중 시뮬레이션을 자유롭게 만들어서 사용하거나 다른 사람이 만든 시뮬레이션을 쓸 수 있는 사이트 입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://science-studio-test-2ihb7.koreacentral.cloudapp.azure.com/?w=1200",
    "serviceUrl": "https://science-studio-test-2ihb7.koreacentral.cloudapp.azure.com/",
    "tags": [
      "학습",
      "창작"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "2"
  },
  {
    "id": "2026-09-3",
    "name": "SAYSO",
    "tagline": "SAYSO는 상대방과 상황에 맞는 메시지를 AI가 작성해주는 커뮤니케이션 서비스입니다",
    "description": "SAYSO는 상대방과 상황에 맞는 메시지를 AI가 작성해주는 커뮤니케이션 서비스입니다. 사용자는 상대방, 상황, 전달 목적, 하고 싶은 말, 원하는 말투를 입력하면 추천 표현과 부드러운 표현, 정중한 표현을 받을 수 있습니다.\n \n 생성된 문장은 복사하거나 수정할 수 있으며, 보내기 전에 자연스러움, 정보 부족, 예의 수준, 오해 가능성을 검사할 수 있습니다. 필요하면 더 정중하게, 자연스럽게, 짧게, 명확하게 다시 개선할 수도 있습니다. 상대방과 최근 대화 내용은 저장해두었다가 다음 메시지를 작성할 때 불러올 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://orange-wave-06876f900.2.azurestaticapps.net?w=1200",
    "serviceUrl": "https://orange-wave-06876f900.2.azurestaticapps.net",
    "tags": [
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "3"
  },
  {
    "id": "2026-09-4",
    "name": "매듭",
    "tagline": "Knot — 매일 다섯 개의 작은 루틴을 완료하며 일주일 동안 서른다섯 개의 점을 이어, 나만의 형상 하나를 조용히 완성하는 미니멀 루틴 앱",
    "description": "Knot — 매일 다섯 개의 작은 루틴을 완료하며 일주일 동안 서른다섯 개의 점을 이어, 나만의 형상 하나를 조용히 완성하는 미니멀 루틴 앱.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://knotwebh8pfmn.z12.web.core.windows.net/?w=1200",
    "serviceUrl": "https://knotwebh8pfmn.z12.web.core.windows.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "4"
  },
  {
    "id": "2026-09-5",
    "name": "스쿨스페이스",
    "tagline": "AI 에이전트의 답변을 매끄럽게 수정",
    "description": "AI 에이전트의 답변을 매끄럽게 수정.\n \n 로그인 기능 기획.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://mango-pebble-0d76ff000.7.azurestaticapps.net/?w=1200",
    "serviceUrl": "https://mango-pebble-0d76ff000.7.azurestaticapps.net/",
    "tags": [
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "5"
  },
  {
    "id": "2026-09-6",
    "name": "FindIt AI",
    "tagline": "FindIt AI 앱 설명\n \n 한 줄 요약\n \n 사용자가 애매하게 상품을 설명해도(\"여름에 입기 좋고 목 안 늘어나는 하얀색 오버핏 반팔티\") AI가 의도를 분석해서 실제 쇼핑 ",
    "description": "FindIt AI 앱 설명\n \n 한 줄 요약\n \n 사용자가 애매하게 상품을 설명해도(\"여름에 입기 좋고 목 안 늘어나는 하얀색 오버핏 반팔티\") AI가 의도를 분석해서 실제 쇼핑 상품과 가격을 찾아주는 자연어 커머스 검색 서비스입니다.\n \n 동작 흐름\n \n 검색 입력 — 사용자가 자연어로 원하는 상품을 설명 (index.html 검색창)\n \n 의도 분석 — Azure OpenAI가 문장을 분석해 카테고리/핵심 특징/목적·제약사항/검색 키워드로 분해 (intent.js)\n \n 상품 조회 — 다나와(Danawa) 검색 결과 페이지를 실시간 스크래핑해서 후보 상품 수집 (scraper.js)\n \n 매칭·랭킹 — 추출된 특징이 상품명에 얼마나 포함되는지로 일치율(%) 점수 계산, 최저가 표시 (matcher.js)\n \n 결과 표시 — 매칭 점수, AI 선정 이유, 가격, 구매 링크가 담긴 카드 UI로 표시, \"일치도순/최저가순\" 필터 제공 (app.js)\n \n 기술 스택\n \n 영역 구성\n \n 백엔드 Node.js + Express (server.js)\n \n 프런트엔드 정적 HTML/JS + Tailwind CDN\n \n LLM Azure OpenAI (Chat Completions)\n \n 상품 데이터 다나와 실시간 스크래핑 (cheerio) — 판매자/API 키 불필요\n \n 안정성 검색 결과 캐싱(10분), IP 레이트리밋(5분/20회), 요청 타임아웃(30초)\n \n 현재 배포 상태\n \n Azure App Service(Linux, Node 20, F1 무료 요금제)에 배포됨: https://app-web-ovkh3zqwz76uy.azurewebsites.net/\n \n 로컬: http://localhost:3000 (지금 열려있는 페이지)\n \n MVP 범위 (agent.md 기준)\n \n 포함: 텍스트 검색, 의도 분석, 실시간 상품 조회, 가격 비교, 최근 검색어, 필터\n \n 제외: 이미지 검색, 결제/로그인, 벡터DB 기반 유사도 검색, 실제 쇼핑몰 제휴 API(쿠팡파트너스 등)\n \n 수익 모델 구상 (prd.md 기준)\n \n 제휴 마케팅(구매 연결 수수료), 쇼핑몰 광고(스폰서드 노출), B2B 검색엔진 API 판매",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://app-web-ovkh3zqwz76uy.azurewebsites.net/?w=1200",
    "serviceUrl": "https://app-web-ovkh3zqwz76uy.azurewebsites.net/",
    "tags": [
      "생산성",
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "6"
  },
  {
    "id": "2026-09-7",
    "name": "pdf remaker",
    "tagline": "pdf관련해서 작업해주는 앱",
    "description": "pdf관련해서 작업해주는 앱",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://happy-bay-01b65c400.2.azurestaticapps.net?w=1200",
    "serviceUrl": "https://happy-bay-01b65c400.2.azurestaticapps.net",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "7"
  },
  {
    "id": "2026-09-8",
    "name": "checklist",
    "tagline": "할 일을 빠르게 추가하고 완료 상태를 한눈에 관리할 수 있는 체크리스트 앱입니다",
    "description": "할 일을 빠르게 추가하고 완료 상태를 한눈에 관리할 수 있는 체크리스트 앱입니다. 데이터가 브라우저에 저장되어 새로고침 후에도 목록이 유지되어 학습·과제·일정 관리에 편리합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://checklist-dawon-20260919.azurewebsites.net/v?w=1200",
    "serviceUrl": "https://checklist-dawon-20260919.azurewebsites.net/v",
    "tags": [
      "학습",
      "생산성"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "8"
  },
  {
    "id": "2026-09-9",
    "name": "world experiment",
    "tagline": "세상 실험가는 일상에서 생기는 “왜?”를 AI와 함께 탐구하는 호기심 앱입니다",
    "description": "세상 실험가는 일상에서 생기는 “왜?”를 AI와 함께 탐구하는 호기심 앱입니다.\n \n 사용자는 궁금한 점을 입력하거나 사진을 올릴 수 있습니다. 앱은 질문에 쉬운 설명을 제공하고, 관련된 꼬리질문과 관찰 방법, 직접 해볼 수 있는 실험을 추천합니다.\n \n 주요 기능:\n \n 텍스트·음성·사진으로 질문\n \n 설명 수준 선택\n \n 꼬리질문 이어가기\n \n 관찰 계획과 실험 추천\n \n 실험 단계 안내와 결과 기록\n \n 실험 결과 분석\n \n 관련 궁금증 추천\n \n 궁금증 보관함\n \n 과학 발견 도감\n \n 오늘의 궁금증\n \n 전체 탐험 기록과 통계\n \n 앱의 흐름은 다음과 같습니다.\n \n 궁금증 발견\n → 질문\n → 원리 이해\n → 꼬리질문\n → 직접 관찰·실험\n → 결과 기록\n → 새로운 궁금증 탐험\n \n 현재 Azure OpenAI 연동도 가능하도록 구성되어 있으며, Azure API 키와 설정을 입력하면 실제 AI 응답을 사용할 수 있습니다.\n \n 앱 주소:\n \n https://azappra3c7ywg6n7u2.azurewebsites.net",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://azappra3c7ywg6n7u2.azurewebsites.net?w=1200",
    "serviceUrl": "https://azappra3c7ywg6n7u2.azurewebsites.net",
    "tags": [
      "생산성",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "9"
  },
  {
    "id": "2026-09-10",
    "name": "지훈봇",
    "tagline": "도배와 서버 테러를 지훈봇이 대신 막아요",
    "description": "도배와 서버 테러를 지훈봇이 대신 막아요.\n \n 검열은 사람이 볼 수 없는 속도로 돌고, 무슨 일이 있었는지는 빠짐없이 남아요. 설정은 웹에서 하고, 서버에서는 아무것도 외울 필요가 없어요.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://jihoonbot-kr-h5d6ecdbgnbbdqem.koreasouth-01.azurewebsites.net/?w=1200",
    "serviceUrl": "https://jihoonbot-kr-h5d6ecdbgnbbdqem.koreasouth-01.azurewebsites.net/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "10"
  },
  {
    "id": "2026-09-11",
    "name": "Word Study",
    "tagline": "이 'Word Study' 앱은 한 앱에서 단어 검색, 퀴즈, 오늘의 단어, 단어시험까지 할 수 있습니다",
    "description": "이 'Word Study' 앱은 한 앱에서 단어 검색, 퀴즈, 오늘의 단어, 단어시험까지 할 수 있습니다. 단어를 빠른 시간에 외우고 싶은 사람들에게 추천합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://mango-ground-007d2250f.4.azurestaticapps.net?w=1200",
    "serviceUrl": "https://mango-ground-007d2250f.4.azurestaticapps.net",
    "tags": [
      "학습",
      "생산성",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "11"
  },
  {
    "id": "2026-09-12",
    "name": "FixFirst",
    "tagline": "FixFirst는 생활제품 문제를 단계별 질문으로 진단하고 해결 방법을 안내하는 웹앱입니다",
    "description": "FixFirst는 생활제품 문제를 단계별 질문으로 진단하고 해결 방법을 안내하는 웹앱입니다.\n \n 주요 기능:\n \n 프린터, 노트북, 청소기, TV, 휴대폰 등록\n \n 증상별 단계형 문제 진단\n \n AI 증상 검색과 사진 기반 분석\n \n 이전 해결 방법 재추천\n \n 제품 건강검진\n \n 관리 일정 및 보증정보 관리\n \n 문제 해결 기록 저장\n \n 해결되지 않은 문제의 A/S 문의 카드 생성\n \n 회원가입 없이 바로 사용하는 게스트 모드",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://fixfirst-live.nicepebble-7c8573eb.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://fixfirst-live.nicepebble-7c8573eb.koreacentral.azurecontainerapps.io",
    "tags": [
      "생산성",
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "12"
  },
  {
    "id": "2026-09-13",
    "name": "VV_BLOG",
    "tagline": "간단한 블로그사이트이지만, 본인만의 개성있는 글 또는 유용한 글을 써서 사람들과 공유하거나 생각 정리를 할 수 있다",
    "description": "간단한 블로그사이트이지만, 본인만의 개성있는 글 또는 유용한 글을 써서 사람들과 공유하거나 생각 정리를 할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://vibe-venture-blog-prod-v2-772dng.azurewebsites.net/?w=1200",
    "serviceUrl": "https://vibe-venture-blog-prod-v2-772dng.azurewebsites.net/",
    "tags": [
      "생산성",
      "창작",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "13"
  },
  {
    "id": "2026-09-14",
    "name": "face fit assistant",
    "tagline": "FaceFit Assistant는 사용자가 저녁 식단과 섭취 시간을 입력하면 음식별 나트륨 함량, 키와 몸무게, 취침까지 남은 시간을 바탕으로 다음 날 아침 얼굴 붓기 가능성을 예",
    "description": "FaceFit Assistant는 사용자가 저녁 식단과 섭취 시간을 입력하면 음식별 나트륨 함량, 키와 몸무게, 취침까지 남은 시간을 바탕으로 다음 날 아침 얼굴 붓기 가능성을 예측해 주는 건강 관리 앱입니다. 분석 결과는 0점부터 100점까지의 위험 점수와 5단계 상태로 제공되며, 점수에 따라 저녁 림프 스트레칭이나 유산소 운동, 적정 수분 섭취량, 칼륨 식품 가이드를 추천합니다. 또한 운동 타이머를 통해 추천 루틴을 바로 실행할 수 있고, 가이드 챗에서 붓기 점수와 수분 섭취량, 아침 마사지 방법을 질문할 수 있습니다. 모든 결과는 의료 진단이 아닌 생활 습관 참고용으로 제공됩니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://proud-island-021081500.1.azurestaticapps.net?w=1200",
    "serviceUrl": "https://proud-island-021081500.1.azurestaticapps.net",
    "tags": [
      "생산성",
      "생활",
      "AI",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "14"
  },
  {
    "id": "2026-09-15",
    "name": "Decision Lab",
    "tagline": "고민이 있을 때, 선택하기 어려울 때, 선택지가 많을 때 결정하는 것을 도와줘요!\n \n AI가 결정 기준과 선택지의 설명에 따라 점수를 매겨주고, 선택에 대한 평가도 내려줄 수 있",
    "description": "고민이 있을 때, 선택하기 어려울 때, 선택지가 많을 때 결정하는 것을 도와줘요!\n \n AI가 결정 기준과 선택지의 설명에 따라 점수를 매겨주고, 선택에 대한 평가도 내려줄 수 있습니다!",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://decision-lab.politewave-e97dfeac.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://decision-lab.politewave-e97dfeac.koreacentral.azurecontainerapps.io/",
    "tags": [
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "15"
  },
  {
    "id": "2026-09-16",
    "name": "주변결",
    "tagline": "카테고리로 해당 장소만 표시할 수 있는 지도앱",
    "description": "카테고리로 해당 장소만 표시할 수 있는 지도앱",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-frontend-wdspd4cfiqn2q.kindsky-91340f4a.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://ca-frontend-wdspd4cfiqn2q.kindsky-91340f4a.koreacentral.azurecontainerapps.io",
    "tags": [
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "16"
  },
  {
    "id": "2026-09-17",
    "name": "Luggy",
    "tagline": "여행 갈 때만 잠깐 쓰고 평소엔 집에서 자리만 차지하는 캐리어, 당근마켓처럼 우리 동네 이웃과 직거래로 빌려 쓰면 어떨까 하는 아이디어에서 시작한 지도 기반 C2C 캐리어 대여 서",
    "description": "여행 갈 때만 잠깐 쓰고 평소엔 집에서 자리만 차지하는 캐리어, 당근마켓처럼 우리 동네 이웃과 직거래로 빌려 쓰면 어떨까 하는 아이디어에서 시작한 지도 기반 C2C 캐리어 대여 서비스입니다.\n \n 주요 기능\n \n 🗺️ 지도 기반 탐색: 내 위치 주변 이웃이 등록한 캐리어를 지도/리스트로 탐색하고, 목적지까지 경로 안내도 받을 수 있어요\n \n 🏷️ 직접 등록: 소유자가 캐리어 사진, 규격, 일일 대여료, 거래 가능 동네를 직접 등록\n \n 💬 1:1 직거래 문의: 결제 대행 없이, 소유자와 채팅으로 직접 일정과 조건을 조율\n \n 📦 대여 상태 관리: 문의중 → 예약 확정 → 대여중 → 반납 완료까지 한눈에 관리\n \n ⚡ 빠른 대여: 목적/기간/인원만 입력하면 딱 맞는 이웃 캐리어를 추천\n \n ⭐ 후기/찜하기: 거래 후 후기를 남기고, 맘에 드는 매물은 찜해두고 다시 찾기\n \n 👤 온보딩: 가입 시 이름/닉네임/실제 행정구역 기반 동네(시-군-구-동)/캐리어 보유 여부 등을 입력받아 처음부터 동네 기반 개인화 제공\n \n 🍎 Apple Human Interface Guidelines 기반의 깔끔한 디자인\n \n 기술 스택\n \n Frontend: Vite + Vanilla JS (SPA), Leaflet/Kakao Map\n \n Backend: Node.js + Express\n \n TDD로 개발: 단위/통합/E2E 테스트 전체 커버\n \n Azure Container Apps로 배포\n \n PG 결제나 중앙 창고 위탁 없이, 순수 이웃 간 직거래에 집중한 MVP입니다. 한번 둘러보시고 캐리어 등록도, 채팅도 직접 체험해보세요!",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-web-du6ob5u24hia6.politeriver-eecb7bef.koreacentral.azurecontainerapps.io?w=1200",
    "serviceUrl": "https://ca-web-du6ob5u24hia6.politeriver-eecb7bef.koreacentral.azurecontainerapps.io",
    "tags": [
      "생산성",
      "창작",
      "생활",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "17"
  },
  {
    "id": "2026-09-18",
    "name": "mangafind",
    "tagline": "이 앱은 인스타나 유튜브 등 여러 쇼츠 영상에 본 일본만화를 찾기 힘들 때 스크린샷이나 사진을 찍어서 이미지를 올리면 대신 일본 만화와 한국 정발, 한국어 이름 등을 알려주는 앱이",
    "description": "이 앱은 인스타나 유튜브 등 여러 쇼츠 영상에 본 일본만화를 찾기 힘들 때 스크린샷이나 사진을 찍어서 이미지를 올리면 대신 일본 만화와 한국 정발, 한국어 이름 등을 알려주는 앱이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-mangafind-dev.gentlemoss-d95d2ec3.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-mangafind-dev.gentlemoss-d95d2ec3.koreacentral.azurecontainerapps.io/",
    "tags": [
      "창작"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "18"
  },
  {
    "id": "2026-09-19",
    "name": "책크인",
    "tagline": "이앱은 지금 당신이 원하는 느낌의 책을 찾을수있거나 아니면 전에 읽은 책과 비슷한 느낌의 책을 찾아볼수있습니다",
    "description": "이앱은 지금 당신이 원하는 느낌의 책을 찾을수있거나 아니면 전에 읽은 책과 비슷한 느낌의 책을 찾아볼수있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-client-babababa4-dev-gxeg2x.redcoast-402b5ffd.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-client-babababa4-dev-gxeg2x.redcoast-402b5ffd.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생활"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "19"
  },
  {
    "id": "2026-09-20",
    "name": "과학 공부앱",
    "tagline": "이 앱은 과학에 대해서 더 구체적으로, 더 많이 알아볼 수 있는 프로그램이다",
    "description": "이 앱은 과학에 대해서 더 구체적으로, 더 많이 알아볼 수 있는 프로그램이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://icy-stone-055045600.3.azurestaticapps.net?w=1200",
    "serviceUrl": "https://icy-stone-055045600.3.azurestaticapps.net",
    "tags": [
      "학습",
      "탐구"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "20"
  },
  {
    "id": "2026-09-21",
    "name": "깃허브 추천",
    "tagline": "이 앱은 깃허브 검색이 목적에 맞는 프로젝트와 인기 급상승 정도만 지원하는것에서 불편함을 느낌 그걸 해결하기 위해 따와서 개발자들이 구경 하거나 둘러볼때 쉽게 검색하도록 해주는 앱",
    "description": "이 앱은 깃허브 검색이 목적에 맞는 프로젝트와 인기 급상승 정도만 지원하는것에서 불편함을 느낌 그걸 해결하기 위해 따와서 개발자들이 구경 하거나 둘러볼때 쉽게 검색하도록 해주는 앱(구현 대략적으로만 됨)",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https://ca-vibeventure-202609-web.delightfulrock-753191f9.koreacentral.azurecontainerapps.io/?w=1200",
    "serviceUrl": "https://ca-vibeventure-202609-web.delightfulrock-753191f9.koreacentral.azurecontainerapps.io/",
    "tags": [
      "생산성",
      "AI"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "9월",
    "roomKey": "2026-09",
    "number": "21"
  }
];
