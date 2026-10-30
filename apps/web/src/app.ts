import './styles.css';
import { createCatalogLoader, type CatalogService as Service, type CatalogKind, type CatalogShuffle as ShuffleId, type CatalogTier as ServiceTier } from './catalog-loader.js';
import { searchCatalogServices, type ServiceSearchKind } from './service-search.js';
import { assistantRequest, type AssistantMessage } from './assistant-conversation.js';
import { escapeHtml, safeExternalUrl } from './html-safety.js';

type Audience = 'student' | 'teacher' | 'parent' | 'other';
type AssistantResponse = {
  reply: string;
  recommendations: Array<{ reason: string; service: Service }>;
  analyzedRepository?: { url: string; languages: string[] };
};
// Runtime config is fetched (not baked into the JS bundle) so the public web
// image stays environment-agnostic; config.json is written by the container
// entrypoint at startup. Resolved via top-level await so nothing below runs
// before the real API base is known (avoids relying on <script> tag order).
async function resolveApiBase(): Promise<string> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.apiUrl === 'string' && data.apiUrl) return data.apiUrl.replace(/\/$/, '');
    }
  } catch { /* fall through to dev default */ }
  return (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
}
const API = await resolveApiBase();
// /api/services now returns imageUrl as a path on our own image-proxy route
// (see apps/api/src/image-proxy.ts) rather than a full external URL, so it
// needs the resolved API origin prefixed before it's usable as an <img src>.
export function resolveImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) return `${API}${imageUrl}`;
  return safeExternalUrl(imageUrl) ?? '';
}
const sessionId = crypto.randomUUID();
// Swiping through all ~98 services in one sitting is exhausting, so cards are
// shown in rounds of BATCH_SIZE; each round ends on an interim results
// screen that offers to continue with the next round.
export const BATCH_SIZE = 10;
// Recommendation weighting: each matched interest tag counts for
// INTEREST_WEIGHT, the single selected audience/type match counts for
// AUDIENCE_WEIGHT. Audience gets the heavier weight because it's one
// deliberate, specific choice ("나는 교사다") versus many possible interest
// tags, so a single audience match should be able to outweigh one matched
// interest tag while still losing to multiple matched interests. Rounds
// (BATCH_SIZE cards) are then cut from this single score-sorted deck, so
// round 1 is always the user's best-matching batch, round 2 the next, etc.
export const INTEREST_WEIGHT = 2;
export const AUDIENCE_WEIGHT = 3;
export function matchedInterestTags(service: Service, interests: ReadonlySet<string>): string[] {
  return service.tags.filter((t) => interests.has(t));
}
export function matchScore(service: Service, audience: Audience | null, interests: ReadonlySet<string>, taskId?: string | null): number {
  const matchedTags = matchedInterestTags(service, interests).length;
  const audienceMatch = audience !== null && service.audiences.includes(audience);
  const taskMatch = taskId !== undefined && taskId !== null && service.tasks?.includes(taskId);
  return (matchedTags + (taskMatch ? 1 : 0)) * INTEREST_WEIGHT + (audienceMatch ? AUDIENCE_WEIGHT : 0);
}
let services: Service[] = [], index = 0, batchStart = 0, batchEnd = 0, liked: Service[] = [], history: Array<{service:Service; action:'like'|'dislike'|'skip'}> = [];
// prd.md §14.3 / trd.md §10.1 (Phase 2 draft): services disliked in the
// current round, collected so the "why not interested" question can be
// asked once, batched, at the results screen instead of interrupting the
// swipe flow after every single dislike.
let dislikedThisBatch: Service[] = [];
let audience: Audience | null = null, interests = new Set<string>();
let selectedTask: string | null = null;
const SHUFFLE_LABELS: Record<ShuffleId,string> = {'vibe-venture':'바이브 벤처','sns':'SNS','dating':'연애','productivity':'생산성','game':'게임','task':'작업으로 찾기'};
const TASK_OPTIONS = [
  ['report-automation', '반복 보고서 자동화'],
  ['document-writing', '문서 작성·정리'],
  ['team-collaboration', '팀 협업·공유'],
  ['customer-support', '고객 문의 응대'],
  ['workflow-automation', '반복 업무 자동화'],
  ['code-review', '코드 검토·테스트'],
  ['meeting-notes', '회의·일정 정리'],
  ['data-analysis', '데이터 분석'],
  ['presentation-design', '발표 자료 만들기'],
  ['content-creation', '콘텐츠 제작'],
  ['ui-design', '화면 설계'],
  ['payment-processing', '온라인 결제 받기'],
] as const;
const TASK_LABELS = new Map<string, string>(TASK_OPTIONS);
const SHUFFLE_TAGS: Record<ShuffleId,string[]> = {
  'vibe-venture':['학습','창작','생활','생산성','협업','AI'],
  'sns':['소통','커뮤니티','콘텐츠공유','네트워킹'],
  'dating':['매칭','소개팅','커뮤니티','본인인증'],
  'productivity':['업무관리','메모·노트','자동화','협업'],
  'game':['캐주얼','멀티플레이어','전략','커뮤니티'],
  'task':[],
};
let currentShuffle: ShuffleId = 'vibe-venture';
const catalogLoader = createCatalogLoader(API);
type AppearanceTheme = 'paper' | 'clay' | 'midnight';
const APPEARANCE_THEMES: AppearanceTheme[] = ['paper', 'clay', 'midnight'];
const DEFAULT_APPEARANCE_THEME: AppearanceTheme = 'midnight';
const APPEARANCE_THEME_STORAGE_KEY = 'gyro.appearance-theme';
let homeCatalogServices: Service[] = [];
let homeCatalogState: 'loading' | 'ready' | 'error' = 'loading';
let selectedHomeKind: ServiceSearchKind = 'all';
let homeCatalogPage = 0;
const HOME_CATALOG_PAGE_SIZE = 24;
const assistantMessages: AssistantMessage[] = [];
let assistantRequestPending = false;
let profileCatalogReady = false;
let profileCatalogError = false;
let profileLoadToken = 0;
const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const screens = ['landing','theme','tier','task-discovery','profile','cards','results','ranking'];
function syncPrimaryNav(screen: string): void {
  const activeId = screen === 'ranking'
    ? 'ranking-nav'
    : screen === 'theme' || screen === 'tier'
      ? 'theme-entry-button'
      : screen === 'task-discovery' || currentShuffle === 'task'
        ? 'task-entry-button'
        : ['sns', 'dating', 'productivity', 'game'].includes(currentShuffle)
          ? 'theme-entry-button'
          : 'discover-nav';
  document.querySelectorAll<HTMLButtonElement>('[data-primary-nav]').forEach(button => {
    const active = button.id === activeId;
    button.classList.toggle('nav-link-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}
function show(id:string){
  if (id !== 'cards') cancelCardInteraction();
  screens.forEach(x => $(x).classList.toggle('hidden', x !== id));
  syncPrimaryNav(id);
  window.scrollTo({top:0,behavior:'smooth'});
}
function track(name:string, metadata:Record<string,unknown>={}){void fetch(`${API}/api/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,sessionId,metadata})}).catch(()=>{});}
function startBatch(){ batchStart = index; batchEnd = Math.min(index + BATCH_SIZE, services.length); dislikedThisBatch = []; history = []; }
function renderChoices(){const audiences:[Audience,string][]=[['student','학생이에요'],['teacher','선생님이에요'],['parent','학부모예요'],['other','그 외예요']];$('audience-choices').innerHTML=audiences.map(([id,label])=>`<button class="choice ${audience===id?'selected':''}" data-audience="${id}">${label}</button>`).join(''); document.querySelectorAll<HTMLElement>('[data-audience]').forEach(b=>b.onclick=()=>{audience=b.dataset.audience as Audience;renderChoices();checkProfile();}); const tags=SHUFFLE_TAGS[currentShuffle];$('interest-choices').innerHTML=tags.map(tag=>`<button class="tag ${interests.has(tag)?'selected':''}" data-interest="${tag}">${tag}</button>`).join('');document.querySelectorAll<HTMLElement>('[data-interest]').forEach(b=>b.onclick=()=>{const tag=b.dataset.interest!;interests.has(tag)?interests.delete(tag):interests.add(tag);renderChoices();checkProfile();});}
function checkProfile(){
  const next = $<HTMLButtonElement>('profile-next');
  const status = $('profile-status');
  next.disabled = !audience || interests.size === 0 || !profileCatalogReady || services.length === 0;
  status.textContent = profileCatalogError
    ? '서비스를 불러오지 못했어요. 홈으로 돌아가 다시 시도해 주세요.'
    : !profileCatalogReady
      ? '서비스 목록을 확인하고 있어요. 먼저 유형과 관심사를 골라보세요.'
      : services.length === 0
        ? '지금은 표시할 수 있는 서비스가 없어요. 잠시 후 다시 시도해 주세요.'
        : '';
}
// Swipe tuning: drag distance past the threshold (or a fast flick) commits
// the decision; released early, the card springs back to center.
const SWIPE_COMMIT_PX = 110;
const SWIPE_VELOCITY_PX_MS = 0.55;
let dragging = false, dragStartX = 0, dragStartY = 0, dragX = 0, dragStartTime = 0;
let wheelAccumX = 0, wheelResetTimer: number | undefined;
let decisionTimer: number | undefined;
let decisionPending = false;
function cancelCardInteraction(): void {
  window.clearTimeout(decisionTimer);
  window.clearTimeout(wheelResetTimer);
  decisionPending = false;
  dragging = false;
  dragX = 0;
  wheelAccumX = 0;
}
function canDecide(): boolean {
  return !$('cards').classList.contains('hidden') && index < batchEnd && !decisionPending
    && $('preview-overlay').classList.contains('hidden') && $('guide-overlay').classList.contains('hidden');
}
function cardTransform(x:number, y:number){ const rotate = x / 18; return `translate(${x}px, ${y}px) rotate(${rotate}deg)`; }
function setStampOpacity(card:HTMLElement, x:number){
  const like = card.querySelector<HTMLElement>('.swipe-stamp.like');
  const nope = card.querySelector<HTMLElement>('.swipe-stamp.nope');
  const ratio = Math.min(Math.abs(x) / SWIPE_COMMIT_PX, 1);
  if (like) like.style.opacity = x > 0 ? String(ratio) : '0';
  if (nope) nope.style.opacity = x < 0 ? String(ratio) : '0';
}
function resetCardPosition(card:HTMLElement){
  card.style.transition = 'transform .25s cubic-bezier(.2,.8,.3,1)';
  card.style.transform = cardTransform(0, 0);
  setStampOpacity(card, 0);
}
function flyOutCard(card:HTMLElement, direction:'like'|'dislike', onDone:()=>void){
  if (!canDecide()) return;
  decisionPending = true;
  const stage = $('swipe-stage');
  const distance = stage.clientWidth + 200;
  card.style.transition = 'transform .32s ease-out';
  card.style.transform = cardTransform(direction === 'like' ? distance : -distance, dragX ? dragX * 0.3 : 0);
  card.style.pointerEvents = 'none';
  decisionTimer = window.setTimeout(() => {
    decisionPending = false;
    if (card.isConnected && !$('cards').classList.contains('hidden')) onDone();
  }, 260);
}
function bindCardGestures(card:HTMLElement){
  card.style.transition = 'none';
  card.addEventListener('pointerdown', (e: PointerEvent) => {
    if (!canDecide()) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragging = true; dragStartX = e.clientX; dragStartY = e.clientY; dragX = 0; dragStartTime = performance.now();
    card.style.transition = 'none';
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    dragX = e.clientX - dragStartX;
    const dragY = (e.clientY - dragStartY) * 0.4;
    card.style.transform = cardTransform(dragX, dragY);
    setStampOpacity(card, dragX);
  });
  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const elapsed = Math.max(performance.now() - dragStartTime, 1);
    const velocity = Math.abs(dragX) / elapsed;
    if (Math.abs(dragX) > SWIPE_COMMIT_PX || velocity > SWIPE_VELOCITY_PX_MS) {
      const action = dragX > 0 ? 'like' : 'dislike';
      flyOutCard(card, action, () => decide(action));
    } else {
      resetCardPosition(card);
    }
  };
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', () => { dragging = false; resetCardPosition(card); });
}
// macOS/trackpad two-finger swipes fire as horizontal `wheel` events (no
// touch events are involved), so they're handled separately from pointer drag.
function bindWheelGestures(card:HTMLElement){
  const stage = $('swipe-stage');
  stage.onwheel = (e: WheelEvent) => {
    if (!canDecide() || dragging) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    wheelAccumX += e.deltaX * -1;
    card.style.transition = 'none';
    card.style.transform = cardTransform(wheelAccumX, 0);
    setStampOpacity(card, wheelAccumX);
    window.clearTimeout(wheelResetTimer);
    wheelResetTimer = window.setTimeout(() => {
      if (Math.abs(wheelAccumX) > SWIPE_COMMIT_PX) {
        const action = wheelAccumX > 0 ? 'like' : 'dislike';
        flyOutCard(card, action, () => decide(action));
      } else {
        resetCardPosition(card);
      }
      wheelAccumX = 0;
    }, 140);
  };
}
// prd.md §8/§9 item 8: every card shows at least one explainable reason, derived
// from the same tag/audience overlap used to rank the deck in profile-next.
function recommendationReason(service: Service): string {
  if (selectedTask && service.tasks?.includes(selectedTask)) return `"${TASK_LABELS.get(selectedTask) ?? '선택한 작업'}"을 도와요`;
  const matchedTags = matchedInterestTags(service, interests);
  const audienceMatch = audience && service.audiences.includes(audience);
  if (matchedTags.length > 0) return `"${matchedTags[0]}" 관심사와 잘 맞아요`;
  if (audienceMatch) return '선택하신 유형에게 인기 있어요';
  return '지금 둘러보기 좋은 서비스예요';
}
function kindLabel(kind: CatalogKind | undefined): string {
  return ({ product: '제품', service: '서비스', skill: '스킬', mcp: 'MCP' })[kind ?? 'service'];
}
function verificationLabel(service: Service): string {
  const level = service.verification?.level ?? 'link';
  const label = ({ link: '링크 확인', docs: '문서 확인', install: '설치 검증' } as const)[level];
  const verifiedAt = service.verification?.verifiedAt ?? (level === 'link' ? service.health?.checkedAt.slice(0, 10) : undefined);
  const environment = level === 'install' ? ` · ${service.verification?.environment ?? '환경 미기록'}` : '';
  return `${label} · ${verifiedAt ?? '검증일 미기록'}${environment}`;
}
function isGuideService(service: Service): boolean {
  return service.kind === 'skill' || service.kind === 'mcp';
}
function createHomeServiceCard(service: Service): HTMLElement {
  const article = document.createElement('article');
  article.className = 'home-product-card';

  const media = document.createElement('div');
  media.className = 'home-product-image image-fallback';
  const initial = document.createElement('span');
  initial.className = 'home-product-initial';
  initial.setAttribute('aria-hidden', 'true');
  initial.textContent = service.name.charAt(0);
  media.append(initial);
  const imageUrl = resolveImageUrl(service.imageUrl);
  if (imageUrl) {
    const image = new Image();
    image.alt = `${service.name} 화면 미리보기`;
    image.onload = () => media.classList.remove('image-fallback');
    image.onerror = () => image.remove();
    image.src = imageUrl;
    media.append(image);
  }

  const copy = document.createElement('div');
  copy.className = 'home-product-copy';
  const labels = document.createElement('div');
  labels.className = 'home-product-labels';
  const kind = document.createElement('span');
  kind.className = 'kind-badge';
  kind.textContent = kindLabel(service.kind);
  labels.append(kind);
  const pricing = document.createElement('span');
  pricing.className = 'home-product-tag';
  pricing.textContent = pricingLabel(service);
  labels.append(pricing);
  for (const tag of service.tags.slice(0, 2)) {
    const badge = document.createElement('span');
    badge.className = 'home-product-tag';
    badge.textContent = tag;
    labels.append(badge);
  }

  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'home-product-title';
  title.textContent = service.name;
  title.onclick = () => isGuideService(service) ? openGuide(service) : openPreview(service);
  const tagline = document.createElement('p');
  tagline.className = 'home-product-tagline';
  tagline.textContent = service.tagline;
  const verification = document.createElement('p');
  verification.className = 'home-product-verification';
  verification.textContent = verificationLabel(service);
  copy.append(labels, title, tagline, verification);

  const footer = document.createElement('div');
  footer.className = 'home-product-footer';
  const officialLink = document.createElement('a');
  officialLink.className = 'home-product-link';
  officialLink.href = safeExternalUrl(service.serviceUrl) ?? '#';
  officialLink.target = '_blank';
  officialLink.rel = 'noopener noreferrer';
  officialLink.textContent = '공식 페이지 ↗';
  officialLink.addEventListener('click', () => track('service_click', { serviceId: service.id, mode: 'official' }));
  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'home-product-preview';
  preview.textContent = isGuideService(service) ? '연결 가이드' : '미리보기';
  preview.onclick = () => isGuideService(service) ? openGuide(service) : openPreview(service);
  footer.append(officialLink, preview);
  article.append(media, copy, footer);
  return article;
}
function renderHomeCatalog(): void {
  const input = $<HTMLInputElement>('service-search');
  const query = input.value.trim();
  const matches = searchCatalogServices(homeCatalogServices, query, selectedHomeKind);
  const defaultView = !query && selectedHomeKind === 'all';
  const visibleLimit = defaultView ? 8 + homeCatalogPage * HOME_CATALOG_PAGE_SIZE : (homeCatalogPage + 1) * HOME_CATALOG_PAGE_SIZE;
  const items = matches.slice(0, visibleLimit);
  const status = $('home-catalog-status');
  const list = $('home-service-list');
  list.replaceChildren();

  if (homeCatalogState === 'loading') {
    status.textContent = '서비스 목록을 불러오고 있어요.';
    return;
  }
  if (homeCatalogState === 'error') {
    status.textContent = '서비스 목록을 불러오지 못했어요.';
    const empty = document.createElement('p');
    empty.className = 'home-empty';
    empty.textContent = '잠시 후 다시 시도해 주세요.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'text-button';
    retry.textContent = '다시 불러오기 →';
    retry.onclick = () => { void loadHomeCatalog(); };
    list.append(empty, retry);
    return;
  }
  if (items.length === 0) {
    status.textContent = '검색 결과가 없어요.';
    const empty = document.createElement('p');
    empty.className = 'home-empty';
    empty.textContent = query ? '다른 검색어나 서비스 유형을 선택해 보세요.' : '이 유형의 서비스는 아직 준비 중이에요.';
    list.append(empty);
    return;
  }

  status.textContent = query || selectedHomeKind !== 'all'
    ? `${matches.length}개 서비스`
    : `${homeCatalogServices.length}개 중 ${items.length}개 표시`;
  list.append(...items.map(createHomeServiceCard));
  if (items.length < matches.length) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'button button-outline home-catalog-more';
    more.textContent = `더 보기 (${matches.length - items.length}개 남음)`;
    more.onclick = () => {
      homeCatalogPage++;
      renderHomeCatalog();
    };
    list.append(more);
  }
}
function loadHomeCatalog(): Promise<void> {
  homeCatalogState = 'loading';
  renderHomeCatalog();
  return catalogLoader.getServices('vibe-venture').then((loaded) => {
    homeCatalogServices = loaded;
    homeCatalogState = 'ready';
    renderHomeCatalog();
  }).catch((error: unknown) => {
    homeCatalogState = 'error';
    console.error('홈 서비스 카탈로그를 불러오지 못했습니다.', error);
    renderHomeCatalog();
  });
}
function isAssistantService(value: unknown): value is Service {
  if (!value || typeof value !== 'object') return false;
  const service = value as Record<string, unknown>;
  return typeof service.id === 'string'
    && typeof service.name === 'string'
    && typeof service.tagline === 'string'
    && typeof service.description === 'string'
    && typeof service.serviceUrl === 'string'
    && typeof service.imageUrl === 'string'
    && Array.isArray(service.tags)
    && service.tags.every((tag) => typeof tag === 'string')
    && Array.isArray(service.audiences)
    && service.audiences.every((item) => typeof item === 'string');
}
function parseAssistantResponse(value: unknown): AssistantResponse | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  if (typeof payload.reply !== 'string' || !Array.isArray(payload.recommendations)) return undefined;
  const recommendations = payload.recommendations.flatMap((entry): AssistantResponse['recommendations'] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.reason !== 'string' || !isAssistantService(item.service)) return [];
    return [{ reason: item.reason, service: item.service }];
  });
  let analyzedRepository: AssistantResponse['analyzedRepository'];
  if (payload.analyzedRepository && typeof payload.analyzedRepository === 'object') {
    const repository = payload.analyzedRepository as Record<string, unknown>;
    if (typeof repository.url === 'string' && Array.isArray(repository.languages)
        && repository.languages.every((language) => typeof language === 'string')) {
      analyzedRepository = { url: repository.url, languages: repository.languages };
    }
  }
  return { reply: payload.reply, recommendations, ...(analyzedRepository ? { analyzedRepository } : {}) };
}
function appendAssistantMessage(role: AssistantMessage['role'], content: string): HTMLElement {
  const message = document.createElement('div');
  message.className = `assistant-message ${role === 'assistant' ? 'assistant-message-ai' : 'assistant-message-user'}`;
  if (role === 'assistant') {
    const avatar = document.createElement('span');
    avatar.className = 'assistant-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = 'g';
    message.append(avatar);
  }
  const paragraph = document.createElement('p');
  paragraph.textContent = content;
  message.append(paragraph);
  const thread = $('assistant-thread');
  thread.append(message);
  thread.scrollTop = thread.scrollHeight;
  return message;
}
function pricingLabel(service: Service): string {
  if (!service.pricing?.source || !service.pricing.verifiedAt) return '요금 확인 필요';
  return ({
    free: '무료 확인',
    freemium: '무료 플랜 확인',
    paid: '유료 확인',
    unknown: '요금 확인 필요',
  } as const)[service.pricing?.model ?? 'unknown'];
}
function appendAssistantRecommendations(recommendations: AssistantResponse['recommendations']): void {
  if (!recommendations.length) return;
  const list = document.createElement('div');
  list.className = 'assistant-recommendations';
  for (const { service, reason } of recommendations) {
    const card = document.createElement('article');
    card.className = 'assistant-recommendation';
    const title = document.createElement('h3');
    title.textContent = service.name;
    const tagline = document.createElement('p');
    tagline.textContent = service.tagline;
    const explanation = document.createElement('p');
    explanation.textContent = reason || '설명한 문제와 관련된 카탈로그 항목이에요.';
    const labels = document.createElement('div');
    labels.className = 'assistant-recommendation-labels';
    for (const label of [kindLabel(service.kind), pricingLabel(service), verificationLabel(service)]) {
      const badge = document.createElement('span');
      badge.textContent = label;
      labels.append(badge);
    }
    const actions = document.createElement('div');
    actions.className = 'assistant-recommendation-actions';
    const official = document.createElement('a');
    official.href = safeExternalUrl(service.serviceUrl) ?? '#';
    official.target = '_blank';
    official.rel = 'noopener noreferrer';
    official.textContent = '공식 페이지 ↗';
    official.addEventListener('click', () => track('service_click', { serviceId: service.id, mode: 'official' }));
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = isGuideService(service) ? '연결 가이드' : '미리보기';
    open.onclick = () => isGuideService(service) ? openGuide(service) : openPreview(service);
    actions.append(official, open);
    card.append(title, tagline, explanation, labels, actions);
    list.append(card);
  }
  const thread = $('assistant-thread');
  thread.append(list);
  thread.scrollTop = thread.scrollHeight;
}
function renderCard(){
  cancelCardInteraction();
  if (index >= batchEnd) { finishBatch(); return; }
  $('progress').textContent = `${index - batchStart + 1} / ${batchEnd - batchStart}`;
  const stage = $('swipe-stage');
  dragX = 0; wheelAccumX = 0;
  const service = services[index];
  // The card image is a live screenshot of the student's site generated by a
  // third-party service, which can be slow, rate-limited, or blocked for a
  // given visitor/network. Start from a safe gradient fallback and only
  // switch to the real screenshot once it has actually finished loading, so
  // a failed/slow fetch never leaves the full-screen card looking dead/black.
  stage.innerHTML = `<article class="service-card image-fallback"><span class="service-card-initial" aria-hidden="true">${escapeHtml(service.name.charAt(0))}</span><span class="swipe-stamp like" aria-hidden="true">관심 있음</span><span class="swipe-stamp nope" aria-hidden="true">관심 없음</span><div class="service-copy"><div class="service-tags"><span class="kind-badge">${escapeHtml(kindLabel(service.kind))}</span><span class="verification-badge">${escapeHtml(verificationLabel(service))}</span>${service.tags.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.tagline)}</p><p class="service-reason">✨ ${escapeHtml(recommendationReason(service))}</p><button class="preview-button" type="button" ${isGuideService(service)?'data-guide':'data-preview'}>${isGuideService(service)?'연결 가이드':'미리보기 ⤢'}</button></div></article>`;
  const card = stage.querySelector<HTMLElement>('.service-card')!;
  const imageUrl = resolveImageUrl(service.imageUrl);
  if (imageUrl) {
    const preload = new Image();
    preload.onload = () => {
      card.style.backgroundImage = `url(${JSON.stringify(imageUrl)})`;
      card.classList.remove('image-fallback');
      const description = document.createElement('span');
      description.className = 'sr-only';
      description.setAttribute('role', 'img');
      description.setAttribute('aria-label', `${service.name} 화면 미리보기`);
      card.append(description);
    };
    preload.src = imageUrl;
  }
  card.querySelector<HTMLButtonElement>('[data-preview], [data-guide]')!.onclick = (e) => { e.stopPropagation(); isGuideService(service) ? openGuide(service) : openPreview(service); };
  bindCardGestures(card);
  bindWheelGestures(card);
  $<HTMLButtonElement>('undo-button').disabled = history.length === 0;
}
function decide(action:'like'|'dislike'|'skip'){
  if (!canDecide()) return;
  const service = services[index++];
  history = [{ service, action }];
  if (action === 'like') liked.push(service);
  if (action === 'dislike') dislikedThisBatch.push(service);
  track(action === 'like' ? 'card_like' : action === 'dislike' ? 'card_dislike' : 'card_skip', { serviceId: service.id });
  renderCard();
}
// prd.md §14.3 / trd.md §10.1 (Phase 2 draft): optional, skippable "why not
// interested" micro-feedback. Asked once per round at the results screen
// (not right after each dislike swipe) so the swipe flow is never
// interrupted. Sent as a separate card_dislike event tagged
// metadata.stage='reason_tag' so it doesn't inflate the primary
// dislike-swipe count used elsewhere.
const DISLIKE_REASONS: [string, string][] = [['unclear','설명이 이해 안 됨'],['not_relevant','내 상황과 안 맞음'],['bad_design','디자인이 별로'],['already_used','이미 써봄']];
function dislikeReasonsHtml():string{
  if(!dislikedThisBatch.length) return '';
  const rows = dislikedThisBatch.map(s=>`<div class="dislike-reason-item" data-dislike-reason-service="${escapeHtml(s.id)}"><p class="dislike-reason-name">${escapeHtml(s.name)}</p><div class="reason-chips">${DISLIKE_REASONS.map(([value,label])=>`<button type="button" class="reason-chip" data-reason="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join('')}</div><p class="dislike-reason-message" role="status"></p></div>`).join('');
  return `<div class="dislike-reasons"><h3>관심 없던 서비스, 이유가 있다면 알려주세요 (선택)</h3>${rows}</div>`;
}
function bindDislikeReasons(){
  document.querySelectorAll<HTMLElement>('[data-dislike-reason-service]').forEach(item=>{
    const serviceId = item.dataset.dislikeReasonService!;
    const message = item.querySelector<HTMLElement>('.dislike-reason-message')!;
    item.querySelectorAll<HTMLButtonElement>('[data-reason]').forEach(btn=>{
      btn.onclick = () => {
        track('card_dislike',{serviceId,reason:btn.dataset.reason,stage:'reason_tag'});
        item.querySelectorAll<HTMLButtonElement>('[data-reason]').forEach(b=>b.disabled=true);
        message.textContent = '알려주셔서 감사해요!';
      };
    });
  });
}
function undo(){
  if (!canDecide() || index <= batchStart) return;
  const last = history.pop();
  if (!last) return;
  index--;
  if (last.action === 'like') liked = liked.filter(service => service.id !== last.service.id);
  if (last.action === 'dislike') dislikedThisBatch = dislikedThisBatch.filter(service => service.id !== last.service.id);
  track('card_undo', { serviceId: last.service.id });
  renderCard();
}
// §PRD 9-?: 한 라운드(스와이프 세션)가 끝나고 결과 화면에 들어선 뒤, 관심 표시한 서비스마다
// 로그인 없이 별점(1~5)+코멘트를 남길 수 있다. 전송은 기존 익명 퍼널 이벤트 경로를 재사용한다.
function feedbackWidgetHtml(serviceId:string):string{
  const stars=[1,2,3,4,5].map(n=>`<button type="button" class="feedback-star" data-star="${n}" aria-label="${n}점">★</button>`).join('');
  return `<div class="feedback-box" data-feedback-service="${escapeHtml(serviceId)}"><p class="feedback-label">이 서비스, 어땠나요?</p><div class="feedback-stars" role="group" aria-label="별점">${stars}</div><textarea class="feedback-comment" maxlength="300" placeholder="개선하면 좋을 점이 있다면 알려주세요 (선택)"></textarea><button type="button" class="text-button feedback-submit" disabled>피드백 보내기</button><p class="feedback-message" role="status"></p></div>`;
}
function bindFeedbackWidgets(){
  document.querySelectorAll<HTMLElement>('[data-feedback-service]').forEach(box=>{
    const serviceId=box.dataset.feedbackService!;
    const stars=Array.from(box.querySelectorAll<HTMLButtonElement>('.feedback-star'));
    const submit=box.querySelector<HTMLButtonElement>('.feedback-submit')!;
    const comment=box.querySelector<HTMLTextAreaElement>('.feedback-comment')!;
    const message=box.querySelector<HTMLElement>('.feedback-message')!;
    let rating=0;
    let pending=false;
    stars.forEach(star=>{
      star.onclick=()=>{
        if(pending)return;
        rating=Number(star.dataset.star);
        stars.forEach(s=>s.classList.toggle('active',Number(s.dataset.star)<=rating));
        submit.disabled=false;
      };
    });
    submit.onclick=async()=>{
      if(rating===0||pending)return;
      pending=true;
      submit.disabled=true;
      try{
        const r=await fetch(`${API}/api/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'service_feedback_submit',sessionId,metadata:{serviceId,rating,comment:comment.value.trim().slice(0,300)}})});
        if(!r.ok)throw new Error();
        message.textContent='피드백 감사해요!';
        stars.forEach(s=>s.disabled=true);
        comment.disabled=true;
      }catch{
        message.textContent='전송에 실패했어요. 다시 시도해주세요.';
        submit.disabled=false;
      }finally{
        pending=false;
      }
    };
  });
}
function finishBatch(){
  const remaining = services.length - index;
  track('result_view',{likedCount:liked.length,remaining});
  show('results');
  $('result-list').innerHTML=liked.length?liked.map(s=>`<article class="result-item"><div class="result-main">${resolveImageUrl(s.imageUrl)?`<img src="${escapeHtml(resolveImageUrl(s.imageUrl))}" alt="">`:''}<div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.tagline)}</p><p class="result-reason">✨ ${escapeHtml(recommendationReason(s))}</p><p class="result-verification">${escapeHtml(kindLabel(s.kind))} · ${escapeHtml(verificationLabel(s))}</p><div class="result-links"><a href="${escapeHtml(safeExternalUrl(s.serviceUrl) ?? '#')}" target="_blank" rel="noopener noreferrer" data-service="${escapeHtml(s.id)}">공식 페이지 열기 →</a><button class="result-preview-button" type="button" ${isGuideService(s)?`data-guide-result="${escapeHtml(s.id)}"`:`data-preview-result="${escapeHtml(s.id)}"`}>${isGuideService(s)?'연결 가이드':'미리보기'}</button></div></div></div>${feedbackWidgetHtml(s.id)}</article>`).join(''):'<p class="lede">아직 관심 표시한 서비스가 없어요. 다시 둘러보며 새로운 가능성을 찾아보세요.</p>';
  document.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach(a=>a.onclick=()=>track('service_click',{serviceId:a.dataset.service}));
  document.querySelectorAll<HTMLButtonElement>('[data-preview-result]').forEach(b=>{
    const matched = liked.find(s=>s.id===b.dataset.previewResult);
    if (matched) b.onclick = () => openPreview(matched);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-guide-result]').forEach(b=>{
    const matched = liked.find(s=>s.id===b.dataset.guideResult);
    if (matched) b.onclick = () => openGuide(matched);
  });
  bindFeedbackWidgets();
  $('dislike-reasons').innerHTML = dislikeReasonsHtml();
  bindDislikeReasons();
  const continueButton = $<HTMLButtonElement>('continue-button');
  if (remaining > 0) {
    $('results-eyebrow').textContent = '중간 결과';
    $('results-pill').textContent = `${index} / ${services.length}`;
    $('results-lede').textContent = '지금까지 관심 표시한 서비스를 모았어요. 계속 둘러보고 싶다면 이어서 확인해보세요.';
    continueButton.textContent = `다음 ${Math.min(BATCH_SIZE, remaining)}개 더 보기 →`;
    continueButton.classList.remove('hidden');
  } else {
    $('results-eyebrow').textContent = '발견 완료';
    $('results-pill').textContent = 'YOUR PICKS';
    $('results-lede').textContent = '모든 서비스를 다 확인했어요. 관심 표시한 서비스를 바로 열어보고 쓸모를 발견해보세요.';
    continueButton.classList.add('hidden');
  }
}
function appendGuideText(parent: HTMLElement, label: string, value: string): void {
  const section = document.createElement('section');
  section.className = 'guide-section';
  const heading = document.createElement('h3');
  heading.textContent = label;
  const text = document.createElement('p');
  text.textContent = value || '확인 안 됨';
  section.append(heading, text);
  parent.append(section);
}
function appendGuideList(parent: HTMLElement, label: string, values: string[]): void {
  const section = document.createElement('section');
  section.className = 'guide-section';
  const heading = document.createElement('h3');
  heading.textContent = label;
  const list = document.createElement('ol');
  if (values.length) {
    for (const value of values) {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    }
  } else {
    const item = document.createElement('li');
    item.textContent = '확인 안 됨';
    list.append(item);
  }
  section.append(heading, list);
  parent.append(section);
}
function externalLink(url: string, label: string): HTMLAnchorElement | null {
  const parsed = safeExternalUrl(url);
  if (!parsed) return null;
  const link = document.createElement('a');
  link.href = parsed;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}
let guideGeneration = 0;
function openGuide(service: Service): void {
  const generation = ++guideGeneration;
  const guide = service.connection;
  const content = $('guide-content');
  const report = $('guide-report');
  content.replaceChildren();
  report.replaceChildren();
  $('guide-title').textContent = `${service.name} 연결 가이드`;
  if (!guide) {
    appendGuideText(content, '연결 정보', '이 항목에는 아직 연결 가이드가 등록되지 않았어요.');
  } else {
    appendGuideText(content, '지원 에이전트 / 클라이언트', guide.agents.map(agent => `${agent.name}${agent.versionNote ? ` (${agent.versionNote})` : ''}`).join(', '));
    appendGuideText(content, 'MCP 연결 방식', service.kind === 'mcp'
      ? `전송: ${guide.transport ?? '확인 안 됨'} · 실행: ${guide.runtime ?? '확인 안 됨'} · 인증: ${guide.auth ?? '확인 안 됨'}`
      : '해당 없음');
    appendGuideList(content, '필요 권한·키', guide.permissions);
    appendGuideList(content, '설치 단계', guide.installSteps);
    appendGuideText(content, '사용 예시', guide.exampleUsage ?? '');
    const docs = document.createElement('section');
    docs.className = 'guide-section';
    const heading = document.createElement('h3');
    heading.textContent = '공식 문서';
    const link = externalLink(guide.docsUrl, '문서 열기 ↗');
    if (link) {
      link.addEventListener('click', () => track('service_click', { serviceId: service.id, mode: 'guide' }));
      docs.append(heading, link);
    } else {
      const text = document.createElement('p');
      text.textContent = '문서 주소를 확인할 수 없습니다.';
      docs.append(heading, text);
    }
    content.append(docs);
  }

  const title = document.createElement('p');
  title.className = 'guide-report-title';
  title.textContent = '직접 연결해 본 결과가 있나요? (선택)';
  const outcomes: Array<{ value: 'success' | 'partial' | 'fail'; label: string }> = [
    { value: 'success', label: '성공' }, { value: 'partial', label: '일부 성공' }, { value: 'fail', label: '실패' },
  ];
  const outcomeGroup = document.createElement('div');
  outcomeGroup.className = 'reason-chips';
  const reasonGroup = document.createElement('div');
  reasonGroup.className = 'reason-chips hidden';
  const reasonOptions = [
    ['install_blocked', '설치가 막힘'], ['auth_issue', '인증 문제'], ['permission_issue', '권한 문제'],
    ['incompatible', '호환되지 않음'], ['docs_outdated', '문서가 오래됨'], ['other', '기타'],
  ] as const;
  let selectedOutcome: 'success' | 'partial' | 'fail' | null = null;
  let reportPending = false;
  let selectedReason: typeof reasonOptions[number][0] | undefined;
  const updateSelection = () => {
    outcomeGroup.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.classList.toggle('selected', button.dataset.outcome === selectedOutcome));
    reasonGroup.classList.toggle('hidden', selectedOutcome !== 'fail' && selectedOutcome !== 'partial');
    reasonGroup.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.classList.toggle('selected', button.dataset.reason === selectedReason));
  };
  for (const outcome of outcomes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reason-chip';
    button.textContent = outcome.label;
    button.dataset.outcome = outcome.value;
    button.onclick = () => {
      if (reportPending) return;
      selectedOutcome = outcome.value;
      if (selectedOutcome === 'success') selectedReason = undefined;
      submitButton.disabled = false;
      updateSelection();
    };
    outcomeGroup.append(button);
  }
  for (const [value, label] of reasonOptions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reason-chip';
    button.textContent = label;
    button.dataset.reason = value;
    button.onclick = () => { if (!reportPending) { selectedReason = value; updateSelection(); } };
    reasonGroup.append(button);
  }
  const submitButton = document.createElement('button');
  submitButton.type = 'button';
  submitButton.className = 'text-button guide-report-submit';
  submitButton.textContent = '익명으로 결과 보내기';
  submitButton.disabled = true;
  const reportStatus = document.createElement('p');
  reportStatus.setAttribute('role', 'status');
  submitButton.onclick = async () => {
    if (!selectedOutcome || reportPending) return;
    reportPending = true;
    const metadata: Record<string, unknown> = { serviceId: service.id, outcome: selectedOutcome };
    if (selectedOutcome !== 'success' && selectedReason) metadata.reason = selectedReason;
    submitButton.disabled = true;
    reportStatus.textContent = '전송 중이에요...';
    try {
      const response = await fetch(`${API}/api/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'connection_report', sessionId, metadata }),
      });
      if (!response.ok) throw new Error('Connection report request failed');
      if (generation === guideGeneration) closeGuide();
    } catch {
      reportStatus.textContent = '전송에 실패했어요. 다시 시도하거나 건너뛰어도 괜찮아요.';
      submitButton.disabled = false;
    } finally {
      reportPending = false;
    }
  };
  report.append(title, outcomeGroup, reasonGroup, submitButton, reportStatus);
  $('guide-overlay').classList.remove('hidden');
  $('guide-close').focus();
}
function closeGuide(): void {
  guideGeneration++;
  $('guide-overlay').classList.add('hidden');
}
// Embedded preview: many student sites block iframe embedding via
// X-Frame-Options/CSP. We can't reliably detect that from JS (a blocked
// frame still fires 'load'), so we pair the iframe with an always-visible
// "새 탭에서 열기" link and a load timeout that swaps in a text fallback if
// the frame never finishes loading.
let previewLoadTimer: number | undefined;
let previewService: Service | null = null;
let previewOpenedAt = 0;
// prd.md §14.3.3 / trd.md §10.1: bucket dwell time (open → close) instead of
// reporting a raw duration, so the funnel report stays a coarse directional
// signal (not a precise tracking metric) per the "집계 통계" principle.
function dwellBucket(ms:number):string{
  if(ms<5000)return'<5s';
  if(ms<15000)return'5-15s';
  if(ms<30000)return'15-30s';
  if(ms<60000)return'30-60s';
  return'60s+';
}
function openPreview(service: Service){
  const serviceUrl = safeExternalUrl(service.serviceUrl);
  if (!serviceUrl) return;
  track('service_click',{serviceId:service.id,mode:'embed'});
  previewService = service;
  previewOpenedAt = Date.now();
  $('preview-title').textContent = service.name;
  $('preview-article-title').textContent = service.name;
  $('preview-article-desc').textContent = service.tagline;
  $<HTMLAnchorElement>('preview-open-new').href = serviceUrl;
  const frame = $<HTMLIFrameElement>('preview-frame');
  const fallback = $('preview-fallback');
  hideRetryIntent();
  fallback.classList.add('hidden');
  frame.classList.remove('hidden');
  let loaded = false;
  frame.onload = () => { loaded = true; };
  frame.src = serviceUrl;
  window.clearTimeout(previewLoadTimer);
  previewLoadTimer = window.setTimeout(() => {
    if (!loaded) { frame.classList.add('hidden'); fallback.classList.remove('hidden'); }
  }, 4000);
  $('preview-overlay').classList.remove('hidden');
}
// prd.md §14.3 / trd.md §10.1 (Phase 2 draft): optional single-question
// "다시 써보고 싶나요?" check when a preview is closed. Sent as a follow-up
// service_click event tagged metadata.stage='preview_close' so it doesn't
// double-count the primary preview-open event recorded in openPreview().
let retryIntentTimer: number | undefined;
function requestClosePreview(){
  if (!previewService) { closePreview(); return; }
  if (!$('retry-intent').classList.contains('hidden')) { closePreview(); return; }
  // Dwell time is recorded once, right as the user initiates closing (button,
  // Escape, or the preview-open timeout below) — regardless of whether they
  // go on to answer/skip the retry-intent question — so every preview close
  // contributes a bucket, not just the ones with an answered follow-up.
  track('service_click',{serviceId:previewService.id,mode:'embed',stage:'preview_close',dwellBucket:dwellBucket(Date.now()-previewOpenedAt)});
  window.clearTimeout(previewLoadTimer);
  $<HTMLIFrameElement>('preview-frame').classList.add('hidden');
  $('preview-fallback').classList.add('hidden');
  $('retry-intent').classList.remove('hidden');
  window.clearTimeout(retryIntentTimer);
  retryIntentTimer = window.setTimeout(() => closePreview(), 6000);
}
function hideRetryIntent(){
  $('retry-intent').classList.add('hidden');
  window.clearTimeout(retryIntentTimer);
}
function answerRetryIntent(retryIntent:'yes'|'no'|'unsure'){
  if (previewService) track('service_click',{serviceId:previewService.id,mode:'embed',stage:'preview_close',retryIntent});
  closePreview();
}
function closePreview(){
  hideRetryIntent();
  $('preview-overlay').classList.add('hidden');
  window.clearTimeout(previewLoadTimer);
  $<HTMLIFrameElement>('preview-frame').src = 'about:blank';
  previewService = null;
}
// Ranking: aggregated server-side from anonymous 'card_like' (right-swipe)
// events, so it reflects everyone's choices, not just this session's.
let rankingOrigin: 'landing' | 'results' = 'landing';
let rankingLoadToken = 0;
async function openRanking(origin: 'landing' | 'results'){
  const token = ++rankingLoadToken;
  profileLoadToken++;
  taskLoadToken++;
  rankingOrigin = origin;
  show('ranking');
  const list = $('ranking-list');
  const empty = $('ranking-empty');
  list.innerHTML = '<li class="ranking-loading">불러오는 중...</li>';
  empty.classList.add('hidden');
  empty.textContent = '아직 집계된 선택이 없어요. 먼저 서비스를 둘러보고 관심 있는 서비스에 스와이프해 주세요!';
  try {
    const r = await fetch(`${API}/api/services/ranking`);
    if (!r.ok) throw new Error('Ranking request failed');
    const body = await r.json();
    if (token !== rankingLoadToken) return;
    if (!Array.isArray(body.ranking)) throw new Error('Invalid ranking response');
    const ranking: Array<{id:string; name:string; tagline:string; serviceUrl:string; likeCount:number}> = body.ranking;
    if (ranking.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    list.innerHTML = ranking.map((s, i) => `<li class="ranking-item"><span class="ranking-rank">${i + 1}</span><div class="ranking-info"><strong>${escapeHtml(s.name)}</strong><p>${escapeHtml(s.tagline)}</p></div><span class="ranking-count">${Number.isSafeInteger(s.likeCount) && s.likeCount >= 0 ? s.likeCount : 0}회 선택</span></li>`).join('');
  } catch {
    if (token !== rankingLoadToken) return;
    list.innerHTML = '';
    empty.textContent = '랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    empty.classList.remove('hidden');
  }
}
function closeRanking(){ show(rankingOrigin); }
function isAppearanceTheme(value: string | null): value is AppearanceTheme {
  return value !== null && APPEARANCE_THEMES.some(theme => theme === value);
}
function applyAppearanceTheme(theme: AppearanceTheme, persist = false): void {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>('[data-app-theme]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.appTheme === theme));
  });
  if (!persist) return;
  try {
    const storage = globalThis.localStorage;
    if (typeof storage?.setItem !== 'function') {
      $('theme-settings-status').textContent = '이 환경에서는 테마 설정을 저장할 수 없어요.';
      return;
    }
    storage.setItem(APPEARANCE_THEME_STORAGE_KEY, theme);
    $('theme-settings-status').textContent = '';
  } catch (error) {
    console.error('화면 테마 설정을 저장하지 못했습니다.', error);
    $('theme-settings-status').textContent = '테마는 적용했지만 설정을 저장하지 못했어요.';
  }
}
function restoreAppearanceTheme(): void {
  applyAppearanceTheme(DEFAULT_APPEARANCE_THEME);
  try {
    const storage = globalThis.localStorage;
    if (typeof storage?.getItem !== 'function') return;
    const saved = storage.getItem(APPEARANCE_THEME_STORAGE_KEY);
    if (isAppearanceTheme(saved)) applyAppearanceTheme(saved);
  } catch (error) {
    console.error('저장된 화면 테마를 읽지 못했습니다.', error);
  }
}
function closeThemeSettings(): void {
  $('theme-settings').classList.add('hidden');
  $<HTMLButtonElement>('theme-settings-button').setAttribute('aria-expanded', 'false');
}
const startButton = $<HTMLButtonElement>('start-button');
const startButtonDefaultText = startButton.textContent ?? '';
// prd.md §9 item 6: an empty catalog (all exhibits currently unreachable) must show a
// "preparing/try again" state instead of silently letting the user swipe
// through zero cards into a misleading "all done" results screen.
const fetchShuffleServices = (shuffle: ShuffleId, tier?: ServiceTier): Promise<Service[]> => catalogLoader.getServices(shuffle, tier);
let taskLoadToken = 0;
function renderTaskChoices(): void {
  $('task-choices').innerHTML = TASK_OPTIONS.map(([id, label]) => `<button class="choice" type="button" data-task="${id}">${label}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(button => {
    button.onclick = () => { void startTaskSearch(button.dataset.task!); };
  });
}
async function startTaskSearch(taskId: string): Promise<void> {
  const token = ++taskLoadToken;
  profileLoadToken++;
  $('task-status').textContent = '작업에 맞는 서비스의 접속 상태를 확인하고 있어요...';
  document.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(button => { button.disabled = true; });
  try {
    const fetched = await catalogLoader.getTaskServices(taskId);
    if (token !== taskLoadToken) return;
    if (fetched.length === 0) {
      $('task-status').textContent = '지금은 연결할 수 있는 항목이 없어요. 다른 작업을 고르거나 잠시 후 다시 시도해 주세요.';
      return;
    }
    currentShuffle = 'task';
    selectedTask = taskId;
    audience = null;
    interests = new Set();
    liked = [];
    history = [];
    index = 0;
    services = [...fetched].sort((a, b) => matchScore(b, null, interests, taskId) - matchScore(a, null, interests, taskId));
    track('landing_view', { shuffle: 'task', task: taskId });
    track('profile_submit', { shuffle: 'task', task: taskId });
    startBatch();
    show('cards');
    renderCard();
  } catch (error) {
    if (token !== taskLoadToken) return;
    console.error(`작업 카탈로그를 불러오지 못했습니다. (${taskId})`, error);
    $('task-status').textContent = '서비스 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
  } finally {
    if (token === taskLoadToken) document.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(button => { button.disabled = false; });
  }
}
// Keep the landing screen interactive while the service catalog warms in the
// background. The questionnaire is available immediately; only its final
// continue action waits until there are cards to show.
startButton.disabled = false;
startButton.textContent = startButtonDefaultText;
function openProfile(shuffle: ShuffleId, tier?: ServiceTier) {
  resetDiscovery();
  currentShuffle = shuffle;
  audience = null; interests = new Set();
  services = [];
  profileCatalogReady = false;
  profileCatalogError=false;
  const requestToken = ++profileLoadToken;
  show('profile');renderChoices();checkProfile();
  void fetchShuffleServices(shuffle, tier).then(fetched => {
    if (requestToken !== profileLoadToken || currentShuffle !== shuffle) return;
    services = fetched;
    profileCatalogReady = true;
    track('landing_view', { shuffle, tier: tier ?? 'all' });
    checkProfile();
  }).catch(error => {
    if (requestToken !== profileLoadToken || currentShuffle !== shuffle) return;
    profileCatalogError = true;
    console.error(`${shuffle} 카탈로그를 불러오지 못했습니다.`, error);
    checkProfile();
  });
}
$('start-button').onclick=()=>openProfile('vibe-venture');
const themeEntryButton = $<HTMLButtonElement>('theme-entry-button');
const THEME_IDS: Exclude<ShuffleId,'vibe-venture'>[] = ['sns','dating','productivity','game'];
let pendingThemeShuffle: Exclude<ShuffleId,'vibe-venture'> | null = null;
function renderThemeChoices(){
  $('theme-choices').innerHTML = THEME_IDS.map(id => `<button class="choice" data-theme="${id}">${SHUFFLE_LABELS[id]}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('#theme-choices [data-theme]').forEach(b => b.onclick = () => selectTheme(b.dataset.theme as Exclude<ShuffleId,'vibe-venture'>));
}
// Theme selection only records the pending shuffle and moves to the
// 주류/비주류 choice; the actual catalog fetch (and its "준비 중" / "불러오지
// 못했어요" error handling) now happens in selectTier() once a tier is
// known, since the services returned depend on both shuffle and tier.
function selectTheme(shuffle: Exclude<ShuffleId,'vibe-venture'>){
  pendingThemeShuffle = shuffle;
  renderTierChoices();
  show('tier');
  void catalogLoader.preloadTheme(shuffle).catch(error => console.warn(`${shuffle} 카탈로그 사전 로드 실패`, error));
}
const TIER_CHOICES: { tier?: ServiceTier; label: string }[] = [
  { tier: 'mainstream', label: '주류 서비스' },
  { tier: 'emerging', label: '비주류(신생) 서비스' },
  { label: '둘 다 (추천)' },
];
function renderTierChoices(){
  $('tier-choices').innerHTML = TIER_CHOICES.map((t,i) => `<button class="choice${t.tier===undefined?' recommended':''}" data-tier-index="${i}">${t.label}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-tier-index]').forEach(b => b.onclick = () => selectTier(TIER_CHOICES[Number(b.dataset.tierIndex)].tier));
}
function selectTier(tier: ServiceTier | undefined){
  if(!pendingThemeShuffle) return;
  openProfile(pendingThemeShuffle, tier);
}
themeEntryButton.onclick = () => {
  resetDiscovery();
  renderThemeChoices();
  show('theme');
};
const taskEntryButton = $<HTMLButtonElement>('task-entry-button');
taskEntryButton.onclick = () => {
  resetDiscovery();
  renderTaskChoices();
  $('task-status').textContent = '';
  show('task-discovery');
};
// Shared "go back to the very start" action: the logo and home button on
// every non-landing screen, plus the results screen's "처음부터 다시 보기"
// button, all reset in-progress round state and return to landing. This is
// always a manual, user-triggered navigation (never automatic).
function resetDiscovery(): void {
  profileLoadToken++;
  taskLoadToken++;
  cancelCardInteraction();
  closePreview();
  closeGuide();
  index = 0; batchStart = 0; batchEnd = 0;
  services = []; liked = []; dislikedThisBatch = []; history = [];
  audience = null; interests = new Set(); selectedTask = null;
  currentShuffle = 'vibe-venture';
  pendingThemeShuffle = null;
}
function goHome(){ resetDiscovery(); show('landing'); }
$('theme-back').onclick = goHome;
$('task-back').onclick = goHome;
$('tier-back').onclick = () => { renderThemeChoices(); show('theme'); };
document.querySelectorAll<HTMLElement>('.home-logo').forEach(el=>{
  el.addEventListener('click', goHome);
  el.addEventListener('keydown', e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goHome();}});
});
document.querySelectorAll<HTMLButtonElement>('.home-button').forEach(el=>el.onclick=goHome);
$('profile-next').onclick=()=>{if(!profileCatalogReady||services.length===0)return;services=[...services].sort((a,b)=>matchScore(b,audience,interests)-matchScore(a,audience,interests));track('profile_submit',{audience,interests:[...interests],shuffle:currentShuffle});startBatch();show('cards');renderCard();};
function triggerDecision(action:'like'|'dislike'){
  if (!canDecide()) return;
  const card=$('swipe-stage').querySelector<HTMLElement>('.service-card');
  if(card) flyOutCard(card, action, () => decide(action)); else decide(action);
}
$('like-button').onclick=()=>triggerDecision('like');$('reject-button').onclick=()=>triggerDecision('dislike');$('undo-button').onclick=undo;$('swipe-stage').onkeydown=e=>{if(e.key==='ArrowRight')triggerDecision('like');if(e.key==='ArrowLeft')triggerDecision('dislike');if(e.key.toLowerCase()==='u')undo();};
$('skip-button').onclick=()=>decide('skip');
$('continue-button').onclick=()=>{startBatch();show('cards');renderCard();};
$('restart-button').onclick=goHome;
$('email-form').onsubmit=async e=>{e.preventDefault();const message=$('email-message');try{const r=await fetch(`${API}/api/email-leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$<HTMLInputElement>('email').value,updatesOptIn:$<HTMLInputElement>('updates').checked})});const body=await r.json();if(!r.ok)throw new Error(body.message);message.textContent='결과를 저장했어요.';track('email_submit',{updatesOptIn:$<HTMLInputElement>('updates').checked});}catch(error){message.textContent=error instanceof Error?error.message:'저장에 실패했어요.';}};
$('preview-close').onclick=requestClosePreview;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('theme-settings').classList.contains('hidden'))closeThemeSettings();else if(!$('guide-overlay').classList.contains('hidden'))closeGuide();else requestClosePreview();}});
$('guide-close').onclick=closeGuide;
$('guide-skip').onclick=closeGuide;
document.querySelectorAll<HTMLButtonElement>('[data-retry-intent]').forEach(b=>b.onclick=()=>answerRetryIntent(b.dataset.retryIntent as 'yes'|'no'|'unsure'));
$('retry-intent-skip').onclick=closePreview;
$('ranking-link-results').onclick=()=>openRanking('results');
$('ranking-nav').onclick=()=>openRanking('landing');
$('ranking-back').onclick=closeRanking;
$('home-ranking-entry').onclick=()=>openRanking('landing');
$('discover-nav').onclick=()=>{
  if($('landing').classList.contains('hidden'))goHome();
  $<HTMLTextAreaElement>('assistant-message').focus();
};
$('brand-home').onclick=event=>{event.preventDefault();goHome();};
$('home-search-form').onsubmit=(event)=>{event.preventDefault();renderHomeCatalog();};
$('assistant-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (assistantRequestPending) return;
  const messageInput = $<HTMLTextAreaElement>('assistant-message');
  const content = messageInput.value.trim();
  const status = $('assistant-status');
  if (!content) return;
  if (!$<HTMLInputElement>('assistant-consent').checked) {
    status.textContent = 'AI 전송 동의를 확인해 주세요.';
    return;
  }

  const userMessage: AssistantMessage = { role: 'user', content };
  $('landing').classList.add('has-assistant-conversation');
  const messageElement = appendAssistantMessage('user', content);
  messageInput.value = '';
  assistantRequestPending = true;
  $<HTMLButtonElement>('assistant-send').disabled = true;
  $<HTMLButtonElement>('assistant-reset').disabled = true;
  let completed = false;
  status.textContent = '문제와 맞는 서비스를 살펴보고 있어요...';
  try {
    const response = await fetch(`${API}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assistantRequest(
        assistantMessages, userMessage,
        $<HTMLInputElement>('assistant-tech-stack').value.trim(),
        $<HTMLInputElement>('assistant-repo-url').value.trim(),
      )),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'AI 추천을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.';
      status.textContent = message;
      return;
    }
    const result = parseAssistantResponse(payload);
    if (!result) {
      status.textContent = 'AI 추천 응답을 확인할 수 없어요. 다시 시도해 주세요.';
      return;
    }
    assistantMessages.push(userMessage, { role: 'assistant', content: result.reply });
    if (assistantMessages.length > 12) assistantMessages.splice(0, assistantMessages.length - 12);
    completed = true;
    appendAssistantMessage('assistant', result.reply);
    appendAssistantRecommendations(result.recommendations);
    status.textContent = result.analyzedRepository
      ? `공개 저장소 확인 완료 · ${result.analyzedRepository.languages.join(', ') || '언어 정보 없음'}`
      : '';
  } catch {
    status.textContent = 'AI 추천 서비스에 연결할 수 없어요. 네트워크를 확인하고 다시 시도해 주세요.';
  } finally {
    assistantRequestPending = false;
    $<HTMLButtonElement>('assistant-send').disabled = false;
    $<HTMLButtonElement>('assistant-reset').disabled = false;
    if (!completed) {
      messageElement.remove();
      if (!messageInput.value) messageInput.value = content;
      $('landing').classList.toggle('has-assistant-conversation', assistantMessages.length > 0);
    }
  }
});
$('assistant-reset').addEventListener('click', () => {
  if (assistantRequestPending) return;
  assistantMessages.length = 0;
  $('assistant-thread').replaceChildren();
  $('landing').classList.remove('has-assistant-conversation');
  $<HTMLTextAreaElement>('assistant-message').value = '';
  $<HTMLInputElement>('assistant-tech-stack').value = '';
  $<HTMLInputElement>('assistant-repo-url').value = '';
  $<HTMLInputElement>('assistant-consent').checked = false;
  $('assistant-status').textContent = '';
});
$('service-search').addEventListener('input',()=>{
  homeCatalogPage=0;
  $('clear-search').classList.toggle('hidden',!$<HTMLInputElement>('service-search').value);
  renderHomeCatalog();
});
$('clear-search').onclick=()=>{
  $<HTMLInputElement>('service-search').value='';
  homeCatalogPage=0;
  $('clear-search').classList.add('hidden');
  renderHomeCatalog();
  $<HTMLInputElement>('service-search').focus();
};
document.querySelectorAll<HTMLButtonElement>('[data-home-kind]').forEach(button=>button.onclick=()=>{
  const kind=button.dataset.homeKind;
  if(kind!=='all'&&kind!=='product'&&kind!=='service'&&kind!=='skill'&&kind!=='mcp')return;
  selectedHomeKind=kind;
  homeCatalogPage=0;
  document.querySelectorAll<HTMLButtonElement>('[data-home-kind]').forEach(filter=>{
    const selected=filter===button;
    filter.classList.toggle('selected',selected);
    filter.setAttribute('aria-pressed',String(selected));
  });
  renderHomeCatalog();
});
const themeSettingsButton=$<HTMLButtonElement>('theme-settings-button');
themeSettingsButton.onclick=()=>{
  const settings=$('theme-settings');
  const willOpen=settings.classList.contains('hidden');
  settings.classList.toggle('hidden',!willOpen);
  themeSettingsButton.setAttribute('aria-expanded',String(willOpen));
};
document.querySelectorAll<HTMLButtonElement>('[data-app-theme]').forEach(button=>button.onclick=()=>{
  const theme=button.dataset.appTheme;
  if(theme==='paper'||theme==='clay'||theme==='midnight')applyAppearanceTheme(theme,true);
});
document.addEventListener('click',event=>{
  const wrapper=$('theme-settings').parentElement!;
  if(event.target instanceof Node&&!wrapper.contains(event.target))closeThemeSettings();
});
restoreAppearanceTheme();
void loadHomeCatalog();
