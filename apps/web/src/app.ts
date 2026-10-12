import './styles.css';

type Audience = 'student' | 'teacher' | 'parent' | 'other';
type Service = { id:string; name:string; tagline:string; description:string; imageUrl:string; serviceUrl:string; tags:string[]; audiences:Audience[] };
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
const sessionId = crypto.randomUUID();
// Swiping through all ~98 services in one sitting is exhausting, so cards are
// shown in rounds of BATCH_SIZE; each round ends on an interim results
// screen that offers to continue with the next round.
const BATCH_SIZE = 10;
let services: Service[] = [], index = 0, batchStart = 0, batchEnd = 0, liked: Service[] = [], history: Array<{service:Service; action:'like'|'dislike'|'skip'}> = [];
let audience: Audience | null = null, interests = new Set<string>();
const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const screens = ['landing','profile','cards','results'];
function show(id:string){screens.forEach(x => $(x).classList.toggle('hidden', x !== id)); window.scrollTo({top:0,behavior:'smooth'});}
function track(name:string, metadata:Record<string,unknown>={}){void fetch(`${API}/api/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,sessionId,metadata})}).catch(()=>{});}
function startBatch(){ batchStart = index; batchEnd = Math.min(index + BATCH_SIZE, services.length); }
function renderChoices(){const audiences:[Audience,string][]=[['student','학생이에요'],['teacher','선생님이에요'],['parent','학부모예요'],['other','그 외예요']];$('audience-choices').innerHTML=audiences.map(([id,label])=>`<button class="choice ${audience===id?'selected':''}" data-audience="${id}">${label}</button>`).join(''); document.querySelectorAll<HTMLElement>('[data-audience]').forEach(b=>b.onclick=()=>{audience=b.dataset.audience as Audience;renderChoices();checkProfile();}); const tags=['학습','창작','생활','생산성','협업','AI'];$('interest-choices').innerHTML=tags.map(tag=>`<button class="tag ${interests.has(tag)?'selected':''}" data-interest="${tag}">${tag}</button>`).join('');document.querySelectorAll<HTMLElement>('[data-interest]').forEach(b=>b.onclick=()=>{const tag=b.dataset.interest!;interests.has(tag)?interests.delete(tag):interests.add(tag);renderChoices();checkProfile();});}
function checkProfile(){ $('profile-next').toggleAttribute('disabled', !audience || interests.size===0); }
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
// §26.3/§26.6.7: every card shows at least one explainable reason, derived
// from the same tag/audience overlap used to rank the deck in profile-next.
function recommendationReason(service: Service): string {
  const matchedTags = service.tags.filter((t) => interests.has(t));
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
  preload.onload = () => { card.style.backgroundImage = `url('${service.imageUrl}')`; card.classList.remove('image-fallback'); };
  preload.src = service.imageUrl;
  card.querySelector<HTMLButtonElement>('[data-preview]')!.onclick = (e) => { e.stopPropagation(); openPreview(service); };
  bindCardGestures(card);
  bindWheelGestures(card);
}
function decide(action:'like'|'dislike'|'skip'){if(index>=batchEnd)return;const service=services[index++];history.push({service,action});if(action==='like')liked.push(service);track(action==='like'?'card_like':action==='dislike'?'card_dislike':'card_skip',{serviceId:service.id});renderCard();}
function undo(){const last=history.pop();if(!last||index<=batchStart)return;index--;if(last.action==='like')liked=liked.filter(x=>x.id!==last.service.id);track('card_undo',{serviceId:last.service.id});renderCard();}
function finishBatch(){
  const remaining = services.length - index;
  track('result_view',{likedCount:liked.length,remaining});
  show('results');
  $('result-list').innerHTML=liked.length?liked.map(s=>`<article class="result-item"><img src="${s.imageUrl}" alt=""><div><h3>${s.name}</h3><p>${s.tagline}</p><div class="result-links"><a href="${s.serviceUrl}" target="_blank" rel="noreferrer" data-service="${s.id}">서비스 열어보기 →</a><button class="result-preview-button" type="button" data-preview-result="${s.id}">미리보기</button></div></div></article>`).join(''):'<p class="lede">아직 관심 표시한 서비스가 없어요. 다시 둘러보며 새로운 가능성을 찾아보세요.</p>';
  document.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach(a=>a.onclick=()=>track('service_click',{serviceId:a.dataset.service}));
  document.querySelectorAll<HTMLButtonElement>('[data-preview-result]').forEach(b=>{
    const matched = liked.find(s=>s.id===b.dataset.previewResult);
    if (matched) b.onclick = () => openPreview(matched);
  });
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
function openPreview(service: Service){
  track('service_click',{serviceId:service.id,mode:'embed'});
  $('preview-title').textContent = service.name;
  $<HTMLAnchorElement>('preview-open-new').href = service.serviceUrl;
  const frame = $<HTMLIFrameElement>('preview-frame');
  const fallback = $('preview-fallback');
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
function closePreview(){
  $('preview-overlay').classList.add('hidden');
  window.clearTimeout(previewLoadTimer);
  $<HTMLIFrameElement>('preview-frame').src = 'about:blank';
}
const startButton = $<HTMLButtonElement>('start-button');
const startButtonDefaultText = startButton.textContent ?? '';
// §26.4.6: an empty catalog (all exhibits currently unreachable) must show a
// "preparing/try again" state instead of silently letting the user swipe
// through zero cards into a misleading "all done" results screen.
async function load(){
  try{
    const response=await fetch(`${API}/api/services`);
    if(!response.ok)throw new Error('services');
    const payload=await response.json();
    services=payload.services;
    if(services.length===0){
      startButton.disabled=false;
      startButton.textContent='서비스를 준비 중이에요. 잠시 후 다시 시도해주세요';
      return;
    }
    track('landing_view');
    startButton.disabled=false;
    startButton.textContent=startButtonDefaultText;
  }catch{
    services=[];
    startButton.disabled=false;
    startButton.textContent='서비스를 불러오지 못했어요';
  }
}
// Fetching the catalog is async, so clicking "발견 시작하기" before it
// resolves would leave `services` empty and strand the cards screen at
// 0/0. Disable the button until the catalog is ready (or failed) instead.
startButton.disabled=true;startButton.textContent='불러오는 중...';
$('start-button').onclick=()=>{if(services.length===0)return;show('profile');renderChoices();};
$('profile-next').onclick=()=>{services=[...services].sort((a,b)=>(b.tags.filter(t=>interests.has(t)).length+(b.audiences.includes(audience!)?1:0))-(a.tags.filter(t=>interests.has(t)).length+(a.audiences.includes(audience!)?1:0)));track('profile_submit',{audience,interests:[...interests]});startBatch();show('cards');renderCard();};
function triggerDecision(action:'like'|'dislike'){ if(index>=batchEnd)return; const card=$('swipe-stage').querySelector<HTMLElement>('.service-card'); if(card) flyOutCard(card, action, () => decide(action)); else decide(action); }
$('like-button').onclick=()=>triggerDecision('like');$('reject-button').onclick=()=>triggerDecision('dislike');$('undo-button').onclick=undo;$('swipe-stage').onkeydown=e=>{if(e.key==='ArrowRight')triggerDecision('like');if(e.key==='ArrowLeft')triggerDecision('dislike');if(e.key.toLowerCase()==='u')undo();};
$('continue-button').onclick=()=>{startBatch();show('cards');renderCard();};
$('restart-button').onclick=()=>{index=0;batchStart=0;batchEnd=0;liked=[];history=[];audience=null;interests.clear();show('landing');};
$('email-form').onsubmit=async e=>{e.preventDefault();const message=$('email-message');try{const r=await fetch(`${API}/api/email-leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$<HTMLInputElement>('email').value,updatesOptIn:$<HTMLInputElement>('updates').checked})});const body=await r.json();if(!r.ok)throw new Error(body.message);message.textContent='결과를 저장했어요.';track('email_submit',{updatesOptIn:$<HTMLInputElement>('updates').checked});}catch(error){message.textContent=error instanceof Error?error.message:'저장에 실패했어요.';}};
$('preview-close').onclick=closePreview;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePreview();});
void load();
