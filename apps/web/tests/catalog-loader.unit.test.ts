import { describe, expect, it, vi } from 'vitest';
import { createCatalogLoader } from '../src/catalog-loader.js';

const mainstream = {
  id: 'sns-main', name: 'Mainstream', tagline: '', description: '', imageUrl: '',
  serviceUrl: 'https://main.example', tags: [], audiences: ['student'] as const, tier: 'mainstream' as const,
};
const emerging = {
  id: 'sns-emerging', name: 'Emerging', tagline: '', description: '', imageUrl: '',
  serviceUrl: 'https://emerging.example', tags: [], audiences: ['student'] as const, tier: 'emerging' as const,
};

describe('createCatalogLoader', () => {
  it('shares one full-catalog request and filters tiers locally', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ services: [mainstream, emerging] })));
    const loader = createCatalogLoader('https://api.example', request as unknown as typeof fetch);

    const [mainstreamServices, emergingServices, allServices] = await Promise.all([
      loader.getServices('sns', 'mainstream'),
      loader.getServices('sns', 'emerging'),
      loader.getServices('sns'),
    ]);

    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).toContain('/api/services?shuffle=sns');
    expect(mainstreamServices.map((service) => service.id)).toEqual(['sns-main']);
    expect(emergingServices.map((service) => service.id)).toEqual(['sns-emerging']);
    expect(allServices).toHaveLength(2);
  });

  it('preloads only the selected theme and reuses it when a tier is selected', async () => {
    const request = vi.fn().mockImplementation((input: string) => {
      const shuffle = new URL(input).searchParams.get('shuffle');
      const service = { ...mainstream, id: `${shuffle}-main`, tier: 'mainstream' as const };
      return Promise.resolve(new Response(JSON.stringify({ services: [service] })));
    });
    const loader = createCatalogLoader('https://api.example', request as unknown as typeof fetch);

    await loader.preloadTheme('dating');
    await loader.getServices('dating', 'mainstream');

    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls.find(([url]) => String(url).includes('shuffle=dating'))?.[0])).toContain('shuffle=dating');
  });

  it('drops failed requests from cache so a later selection can retry', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ services: [mainstream] })));
    const loader = createCatalogLoader('https://api.example', request as unknown as typeof fetch);

    await expect(loader.getServices('sns')).rejects.toThrow('network down');
    await expect(loader.getServices('sns')).resolves.toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
