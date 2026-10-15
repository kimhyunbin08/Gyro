import type { CatalogService } from '../catalog.js';

export const snsCatalog: CatalogService[] = [
  {
    "id": "sns-1",
    "name": "X (Twitter)",
    "tagline": "짧은 글과 실시간 반응으로 세상 소식을 나누는 공간",
    "description": "140자 안팎의 짧은 글, 이미지, 영상을 올려 즉각적으로 의견을 주고받는 실시간 소셜 플랫폼이다. 뉴스, 트렌드, 팬덤 이야기가 빠르게 퍼지는 공론장 역할을 한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fx.com?w=1200",
    "serviceUrl": "https://x.com",
    "tags": [
      "소통",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "1"
  },
  {
    "id": "sns-2",
    "name": "Threads",
    "tagline": "인스타그램 계정으로 바로 쓰는 텍스트 중심 대화 공간",
    "description": "메타가 만든 텍스트 기반 소셜 서비스로, 인스타그램 계정을 그대로 연결해 글과 사진으로 일상과 생각을 공유한다. 팔로우한 사람들의 글에 답글을 달며 대화를 이어간다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.threads.net?w=1200",
    "serviceUrl": "https://www.threads.net",
    "tags": [
      "소통",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "2"
  },
  {
    "id": "sns-3",
    "name": "Instagram",
    "tagline": "사진과 짧은 영상으로 일상을 전시하는 대표 이미지 SNS",
    "description": "사진과 릴스 영상을 중심으로 일상을 기록하고 팔로워와 나누는 서비스다. 해시태그와 탐색 탭을 통해 관심사 기반으로 새로운 계정을 발견할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.instagram.com?w=1200",
    "serviceUrl": "https://www.instagram.com",
    "tags": [
      "콘텐츠공유",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "3"
  },
  {
    "id": "sns-4",
    "name": "Facebook",
    "tagline": "친구, 가족, 그룹을 연결하는 종합 소셜 네트워크",
    "description": "프로필과 타임라인을 중심으로 지인들과 소식을 주고받고, 관심 그룹이나 페이지를 통해 커뮤니티 활동도 할 수 있는 종합 소셜 플랫폼이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.facebook.com?w=1200",
    "serviceUrl": "https://www.facebook.com",
    "tags": [
      "네트워킹",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "4"
  },
  {
    "id": "sns-5",
    "name": "LinkedIn",
    "tagline": "경력과 이력을 바탕으로 연결되는 비즈니스 인맥망",
    "description": "직무 경험과 이력서를 프로필로 등록하고 동료, 채용 담당자와 연결되는 비즈니스 전문 네트워킹 서비스다. 채용 공고 탐색과 업계 인사이트 공유도 이루어진다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.linkedin.com?w=1200",
    "serviceUrl": "https://www.linkedin.com",
    "tags": [
      "네트워킹"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "5"
  },
  {
    "id": "sns-6",
    "name": "Discord",
    "tagline": "관심사별 서버에 모여 채팅과 음성으로 소통하는 커뮤니티",
    "description": "게임, 취미, 스터디 등 주제별 서버를 만들어 텍스트와 음성 채널로 소통하는 커뮤니티 플랫폼이다. 실시간 음성 대화와 화면 공유 기능이 강점이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fdiscord.com?w=1200",
    "serviceUrl": "https://discord.com",
    "tags": [
      "커뮤니티",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "6"
  },
  {
    "id": "sns-7",
    "name": "Bluesky",
    "tagline": "분산형 기술 기반의 탈중앙화 타임라인 SNS",
    "description": "AT 프로토콜이라는 개방형 기술 위에서 작동하는 분산형 소셜 네트워크로, 짧은 글과 이미지를 공유한다. 사용자가 알고리즘과 데이터를 직접 선택할 수 있는 구조가 특징이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fbsky.app?w=1200",
    "serviceUrl": "https://bsky.app",
    "tags": [
      "소통",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "7"
  },
  {
    "id": "sns-8",
    "name": "Mastodon",
    "tagline": "서버를 골라 가입하는 오픈소스 탈중앙화 SNS",
    "description": "하나의 회사가 아닌 여러 독립 서버가 연결된 연합형 구조의 오픈소스 소셜 네트워크다. 관심사에 맞는 서버에 가입해 짧은 글을 올리고 다른 서버 이용자와도 교류한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fjoinmastodon.org?w=1200",
    "serviceUrl": "https://joinmastodon.org",
    "tags": [
      "커뮤니티",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "8"
  },
  {
    "id": "sns-9",
    "name": "Reddit",
    "tagline": "주제별 게시판에서 토론하고 추천하는 커뮤니티 포럼",
    "description": "서브레딧이라는 주제별 게시판에 글을 올리고 추천수로 인기 게시물을 가리는 토론형 커뮤니티다. 전 세계 다양한 취미와 이슈에 대한 깊은 토론이 오간다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.reddit.com?w=1200",
    "serviceUrl": "https://www.reddit.com",
    "tags": [
      "커뮤니티",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "9"
  },
  {
    "id": "sns-10",
    "name": "Snapchat",
    "tagline": "사라지는 사진 메시지로 친구와 가볍게 교류하는 앱",
    "description": "보낸 사진과 영상이 확인 후 사라지는 방식으로 친구들과 즉흥적인 순간을 나누는 메신저형 SNS다. 증강현실 필터와 스토리 기능으로 재미를 더한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.snapchat.com?w=1200",
    "serviceUrl": "https://www.snapchat.com",
    "tags": [
      "소통",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "10"
  },
  {
    "id": "sns-11",
    "name": "BeReal",
    "tagline": "하루 한 번, 꾸미지 않은 순간을 동시에 찍는 앱",
    "description": "하루 중 무작위 시간에 알림이 오면 전후면 카메라로 그 순간을 그대로 찍어 친구들과 공유하는 서비스다. 보정 없는 일상 공유를 지향한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fbereal.com?w=1200",
    "serviceUrl": "https://bereal.com",
    "tags": [
      "소통",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "11"
  },
  {
    "id": "sns-12",
    "name": "Nextdoor",
    "tagline": "우리 동네 이웃과 정보를 나누는 지역 기반 커뮤니티",
    "description": "실제 거주 주소를 인증하고 가입하는 지역 기반 커뮤니티로, 동네 소식, 추천 업체, 분실물 정보 등을 이웃과 주고받는다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fnextdoor.com?w=1200",
    "serviceUrl": "https://nextdoor.com",
    "tags": [
      "커뮤니티",
      "네트워킹"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "12"
  },
  {
    "id": "sns-13",
    "name": "Clubhouse",
    "tagline": "실시간 음성 대화방에서 주제별로 이야기 나누는 앱",
    "description": "글이나 영상 없이 음성만으로 진행되는 실시간 대화방 서비스다. 관심 주제의 방에 들어가 듣기만 하거나 직접 발언하며 토론에 참여할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.clubhouse.com?w=1200",
    "serviceUrl": "https://www.clubhouse.com",
    "tags": [
      "소통",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "13"
  },
  {
    "id": "sns-14",
    "name": "Lemon8",
    "tagline": "라이프스타일 정보를 카드 형태로 공유하는 비주얼 플랫폼",
    "description": "뷰티, 패션, 맛집 같은 라이프스타일 콘텐츠를 사진과 짧은 글로 엮은 카드 형태로 올리는 서비스다. 관심사 기반 피드로 취향에 맞는 콘텐츠를 추천받는다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.lemon8-app.com?w=1200",
    "serviceUrl": "https://www.lemon8-app.com",
    "tags": [
      "콘텐츠공유",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "14"
  },
  {
    "id": "sns-15",
    "name": "TikTok",
    "tagline": "짧은 영상으로 트렌드를 만들고 따라가는 숏폼 플랫폼",
    "description": "음악과 효과를 더한 짧은 영상을 올리고 알고리즘 추천 피드를 통해 전 세계 이용자와 트렌드를 공유하는 숏폼 영상 서비스다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.tiktok.com?w=1200",
    "serviceUrl": "https://www.tiktok.com",
    "tags": [
      "콘텐츠공유",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "15"
  },
  {
    "id": "sns-16",
    "name": "Pinterest",
    "tagline": "원하는 이미지를 모아 보는 아이디어 수집 플랫폼",
    "description": "인테리어, 패션, 요리 등 관심 있는 이미지를 핀으로 저장하고 보드에 모아 분류하는 아이디어 큐레이션 서비스다. 비슷한 취향의 이용자 콘텐츠도 추천받는다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.pinterest.com?w=1200",
    "serviceUrl": "https://www.pinterest.com",
    "tags": [
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "16"
  },
  {
    "id": "sns-17",
    "name": "WeChat",
    "tagline": "메시지부터 결제까지 아우르는 중국의 종합 생활 앱",
    "description": "채팅, 음성 통화, 모멘트라는 소셜 피드, 간편 결제까지 하나로 묶은 중국의 대표 종합 메신저형 플랫폼이다. 일상 전반을 아우르는 슈퍼앱으로 자리 잡았다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.wechat.com?w=1200",
    "serviceUrl": "https://www.wechat.com",
    "tags": [
      "소통",
      "네트워킹"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "17"
  },
  {
    "id": "sns-18",
    "name": "LINE",
    "tagline": "채팅과 타임라인으로 일상을 나누는 아시아권 메신저",
    "description": "1:1 및 그룹 채팅을 기본으로, 타임라인에 사진과 글을 올려 지인들과 근황을 공유하는 메신저 기반 소셜 서비스다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fline.me?w=1200",
    "serviceUrl": "https://line.me",
    "tags": [
      "소통",
      "네트워킹"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "18"
  },
  {
    "id": "sns-19",
    "name": "Telegram",
    "tagline": "대용량 채널과 보안 메시지를 지원하는 글로벌 메신저",
    "description": "암호화된 채팅은 물론 수만 명이 모이는 공개 채널과 그룹을 운영할 수 있는 메신저형 플랫폼이다. 뉴스 채널부터 취미 커뮤니티까지 폭넓게 활용된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftelegram.org?w=1200",
    "serviceUrl": "https://telegram.org",
    "tags": [
      "소통",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "19"
  },
  {
    "id": "sns-20",
    "name": "Weverse",
    "tagline": "아티스트와 팬이 직접 소통하는 K팝 팬덤 커뮤니티",
    "description": "좋아하는 아티스트의 소식과 영상 콘텐츠를 보고, 댓글과 메시지로 직접 소통할 수 있는 팬 커뮤니티 플랫폼이다. 공연 영상과 피드 포스트도 함께 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fweverse.io?w=1200",
    "serviceUrl": "https://weverse.io",
    "tags": [
      "커뮤니티",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "20"
  },
  {
    "id": "sns-21",
    "name": "VSCO",
    "tagline": "필터 없이 담백한 사진으로 보여주는 감성 갤러리",
    "description": "사진 보정 도구와 함께 광고성 피드 없이 깔끔한 이미지 중심 갤러리를 운영하는 서비스다. 좋아요나 댓글 수를 강조하지 않는 담백한 공유 방식이 특징이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fvsco.co?w=1200",
    "serviceUrl": "https://vsco.co",
    "tags": [
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "21"
  },
  {
    "id": "sns-22",
    "name": "Tumblr",
    "tagline": "글, 그림, 짧은 영상을 자유롭게 섞어 쓰는 블로그형 SNS",
    "description": "짧은 글부터 이미지, GIF까지 형식 제약 없이 올리고 리블로그로 콘텐츠를 퍼뜨리는 블로그형 소셜 서비스다. 특정 취향의 서브컬처 커뮤니티가 활발하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.tumblr.com?w=1200",
    "serviceUrl": "https://www.tumblr.com",
    "tags": [
      "콘텐츠공유",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "22"
  },
  {
    "id": "sns-23",
    "name": "Strava",
    "tagline": "운동 기록을 공유하며 서로 응원하는 스포츠 SNS",
    "description": "달리기, 라이딩 같은 운동 기록을 자동으로 남기고 친구들과 경로, 기록을 비교하며 응원을 주고받는 피트니스 중심 소셜 플랫폼이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.strava.com?w=1200",
    "serviceUrl": "https://www.strava.com",
    "tags": [
      "커뮤니티",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "23"
  },
  {
    "id": "sns-24",
    "name": "Letterboxd",
    "tagline": "본 영화를 기록하고 취향을 나누는 영화 애호가 커뮤니티",
    "description": "관람한 영화에 별점과 리뷰를 남기고 목록을 만들어 다른 영화 팬들과 취향을 공유하는 커뮤니티형 서비스다. 팔로우한 이용자의 감상도 피드로 확인한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fletterboxd.com?w=1200",
    "serviceUrl": "https://letterboxd.com",
    "tags": [
      "커뮤니티",
      "콘텐츠공유"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "24"
  },
  {
    "id": "sns-25",
    "name": "Locket",
    "tagline": "친한 친구에게만 사진을 바로 보여주는 위젯 공유 앱",
    "description": "스마트폰 홈 화면 위젯에 사진을 올리면 선택한 친구의 위젯에도 바로 나타나는 소규모 친밀 공유 서비스다. 가까운 사람과의 일상 공유에 집중한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Flocket.camera?w=1200",
    "serviceUrl": "https://locket.camera",
    "tags": [
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "25"
  },
  {
    "id": "sns-26",
    "name": "Yubo",
    "tagline": "라이브 방송으로 또래를 만나는 영상 기반 소셜 앱",
    "description": "실시간 라이브 방송과 그룹 채팅을 통해 관심사가 비슷한 또래 이용자를 만나는 영상 중심 소셜 네트워킹 서비스다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.yubo.live?w=1200",
    "serviceUrl": "https://www.yubo.live",
    "tags": [
      "네트워킹",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "26"
  },
  {
    "id": "sns-27",
    "name": "당근 (당근마켓)",
    "tagline": "동네 이웃과 물건부터 정보까지 나누는 지역 커뮤니티",
    "description": "중고 물품 거래를 중심으로 시작해 동네 소식, 모임, 가게 정보까지 다루는 지역 기반 생활 커뮤니티 플랫폼이다. 가까운 이웃과의 연결을 강조한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.daangn.com?w=1200",
    "serviceUrl": "https://www.daangn.com",
    "tags": [
      "커뮤니티",
      "네트워킹"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "27"
  },
  {
    "id": "sns-28",
    "name": "네이버 밴드",
    "tagline": "모임과 소모임을 운영하기 좋은 그룹형 커뮤니티 앱",
    "description": "동호회, 학교 모임, 가족 단위 그룹을 만들어 게시판, 사진첩, 일정을 함께 관리하는 그룹 전용 커뮤니티 서비스다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.band.us?w=1200",
    "serviceUrl": "https://www.band.us",
    "tags": [
      "커뮤니티",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "28"
  },
  {
    "id": "sns-29",
    "name": "에브리타임",
    "tagline": "시간표 관리와 익명 게시판을 함께 쓰는 대학생 커뮤니티",
    "description": "대학생들이 강의 시간표를 관리하면서 학교별 익명 게시판에서 정보와 일상을 나누는 캠퍼스 전용 커뮤니티 서비스다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Feverytime.kr?w=1200",
    "serviceUrl": "https://everytime.kr",
    "tags": [
      "커뮤니티",
      "소통"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "SNS",
    "roomKey": "sns",
    "number": "29"
  }
];
