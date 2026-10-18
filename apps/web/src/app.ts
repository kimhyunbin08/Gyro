import './styles.css';
import { createCatalogLoader, type CatalogService as Service, type CatalogShuffle as ShuffleId, type CatalogTier as ServiceTier } from './catalog-loader.js';

type Audience = 'student' | 'teacher' | 'parent' | 'other';
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
  return imageUrl.startsWith('/') ? `${API}${imageUrl}` : imageUrl;
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
export function matchScore(service: Service, audience: Audience | null, interests: ReadonlySet<string>): number {
  const matchedTags = matchedInterestTags(service, interests).length;
  const audienceMatch = audience !== null && service.audiences.includes(audience);
  return matchedTags * INTEREST_WEIGHT + (audienceMatch ? AUDIENCE_WEIGHT : 0);
}
let services: Service[] = [], index = 0, batchStart = 0, batchEnd = 0, liked: Service[] = [], history: Array<{service:Service; action:'like'|'dislike'|'skip'}> = [];
// prd.md §14.3 / trd.md §10.1 (Phase 2 draft): services disliked in the
// current round, collected so the "why not interested" question can be
// asked once, batched, at the results screen instead of interrupting the
// swipe flow after every single dislike.
let dislikedThisBatch: Service[] = [];
let audience: Audience | null = null, interests = new Set<string>();
const SHUFFLE_LABELS: Record<ShuffleId,string> = {'vibe-venture':'바이브 벤처','sns':'SNS','dating':'연애','productivity':'생산성','game':'게임'};
const SHUFFLE_TAGS: Record<ShuffleId,string[]> = {
  'vibe-venture':['학습','창작','생활','생산성','협업','AI'],
  'sns':['소통','커뮤니티','콘텐츠공유','네트워킹'],
  'dating':['매칭','소개팅','커뮤니티','본인인증'],
  'productivity':['업무관리','메모·노트','자동화','협업'],
  'game':['캐주얼','멀티플레이어','전략','커뮤니티'],
};
let currentShuffle: ShuffleId = 'vibe-venture';
const catalogLoader = createCatalogLoader(API);
let profileCatalogReady = false;
let profileCatalogError = false;
let profileLoadToken = 0;
const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const screens = ['landing','theme','tier','profile','cards','results','ranking'];
function show(id:string){screens.forEach(x => $(x).classList.toggle('hidden', x !== id)); window.scrollTo({top:0,behavior:'smooth'});}
function track(name:string, metadata:Record<string,unknown>={}){void fetch(`${API}/api/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,sessionId,metadata})}).catch(()=>{});}
function startBatch(){ batchStart = index; batchEnd = Math.min(index + BATCH_SIZE, services.length); dislikedThisBatch = []; }
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
  const stage = $('swipe-stage');
  const distance = stage.clientWidth + 200;
  card.style.transition = 'transform .32s ease-out';
  card.style.transform = cardTransform(direction === 'like' ? distance : -distance, dragX ? dragX * 0.3 : 0);
  card.style.pointerEvents = 'none';
  setTimeout(onDone, 260);
}
function bindCardGestures(card:HTMLElement){
  card.style.transition = 'none';
  card.addEventListener('pointerdown', (e: PointerEvent) => {
    if (index >= batchEnd) return;
    if ((e.target as HTMLElement).closest('[data-preview]')) return;
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
  card.addEventListener('pointercancel', endDrag);
}
// macOS/trackpad two-finger swipes fire as horizontal `wheel` events (no
// touch events are involved), so they're handled separately from pointer drag.
function bindWheelGestures(card:HTMLElement){
  const stage = $('swipe-stage');
  stage.onwheel = (e: WheelEvent) => {
    if (index >= batchEnd || dragging) return;
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
  const matchedTags = matchedInterestTags(service, interests);
  const audienceMatch = audience && service.audiences.includes(audience);
  if (matchedTags.length > 0) return `"${matchedTags[0]}" 관심사와 잘 맞아요`;
  if (audienceMatch) return '선택하신 유형에게 인기 있어요';
  return '지금 둘러보기 좋은 서비스예요';
}
function renderCard(){
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
  stage.innerHTML = `<article class="service-card image-fallback"><span class="service-card-initial" aria-hidden="true">${service.name.charAt(0)}</span><span class="swipe-stamp like" aria-hidden="true">관심 있음</span><span class="swipe-stamp nope" aria-hidden="true">관심 없음</span><div class="service-copy"><div class="service-tags">${service.tags.map(t=>`<span>${t}</span>`).join('')}</div><h3>${service.name}</h3><p>${service.tagline}</p><p class="service-reason">✨ ${recommendationReason(service)}</p><button class="preview-button" type="button" data-preview>미리보기 ⤢</button></div></article>`;
  const card = stage.querySelector<HTMLElement>('.service-card')!;
  const preload = new Image();
  preload.onload = () => { card.style.backgroundImage = `url('${resolveImageUrl(service.imageUrl)}')`; card.classList.remove('image-fallback'); };
  preload.src = resolveImageUrl(service.imageUrl);
  card.querySelector<HTMLButtonElement>('[data-preview]')!.onclick = (e) => { e.stopPropagation(); openPreview(service); };
  bindCardGestures(card);
  bindWheelGestures(card);
}
function decide(action:'like'|'dislike'|'skip'){if(index>=batchEnd)return;const service=services[index++];history.push({service,action});if(action==='like')liked.push(service);if(action==='dislike')dislikedThisBatch.push(service);track(action==='like'?'card_like':action==='dislike'?'card_dislike':'card_skip',{serviceId:service.id});renderCard();}
// prd.md §14.3 / trd.md §10.1 (Phase 2 draft): optional, skippable "why not
// interested" micro-feedback. Asked once per round at the results screen
// (not right after each dislike swipe) so the swipe flow is never
// interrupted. Sent as a separate card_dislike event tagged
// metadata.stage='reason_tag' so it doesn't inflate the primary
// dislike-swipe count used elsewhere.
const DISLIKE_REASONS: [string, string][] = [['unclear','설명이 이해 안 됨'],['not_relevant','내 상황과 안 맞음'],['bad_design','디자인이 별로'],['already_used','이미 써봄']];
function dislikeReasonsHtml():string{
  if(!dislikedThisBatch.length) return '';
  const rows = dislikedThisBatch.map(s=>`<div class="dislike-reason-item" data-dislike-reason-service="${s.id}"><p class="dislike-reason-name">${s.name}</p><div class="reason-chips">${DISLIKE_REASONS.map(([value,label])=>`<button type="button" class="reason-chip" data-reason="${value}">${label}</button>`).join('')}</div><p class="dislike-reason-message" role="status"></p></div>`).join('');
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
function undo(){const last=history.pop();if(!last||index<=batchStart)return;index--;if(last.action==='like')liked=liked.filter(x=>x.id!==last.service.id);if(last.action==='dislike')dislikedThisBatch=dislikedThisBatch.filter(x=>x.id!==last.service.id);track('card_undo',{serviceId:last.service.id});renderCard();}
// §PRD 9-?: 한 라운드(스와이프 세션)가 끝나고 결과 화면에 들어선 뒤, 관심 표시한 서비스마다
// 로그인 없이 별점(1~5)+코멘트를 남길 수 있다. 전송은 기존 익명 퍼널 이벤트 경로를 재사용한다.
function feedbackWidgetHtml(serviceId:string):string{
  const stars=[1,2,3,4,5].map(n=>`<button type="button" class="feedback-star" data-star="${n}" aria-label="${n}점">★</button>`).join('');
  return `<div class="feedback-box" data-feedback-service="${serviceId}"><p class="feedback-label">이 서비스, 어땠나요?</p><div class="feedback-stars" role="group" aria-label="별점">${stars}</div><textarea class="feedback-comment" maxlength="300" placeholder="개선하면 좋을 점이 있다면 알려주세요 (선택)"></textarea><button type="button" class="text-button feedback-submit" disabled>피드백 보내기</button><p class="feedback-message" role="status"></p></div>`;
}
function bindFeedbackWidgets(){
  document.querySelectorAll<HTMLElement>('[data-feedback-service]').forEach(box=>{
    const serviceId=box.dataset.feedbackService!;
    const stars=Array.from(box.querySelectorAll<HTMLButtonElement>('.feedback-star'));
    const submit=box.querySelector<HTMLButtonElement>('.feedback-submit')!;
    const comment=box.querySelector<HTMLTextAreaElement>('.feedback-comment')!;
    const message=box.querySelector<HTMLElement>('.feedback-message')!;
    let rating=0;
    stars.forEach(star=>{
      star.onclick=()=>{
        rating=Number(star.dataset.star);
        stars.forEach(s=>s.classList.toggle('active',Number(s.dataset.star)<=rating));
        submit.disabled=false;
      };
    });
    submit.onclick=async()=>{
      if(rating===0)return;
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
      }
    };
  });
}
function finishBatch(){
  const remaining = services.length - index;
  track('result_view',{likedCount:liked.length,remaining});
  show('results');
  $('result-list').innerHTML=liked.length?liked.map(s=>`<article class="result-item"><div class="result-main"><img src="${resolveImageUrl(s.imageUrl)}" alt=""><div><h3>${s.name}</h3><p>${s.tagline}</p><div class="result-links"><a href="${s.serviceUrl}" target="_blank" rel="noreferrer" data-service="${s.id}">서비스 열어보기 →</a><button class="result-preview-button" type="button" data-preview-result="${s.id}">미리보기</button></div></div></div>${feedbackWidgetHtml(s.id)}</article>`).join(''):'<p class="lede">아직 관심 표시한 서비스가 없어요. 다시 둘러보며 새로운 가능성을 찾아보세요.</p>';
  document.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach(a=>a.onclick=()=>track('service_click',{serviceId:a.dataset.service}));
  document.querySelectorAll<HTMLButtonElement>('[data-preview-result]').forEach(b=>{
    const matched = liked.find(s=>s.id===b.dataset.previewResult);
    if (matched) b.onclick = () => openPreview(matched);
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
  track('service_click',{serviceId:service.id,mode:'embed'});
  previewService = service;
  previewOpenedAt = Date.now();
  $('preview-title').textContent = service.name;
  $('preview-article-title').textContent = service.name;
  $('preview-article-desc').textContent = service.tagline;
  $<HTMLAnchorElement>('preview-open-new').href = service.serviceUrl;
  const frame = $<HTMLIFrameElement>('preview-frame');
  const fallback = $('preview-fallback');
  hideRetryIntent();
  fallback.classList.add('hidden');
  frame.classList.remove('hidden');
  let loaded = false;
  frame.onload = () => { loaded = true; };
  frame.src = service.serviceUrl;
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
async function openRanking(origin: 'landing' | 'results'){
  rankingOrigin = origin;
  show('ranking');
  const list = $('ranking-list');
  const empty = $('ranking-empty');
  list.innerHTML = '<li class="ranking-loading">불러오는 중...</li>';
  empty.classList.add('hidden');
  try {
    const r = await fetch(`${API}/api/services/ranking`);
    const body = await r.json();
    const ranking: Array<{id:string; name:string; tagline:string; serviceUrl:string; likeCount:number}> = body.ranking || [];
    if (ranking.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    list.innerHTML = ranking.map((s, i) => `<li class="ranking-item"><span class="ranking-rank">${i + 1}</span><div class="ranking-info"><strong>${s.name}</strong><p>${s.tagline}</p></div><span class="ranking-count">${s.likeCount}회 선택</span></li>`).join('');
  } catch {
    list.innerHTML = '';
    empty.textContent = '랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    empty.classList.remove('hidden');
  }
}
function closeRanking(){ show(rankingOrigin); }
const startButton = $<HTMLButtonElement>('start-button');
const startButtonDefaultText = startButton.textContent ?? '';
// prd.md §9 item 6: an empty catalog (all exhibits currently unreachable) must show a
// "preparing/try again" state instead of silently letting the user swipe
// through zero cards into a misleading "all done" results screen.
const fetchShuffleServices = (shuffle: ShuffleId, tier?: ServiceTier): Promise<Service[]> => catalogLoader.getServices(shuffle, tier);
// Keep the landing screen interactive while the service catalog warms in the
// background. The questionnaire is available immediately; only its final
// continue action waits until there are cards to show.
startButton.disabled = false;
startButton.textContent = startButtonDefaultText;
function openProfile(shuffle: ShuffleId, tier?: ServiceTier) {
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
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.onclick = () => selectTheme(b.dataset.theme as Exclude<ShuffleId,'vibe-venture'>));
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
  renderThemeChoices();
  show('theme');
};
// Shared "go back to the very start" action: the logo and home button on
// every non-landing screen, plus the results screen's "처음부터 다시 보기"
// button, all reset in-progress round state and return to landing. This is
// always a manual, user-triggered navigation (never automatic).
function goHome(){profileLoadToken++;index=0;batchStart=0;batchEnd=0;liked=[];dislikedThisBatch=[];history=[];audience=null;interests.clear();pendingThemeShuffle=null;show('landing');}
$('theme-back').onclick = goHome;
$('tier-back').onclick = () => { renderThemeChoices(); show('theme'); };
document.querySelectorAll<HTMLElement>('.home-logo').forEach(el=>{
  el.addEventListener('click', goHome);
  el.addEventListener('keydown', e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goHome();}});
});
document.querySelectorAll<HTMLButtonElement>('.home-button').forEach(el=>el.onclick=goHome);
$('profile-next').onclick=()=>{if(!profileCatalogReady||services.length===0)return;services=[...services].sort((a,b)=>matchScore(b,audience,interests)-matchScore(a,audience,interests));track('profile_submit',{audience,interests:[...interests],shuffle:currentShuffle});startBatch();show('cards');renderCard();};
function triggerDecision(action:'like'|'dislike'){ if(index>=batchEnd)return; const card=$('swipe-stage').querySelector<HTMLElement>('.service-card'); if(card) flyOutCard(card, action, () => decide(action)); else decide(action); }
$('like-button').onclick=()=>triggerDecision('like');$('reject-button').onclick=()=>triggerDecision('dislike');$('undo-button').onclick=undo;$('swipe-stage').onkeydown=e=>{if(e.key==='ArrowRight')triggerDecision('like');if(e.key==='ArrowLeft')triggerDecision('dislike');if(e.key.toLowerCase()==='u')undo();};
$('continue-button').onclick=()=>{startBatch();show('cards');renderCard();};
$('restart-button').onclick=goHome;
$('email-form').onsubmit=async e=>{e.preventDefault();const message=$('email-message');try{const r=await fetch(`${API}/api/email-leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$<HTMLInputElement>('email').value,updatesOptIn:$<HTMLInputElement>('updates').checked})});const body=await r.json();if(!r.ok)throw new Error(body.message);message.textContent='결과를 저장했어요.';track('email_submit',{updatesOptIn:$<HTMLInputElement>('updates').checked});}catch(error){message.textContent=error instanceof Error?error.message:'저장에 실패했어요.';}};
$('preview-close').onclick=requestClosePreview;
document.addEventListener('keydown',e=>{if(e.key==='Escape')requestClosePreview();});
document.querySelectorAll<HTMLButtonElement>('[data-retry-intent]').forEach(b=>b.onclick=()=>answerRetryIntent(b.dataset.retryIntent as 'yes'|'no'|'unsure'));
$('retry-intent-skip').onclick=closePreview;
$('ranking-link-landing').onclick=()=>openRanking('landing');
$('ranking-link-results').onclick=()=>openRanking('results');
$('ranking-back').onclick=closeRanking;
