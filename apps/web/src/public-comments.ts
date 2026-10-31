type PublicComment = { id: string; nickname: string | null; body: string; createdAt: string };

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  return item;
}

export function initializePublicComments(apiBase: string): (serviceId: string) => Promise<void> {
  const list = document.getElementById('public-comment-list')!;
  const form = document.getElementById('public-comment-form') as HTMLFormElement;
  const status = document.getElementById('public-comment-status')!;
  let currentServiceId = '';
  let generation = 0;

  const load = async (serviceId: string): Promise<void> => {
    currentServiceId = serviceId;
    const requestId = ++generation;
    form.hidden = true;
    status.textContent = '';
    list.replaceChildren(node('p', '댓글을 불러오고 있어요.'));
    try {
      const response = await fetch(`${apiBase}/api/services/${encodeURIComponent(serviceId)}/comments`);
      const payload = await response.json() as { comments?: PublicComment[]; message?: string };
      if (!response.ok) throw new Error(payload.message || '댓글을 불러오지 못했어요.');
      if (requestId !== generation) return;
      form.hidden = false;
      const comments = payload.comments ?? [];
      list.replaceChildren();
      if (comments.length === 0) list.append(node('p', '아직 댓글이 없습니다. 첫 댓글을 남겨보세요.'));
      for (const comment of comments) {
        const article = node('article');
        article.className = 'public-comment';
        const header = node('div');
        header.className = 'public-comment-header';
        header.append(
          node('strong', comment.nickname || '익명'),
          node('time', new Date(comment.createdAt).toLocaleDateString('ko-KR')),
        );
        article.append(header, node('p', comment.body));
        const report = node('button', '신고');
        report.type = 'button';
        report.className = 'text-button';
        report.addEventListener('click', async () => {
          report.disabled = true;
          try {
            const result = await fetch(`${apiBase}/api/services/${encodeURIComponent(serviceId)}/comments/${encodeURIComponent(comment.id)}/report`, { method: 'POST' });
            if (!result.ok) {
              const error = await result.json() as { message?: string };
              throw new Error(error.message || '신고를 접수하지 못했어요.');
            }
            report.textContent = '신고 접수됨';
          } catch (error) {
            status.textContent = error instanceof Error ? error.message : '신고를 접수하지 못했어요.';
            report.disabled = false;
          }
        });
        article.append(report);
        list.append(article);
      }
    } catch (error) {
      if (requestId === generation) {
        list.replaceChildren(node('p', error instanceof Error ? error.message : '댓글을 불러오지 못했어요.'));
      }
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentServiceId) return;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submit.disabled = true;
    status.textContent = '댓글을 공개하고 있어요.';
    try {
      const nickname = (document.getElementById('public-comment-nickname') as HTMLInputElement).value.trim();
      const body = (document.getElementById('public-comment-body') as HTMLTextAreaElement).value.trim();
      const response = await fetch(`${apiBase}/api/services/${encodeURIComponent(currentServiceId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, body }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message || '댓글을 공개하지 못했어요.');
      form.reset();
      status.textContent = '댓글을 공개했어요.';
      await load(currentServiceId);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : '댓글을 공개하지 못했어요.';
    } finally {
      submit.disabled = false;
    }
  });

  return load;
}
