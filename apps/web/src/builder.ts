import './styles.css';
import './builder.css';
import { escapeHtml } from './html-safety.js';

type Theme = 'paper' | 'clay' | 'midnight';
type Providers = {
  enabled: boolean;
  github: boolean;
  email: boolean;
  legal: {
    ready: boolean;
    operatorName: string | null;
    contactEmail: string | null;
    termsVersion: string | null;
    privacyVersion: string | null;
    processorNotice: string | null;
    retentionPolicy: string | null;
    message?: string;
  };
};
type Builder = { id: string; email: string; displayName: string };
type ServiceSubmission = {
  id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  name: string;
  tagline: string;
  service_url: string;
  docs_url: string;
  operator_contact_url?: string;
  rights_notes?: string;
  kind: string;
  tasks: string[];
  review_reason?: string | null;
};
type ModerationSubmission = ServiceSubmission & {
  description: string;
  builder_email: string;
};

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing builder element: ${id}`);
  return element as T;
};
const field = (id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  const element = $(id);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
    throw new Error(`Builder field has an unexpected element type: ${id}`);
  }
  return element;
};

async function resolveApiBase(): Promise<string> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (response.ok) {
      const config = await response.json() as { apiUrl?: unknown };
      if (typeof config.apiUrl === 'string' && config.apiUrl) return config.apiUrl.replace(/\/$/, '');
    }
  } catch {
    // The local development URL is used when the static host has no runtime config.
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

const API = await resolveApiBase();
let providers: Providers | undefined;
let builder: Builder | undefined;
let csrfToken = '';
let editingId: string | undefined;

function apiPath(path: string): string {
  return `${API}/api/builder${path}`;
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  field('builder-theme').value = theme;
  try {
    localStorage.setItem('gyro.appearance-theme', theme);
  } catch (error) {
    console.error('화면 테마 설정을 저장하지 못했습니다.', error);
  }
}

function restoreTheme(): void {
  const saved = localStorage.getItem('gyro.appearance-theme');
  applyTheme(saved === 'paper' || saved === 'clay' || saved === 'midnight' ? saved : 'midnight');
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiPath(path), {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...init.headers,
    },
  });
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { message?: unknown };
    return typeof body.message === 'string' ? body.message : fallback;
  } catch {
    return fallback;
  }
}

function showLogin(message?: string): void {
  $('builder-loading').classList.add('hidden');
  $('builder-dashboard').classList.add('hidden');
  $('builder-login').classList.remove('hidden');
  const notice = $('builder-disabled');
  if (message) {
    notice.textContent = message;
    notice.classList.remove('hidden');
    $('builder-login-form').querySelectorAll('input, button').forEach((input) => {
      (input as HTMLInputElement | HTMLButtonElement).disabled = true;
    });
    $('builder-github-login').setAttribute('disabled', 'true');
  }
}

function renderServiceList(services: ServiceSubmission[]): void {
  const list = $('builder-service-list');
  if (!services.length) {
    list.innerHTML = '<p class="builder-empty">아직 등록한 서비스가 없어요. 새 제출물을 작성해 보세요.</p>';
    return;
  }
  const labels: Record<ServiceSubmission['status'], string> = {
    draft: '초안',
    pending_review: '검수 대기',
    approved: '승인됨',
    rejected: '수정 필요',
    suspended: '공개 중지',
  };
  list.innerHTML = services.map((service) => `
    <article class="builder-service-item">
      <div class="builder-service-title"><div><span class="builder-status status-${service.status}">${labels[service.status]}</span><h3>${escapeHtml(service.name || '이름 없는 초안')}</h3></div><p>${escapeHtml(service.tagline || '')}</p></div>
      <p class="builder-service-links"><a href="${escapeHtml(service.service_url)}" target="_blank" rel="noopener noreferrer">공식 서비스 ↗</a><a href="${escapeHtml(service.docs_url)}" target="_blank" rel="noopener noreferrer">문서 ↗</a></p>
      ${service.review_reason ? `<p class="builder-review-note"><strong>최근 검토 의견:</strong> ${escapeHtml(service.review_reason)}</p>` : ''}
      <div class="builder-service-actions">
        ${['draft', 'rejected', 'approved', 'suspended'].includes(service.status) ? `<button class="text-button" type="button" data-edit-service="${escapeHtml(service.id)}">수정</button>` : ''}
        ${['draft', 'rejected'].includes(service.status) ? `<button class="button button-dark" type="button" data-submit-service="${escapeHtml(service.id)}">검수 요청</button>` : ''}
        <button class="text-button danger-text" type="button" data-delete-service="${escapeHtml(service.id)}">제출 삭제</button>
      </div>
    </article>
  `).join('');
}

async function loadServices(): Promise<void> {
  const response = await request('/services');
  if (!response.ok) throw new Error(await responseMessage(response, '제출 목록을 불러오지 못했어요.'));
  const data = await response.json() as { services: ServiceSubmission[] };
  renderServiceList(data.services);
}

async function loadModerationQueue(): Promise<void> {
  const selectedStatus = encodeURIComponent(field('moderation-status').value);
  const response = await request(`/moderation/submissions?status=${selectedStatus}`);
  if (!response.ok) throw new Error(await responseMessage(response, '검수 대기열을 불러오지 못했어요.'));
  const data = await response.json() as { submissions: ModerationSubmission[] };
  const queue = $('moderation-queue');
  if (!data.submissions.length) {
    queue.innerHTML = '<p class="builder-empty">해당 상태의 제출물이 없어요.</p>';
    return;
  }
  const status = field('moderation-status').value;
  queue.innerHTML = data.submissions.map((submission) => `
    <article class="builder-service-item" data-moderation-id="${escapeHtml(submission.id)}">
      <div class="builder-service-title"><div><span class="builder-status status-${escapeHtml(submission.status)}">${escapeHtml(submission.status)}</span><h3>${escapeHtml(submission.name)}</h3></div><p>${escapeHtml(submission.builder_email)} · ${escapeHtml(submission.kind)}</p></div>
      <p>${escapeHtml(submission.tagline)}</p><p>${escapeHtml(submission.description)}</p>
      <p class="builder-service-links"><a href="${escapeHtml(submission.service_url)}" target="_blank" rel="noopener noreferrer">공식 서비스 ↗</a><a href="${escapeHtml(submission.docs_url)}" target="_blank" rel="noopener noreferrer">문서 ↗</a></p>
      ${submission.operator_contact_url ? `<p class="builder-service-links"><a href="${escapeHtml(submission.operator_contact_url)}" target="_blank" rel="noopener noreferrer">문의 페이지 ↗</a></p>` : ''}
      ${submission.rights_notes ? `<p class="builder-review-note"><strong>출처·권한 근거:</strong> ${escapeHtml(submission.rights_notes)}</p>` : ''}
      ${status === 'pending_review' ? '<label>검토 사유 <textarea class="moderation-reason" rows="2" maxlength="1000" placeholder="승인/반려 사유를 기록하세요."></textarea></label>' : ''}
      <div class="builder-service-actions">
        ${status === 'pending_review' ? '<button class="button button-dark" type="button" data-moderation-decision="approved">승인</button><button class="text-button" type="button" data-moderation-decision="rejected">반려</button><button class="text-button danger-text" type="button" data-moderation-decision="suspended">공개 중지</button>' : ''}
        ${status === 'approved' ? '<button class="text-button danger-text" type="button" data-moderation-decision="suspended">공개 중지</button>' : ''}
        ${status === 'rejected' ? '<button class="text-button danger-text" type="button" data-moderation-decision="suspended">공개 중지</button>' : ''}
        ${status === 'suspended' ? '<button class="button button-dark" type="button" data-moderation-decision="approved">다시 승인</button>' : ''}
      </div>
    </article>
  `).join('');
}

function clearSubmissionForm(): void {
  editingId = undefined;
  $<HTMLFormElement>('builder-service-form').reset();
  $('submission-title').textContent = '검토를 위한 정보를 입력해 주세요.';
}

async function loadDashboard(): Promise<void> {
  const response = await request('/me');
  if (!response.ok) {
    if (response.status === 401) return showLogin();
    return showLogin(await responseMessage(response, '창업가 센터 설정이 완료되지 않았어요.'));
  }
  const data = await response.json() as { builder: Builder; csrfToken: string; providers: string[]; moderator: boolean };
  builder = data.builder;
  csrfToken = data.csrfToken;
  $('builder-loading').classList.add('hidden');
  $('builder-login').classList.add('hidden');
  $('builder-dashboard').classList.remove('hidden');
  $('builder-account').textContent = `${builder.email} · 연결된 로그인: ${data.providers.join(', ') || '이메일'}`;
  field('builder-display-name').value = builder.displayName;
  await loadServices();
  if (data.moderator) {
    $('builder-moderation').classList.remove('hidden');
    await loadModerationQueue();
  }
}

async function loadProviderConfiguration(): Promise<void> {
  const response = await fetch(apiPath('/auth/providers'), { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error(await responseMessage(response, '로그인 설정을 불러오지 못했어요.'));
  providers = await response.json() as Providers;
  if (!providers.enabled) {
    showLogin(providers.legal.message ?? '운영 설정이 완료되기 전까지 창업가 가입을 사용할 수 없어요.');
    return;
  }
  $('builder-email-submit').toggleAttribute('disabled', !providers.email);
  $('builder-github-login').toggleAttribute('disabled', !providers.github);
  const email = $('builder-email') as HTMLInputElement;
  email.disabled = !providers.email;
}

function policiesPayload() {
  if (!providers?.legal.termsVersion || !providers.legal.privacyVersion) return undefined;
  return {
    ageConfirmed: $<HTMLInputElement>('builder-age-confirm').checked,
    termsVersion: providers.legal.termsVersion,
    privacyVersion: providers.legal.privacyVersion,
  };
}

async function start(): Promise<void> {
  restoreTheme();
  const theme = $('builder-theme') as HTMLSelectElement;
  theme.addEventListener('change', () => applyTheme(theme.value as Theme));
  const magicToken = new URLSearchParams(location.hash.slice(1)).get('magic');
  if (magicToken) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    const verify = await fetch(apiPath('/auth/email/verify'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: magicToken }),
    });
    if (!verify.ok) {
      $('builder-loading').textContent = await responseMessage(verify, '로그인 링크가 만료되었거나 이미 사용되었어요.');
      showLogin();
    }
  }
  await loadProviderConfiguration();
  if (!providers?.enabled) return;
  await loadDashboard();

  $('builder-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('builder-login-status');
    status.textContent = '로그인 링크를 보내고 있어요.';
    const policies = policiesPayload();
    if (!policies?.ageConfirmed || !$<HTMLInputElement>('builder-terms-confirm').checked || !$<HTMLInputElement>('builder-privacy-confirm').checked) {
      status.textContent = '만 14세 이상 확인과 약관 확인이 필요합니다.';
      return;
    }
    const result = await fetch(apiPath('/auth/email'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: field('builder-email').value, ...policies }),
    });
    status.textContent = result.ok
      ? '등록된 주소라면 로그인 링크를 보냈어요. 메일함을 확인해 주세요.'
      : await responseMessage(result, '로그인 링크를 요청하지 못했어요.');
  });

  $('builder-github-login').addEventListener('click', () => {
    const policies = policiesPayload();
    if (!policies?.ageConfirmed || !$<HTMLInputElement>('builder-terms-confirm').checked || !$<HTMLInputElement>('builder-privacy-confirm').checked) {
      $('builder-login-status').textContent = '만 14세 이상 확인과 약관 확인이 필요합니다.';
      return;
    }
    const query = new URLSearchParams({
      ageConfirmed: 'true',
      termsVersion: policies.termsVersion,
      privacyVersion: policies.privacyVersion,
    });
    location.assign(apiPath(`/auth/github?${query.toString()}`));
  });

  $('builder-service-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!builder) return;
    const status = $('builder-submit-status');
    status.textContent = '초안을 저장하고 있어요.';
    const payload = {
      name: field('service-name').value,
      tagline: field('service-tagline').value,
      description: field('service-description').value,
      serviceUrl: field('service-url').value,
      docsUrl: field('service-docs-url').value,
      operatorContactUrl: field('service-contact-url').value,
      rightsNotes: field('service-rights-notes').value,
      kind: field('service-kind').value,
      tasks: [...document.querySelectorAll<HTMLInputElement>('.builder-task-grid input:checked')].map((item) => item.value),
      rightsConfirmed: $<HTMLInputElement>('rights-confirmed').checked,
    };
    const response = await request(editingId ? `/services/${encodeURIComponent(editingId)}` : '/services', {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    status.textContent = response.ok
      ? '초안을 저장했어요. 내용을 확인한 뒤 검수 요청을 눌러 주세요.'
      : await responseMessage(response, '초안을 저장하지 못했어요.');
    if (response.ok) {
      clearSubmissionForm();
      await loadServices();
    }
  });

  $('builder-service-list').addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const editButton = target.closest<HTMLButtonElement>('[data-edit-service]');
    if (editButton) {
      const response = await request(`/services/${encodeURIComponent(editButton.dataset.editService ?? '')}`);
      if (!response.ok) return;
      const data = await response.json() as { service: Record<string, unknown> };
      const service = data.service;
      editingId = String(service.id);
      $('submission-title').textContent = '제출 정보를 수정해요.';
      field('service-name').value = String(service.name ?? '');
      field('service-tagline').value = String(service.tagline ?? '');
      field('service-description').value = String(service.description ?? '');
      field('service-url').value = String(service.service_url ?? '');
      field('service-docs-url').value = String(service.docs_url ?? '');
      field('service-contact-url').value = String(service.operator_contact_url ?? '');
      field('service-rights-notes').value = String(service.rights_notes ?? '');
      field('service-kind').value = String(service.kind ?? 'service');
      $$('.builder-task-grid input').forEach((item) => {
        (item as HTMLInputElement).checked = Array.isArray(service.tasks) && service.tasks.includes((item as HTMLInputElement).value);
      });
      $<HTMLInputElement>('rights-confirmed').checked = Boolean(service.rights_confirmed);
      $('builder-service-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const submitButton = target.closest<HTMLButtonElement>('[data-submit-service]');
    if (submitButton) {
      const response = await request(`/services/${encodeURIComponent(submitButton.dataset.submitService ?? '')}/submit`, { method: 'POST' });
      $('builder-submit-status').textContent = response.ok
        ? '검수 요청을 접수했어요.'
        : await responseMessage(response, '검수 요청을 접수하지 못했어요.');
      if (response.ok) await loadServices();
      return;
    }
    const deleteButton = target.closest<HTMLButtonElement>('[data-delete-service]');
    if (deleteButton) {
      if (!confirm('이 제출물과 승인된 카탈로그 항목을 삭제할까요?')) return;
      const response = await request(`/services/${encodeURIComponent(deleteButton.dataset.deleteService ?? '')}`, { method: 'DELETE' });
      $('builder-submit-status').textContent = response.ok
        ? '제출물을 삭제했어요.'
        : await responseMessage(response, '제출물을 삭제하지 못했어요.');
      if (response.ok) await loadServices();
    }
  });

  $('builder-refresh').addEventListener('click', () => void loadServices());
  $('moderation-refresh').addEventListener('click', () => void loadModerationQueue());
  $('moderation-status').addEventListener('change', () => void loadModerationQueue());
  $('moderation-queue').addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('[data-moderation-decision]');
    if (!button) return;
    const article = button.closest<HTMLElement>('[data-moderation-id]');
    if (!article) return;
    const decision = button.dataset.moderationDecision;
    const reason = article.querySelector<HTMLTextAreaElement>('.moderation-reason')?.value.trim()
      ?? (decision === 'suspended' ? '운영 정책에 따른 공개 중지' : '운영자 승인');
    if (reason.length < 5) {
      $('moderation-title').textContent = '검토 사유를 5자 이상 입력해 주세요.';
      return;
    }
    const response = await request(`/moderation/submissions/${encodeURIComponent(article.dataset.moderationId ?? '')}`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    });
    if (!response.ok) {
      $('moderation-title').textContent = await responseMessage(response, '검토 결과를 저장하지 못했어요.');
      return;
    }
    $('moderation-title').textContent = '서비스 검수';
    await Promise.all([loadModerationQueue(), loadServices()]);
  });
  $('builder-profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await request('/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: field('builder-display-name').value }),
    });
    $('builder-profile-status').textContent = response.ok
      ? '표시 이름을 저장했어요.'
      : await responseMessage(response, '프로필을 저장하지 못했어요.');
  });
  $('builder-logout').addEventListener('click', async () => {
    const response = await request('/auth/logout', { method: 'POST' });
    if (response.ok) location.reload();
  });
  $('builder-delete-account').addEventListener('click', async () => {
    if (!confirm('계정과 제출물, 연결 정보를 삭제할까요? 승인된 서비스도 카탈로그에서 내려갑니다.')) return;
    const response = await request('/me', { method: 'DELETE' });
    if (response.ok) location.reload();
    else $('builder-profile-status').textContent = await responseMessage(response, '계정을 삭제하지 못했어요.');
  });
}

function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector);
}

start().catch((error: unknown) => {
  console.error('창업가 센터를 불러오지 못했습니다.', error);
  $('builder-loading').textContent = '창업가 센터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
});
