import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JobPost } from '../job-posts/job-post.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(JobPost) private readonly jobs: Repository<JobPost>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {}

  private baseUrl() {
    const b = this.config.get<string>('BASE_URL')!;
    return b.replace(/\/api\/?$/, '');
  }

  private staticRoutes() {
    const b = this.baseUrl();
    return [
      { loc: `${b}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${b}/find-job`, priority: '0.9', changefreq: 'daily' },
      { loc: `${b}/find-talent`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${b}/pricing`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${b}/blog`, priority: '0.5', changefreq: 'weekly' },
      { loc: `${b}/about-us`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${b}/careers`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${b}/privacy-policy`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${b}/terms-of-service`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${b}/va-categories`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${b}/client-stories`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${b}/success-stories`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${b}/profile-tips`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/skill-test`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/contact-support`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/how-it-works/jobseeker-faq`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/how-it-works/employer-faq`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/latam-freelancer`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${b}/philippino-freelancer`, priority: '0.4', changefreq: 'monthly' },
    ];
  }

  private jobUrl(slug: string) {
    return `${this.baseUrl()}/vacancy/${encodeURIComponent(slug)}`;
  }

  async buildSitemapXml(): Promise<string> {
    const cached = await this.cache.get<string>('sitemap.xml');
    if (cached) return cached;

    const staticUrls = this.staticRoutes();

    const active = await this.jobs.find({
      where: { status: 'Active', pending_review: false },
      select: ['id', 'slug_id', 'updated_at', 'created_at'],
      order: { updated_at: 'DESC' },
      take: 20000,
    });

    const parts: string[] = [];

    for (const u of staticUrls) {
      parts.push(
        `<url><loc>${u.loc}</loc>` +
        (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : '') +
        (u.priority ? `<priority>${u.priority}</priority>` : '') +
        `</url>`
      );
    }

    for (const j of active) {
      const slug = j.slug_id || j.id;
      const last = (j.updated_at || j.created_at)?.toISOString();
      parts.push(
        `<url><loc>${this.jobUrl(slug)}</loc>` +
        (last ? `<lastmod>${last}</lastmod>` : '') +
        `<changefreq>daily</changefreq><priority>0.9</priority></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      parts.join('') +
      `</urlset>`;

    await this.cache.set('sitemap.xml', xml);
    return xml;
  }

  async buildRobotsTxt(): Promise<string> {
    const b = this.baseUrl();
    return [
      'User-agent: *',
      'Disallow: /admin',
      'Disallow: /moderator',
      'Disallow: /employer-dashboard',
      'Disallow: /jobseeker-dashboard',
      'Disallow: /profile',
      'Disallow: /messages',
      'Disallow: /my-job-posts',
      'Disallow: /my-applications',
      'Disallow: /post-job',
      'Disallow: /admin/email-notifications',
      'Disallow: /api/',
      'Allow: /',
      '',
      `Sitemap: ${b}/sitemap.xml`,
      '',
    ].join('\n');
  }
}
