import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  sitemap() {
    return this.seo.buildSitemapXml();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() {
    return this.seo.buildRobotsTxt();
  }
}
