import type { CatalogService } from '../catalog.js';
import { createCuratedServices } from './catalog-entry.js';

export const productivityCatalog: CatalogService[] = [
  {
    "id": "productivity-1",
    "name": "Notion",
    "tagline": "메모와 문서, 업무관리를 하나로 합친 올인원 작업공간",
    "description": "페이지 단위로 메모, 문서, 데이터베이스를 자유롭게 조합해 개인 노트부터 팀 위키까지 운영할 수 있는 도구다. 블록 편집 방식이라 글, 표, 체크리스트를 한 화면에서 섞어 쓸 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.notion.so?w=1200",
    "serviceUrl": "https://www.notion.so",
    "tags": [
      "메모·노트",
      "업무관리",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "1",
    "tier": "mainstream"
  },
  {
    "id": "productivity-2",
    "name": "Slack",
    "tagline": "채널 기반으로 대화와 파일을 정리하는 팀 메신저",
    "description": "주제별 채널과 다이렉트 메시지로 사내 소통을 구조화하고, 여러 업무 도구를 연결해 알림과 파일을 한 곳에서 확인할 수 있다. 음성·화상 통화 기능도 지원한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fslack.com?w=1200",
    "serviceUrl": "https://slack.com",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "2",
    "tier": "mainstream"
  },
  {
    "id": "productivity-3",
    "name": "Trello",
    "tagline": "칸반 보드로 할 일의 진행 상태를 한눈에 보는 도구",
    "description": "카드를 리스트 사이로 옮기며 작업 단계를 시각적으로 관리하는 보드형 서비스다. 체크리스트, 마감일, 담당자 지정 기능으로 개인 및 소규모 팀 업무를 추적하기 좋다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftrello.com?w=1200",
    "serviceUrl": "https://trello.com",
    "tags": [
      "업무관리",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "3",
    "tier": "mainstream"
  },
  {
    "id": "productivity-4",
    "name": "Asana",
    "tagline": "프로젝트 일정과 담당자를 체계적으로 관리하는 업무관리 플랫폼",
    "description": "작업을 목록, 보드, 타임라인 등 다양한 뷰로 전환해 보며 팀 프로젝트 진행 상황을 추적한다. 작업 간 의존 관계와 마감일 설정으로 일정 관리가 수월하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fasana.com?w=1200",
    "serviceUrl": "https://asana.com",
    "tags": [
      "업무관리",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "4",
    "tier": "mainstream"
  },
  {
    "id": "productivity-5",
    "name": "Todoist",
    "tagline": "개인 할 일과 일정을 간결하게 정리하는 투두리스트 앱",
    "description": "자연어로 할 일을 입력하면 날짜와 반복 주기를 자동 인식해 일정을 등록해 준다. 우선순위와 프로젝트별 분류로 개인 업무를 가볍게 관리할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftodoist.com?w=1200",
    "serviceUrl": "https://todoist.com",
    "tags": [
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "5",
    "tier": "mainstream"
  },
  {
    "id": "productivity-6",
    "name": "ClickUp",
    "tagline": "작업, 문서, 목표관리를 통합한 올인원 업무관리 플랫폼",
    "description": "태스크 관리, 문서 작성, 목표 추적, 화이트보드 기능을 한 서비스 안에 모아 여러 업무 도구를 대체하려는 플랫폼이다. 커스터마이징 가능한 뷰와 자동화 규칙을 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fclickup.com?w=1200",
    "serviceUrl": "https://clickup.com",
    "tags": [
      "업무관리",
      "협업",
      "자동화"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "6",
    "tier": "mainstream"
  },
  {
    "id": "productivity-7",
    "name": "Linear",
    "tagline": "개발팀을 위한 빠르고 정돈된 이슈 트래킹 도구",
    "description": "버그와 기능 요청을 이슈로 등록하고 진행 상태, 우선순위, 사이클을 관리하는 소프트웨어 개발 전용 도구다. 단축키 중심의 빠른 조작감이 특징이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Flinear.app?w=1200",
    "serviceUrl": "https://linear.app",
    "tags": [
      "업무관리",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "7",
    "tier": "mainstream"
  },
  {
    "id": "productivity-8",
    "name": "Monday.com",
    "tagline": "표 형태로 업무 데이터를 관리하는 워크 운영체제",
    "description": "프로젝트, 일정, 고객 관리 등 다양한 업무를 커스텀 가능한 표와 보드로 구성해 관리하는 플랫폼이다. 자동화 규칙을 추가해 반복 작업을 줄일 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fmonday.com?w=1200",
    "serviceUrl": "https://monday.com",
    "tags": [
      "업무관리",
      "자동화",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "8",
    "tier": "mainstream"
  },
  {
    "id": "productivity-9",
    "name": "Evernote",
    "tagline": "텍스트, 사진, 웹클리핑을 모아두는 디지털 노트 서비스",
    "description": "여러 기기에서 작성한 메모와 스캔한 문서, 웹페이지 클리핑을 한 곳에 저장하고 검색할 수 있는 노트 앱이다. 노트북과 태그로 자료를 분류해 정리한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fevernote.com?w=1200",
    "serviceUrl": "https://evernote.com",
    "tags": [
      "메모·노트"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "9",
    "tier": "mainstream"
  },
  {
    "id": "productivity-10",
    "name": "Obsidian",
    "tagline": "메모 간 링크로 지식을 연결하는 네트워크형 노트 앱",
    "description": "마크다운 파일 기반으로 메모를 작성하고, 메모끼리 링크를 걸어 그래프 형태로 생각을 연결해 보여주는 개인 지식관리 도구다. 로컬 파일 저장과 플러그인 확장을 지원한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fobsidian.md?w=1200",
    "serviceUrl": "https://obsidian.md",
    "tags": [
      "메모·노트"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "10",
    "tier": "mainstream"
  },
  {
    "id": "productivity-11",
    "name": "Google Workspace",
    "tagline": "문서, 스프레드시트, 메일, 드라이브를 아우르는 업무용 서비스 묶음",
    "description": "구글 문서, 시트, 프레젠테이션, 드라이브, 메일 등을 하나의 계정으로 연동해 문서 작성과 실시간 공동 편집을 지원하는 업무용 클라우드 도구 모음이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fworkspace.google.com?w=1200",
    "serviceUrl": "https://workspace.google.com",
    "tags": [
      "협업",
      "메모·노트"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "11",
    "tier": "mainstream"
  },
  {
    "id": "productivity-12",
    "name": "Zapier",
    "tagline": "앱과 앱 사이의 반복 작업을 자동으로 연결하는 서비스",
    "description": "트리거와 액션을 설정해 서로 다른 웹 서비스 간 데이터 전달과 반복 업무를 코드 없이 자동화한다. 수천 개의 앱 연동을 지원해 업무 흐름을 간소화한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fzapier.com?w=1200",
    "serviceUrl": "https://zapier.com",
    "tags": [
      "자동화"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "12",
    "tier": "mainstream"
  },
  {
    "id": "productivity-13",
    "name": "Figma",
    "tagline": "실시간 공동 작업이 가능한 브라우저 기반 디자인 협업 도구",
    "description": "여러 사람이 동시에 하나의 디자인 파일을 편집하고 댓글로 피드백을 주고받을 수 있는 디자인 협업 플랫폼이다. 화이트보드 기능인 피그잼도 함께 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.figma.com?w=1200",
    "serviceUrl": "https://www.figma.com",
    "tags": [
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "13",
    "tier": "mainstream"
  },
  {
    "id": "productivity-14",
    "name": "Confluence",
    "tagline": "팀의 문서와 지식을 체계적으로 쌓아가는 위키형 협업 공간",
    "description": "회의록, 기획서, 매뉴얼 등을 페이지로 작성하고 공간별로 정리해 팀 지식베이스를 구축하는 문서 협업 도구다. 지라와 연동해 프로젝트 문서로도 활용된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.atlassian.com%2Fsoftware%2Fconfluence?w=1200",
    "serviceUrl": "https://www.atlassian.com/software/confluence",
    "tags": [
      "메모·노트",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "14",
    "tier": "mainstream"
  },
  {
    "id": "productivity-15",
    "name": "Jira",
    "tagline": "개발 프로젝트의 이슈와 스프린트를 관리하는 업무 트래커",
    "description": "버그, 작업, 스토리를 이슈로 등록하고 보드와 스프린트 단위로 진행 상황을 추적하는 프로젝트 관리 도구다. 애자일 개발 프로세스에 맞춘 기능이 강점이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.atlassian.com%2Fsoftware%2Fjira?w=1200",
    "serviceUrl": "https://www.atlassian.com/software/jira",
    "tags": [
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "15",
    "tier": "mainstream"
  },
  {
    "id": "productivity-16",
    "name": "Flow",
    "tagline": "국내 기업 맞춤형 업무용 협업 메신저 및 태스크 관리 도구",
    "description": "메신저, 전자결재, 할 일 관리 기능을 한 서비스에 담아 국내 조직의 업무 방식에 맞춰 만든 협업 플랫폼이다. 메신저 대화에서 바로 업무를 지시하고 추적할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fflow.team?w=1200",
    "serviceUrl": "https://flow.team",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "16",
    "tier": "mainstream"
  },
  {
    "id": "productivity-17",
    "name": "Dooray!",
    "tagline": "메신저, 메일, 프로젝트관리를 묶은 국내 업무용 협업 플랫폼",
    "description": "메신저, 이메일, 캘린더, 프로젝트 보드를 하나의 서비스로 제공해 조직 내 여러 업무 도구를 대체하려는 국산 협업 솔루션이다. 중소기업과 공공기관에서 많이 쓰인다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.dooray.com?w=1200",
    "serviceUrl": "https://www.dooray.com",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "17",
    "tier": "mainstream"
  },
  {
    "id": "productivity-18",
    "name": "Swit",
    "tagline": "채팅과 업무관리를 한 화면에서 처리하는 협업 플랫폼",
    "description": "메신저 창 옆에 작업 보드를 나란히 배치해 대화와 할 일 처리를 분리하지 않고 진행할 수 있도록 만든 국내 개발 협업 도구다. 외부 서비스 연동 기능도 지원한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.swit.io?w=1200",
    "serviceUrl": "https://www.swit.io",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "18",
    "tier": "mainstream"
  },
  {
    "id": "productivity-19",
    "name": "JANDI",
    "tagline": "국내 중소기업에서 많이 쓰는 토픽 기반 협업 메신저",
    "description": "주제별 토픽방으로 대화를 나누고 파일, 할 일 카드를 공유할 수 있는 국산 업무용 메신저다. 간단한 인터페이스로 소규모 조직의 사내 소통 도구로 자리잡았다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.jandi.com?w=1200",
    "serviceUrl": "https://www.jandi.com",
    "tags": [
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "19",
    "tier": "mainstream"
  },
  {
    "id": "productivity-20",
    "name": "LINE WORKS",
    "tagline": "메신저와 그룹웨어 기능을 함께 담은 업무용 메신저",
    "description": "채팅, 메일, 캘린더, 주소록 등 사내 그룹웨어 기능을 메신저 형태로 묶은 업무용 플랫폼이다. 라인 메신저와 유사한 사용성으로 접근성이 높다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.worksmobile.com?w=1200",
    "serviceUrl": "https://www.worksmobile.com",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "20",
    "tier": "mainstream"
  },
  {
    "id": "productivity-21",
    "name": "Coda",
    "tagline": "문서 안에 표와 자동화 버튼을 넣을 수 있는 올인원 문서 도구",
    "description": "일반 문서처럼 글을 쓰다가 표, 버튼, 자동화 수식을 자유롭게 삽입해 보고서이자 업무 도구로 쓸 수 있는 서비스다. 팀 운영 문서를 앱처럼 만들 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fcoda.io?w=1200",
    "serviceUrl": "https://coda.io",
    "tags": [
      "메모·노트",
      "자동화",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "21",
    "tier": "mainstream"
  },
  {
    "id": "productivity-22",
    "name": "Airtable",
    "tagline": "스프레드시트처럼 쓰는 관계형 데이터베이스 협업 도구",
    "description": "표 형태로 데이터를 입력하면서도 데이터베이스처럼 항목 간 관계를 연결하고 다양한 뷰로 조회할 수 있는 서비스다. 자동화 기능으로 반복 입력 작업도 줄일 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fairtable.com?w=1200",
    "serviceUrl": "https://airtable.com",
    "tags": [
      "업무관리",
      "자동화",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "22",
    "tier": "mainstream"
  },
  {
    "id": "productivity-23",
    "name": "Miro",
    "tagline": "무한 캔버스 위에서 아이디어를 함께 그리는 온라인 화이트보드",
    "description": "포스트잇, 도형, 다이어그램을 자유롭게 배치해 브레인스토밍이나 기획 회의를 진행하는 협업용 화이트보드 서비스다. 여러 사람이 동시에 캔버스를 편집할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fmiro.com?w=1200",
    "serviceUrl": "https://miro.com",
    "tags": [
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "23",
    "tier": "mainstream"
  },
  {
    "id": "productivity-24",
    "name": "Basecamp",
    "tagline": "메시지, 할 일, 일정을 프로젝트 단위로 모아 관리하는 도구",
    "description": "프로젝트마다 메시지보드, 할 일 목록, 일정, 파일함을 세트로 제공해 흩어지기 쉬운 업무 소통을 한 곳에 모으는 관리 플랫폼이다. 단순한 구성으로 알림 피로를 줄인다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fbasecamp.com?w=1200",
    "serviceUrl": "https://basecamp.com",
    "tags": [
      "업무관리",
      "협업"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "24",
    "tier": "mainstream"
  },
  {
    "id": "productivity-25",
    "name": "Make",
    "tagline": "시각적으로 흐름을 그려 여러 앱을 자동 연동하는 도구",
    "description": "노드와 화살표로 데이터 흐름을 그림처럼 설계해 여러 웹 서비스 사이의 작업을 자동화하는 플랫폼이다. 복잡한 조건 분기도 코드 없이 구성할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.make.com?w=1200",
    "serviceUrl": "https://www.make.com",
    "tags": [
      "자동화"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "25",
    "tier": "mainstream"
  },
  {
    "id": "productivity-26",
    "name": "Toggl Track",
    "tagline": "버튼 하나로 업무 시간을 기록하는 타임트래킹 서비스",
    "description": "작업을 시작할 때 타이머를 누르고 끝나면 멈추는 방식으로 개인과 팀의 업무 소요 시간을 기록, 분석하는 도구다. 프로젝트별 리포트로 시간 사용 패턴을 확인할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftoggl.com%2Ftrack%2F?w=1200",
    "serviceUrl": "https://toggl.com/track/",
    "tags": [
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "26",
    "tier": "mainstream"
  },
  {
    "id": "productivity-27",
    "name": "Collabee",
    "tagline": "프로젝트와 업무 메모를 함께 관리하는 국내 협업 서비스",
    "description": "업무 공간마다 일정, 할 일, 메모를 묶어 정리할 수 있는 국산 협업 플랫폼이다. 외부 파트너와의 공동 작업 공간을 따로 만들 수 있는 점이 특징이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fcollabee.co?w=1200",
    "serviceUrl": "https://collabee.co",
    "tags": [
      "협업",
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "27",
    "tier": "mainstream"
  },
  {
    "id": "productivity-28",
    "name": "TickTick",
    "tagline": "할 일과 캘린더, 습관 기록을 함께 관리하는 개인 생산성 앱",
    "description": "할 일 목록에 마감일과 알림을 설정하고 캘린더 뷰로 전환해 일정을 확인할 수 있는 앱이다. 반복 습관 체크 기능도 포함되어 있어 개인 루틴 관리에 쓰인다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fticktick.com?w=1200",
    "serviceUrl": "https://ticktick.com",
    "tags": [
      "업무관리"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "28",
    "tier": "mainstream"
  },

  {
    "id": "productivity-29",
    "name": "Tana",
    "tagline": "회의 중 AI가 바로 일을 처리하는 지능형 회의 플랫폼",
    "description": "Tana는 화상 회의가 진행되는 동안 AI 에이전트가 실시간으로 문서를 작성하고 이슈를 등록하며 맥락 그래프를 업데이트해주는 생산성 도구입니다. 대화 내용을 단순히 기록하는 것을 넘어 회의가 끝나기 전에 후속 업무까지 자동으로 처리되도록 돕습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftana.inc?w=1200",
    "serviceUrl": "https://tana.inc",
    "tags": [
      "메모·노트",
      "자동화",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "29",
    "tier": "emerging"
  },
  {
    "id": "productivity-30",
    "name": "Capacities",
    "tagline": "메모를 폴더가 아닌 연결된 객체로 정리하는 노트 앱",
    "description": "Capacities는 글, 할 일, 인물 등 서로 다른 유형의 정보를 '객체'로 구조화해 저장하고 서로 연결할 수 있는 지식 관리 노트 앱입니다. 파일과 폴더 중심의 전통적인 메모 방식 대신 관계 기반으로 생각을 정리하도록 설계되었습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fcapacities.io?w=1200",
    "serviceUrl": "https://capacities.io",
    "tags": [
      "메모·노트",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "30",
    "tier": "emerging"
  },
  {
    "id": "productivity-31",
    "name": "Akiflow",
    "tagline": "흩어진 일정과 할 일을 한 화면에 모아주는 플래너",
    "description": "Akiflow는 여러 캘린더와 협업 툴에 흩어져 있는 일정과 작업을 하나의 타임블로킹 화면으로 모아주는 업무 관리 앱입니다. AI 비서가 빈 시간을 찾아 일정을 자동 배치해 주 단위 계획 세우기를 도와줍니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fakiflow.com?w=1200",
    "serviceUrl": "https://akiflow.com",
    "tags": [
      "업무관리",
      "자동화",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "31",
    "tier": "emerging"
  },
  {
    "id": "productivity-32",
    "name": "Reclaim.ai",
    "tagline": "우선순위에 맞춰 캘린더를 자동으로 재배치하는 AI 비서",
    "description": "Reclaim.ai는 업무 우선순위와 일정 변화에 맞춰 회의, 할 일, 집중 시간을 자동으로 조정해주는 스마트 스케줄링 서비스입니다. 캘린더 충돌이 생기면 대안을 제시해 승인만으로 일정을 재구성할 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Freclaim.ai?w=1200",
    "serviceUrl": "https://reclaim.ai",
    "tags": [
      "자동화",
      "업무관리",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "32",
    "tier": "emerging"
  },
  {
    "id": "productivity-33",
    "name": "Anytype",
    "tagline": "내 데이터를 직접 소유하는 로컬 우선 노트·협업 공간",
    "description": "Anytype은 모든 기록을 사용자 기기에 암호화해 저장하는 로컬 우선 방식의 노트 및 협업 도구로, 외부 서버에 의존하지 않고도 팀과 정보를 공유할 수 있습니다. 데이터베이스처럼 서로 연결된 블록으로 지식을 구조화하는 것이 특징입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fanytype.io?w=1200",
    "serviceUrl": "https://anytype.io",
    "tags": [
      "메모·노트",
      "협업",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "33",
    "tier": "emerging"
  },
  {
    "id": "productivity-34",
    "name": "Circleback",
    "tagline": "회의가 끝나자마자 할 일을 정리해주는 AI 회의록",
    "description": "Circleback은 화상 회의 내용을 자동으로 요약하고 담당자별 액션 아이템을 추출해 정리해주는 AI 메모 서비스입니다. 과거 회의 기록을 검색 가능한 형태로 쌓아 팀의 업무 맥락을 놓치지 않도록 돕습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fcircleback.ai?w=1200",
    "serviceUrl": "https://circleback.ai",
    "tags": [
      "메모·노트",
      "자동화",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "34",
    "tier": "emerging"
  },
  {
    "id": "productivity-35",
    "name": "Hoop",
    "tagline": "이메일과 메신저 속 할 일을 자동으로 찾아주는 비서",
    "description": "Hoop은 이메일, 슬랙, 회의에서 오간 약속과 할 일을 자동으로 감지해 하나의 작업 목록으로 모아주는 업무 관리 도구입니다. 수작업으로 할 일을 옮겨 적을 필요 없이 맥락까지 함께 저장해 놓쳐도 다시 찾을 수 있게 해줍니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.hoop.app?w=1200",
    "serviceUrl": "https://www.hoop.app",
    "tags": [
      "업무관리",
      "자동화",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "35",
    "tier": "emerging"
  },
  {
    "id": "productivity-36",
    "name": "Sunsama",
    "tagline": "하루 계획을 차분히 세우는 데일리 플래닝 도구",
    "description": "Sunsama는 여러 프로젝트 관리 툴에 흩어진 작업을 끌어와 하루 단위로 할 일을 정리하도록 돕는 일일 계획 앱입니다. 무리한 일정을 피하고 그날 할 수 있는 만큼만 계획하도록 유도하는 방식이 특징입니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.sunsama.com?w=1200",
    "serviceUrl": "https://www.sunsama.com",
    "tags": [
      "업무관리",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "36",
    "tier": "emerging"
  },
  {
    "id": "productivity-37",
    "name": "Gumloop",
    "tagline": "누구나 코드 없이 업무 자동화 에이전트를 만드는 도구",
    "description": "Gumloop은 비개발자도 원하는 업무 흐름을 말로 설명하면 여러 앱과 연동되는 자동화 에이전트를 만들 수 있는 플랫폼입니다. 특정 조건이나 일정에 맞춰 작업을 실행하고 보고서나 대시보드 같은 결과물을 자동 생성합니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.gumloop.com?w=1200",
    "serviceUrl": "https://www.gumloop.com",
    "tags": [
      "자동화",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "37",
    "tier": "emerging"
  },
  {
    "id": "productivity-38",
    "name": "Bati AI",
    "tagline": "메신저부터 문서까지 반복 업무를 대신 처리하는 자동화 서비스",
    "description": "바티AI는 엑셀 정리, 메시지 발송, 문서 작성 같은 반복적인 사무 업무를 비개발자도 쉽게 자동화할 수 있도록 만든 국내 노코드 자동화 플랫폼입니다. 노션, 카카오 등 자주 쓰는 업무 도구와 연동해 워크플로우를 구성할 수 있습니다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fbati.ai?w=1200",
    "serviceUrl": "https://bati.ai",
    "tags": [
      "자동화",
      "업무관리",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "생산성",
    "roomKey": "productivity",
    "number": "38",
    "tier": "emerging"
  },
  ...createCuratedServices('productivity', '생산성', 39, 'emerging', [
    { name: 'Routine', serviceUrl: 'https://routine.co', tagline: '일정, 할 일, 메모를 한 화면에서 정리하는 업무 공간', description: '캘린더와 작업, 노트를 연결해 하루의 계획과 업무 맥락을 한곳에서 관리하도록 돕는 생산성 워크스페이스다.', tags: ['업무관리', '메모·노트'] },
    { name: 'Taskade', serviceUrl: 'https://www.taskade.com', tagline: '프로젝트 보드와 AI 작업 공간을 함께 만드는 협업 도구', description: '할 일 목록, 마인드맵, 프로젝트 보드를 실시간으로 협업하고 자동화 에이전트와 함께 작업 공간을 구성할 수 있다.', tags: ['업무관리', '협업', '자동화'] },
    { name: 'Mem', serviceUrl: 'https://mem.ai', tagline: '메모를 자동으로 연결하고 다시 찾아주는 지식 관리 앱', description: '기록한 메모와 문서를 AI 검색과 자동 정리 기능으로 연결해 개인 지식과 업무 정보를 쉽게 다시 찾도록 돕는다.', tags: ['메모·노트', '자동화'] },
    { name: 'Logseq', serviceUrl: 'https://logseq.com', tagline: '로컬 우선 방식으로 생각과 업무 기록을 연결하는 아웃라이너', description: '일일 노트와 링크 기반 그래프를 사용해 아이디어, 문서, 작업을 연결하는 오픈소스 지식 관리 도구다.', tags: ['메모·노트', '업무관리'] },
    { name: 'Reflect', serviceUrl: 'https://reflect.app', tagline: '네트워크 노트와 캘린더를 연결하는 개인 지식 도구', description: '빠른 메모, 양방향 링크, 캘린더 기록을 연결해 생각과 회의 내용을 정리하고 검색할 수 있는 노트 앱이다.', tags: ['메모·노트', '업무관리'] },
    { name: 'Motion', serviceUrl: 'https://www.usemotion.com', tagline: '할 일과 캘린더를 자동으로 배치해 하루를 계획하는 앱', description: '작업의 우선순위와 마감일을 캘린더 일정에 맞춰 배치하고, 일정 변화에 따라 계획을 다시 조정하는 업무 관리 서비스다.', tags: ['업무관리', '자동화'] },
    { name: 'Heptabase', serviceUrl: 'https://heptabase.com', tagline: '카드와 화이트보드로 복잡한 지식을 시각화하는 노트 앱', description: '자료와 생각을 카드로 기록하고 화이트보드에서 시각적으로 연결해 연구와 프로젝트의 맥락을 정리하도록 돕는다.', tags: ['메모·노트', '협업'] },
    { name: 'Superlist', serviceUrl: 'https://www.superlist.com', tagline: '개인 할 일과 팀 프로젝트를 한곳에서 관리하는 앱', description: '작업 목록을 개인과 팀 단위로 만들고 문서, 체크리스트, 협업 기능을 함께 사용해 계획을 실행으로 옮길 수 있다.', tags: ['업무관리', '협업'] },
    { name: 'Granola', serviceUrl: 'https://www.granola.ai', tagline: '회의 메모와 대화를 정리해 후속 작업을 만드는 노트 앱', description: '회의 중 작성한 메모를 대화 맥락과 결합해 정리하고, 핵심 내용과 다음에 할 일을 빠르게 확인할 수 있도록 돕는다.', tags: ['메모·노트', '자동화'] },
    { name: 'Readwise', serviceUrl: 'https://readwise.io', tagline: '책과 웹에서 저장한 하이라이트를 다시 읽고 정리하는 도구', description: '전자책과 웹에서 수집한 하이라이트를 한곳에 모으고, 주기적인 복습과 노트 앱 연동으로 지식이 잊히지 않도록 돕는다.', tags: ['메모·노트', '자동화'] },
    { name: 'Morgen', serviceUrl: 'https://www.morgen.so', tagline: '여러 캘린더와 할 일을 하나의 일정 화면으로 모으는 앱', description: '여러 일정 서비스와 작업 관리 도구를 연결하고, 드래그 앤 드롭 방식으로 하루의 계획을 조정할 수 있다.', tags: ['업무관리', '자동화'] },
    { name: 'FlowSavvy', serviceUrl: 'https://flowsavvy.app', tagline: '할 일의 남은 시간을 캘린더에 자동으로 배치하는 도구', description: '작업 시간과 마감일을 입력하면 빈 시간을 찾아 일정을 자동 배치하고, 새 일정이 생길 때 계획을 다시 계산한다.', tags: ['업무관리', '자동화'] },
    { name: 'Slite', serviceUrl: 'https://slite.com', tagline: '팀의 문서와 질문을 검색 가능한 지식 공간으로 정리하는 앱', description: '팀 문서와 절차, 회의 기록을 공동 편집하고 검색해 조직의 지식을 한곳에서 공유하도록 지원한다.', tags: ['메모·노트', '협업'] },
    { name: 'Fibery', serviceUrl: 'https://fibery.io', tagline: '업무 데이터와 팀 프로세스를 연결해 만드는 맞춤형 작업 공간', description: '문서, 데이터베이스, 업무 프로세스를 연결해 제품과 조직에 맞는 협업 공간을 직접 구성할 수 있는 플랫폼이다.', tags: ['업무관리', '협업'] },
    { name: 'Fellow', serviceUrl: 'https://fellow.app', tagline: '회의 안건과 결정 사항, 후속 작업을 팀과 함께 기록하는 도구', description: '회의 전 안건 작성부터 회의 중 메모와 회의 후 실행 항목 관리까지 팀의 회의 흐름을 한곳에서 정리한다.', tags: ['협업', '업무관리'] },
    { name: 'Fathom', serviceUrl: 'https://fathom.video', tagline: '온라인 회의를 기록하고 핵심 순간을 찾아주는 회의 도구', description: '화상 회의를 녹화·전사하고 핵심 구간과 요약을 공유해 팀이 대화 내용을 다시 확인하고 후속 작업을 정리하도록 돕는다.', tags: ['자동화', '협업'] },
    { name: 'tl;dv', serviceUrl: 'https://tldv.io', tagline: '회의 녹화와 요약을 팀 지식으로 재사용하는 서비스', description: '화상 회의를 녹화하고 전사·요약해 팀과 공유하며, 회의 내용을 검색하고 고객 대화의 반복 주제를 파악할 수 있다.', tags: ['자동화', '협업'] },
    { name: 'Fireflies.ai', serviceUrl: 'https://fireflies.ai', tagline: '회의 대화를 전사하고 검색 가능한 기록으로 바꾸는 AI 노트', description: '온라인 회의에 참여해 대화를 전사·요약하고 주요 결정과 할 일을 검색할 수 있도록 정리하는 회의 생산성 도구다.', tags: ['자동화', '메모·노트'] },
    { name: 'Bardeen', serviceUrl: 'https://www.bardeen.ai', tagline: '반복되는 웹 업무를 자동화하는 브라우저 기반 도구', description: '웹 앱 사이에서 반복하는 데이터 수집과 입력 작업을 자동화하고, 재사용 가능한 워크플로로 업무 시간을 줄이도록 돕는다.', tags: ['자동화', '업무관리'] },
    { name: 'Relay.app', serviceUrl: 'https://www.relay.app', tagline: '사람의 확인 단계를 포함해 업무 흐름을 자동화하는 플랫폼', description: '여러 업무 도구를 연결해 자동화 흐름을 만들고, 필요한 단계에서 사람이 검토하거나 승인하도록 구성할 수 있다.', tags: ['자동화', '협업'] },
  ]),
];
