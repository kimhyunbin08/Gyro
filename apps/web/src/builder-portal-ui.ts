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

export function formatInterestReaction(likes: number, dislikes: number): string {
  const responses = likes + dislikes;
  if (responses === 0) return '관심 있음 선택 비율: 응답 없음 (0건)';
  return `관심 있음 선택 비율: ${Math.round((likes / responses) * 100)}% (${likes}/${responses}건, 관심 있음/없음 응답 기준; 건너뛰기 제외)`;
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
  const navigate = (screen: 'builder' | 'builder-admin' | 'institution') => {
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
      if (canManageServices) {
        await Promise.all([
          loadDashboard(),
          loadOwnedServices(),
          loadBuilderSubmissions(),
          loadBuilderProfile(),
          loadBuilderInstitutions(),
        ]);
      }
    } catch (error) {
      login.classList.remove('hidden');
      panel.classList.add('hidden');
      renderOwnedServices?.([]);
      statusText('builder-login-status', messageFrom(error));
    }
  };

  const tokenFromUrl = new URLSearchParams(location.hash.slice(1)).get('token');
  const returnTo = new URLSearchParams(location.hash.slice(1)).get('returnTo') === 'institution' ? 'institution' : 'builder';
  if (tokenFromUrl) {
    const clearToken = () => {
      const hash = location.hash.startsWith('#token=')
        ? returnTo === 'institution' ? '#institution' : '#feed'
        : location.hash;
      history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    };
    navigate(returnTo);
    void request<{ builder: BuilderAccount }>('/api/builder/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: tokenFromUrl }),
    }).then(async () => {
      clearToken();
      statusText('builder-login-status', '로그인되었습니다.');
      await loadAccount();
      if (returnTo === 'institution') await loadInstitutionDashboard();
    }).catch((error: unknown) => {
      clearToken();
      statusText('builder-login-status', messageFrom(error));
    });
  } else {
    void loadAccount();
  }

  document.querySelectorAll<HTMLButtonElement>('[data-builder-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.builderTab;
      document.querySelectorAll<HTMLButtonElement>('[data-builder-tab]').forEach((item) => {
        if (item.dataset.builderTab === tab) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      document.querySelectorAll<HTMLElement>('[data-builder-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.builderPanel !== tab);
      });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-institution-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.institutionTab;
      document.querySelectorAll<HTMLButtonElement>('[data-institution-tab]').forEach((item) => {
        if (item.dataset.institutionTab === tab) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      document.querySelectorAll<HTMLElement>('[data-institution-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.institutionPanel !== tab);
      });
    });
  });

  document.getElementById('institution-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = (document.getElementById('institution-email') as HTMLInputElement).value.trim();
    try {
      const result = await request<{ message: string }>('/api/builder/auth/request', {
        method: 'POST',
        body: JSON.stringify({ email, returnTo: 'institution' }),
      });
      statusText('institution-login-status', result.message);
    } catch (error) {
      statusText('institution-login-status', messageFrom(error));
    }
  });

  document.getElementById('institution-logout')?.addEventListener('click', async () => {
    try {
      await request('/api/builder/auth/logout', { method: 'POST' });
      document.getElementById('institution-account-panel')?.classList.add('hidden');
      document.getElementById('institution-login-form')?.classList.remove('hidden');
      statusText('institution-login-status', '로그아웃했어요.');
    } catch (error) {
      statusText('institution-account-status', messageFrom(error));
    }
  });

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
    let geo: unknown;
    const geoText = (document.getElementById('builder-geo-draft') as HTMLTextAreaElement).value.trim();
    if (geoText) {
      try {
        geo = JSON.parse(geoText);
      } catch {
        statusText('builder-geo-status', 'GEO JSON 형식을 확인해 주세요.');
        return;
      }
    }
    const draft = {
      name: (document.getElementById('builder-service-name') as HTMLInputElement).value.trim(),
      tagline: (document.getElementById('builder-service-tagline') as HTMLInputElement).value.trim(),
      description: (document.getElementById('builder-service-description') as HTMLTextAreaElement).value.trim(),
      serviceUrl: (document.getElementById('builder-service-url') as HTMLInputElement).value.trim(),
      tags,
      rightsConfirmed: (document.getElementById('builder-service-rights') as HTMLInputElement).checked,
      ...(geo ? { geo } : {}),
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

  document.getElementById('builder-geo-generate')?.addEventListener('click', async () => {
    const tags = (document.getElementById('builder-service-tags') as HTMLInputElement).value
      .split(',').map((tag) => tag.trim()).filter(Boolean);
    const draft = {
      name: (document.getElementById('builder-service-name') as HTMLInputElement).value.trim(),
      tagline: (document.getElementById('builder-service-tagline') as HTMLInputElement).value.trim(),
      description: (document.getElementById('builder-service-description') as HTMLTextAreaElement).value.trim(),
      serviceUrl: (document.getElementById('builder-service-url') as HTMLInputElement).value.trim(),
      tags,
    };
    const button = document.getElementById('builder-geo-generate') as HTMLButtonElement;
    button.disabled = true;
    statusText('builder-geo-status', '서비스 설명을 바탕으로 Gyro용 초안을 만들고 있어요.');
    try {
      const { geo } = await request<{ geo: unknown }>('/api/builder/geo/draft', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      (document.getElementById('builder-geo-draft') as HTMLTextAreaElement).value = JSON.stringify(geo, null, 2);
      statusText('builder-geo-status', '초안을 검토하고 필요하면 수정한 뒤 서비스 제출 폼에서 검수 요청을 제출해 주세요.');
    } catch (error) {
      statusText('builder-geo-status', messageFrom(error));
    } finally {
      button.disabled = false;
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

  async function loadBuilderSubmissions(): Promise<void> {
    const container = document.getElementById('builder-submissions');
    if (!container) return;
    container.replaceChildren();
    try {
      const { submissions } = await request<{ submissions: Array<{
        id: string;
        serviceId: string | null;
        draft: { name: string; geo?: unknown };
        status: 'pending' | 'approved' | 'rejected';
        createdAt: string;
        decidedAt: string | null;
      }> }>('/api/builder/submissions');
      if (submissions.length === 0) {
        container.append(element('p', '아직 제출한 서비스가 없습니다.'));
        return;
      }
      const statusLabels = {
        pending: '운영자 검수 대기',
        approved: '승인·카탈로그 반영',
        rejected: '반려',
      };
      container.replaceChildren(...submissions.map((submission) => card(submission.draft.name, [
        `상태: ${statusLabels[submission.status]}`,
        `유형: ${submission.serviceId ? '기존 서비스 수정 제안' : '신규 서비스'}`,
        `제출: ${new Date(submission.createdAt).toLocaleString()}`,
        ...(submission.decidedAt ? [`처리: ${new Date(submission.decidedAt).toLocaleString()}`] : []),
        submission.draft.geo ? 'Gyro GEO 초안 포함' : 'GEO 초안 미포함',
      ])));
    } catch (error) {
      container.append(element('p', messageFrom(error)));
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
      container.append(element(
        'p',
        '비율은 누적 카드 반응 이벤트 기준이며 고유 사용자 수나 최종 의향률이 아닙니다. 되돌리기 기록은 별도로 차감되지 않습니다.',
      ));
      for (const service of services) {
        container.append(card(service.name, [
          `서비스 ID: ${service.serviceId}`,
          formatInterestReaction(service.likes, service.dislikes),
          `카드 반응: ${service.impressions}회 · 관심 있음 ${service.likes}회 · 관심 없음 ${service.dislikes}회`,
          `미리보기 ${service.previewClicks}회 · 별점 ${service.ratings}건${service.averageRating === null ? '' : ` (평균 ${service.averageRating.toFixed(1)})`}`,
          `공개 댓글 ${service.comments}건`,
        ]));
      }
    } catch (error) {
      container.append(element('p', messageFrom(error)));
    }
  }

  async function loadBuilderProfile(): Promise<void> {
    try {
      const { profile } = await request<{ profile: { displayName: string; socialLinks: Array<{ label: string; url: string }>; public: boolean } }>('/api/builder/profile');
      (document.getElementById('builder-profile-name') as HTMLInputElement).value = profile.displayName;
      (document.getElementById('builder-profile-links') as HTMLTextAreaElement).value = JSON.stringify(profile.socialLinks, null, 2);
      (document.getElementById('builder-profile-public') as HTMLInputElement).checked = profile.public;
    } catch (error) {
      statusText('builder-profile-status', messageFrom(error));
    }
  }

  document.getElementById('builder-profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    let socialLinks: Array<{ label: string; url: string }>;
    try {
      socialLinks = JSON.parse((document.getElementById('builder-profile-links') as HTMLTextAreaElement).value || '[]') as Array<{ label: string; url: string }>;
    } catch {
      statusText('builder-profile-status', 'SNS 링크는 label과 HTTPS url을 포함한 JSON 배열로 입력해 주세요.');
      return;
    }
    try {
      await request('/api/builder/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: (document.getElementById('builder-profile-name') as HTMLInputElement).value,
          socialLinks,
          public: (document.getElementById('builder-profile-public') as HTMLInputElement).checked,
        }),
      });
      statusText('builder-profile-status', '프로필을 저장했어요. 공개 설정한 프로필은 승인된 연결 서비스 카드에 표시됩니다.');
    } catch (error) {
      statusText('builder-profile-status', messageFrom(error));
    }
  });

  async function loadBuilderInstitutions(): Promise<void> {
    const container = document.getElementById('builder-institutions');
    if (!container) return;
    container.replaceChildren();
    try {
      const [{ institutions }, { institutions: memberships }, { services: ownedServices }] = await Promise.all([
        request<{ institutions: Array<{ id: string; name: string; slug: string; description: string }> }>('/api/institutions'),
        request<{ institutions: Array<{ id: string; membershipStatus: string | null; isAdmin: boolean }> }>('/api/builder/institutions'),
        request<{ services: CatalogService[] }>('/api/builder/services'),
      ]);
      const membershipById = new Map(memberships.map((membership) => [membership.id, membership]));
      if (institutions.length === 0) {
        container.append(element('p', '현재 신청할 수 있는 검증된 기관이 없습니다.'));
        return;
      }
      for (const institution of institutions) {
        const membership = membershipById.get(institution.id);
        const item = card(institution.name, [institution.description || '기관 소개가 등록되지 않았습니다.']);
        const state = membership?.membershipStatus;
        if (membership?.isAdmin) {
          item.append(element('p', '기관 관리자'));
        } else if (state === 'approved') {
          item.append(element('p', '소속 승인 완료'));
          if (ownedServices.length > 0) {
            const select = element('select');
            select.setAttribute('aria-label', `${institution.name}에 연결할 서비스`);
            for (const service of ownedServices) {
              const option = element('option', service.name);
              option.value = service.id;
              select.append(option);
            }
            const connect = element('button', '기관 관리 서비스 연결 신청');
            connect.type = 'button';
            connect.addEventListener('click', async () => {
              try {
                await request(`/api/builder/institutions/${encodeURIComponent(institution.id)}/services`, {
                  method: 'POST',
                  body: JSON.stringify({ serviceId: select.value }),
                });
                statusText('builder-service-status', '기관의 서비스 연결 검토를 신청했어요.');
              } catch (error) { statusText('builder-service-status', messageFrom(error)); }
            });
            item.append(select, connect);
          }
          const leave = element('button', '소속 탈퇴');
          leave.type = 'button';
          leave.addEventListener('click', async () => {
            try {
              await request(`/api/builder/institutions/${encodeURIComponent(institution.id)}/membership`, { method: 'DELETE' });
              await loadBuilderInstitutions();
            } catch (error) { statusText('builder-service-status', messageFrom(error)); }
          });
          item.append(leave);
        } else {
          const button = element('button', state === 'pending' ? '승인 대기 중' : state === 'rejected' ? '다시 신청' : '가입 신청');
          button.type = 'button';
          button.disabled = state === 'pending';
          button.addEventListener('click', async () => {
            try {
              await request(`/api/builder/institutions/${encodeURIComponent(institution.id)}/membership`, { method: 'POST', body: '{}' });
              await loadBuilderInstitutions();
            } catch (error) { statusText('builder-service-status', messageFrom(error)); }
          });
          item.append(button);
          if (membership?.isAdmin) {
            const dashboard = element('button', '기관 대시보드 열기');
            dashboard.type = 'button';
            dashboard.addEventListener('click', () => navigate('institution'));
            item.append(dashboard);
          }
        }
        container.append(item);
      }
    } catch (error) {
      container.append(element('p', messageFrom(error)));
    }
  }

  async function loadInstitutionDashboard(): Promise<void> {
    const login = document.getElementById('institution-login-form');
    const panel = document.getElementById('institution-account-panel');
    const select = document.getElementById('institution-selector') as HTMLSelectElement | null;
    const status = document.getElementById('institution-account-status');
    if (!login || !panel || !select || !status) return;
    try {
      await loadInstitutionIdentity();
      const { institutions } = await request<{ institutions: Array<{ id: string; name: string }> }>('/api/institution/list');
      login.classList.add('hidden');
      panel.classList.remove('hidden');
      select.replaceChildren(...institutions.map((institution) => {
        const option = element('option', institution.name);
        option.value = institution.id;
        return option;
      }));
      if (institutions.length === 0) {
        status.textContent = '승인된 기관 관리자 권한이 없습니다. 기관 디렉터리에서 기관 담당자를 통해 권한을 확인해 주세요.';
        return;
      }
      status.textContent = `관리 기관: ${institutions[0].name}`;
      await renderInstitutionDashboard(institutions[0].id);
      select.onchange = () => { void renderInstitutionDashboard(select.value); };
    } catch (error) {
      login.classList.remove('hidden');
      panel.classList.add('hidden');
      statusText('institution-login-status', messageFrom(error));
    }
  }

  async function renderInstitutionDashboard(institutionId: string): Promise<void> {
    const renderRows = (targetId: string, rows: Array<HTMLElement>) => {
      document.getElementById(targetId)?.replaceChildren(...rows);
    };
    try {
      const dashboard = await request<{
        institution: { id: string; name: string; slug: string; description: string };
        services: Array<{ serviceId: string; name: string; likes: number; dislikes: number; previewClicks: number; ratings: number; averageRating: number | null }>;
        members: Array<{ builderId: string; displayName: string | null; joinedAt: string }>;
        membershipRequests: Array<{ builderId: string; displayName: string | null; createdAt: string }>;
        serviceRequests: Array<{ id: string; builderId: string; displayName: string | null; serviceId: string; serviceName: string }>;
        history: Array<{ action: string; targetId: string; actorId: string | null; createdAt: string }>;
      }>(`/api/institution/dashboard?institutionId=${encodeURIComponent(institutionId)}`);
      statusText('institution-account-status', `관리 중: ${dashboard.institution.name}`);
      renderRows('institution-summary', dashboard.services.map((service) => card(service.name, [
        formatInterestReaction(service.likes, service.dislikes),
        `미리보기 ${service.previewClicks}회 · 별점 ${service.ratings}건${service.averageRating === null ? '' : ` · 평균 ${service.averageRating.toFixed(1)}`}`,
      ])));
      renderRows('institution-services', dashboard.services.map((service) => card(service.name, [
        `카탈로그 서비스 ID: ${service.serviceId}`,
        '공개 카탈로그 반영은 Gyro 운영자 검수를 별도로 통과해야 합니다.',
      ])));
      const memberRows = dashboard.members.map((member) => {
        const item = card(member.displayName || '이름 미공개', [
          `빌더 ID: ${member.builderId}`,
          `소속 승인: ${new Date(member.joinedAt).toLocaleDateString()}`,
        ]);
        if (member.builderId !== currentInstitutionBuilderId) {
          const revoke = element('button', '기관 소속 해제');
          revoke.type = 'button';
          revoke.addEventListener('click', async () => {
            if (!window.confirm('이 빌더의 기관 소속을 해제할까요?')) return;
            try {
              await request(`/api/institution/${encodeURIComponent(institutionId)}/members/${encodeURIComponent(member.builderId)}`, {
                method: 'DELETE',
              });
              await renderInstitutionDashboard(institutionId);
            } catch (error) {
              statusText('institution-account-status', messageFrom(error));
            }
          });
          item.append(revoke);
        }
        return item;
      });
      renderRows('institution-builders', memberRows);
      const membershipRows = dashboard.membershipRequests.map((membership) => {
        const item = card(membership.displayName || '이름 미공개', [`빌더 ID: ${membership.builderId}`, '기관 가입 신청']);
        for (const approved of [true, false]) {
          const button = element('button', approved ? '승인' : '거절');
          button.type = 'button';
          button.addEventListener('click', async () => {
            await request(`/api/institution/${encodeURIComponent(institutionId)}/members/${encodeURIComponent(membership.builderId)}`, {
              method: 'PATCH', body: JSON.stringify({ approved }),
            });
            await renderInstitutionDashboard(institutionId);
          });
          item.append(button);
        }
        return item;
      });
      const serviceRows = dashboard.serviceRequests.map((service) => {
        const item = card(service.serviceName, [`신청자: ${service.displayName || service.builderId}`, `서비스 ID: ${service.serviceId}`]);
        for (const approved of [true, false]) {
          const button = element('button', approved ? '기관 서비스로 승인' : '거절');
          button.type = 'button';
          button.addEventListener('click', async () => {
            await request(`/api/institution/${encodeURIComponent(institutionId)}/service-requests/${encodeURIComponent(service.id)}`, {
              method: 'PATCH', body: JSON.stringify({ approved }),
            });
            await renderInstitutionDashboard(institutionId);
          });
          item.append(button);
        }
        return item;
      });
      renderRows('institution-requests', [...membershipRows, ...serviceRows]);
      (document.getElementById('institution-name') as HTMLInputElement).value = dashboard.institution.name;
      (document.getElementById('institution-description') as HTMLTextAreaElement).value = dashboard.institution.description;
      const actionLabels: Record<string, string> = {
        institution_created: '기관 생성',
        institution_profile_updated: '기관 정보 수정',
        institution_membership_requested: '소속 신청',
        institution_membership_approved: '소속 승인',
        institution_membership_rejected: '소속 거절',
        institution_membership_withdrawn: '소속 철회',
        institution_membership_revoked: '소속 해제',
        institution_service_requested: '서비스 연결 신청',
        institution_service_approved: '서비스 연결 승인',
        institution_service_rejected: '서비스 연결 거절',
      };
      renderRows('institution-history', dashboard.history.map((entry) => card(
        actionLabels[entry.action] ?? entry.action,
        [`대상: ${entry.targetId}`, `처리자: ${entry.actorId ?? '운영자'}`, new Date(entry.createdAt).toLocaleString()],
      )));
    } catch (error) {
      statusText('institution-account-status', messageFrom(error));
    }
  }

  let currentInstitutionBuilderId = '';
  async function loadInstitutionIdentity(): Promise<void> {
    try {
      const { builder } = await request<{ builder: BuilderAccount & { id: string } }>('/api/builder/me');
      currentInstitutionBuilderId = builder.id;
    } catch {
      currentInstitutionBuilderId = '';
    }
  }

  document.getElementById('institution-settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const institutionId = (document.getElementById('institution-selector') as HTMLSelectElement).value;
    try {
      await request(`/api/institution/${encodeURIComponent(institutionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: (document.getElementById('institution-name') as HTMLInputElement).value,
          description: (document.getElementById('institution-description') as HTMLTextAreaElement).value,
        }),
      });
      statusText('institution-settings-status', '기관 정보를 저장했어요.');
      await renderInstitutionDashboard(institutionId);
      await loadBuilderInstitutions();
    } catch (error) {
      statusText('institution-settings-status', messageFrom(error));
    }
  });

  window.addEventListener('gyro:institution-refresh', () => { void loadInstitutionDashboard(); });

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

  document.getElementById('admin-institution-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const { institution } = await adminRequest<{ institution: { name: string } }>('/api/admin/institutions', {
        method: 'POST',
        body: JSON.stringify({
          name: (document.getElementById('admin-institution-name') as HTMLInputElement).value.trim(),
          slug: (document.getElementById('admin-institution-slug') as HTMLInputElement).value.trim(),
          description: (document.getElementById('admin-institution-description') as HTMLTextAreaElement).value.trim(),
          adminEmail: (document.getElementById('admin-institution-email') as HTMLInputElement).value.trim(),
        }),
      });
      statusText('builder-admin-status', `${institution.name} 기관을 등록했어요.`);
      (document.getElementById('admin-institution-form') as HTMLFormElement).reset();
    } catch (error) {
      statusText('builder-admin-status', messageFrom(error));
    }
  });

  document.getElementById('builder-admin-auth')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    adminToken = (document.getElementById('builder-admin-token') as HTMLInputElement).value;
    const status = document.getElementById('builder-admin-status')!;
    status.textContent = '검수 대기열을 불러오고 있어요.';
    try {
      const [builders, ownership, submissions, comments] = await Promise.all([
        adminRequest<{ builders: Array<{ id: string; email: string; status: BuilderStatus; programVerified: boolean }> }>('/api/admin/builders'),
        adminRequest<{ requests: Array<{ id: string; builderEmail: string; serviceId: string; evidence: string }> }>('/api/admin/ownership-requests'),
        adminRequest<{                 submissions: Array<{
          id: string; builderEmail: string; serviceId: string | null;
          draft: { name: string; tagline: string; description: string; serviceUrl: string; tags: string[] };
          createdAt: string; rightsAttestedAt: string | null; rightsStatementVersion: string | null;
        }> }>('/api/admin/submissions'),
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
          `공개 권한 확인: ${submission.rightsStatementVersion ?? '기록 없음'} · ${submission.rightsAttestedAt ? new Date(submission.rightsAttestedAt).toLocaleString() : '기록 없음'}`,
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
