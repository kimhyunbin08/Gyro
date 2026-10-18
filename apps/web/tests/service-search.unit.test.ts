import { describe, expect, it } from 'vitest';
import { searchCatalogServices } from '../src/service-search.js';
import type { CatalogService } from '../src/catalog-loader.js';

const services: CatalogService[] = [
  {
    id: 'design-tool',
    name: 'Canvas Studio',
    tagline: '디자인과 협업을 한곳에서',
    description: '팀의 화면을 함께 만들어요',
    imageUrl: '',
    serviceUrl: 'https://example.com/canvas',
    tags: ['디자인', '협업'],
    audiences: ['student'],
    kind: 'product',
  },
  {
    id: 'simple-service',
    name: 'Note Garden',
    tagline: '생각을 정리하는 서비스',
    description: '',
    imageUrl: '',
    serviceUrl: 'https://example.com/notes',
    tags: ['기록'],
    audiences: ['teacher'],
  },
  {
    id: 'calendar-mcp',
    name: 'Calendar MCP',
    tagline: '회의 일정을 연결해요',
    description: '',
    imageUrl: '',
    serviceUrl: 'https://example.com/calendar',
    tags: ['일정'],
    audiences: ['other'],
    kind: 'mcp',
    tasks: ['meeting-notes'],
  },
];

describe('web unit: home service search', () => {
  it('searches names, descriptions, tags and task labels across all terms', () => {
    expect(searchCatalogServices(services, '화면 협업')).toEqual([services[0]]);
    expect(searchCatalogServices(services, 'MEETING')).toEqual([services[2]]);
  });

  it('treats a missing kind as a service and applies type filters', () => {
    expect(searchCatalogServices(services, '', 'service')).toEqual([services[1]]);
    expect(searchCatalogServices(services, '', 'mcp')).toEqual([services[2]]);
  });
});
