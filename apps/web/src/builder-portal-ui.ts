import type { CatalogService } from './catalog-loader.js';

type BuilderStatus = 'pending' | 'approved' | 'suspended';
type BuilderAccount = { email: string; status: BuilderStatus; programVerified: boolean };
type ApiError = { message?: string };

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요.';
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

export function initializeBuilderPortal(apiBase: string, renderOwnedServices?: (services: CatalogService[]) => void): void {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    const body = await response.json().catch(() => ({})) as ApiError & T;
    if (!response.ok) throw new Error(body.message || `요청 실패 (${response.status})`);
    return body;
  };
  const navigate = (screen: 'builder' | 'builder-admin') => {
    window.dispatchEvent(new CustomEvent('gyro:navigate', { detail: screen }));
  };
  const statusText = (id: string, text: string) => {
    const target = document.getElementById(id);
    if (target) target.textContent = text;
  };
  const card = (title: string, details: string[]) => {
    const item = element('article');
    item.className = 'builder-review-item';
    item.append(element('h4', title));
    for (const detail of details) item.append(element('p', detail));
    return item;
  };

  document.getElementById('builder-admin-open')?.addEventListener('click', () => navigate('builder-admin'));
  document.getElementById('builder-admin-back')?.addEventListener('click', () => navigate('builder'));

  const loginForm = document.getElementById('builder-login-form') as HTMLFormElement | null;
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = (document.getElementById('builder-email') as HTMLInputElement).value.trim();
    const button = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.disabled = true;
    try {
      const result = await request<{ message: string }>('/api/builder/auth/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      statusText('builder-login-status', result.message);
    } catch (error) {
      statusText('builder-login-status', messageFrom(error));
    } finally {
      button.disabled = false;
    }
  });

  const loadAccount = async () => {
    const login = document.getElementById('builder-login-form')!;
    const panel = document.getElementById('builder-account-panel')!;
    try {
      const { builder } = await request<{ builder: BuilderAccount }>('/api/builder/me');
      login.classList.add('hidden');
      panel.classList.remove('hidden');
      const labels: Record<BuilderStatus, string> = {
        pending: '이메일 인증이 완료됐어요. 운영자가 바이브벤처 프로그램 참여를 확인하고 빌더 계정을 승인하면 서비스를 등록할 수 있습니다.',
        approved: builder.programVerified
          ? `${builder.email} 계정으로 로그인했어요.`
          : '프로그램 참여 확인이 아직 완료되지 않아 포털 기능을 사용할 수 없습니다.',
        suspended: '계정이 정지되어 포털을 사용할 수 없습니다.',
      };
      statusText('builder-account-status', labels[builder.status]);
      const canManageServices = builder.status === 'approved' && builder.programVerified;
      document.getElementById('builder-approved-tools')?.classList.toggle('hidden', !canManageServices);
      if (canManageServices) await Promise.all([loadDashboard(), loadOwnedServices()]);
    } catch (error) {
      login.classList.remove('hidden');
      panel.classList.add('hidden');
      renderOwnedServices?.([]);
      statusText('builder-login-status', messageFrom(error));
    }
  };

  const tokenFromUrl = new URLSearchParams(location.hash.slice(1)).get('token');
  if (tokenFromUrl) {
    const clearToken = () => {
      const hash = location.hash.startsWith('#token=') ? '#feed' : location.hash;
      history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    };
    navigate('builder');
    void request<{ builder: BuilderAccount }>('/api/builder/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: tokenFromUrl }),
    }).then(async () => {
      clearToken();
      statusText('builder-login-status', '로그인되었습니다.');
      await loadAccount();
    }).catch((error: unknown) => {
      clearToken();
      statusText('builder-login-status', messageFrom(error));
    });
  } else {
    void loadAccount();
  }

  document.getElementById('builder-logout')?.addEventListener('click', async () => {
    try {
      await request('/api/builder/auth/logout', { method: 'POST' });
      document.getElementById('builder-account-panel')?.classList.add('hidden');
      document.getElementById('builder-login-form')?.classList.remove('hidden');
      renderOwnedServices?.([]);
      statusText('builder-login-status', '로그아웃했어요.');
    } catch (error) {
      statusText('builder-account-status', messageFrom(error));
    }
  });

  document.getElementById('builder-ownership-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await request('/api/builder/services/ownership-requests', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: (document.getElementById('builder-service-id') as HTMLInputElement).value.trim(),
          evidence: (document.getElementById('builder-ownership-evidence') as HTMLTextAreaElement).value.trim(),
        }),
      });
      statusText('builder-service-status', '소유권 확인 요청을 접수했어요.');
    } catch (error) {
      statusText('builder-service-status', messageFrom(error));
    }
  });

  document.getElementById('builder-service-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = (document.getElementById('builder-edit-id') as HTMLInputElement).value.trim();
    const tags = (document.getElementById('builder-service-tags') as HTMLInputElement).value
      .split(',').map((tag) => tag.trim()).filter(Boolean);
    const draft = {
      name: (document.getElementById('builder-service-name') as HTMLInputElement).value.trim(),
      tagline: (document.getElementById('builder-service-tagline') as HTMLInputElement).value.trim(),
      description: (document.getElementById('builder-service-description') as HTMLTextAreaElement).value.trim(),
      serviceUrl: (document.getElementById('builder-service-url') as HTMLInputElement).value.trim(),
      tags,
    };
    try {
      const result = await request<{ message: string }>(
        id ? `/api/builder/services/${encodeURIComponent(id)}/proposals` : '/api/builder/services',
        { method: 'POST', body: JSON.stringify(draft) },
      );
      statusText('builder-service-status', result.message);
    } catch (error) {
      statusText('builder-service-status', messageFrom(error));
    }
  });

  async function loadOwnedServices(): Promise<void> {
    try {
      const { services } = await request<{ services: CatalogService[] }>('/api/builder/services');
      renderOwnedServices?.(services);
      const select = document.getElementById('builder-edit-id') as HTMLInputElement;
      select.setAttribute('list', 'builder-service-options');
      let options = document.getElementById('builder-service-options') as HTMLDataListElement | null;
      if (!options) {
        options = element('datalist');
        options.id = 'builder-service-options';
        select.after(options);
      }
      options.replaceChildren(...services.map((service) => {
        const option = element('option');
        option.value = service.id;
        option.label = service.name;
        return option;
      }));
    } catch (error) {
      statusText('builder-service-status', messageFrom(error));
    }
  }

  async function loadDashboard(): Promise<void> {
    const container = document.getElementById('builder-dashboard')!;
    container.replaceChildren();
    try {
      const { services } = await request<{ services: Array<{
        serviceId: string; name: string; impressions: number; likes: number; dislikes: number;
        previewClicks: number; ratings: number; averageRating: number | null; comments: number;
      }> }>('/api/builder/dashboard');
      if (services.length === 0) {
        container.append(element('p', '아직 승인된 서비스가 없습니다. 기존 서비스 소유권을 요청하거나 새 서비스를 제출해 주세요.'));
        return;
      }
      for (const service of services) {
        container.append(card(service.name, [
          `서비스 ID: ${service.serviceId}`,
          `카드 반응: ${service.impressions}회 · 관심 있음 ${service.likes}회 · 관심 없음 ${service.dislikes}회`,
          `미리보기 ${service.previewClicks}회 · 별점 ${service.ratings}건${service.averageRating === null ? '' : ` (평균 ${service.averageRating.toFixed(1)})`}`,
          `공개 댓글 ${service.comments}건`,
        ]));
      }
    } catch (error) {
      container.append(element('p', messageFrom(error)));
    }
  }

  let adminToken = '';
  async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken, ...init.headers },
    });
    const body = await response.json().catch(() => ({})) as ApiError & T;
    if (!response.ok) throw new Error(body.message || `요청 실패 (${response.status})`);
    return body;
  }
  const bindAdminButton = (
    button: HTMLButtonElement,
    action: () => Promise<void>,
  ) => button.addEventListener('click', () => { void action().catch((error: unknown) => statusText('builder-admin-status', messageFrom(error))); });

  document.getElementById('builder-admin-auth')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    adminToken = (document.getElementById('builder-admin-token') as HTMLInputElement).value;
    const status = document.getElementById('builder-admin-status')!;
    status.textContent = '검수 대기열을 불러오고 있어요.';
    try {
      const [builders, ownership, submissions, comments] = await Promise.all([
        adminRequest<{ builders: Array<{ id: string; email: string; status: BuilderStatus; programVerified: boolean }> }>('/api/admin/builders'),
        adminRequest<{ requests: Array<{ id: string; builderEmail: string; serviceId: string; evidence: string }> }>('/api/admin/ownership-requests'),
        adminRequest<{                 submissions: Array<{ id: string; builderEmail: string; serviceId: string | null; draft: { name: string; tagline: string; description: string; serviceUrl: string; tags: string[] }; createdAt: string }> }>('/api/admin/submissions'),
        adminRequest<{ comments: Array<{ id: string; serviceId: string; body: string; reportCount: number; visible: boolean }> }>('/api/admin/reported-comments'),
      ]);
      const buildersNode = document.getElementById('builder-admin-builders')!;
      buildersNode.replaceChildren(...builders.builders.map((builder) => {
        const item = card(builder.email, [
          `현재 상태: ${builder.status}`,
          `바이브벤처 참여 확인: ${builder.programVerified ? '완료' : '미확인'}`,
        ]);
        if (builder.status === 'approved' && builder.programVerified) {
          const button = element('button', '참가 확인 취소 및 계정 정지');
          button.type = 'button';
          bindAdminButton(button, async () => {
            await adminRequest(`/api/admin/builders/${encodeURIComponent(builder.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'suspended', programVerified: false }),
            });
            (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
          });
          item.append(button);
        } else {
          const confirmation = element('label');
          const checkbox = element('input');
          checkbox.type = 'checkbox';
          confirmation.append(checkbox, document.createTextNode('바이브벤처 프로그램 참가를 확인했습니다.'));
          const button = element('button', '참가 확인 후 승인');
          button.type = 'button';
          button.disabled = true;
          checkbox.addEventListener('change', () => { button.disabled = !checkbox.checked; });
          bindAdminButton(button, async () => {
            await adminRequest(`/api/admin/builders/${encodeURIComponent(builder.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'approved', programVerified: checkbox.checked }),
            });
            (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
          });
          item.append(confirmation, button);
        }
        return item;
      }));
      const ownershipNode = document.getElementById('builder-admin-ownership')!;
      ownershipNode.replaceChildren(...ownership.requests.map((request) => {
        const item = card(`${request.builderEmail} → ${request.serviceId}`, [request.evidence]);
        for (const approved of [true, false]) {
          const button = element('button', approved ? '소유권 승인' : '반려');
          button.type = 'button';
          bindAdminButton(button, async () => {
            await adminRequest(`/api/admin/ownership-requests/${encodeURIComponent(request.id)}`, { method: 'PATCH', body: JSON.stringify({ approved }) });
            (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
          });
          item.append(button);
        }
        return item;
      }));
      const submissionsNode = document.getElementById('builder-admin-submissions')!;
      submissionsNode.replaceChildren(...submissions.submissions.map((submission) => {
        const item = card(submission.draft.name, [
          `제출자: ${submission.builderEmail}`,
          `대상: ${submission.serviceId ?? '신규 서비스'}`,
          submission.draft.tagline,
          submission.draft.description,
          submission.draft.serviceUrl,
          `태그: ${submission.draft.tags.join(', ')}`,
        ]);
        for (const approved of [true, false]) {
          const button = element('button', approved ? '승인 후 공개' : '반려');
          button.type = 'button';
          bindAdminButton(button, async () => {
            await adminRequest(`/api/admin/submissions/${encodeURIComponent(submission.id)}/${approved ? 'approve' : 'reject'}`, { method: 'POST' });
            (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
          });
          item.append(button);
        }
        return item;
      }));
      const commentsNode = document.getElementById('builder-admin-comments')!;
      commentsNode.replaceChildren(...comments.comments.map((comment) => {
        const item = card(`서비스 ${comment.serviceId} · 신고 ${comment.reportCount}건`, [comment.body]);
        const visibilityButton = element('button', comment.visible ? '숨김 처리' : '다시 공개');
        visibilityButton.type = 'button';
        bindAdminButton(visibilityButton, async () => {
          await adminRequest(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ visible: !comment.visible }),
          });
          (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
        });
        const deleteButton = element('button', '영구 삭제');
        deleteButton.type = 'button';
        bindAdminButton(deleteButton, async () => {
          if (!window.confirm('이 댓글을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
          await adminRequest(`/api/admin/comments/${encodeURIComponent(comment.id)}`, { method: 'DELETE' });
          (document.getElementById('builder-admin-auth') as HTMLFormElement).requestSubmit();
        });
        item.append(visibilityButton, deleteButton);
        return item;
      }));
      status.textContent = '검수 대기열을 불러왔어요.';
    } catch (error) {
      status.textContent = messageFrom(error);
    }
  });

  window.addEventListener('gyro:portal-refresh', () => { void loadAccount(); });
}
