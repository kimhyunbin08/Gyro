import type { CatalogService } from '../catalog.js';

export const gameCatalog: CatalogService[] = [
  {
    "id": "game-1",
    "name": "Steam",
    "tagline": "PC 게임을 사고 즐기는 가장 큰 디지털 장터",
    "description": "밸브가 운영하는 PC 게임 유통 플랫폼으로 수만 종의 게임을 구매, 설치, 실행할 수 있다. 커뮤니티 리뷰와 도전과제, 워크숍 등 부가 기능도 함께 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com?w=1200",
    "serviceUrl": "https://store.steampowered.com",
    "tags": [
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "1",
    "tier": "mainstream"
  },
  {
    "id": "game-2",
    "name": "Discord",
    "tagline": "게이머들이 모여 음성·텍스트로 소통하는 공간",
    "description": "실시간 음성 채팅과 텍스트 채널을 제공하는 메신저로, 게임 길드와 커뮤니티 서버 운영에 널리 쓰인다. 봇과 화면 공유 기능으로 협업 플레이를 돕는다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fdiscord.com?w=1200",
    "serviceUrl": "https://discord.com",
    "tags": [
      "커뮤니티",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "2",
    "tier": "mainstream"
  },
  {
    "id": "game-3",
    "name": "Twitch",
    "tagline": "게임 방송과 e스포츠를 실시간으로 보는 스트리밍 채널",
    "description": "아마존이 운영하는 실시간 스트리밍 서비스로 게임 플레이 중계와 채팅 소통이 핵심이다. e스포츠 대회 생중계와 구독 후원 기능도 지원한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.twitch.tv?w=1200",
    "serviceUrl": "https://www.twitch.tv",
    "tags": [
      "커뮤니티",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "3",
    "tier": "mainstream"
  },
  {
    "id": "game-4",
    "name": "Epic Games Store",
    "tagline": "무료 게임 배포로 유명한 에픽의 게임 스토어",
    "description": "에픽게임즈가 운영하는 디지털 게임 판매 플랫폼으로 매주 무료 게임 증정 이벤트로 알려져 있다. 언리얼 엔진 기반 타이틀과 독점작도 다수 유통한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.epicgames.com?w=1200",
    "serviceUrl": "https://store.epicgames.com",
    "tags": [
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "4",
    "tier": "mainstream"
  },
  {
    "id": "game-5",
    "name": "itch.io",
    "tagline": "인디 개발자의 창작 게임을 자유롭게 올리는 장터",
    "description": "독립 개발자와 소규모 팀이 직접 가격을 정해 게임을 업로드하고 판매할 수 있는 개방형 플랫폼이다. 게임잼 결과물도 많이 공유된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fitch.io?w=1200",
    "serviceUrl": "https://itch.io",
    "tags": [
      "커뮤니티",
      "캐주얼"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "5",
    "tier": "mainstream"
  },
  {
    "id": "game-6",
    "name": "Roblox",
    "tagline": "누구나 게임을 만들고 함께 즐기는 메타버스 플랫폼",
    "description": "이용자가 직접 미니게임을 제작해 공유하고 다른 사람들과 함께 플레이할 수 있는 플랫폼이다. 어린 연령층에게 특히 인기가 많다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.roblox.com?w=1200",
    "serviceUrl": "https://www.roblox.com",
    "tags": [
      "캐주얼",
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "6",
    "tier": "mainstream"
  },
  {
    "id": "game-7",
    "name": "Among Us",
    "tagline": "우주선 속 숨은 배신자를 찾는 추리 파티게임",
    "description": "승무원과 임포스터로 나뉘어 임무 수행과 거짓말을 통해 정체를 숨기거나 밝혀내는 소셜 추리 게임이다. 가볍게 여럿이 즐기기 좋다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Finnersloth.com%2Fgame-among-us%2F?w=1200",
    "serviceUrl": "https://innersloth.com/game-among-us/",
    "tags": [
      "캐주얼",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "7",
    "tier": "mainstream"
  },
  {
    "id": "game-8",
    "name": "Genshin Impact",
    "tagline": "광활한 오픈월드를 탐험하는 원소 액션 RPG",
    "description": "호요버스가 서비스하는 오픈월드 액션 RPG로 다양한 캐릭터를 모아 원소 조합 전투를 즐길 수 있다. 정기 업데이트로 스토리와 지역이 꾸준히 확장된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fgenshin.hoyoverse.com?w=1200",
    "serviceUrl": "https://genshin.hoyoverse.com",
    "tags": [
      "멀티플레이어",
      "전략"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "8",
    "tier": "mainstream"
  },
  {
    "id": "game-9",
    "name": "League of Legends",
    "tagline": "전세계 e스포츠의 중심이 된 5대5 전략 대전",
    "description": "라이엇게임즈의 대표작으로 두 팀이 챔피언을 조작해 상대 진영을 파괴하는 AOS 장르다. 전략적 팀플레이와 세계적인 프로리그로 유명하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.leagueoflegends.com?w=1200",
    "serviceUrl": "https://www.leagueoflegends.com",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "9",
    "tier": "mainstream"
  },
  {
    "id": "game-10",
    "name": "Minecraft",
    "tagline": "블록을 쌓고 세계를 창조하는 샌드박스의 원조",
    "description": "블록으로 이루어진 세계를 탐험하며 건축, 생존, 모험을 자유롭게 즐기는 샌드박스 게임이다. 혼자서도, 친구들과 서버에 모여서도 플레이할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.minecraft.net?w=1200",
    "serviceUrl": "https://www.minecraft.net",
    "tags": [
      "캐주얼",
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "10",
    "tier": "mainstream"
  },
  {
    "id": "game-11",
    "name": "VALORANT",
    "tagline": "요원별 특수능력으로 겨루는 5대5 전술 슈팅",
    "description": "라이엇게임즈의 택티컬 슈터로 요원 고유 스킬과 정밀한 사격을 조합한 전략이 승패를 가른다. 공격과 수비를 번갈아 수행하는 라운드제로 진행된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fplayvalorant.com?w=1200",
    "serviceUrl": "https://playvalorant.com",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "11",
    "tier": "mainstream"
  },
  {
    "id": "game-12",
    "name": "PUBG: BATTLEGROUNDS",
    "tagline": "배틀로얄 장르를 대중화시킨 생존 슈팅",
    "description": "크래프톤이 개발한 배틀로얄 게임으로 넓은 맵에서 100명이 최후의 1인 또는 1팀을 가린다. 자기장 압박 속 보급과 전투 전략이 핵심이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fpubg.com?w=1200",
    "serviceUrl": "https://pubg.com",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "12",
    "tier": "mainstream"
  },
  {
    "id": "game-13",
    "name": "GeForce NOW",
    "tagline": "고사양 PC 없이 즐기는 엔비디아 클라우드 게이밍",
    "description": "엔비디아 서버에서 게임을 구동해 각종 기기로 스트리밍하는 클라우드 게이밍 서비스다. 보유 중인 스토어 게임 라이브러리를 그대로 불러와 실행할 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.nvidia.com%2Fen-us%2Fgeforce-now%2F?w=1200",
    "serviceUrl": "https://www.nvidia.com/en-us/geforce-now/",
    "tags": [
      "캐주얼",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "13",
    "tier": "mainstream"
  },
  {
    "id": "game-14",
    "name": "Xbox Cloud Gaming",
    "tagline": "콘솔 없이 어디서나 즐기는 마이크로소프트 클라우드 게임",
    "description": "마이크로소프트의 클라우드 스트리밍 서비스로 Xbox 타이틀을 PC, 모바일 등 다양한 기기에서 실행할 수 있다. 게임패스 구독과 연동되어 운영된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.xbox.com%2Fen-US%2Fplay?w=1200",
    "serviceUrl": "https://www.xbox.com/en-US/play",
    "tags": [
      "멀티플레이어",
      "캐주얼"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "14",
    "tier": "mainstream"
  },
  {
    "id": "game-15",
    "name": "Nintendo Switch Online",
    "tagline": "온라인 대전과 클래식 게임을 담은 닌텐도 구독 서비스",
    "description": "닌텐도 스위치의 온라인 멀티플레이 기능과 레트로 게임 라이브러리를 제공하는 구독형 서비스다. 세이브 데이터 클라우드 백업도 지원한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.nintendo.com%2Fswitch%2Fonline-service%2F?w=1200",
    "serviceUrl": "https://www.nintendo.com/switch/online-service/",
    "tags": [
      "캐주얼",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "15",
    "tier": "mainstream"
  },
  {
    "id": "game-16",
    "name": "Xbox Game Pass",
    "tagline": "매달 구독료로 수백 종 게임을 즐기는 라이브러리",
    "description": "마이크로소프트의 월정액 구독 서비스로 콘솔, PC, 클라우드에서 다양한 게임을 제한 없이 즐길 수 있다. 신작이 출시 당일 추가되는 경우도 많다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.xbox.com%2Fen-US%2Fxbox-game-pass?w=1200",
    "serviceUrl": "https://www.xbox.com/en-US/xbox-game-pass",
    "tags": [
      "멀티플레이어",
      "캐주얼"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "16",
    "tier": "mainstream"
  },
  {
    "id": "game-17",
    "name": "카트라이더: 드리프트",
    "tagline": "넥슨의 국민 레이싱 게임, 드리프트로 재탄생",
    "description": "카트를 몰고 트랙을 질주하며 드리프트 기술로 순위를 다투는 넥슨의 레이싱 게임이다. 기존 카트라이더의 감성을 계승해 크로스플랫폼으로 서비스된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fkartdrift.nexon.com?w=1200",
    "serviceUrl": "https://kartdrift.nexon.com",
    "tags": [
      "캐주얼",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "17",
    "tier": "mainstream"
  },
  {
    "id": "game-18",
    "name": "서든어택",
    "tagline": "국내 FPS 1세대를 이끈 넥슨의 밀리터리 슈팅",
    "description": "팀 대전 중심의 국내 FPS로 폭파, 섬멸 등 다양한 모드로 오랜 기간 사랑받아온 넥슨의 대표 슈팅 게임이다. PC방 문화와 함께 성장한 타이틀이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fsa.nexon.com?w=1200",
    "serviceUrl": "https://sa.nexon.com",
    "tags": [
      "멀티플레이어",
      "전략"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "18",
    "tier": "mainstream"
  },
  {
    "id": "game-19",
    "name": "로스트아크",
    "tagline": "방대한 세계를 모험하는 스마일게이트의 액션 MMORPG",
    "description": "쿼터뷰 시점의 액션 전투와 다양한 클래스, 레이드 콘텐츠를 즐기는 대규모 온라인 RPG다. 길드 활동과 협동 던전 공략이 핵심 재미 요소다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Flostark.game.onstove.com?w=1200",
    "serviceUrl": "https://lostark.game.onstove.com",
    "tags": [
      "전략",
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "19",
    "tier": "mainstream"
  },
  {
    "id": "game-20",
    "name": "메이플스토리",
    "tagline": "20년 넘게 이어온 넥슨의 2D 사이드 스크롤 RPG",
    "description": "귀여운 그래픽과 다양한 직업군으로 꾸준한 인기를 얻어온 국산 대표 온라인 RPG다. 보스 레이드와 메이플 월드 이벤트가 지속적으로 추가된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fmaplestory.nexon.com?w=1200",
    "serviceUrl": "https://maplestory.nexon.com",
    "tags": [
      "캐주얼",
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "20",
    "tier": "mainstream"
  },
  {
    "id": "game-21",
    "name": "배틀그라운드 모바일",
    "tagline": "손안에서 즐기는 PUBG 배틀로얄",
    "description": "PC 버전 PUBG의 생존 배틀로얄을 모바일 최적화로 구현한 게임이다. 간편한 조작과 다양한 모드로 전 세계 모바일 이용자에게 인기가 높다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.pubgmobile.com?w=1200",
    "serviceUrl": "https://www.pubgmobile.com",
    "tags": [
      "멀티플레이어",
      "전략"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "21",
    "tier": "mainstream"
  },
  {
    "id": "game-22",
    "name": "오버워치 2",
    "tagline": "개성 넘치는 영웅들의 5대5 팀 대전 슈팅",
    "description": "블리자드가 만든 히어로 슈터로 각기 다른 역할의 영웅을 선택해 팀 전략을 짜는 것이 핵심이다. 공격, 수비, 지원 역할군의 조합이 승부를 가른다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Foverwatch.blizzard.com?w=1200",
    "serviceUrl": "https://overwatch.blizzard.com",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "22",
    "tier": "mainstream"
  },
  {
    "id": "game-23",
    "name": "World of Warcraft",
    "tagline": "20년 역사를 이어온 블리자드의 대표 MMORPG",
    "description": "방대한 판타지 세계 아제로스를 배경으로 퀘스트, 레이드, PvP를 즐기는 대규모 다중접속 역할수행게임이다. 길드 단위 협동 공략 문화가 유명하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fworldofwarcraft.blizzard.com?w=1200",
    "serviceUrl": "https://worldofwarcraft.blizzard.com",
    "tags": [
      "전략",
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "23",
    "tier": "mainstream"
  },
  {
    "id": "game-24",
    "name": "Fortnite",
    "tagline": "건설과 전투를 결합한 에픽게임즈의 배틀로얄",
    "description": "맵에서 구조물을 지으며 싸우는 독특한 배틀로얄 게임으로 각종 콜라보 콘텐츠와 시즌 이벤트가 꾸준히 이어진다. 크리에이티브 모드로 자작 맵 제작도 가능하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.fortnite.com?w=1200",
    "serviceUrl": "https://www.fortnite.com",
    "tags": [
      "캐주얼",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "24",
    "tier": "mainstream"
  },
  {
    "id": "game-25",
    "name": "Apex Legends",
    "tagline": "개성 있는 레전드들이 겨루는 3인조 배틀로얄 슈팅",
    "description": "각기 다른 능력을 가진 캐릭터 '레전드'를 선택해 3인 1팀으로 생존을 겨루는 FPS다. 핑 시스템으로 팀워크를 돕는 전략성이 특징이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.ea.com%2Fgames%2Fapex-legends?w=1200",
    "serviceUrl": "https://www.ea.com/games/apex-legends",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "25",
    "tier": "mainstream"
  },
  {
    "id": "game-26",
    "name": "Minecraft Realms",
    "tagline": "친구들과 안전하게 즐기는 마인크래프트 전용 서버",
    "description": "마인크래프트 공식 호스팅 서버 구독 서비스로 지인들과 자신만의 월드를 꾸준히 운영할 수 있다. 서버 관리 지식 없이도 손쉽게 멀티플레이를 즐길 수 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.minecraft.net%2Fen-us%2Frealms?w=1200",
    "serviceUrl": "https://www.minecraft.net/en-us/realms",
    "tags": [
      "커뮤니티",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "26",
    "tier": "mainstream"
  },
  {
    "id": "game-27",
    "name": "배틀넷 (Battle.net)",
    "tagline": "블리자드 게임을 모아 관리하는 통합 런처",
    "description": "오버워치, 디아블로, 스타크래프트 등 블리자드의 다양한 타이틀을 설치, 실행, 업데이트하는 통합 플랫폼이다. 친구 목록과 인게임 소셜 기능도 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fbattle.net?w=1200",
    "serviceUrl": "https://battle.net",
    "tags": [
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "27",
    "tier": "mainstream"
  },
  {
    "id": "game-28",
    "name": "PlayStation Network",
    "tagline": "플레이스테이션 콘솔의 온라인 게임 서비스망",
    "description": "소니의 콘솔 플레이스테이션에서 온라인 멀티플레이, 스토어 구매, 트로피 기록 등을 지원하는 온라인 네트워크다. 구독제 PS Plus와 연계된 혜택도 풍부하다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.playstation.com%2Fen-us%2Fplaystation-network%2F?w=1200",
    "serviceUrl": "https://www.playstation.com/en-us/playstation-network/",
    "tags": [
      "멀티플레이어",
      "커뮤니티"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "28",
    "tier": "mainstream"
  },
  {
    "id": "game-29",
    "name": "스타크래프트: 리마스터",
    "tagline": "한국 e스포츠 역사를 만든 전설의 전략 게임",
    "description": "세 종족 간의 자원 수급과 물량 운용 전략을 겨루는 실시간 전략 게임의 고전이다. 리마스터 버전으로 그래픽을 개선해 지금도 서비스되고 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstarcraft.blizzard.com?w=1200",
    "serviceUrl": "https://starcraft.blizzard.com",
    "tags": [
      "전략",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "29",
    "tier": "mainstream"
  },
  {
    "id": "game-30",
    "name": "넥슨 (Nexon.com)",
    "tagline": "메이플스토리, 던전앤파이터 등을 묶은 국내 퍼블리셔 포털",
    "description": "국내 최대 온라인 게임사 넥슨이 운영하는 게임들을 한곳에서 안내하고 계정을 통합 관리하는 공식 포털 사이트다. 공지사항과 이벤트 정보도 함께 제공한다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.nexon.com?w=1200",
    "serviceUrl": "https://www.nexon.com",
    "tags": [
      "커뮤니티",
      "멀티플레이어"
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other"
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "30",
    "tier": "mainstream"
  },

  {
    "id": "game-31",
    "name": "Backpack Battles",
    "tagline": "가방 속 아이템 배치로 승부하는 전략 배틀러",
    "description": "플레이어가 가방 안에 아이템을 사고 조합하고 배치해 나만의 빌드를 만드는 비동기 대전 게임이다. 아이템 궁합과 위치 전략이 승패를 가르며, 꾸준한 업데이트로 얼리 액세스 기간 동안 성장해온 인디 타이틀이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F2427700%2FBackpack_Battles%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/2427700/Backpack_Battles/",
    "tags": [
      "전략",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "31",
    "tier": "emerging"
  },
  {
    "id": "game-32",
    "name": "Lethal Company",
    "tagline": "버려진 위성을 뒤지는 괴짜 협동 공포 게임",
    "description": "친구들과 함께 버려진 달과 폐건물을 탐험하며 고철을 모아 회사에 팔아넘기는 협동 서바이벌 호러 게임이다. 아기자기한 그래픽과 달리 예측 불가능한 괴물과 상황이 긴장감과 웃음을 동시에 준다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F1966720%2FLethal_Company%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/1966720/Lethal_Company/",
    "tags": [
      "멀티플레이어",
      "커뮤니티",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "32",
    "tier": "emerging"
  },
  {
    "id": "game-33",
    "name": "PEAK",
    "tagline": "넷이서 함께 오르는 절벽 생존 협동극",
    "description": "최대 네 명이 팀을 이뤄 추락 후 거대한 산을 기어오르는 협동 등반 게임이다. 체력, 허기, 날씨 같은 변수 속에서 서로를 돕는 타이밍 플레이가 핵심이며, 출시와 동시에 큰 화제를 모은 소규모 스튜디오의 작품이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F3527290%2FPEAK%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/3527290/PEAK/",
    "tags": [
      "멀티플레이어",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "33",
    "tier": "emerging"
  },
  {
    "id": "game-34",
    "name": "WEBFISHING",
    "tagline": "낚시하며 수다 떠는 아늑한 동물 세계",
    "description": "동물 캐릭터가 되어 낚시를 하고 캠프에 모여 잡담을 나누는 소셜 샌드박스 게임이다. 혼자서도, 여럿이서도 즐길 수 있으며 느긋한 분위기와 친근한 커뮤니티 문화로 입소문을 탄 1인 개발 인디작이다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F3146520%2FWEBFISHING%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/3146520/WEBFISHING/",
    "tags": [
      "캐주얼",
      "커뮤니티",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "34",
    "tier": "emerging"
  },
  {
    "id": "game-35",
    "name": "R.E.P.O.",
    "tagline": "깨지기 쉬운 보물을 나르는 협동 공포극",
    "description": "최대 여섯 명이 로봇 작업자가 되어 유령 들린 장소에서 값비싼 물건을 조심스럽게 운반해 돈을 버는 협동 호러 게임이다. 물리 엔진 기반의 엉뚱한 사고와 괴물의 위협이 뒤섞여 독특한 긴장감을 만들어낸다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F3241660%2FREPO%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/3241660/REPO/",
    "tags": [
      "멀티플레이어",
      "커뮤니티",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "35",
    "tier": "emerging"
  },
  {
    "id": "game-36",
    "name": "Balatro",
    "tagline": "카드 조합으로 쌓아가는 중독성 로그라이크",
    "description": "포커 족보를 기반으로 조커 카드를 조합해 점수를 극대화하는 덱빌딩 로그라이크 게임이다. 한 번의 플레이가 짧지만 빌드 전략의 경우의 수가 방대해 반복 플레이의 재미가 크다는 평가를 받고 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F2379780%2FBalatro%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/2379780/Balatro/",
    "tags": [
      "전략",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "36",
    "tier": "emerging"
  },
  {
    "id": "game-37",
    "name": "Content Warning",
    "tagline": "괴물을 찍어 조회수 버는 괴짜 협동 촬영기",
    "description": "친구들과 잠수종을 타고 이상한 세계로 내려가 괴물과 기이한 현상을 카메라로 촬영해 가상의 영상 플랫폼에 올리는 협동 게임이다. 조회수를 많이 얻을수록 보상이 커지는 구조라 위험을 감수하는 플레이가 유도된다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F2881650%2FContent_Warning%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/2881650/Content_Warning/",
    "tags": [
      "멀티플레이어",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "37",
    "tier": "emerging"
  },
  {
    "id": "game-38",
    "name": "SANABI (산나비)",
    "tagline": "사슬팔로 질주하는 한국형 사이버펑크 액션",
    "description": "조선과 사이버펑크를 결합한 독특한 세계관 위에서 기계 팔을 와이어처럼 사용해 빠르게 이동하며 전투하는 2D 액션 플랫포머다. 소규모 한국 개발팀이 만든 작품으로 탄탄한 스토리와 손맛 있는 조작감으로 호평받았다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F1226430%2FSANABI%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/1226430/SANABI/",
    "tags": [
      "전략",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "38",
    "tier": "emerging"
  },
  {
    "id": "game-39",
    "name": "Cult of the Lamb",
    "tagline": "귀여운 양이 교주가 되는 로그라이크 경영극",
    "description": "플레이어가 작은 양이 되어 자신만의 신도 공동체를 세우고 던전을 탐험하는 액션 로그라이크와 기지 경영이 결합된 게임이다. 아기자기하면서도 어두운 분위기의 아트 스타일로 꾸준한 팬층을 유지하고 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fstore.steampowered.com%2Fapp%2F1313140%2FCult_of_the_Lamb%2F?w=1200",
    "serviceUrl": "https://store.steampowered.com/app/1313140/Cult_of_the_Lamb/",
    "tags": [
      "전략",
      "캐주얼",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "39",
    "tier": "emerging"
  },
  {
    "id": "game-40",
    "name": "Overwolf",
    "tagline": "게임 모드와 오버레이 앱을 만드는 창작자 허브",
    "description": "게임 플레이 중 띄울 수 있는 오버레이 앱과 모드를 개발자들이 직접 만들고 배포해 수익화할 수 있도록 돕는 게임 어드레스 플랫폼이다. 전 세계 여러 게임 커뮤니티의 창작자들이 모여 툴과 모드를 공유하는 생태계를 이루고 있다.",
    "imageUrl": "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.overwolf.com%2F?w=1200",
    "serviceUrl": "https://www.overwolf.com/",
    "tags": [
      "커뮤니티",
      "멀티플레이어",
    ],
    "audiences": [
      "student",
      "teacher",
      "parent",
      "other",
    ],
    "room": "게임",
    "roomKey": "game",
    "number": "40",
    "tier": "emerging"
  },
];
