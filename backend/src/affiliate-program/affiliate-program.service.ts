import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { AffiliateOffer } from './entities/affiliate-offer.entity';
import { AffiliateOfferGeoRule } from './entities/affiliate-offer-geo-rule.entity';
import { AffiliateLink } from './entities/affiliate-link.entity';
import { AffiliateClick } from './entities/affiliate-click.entity';
import { User } from '../users/entities/user.entity';
import { Affiliate } from '../users/entities/affiliate.entity';

import { CreateAffiliateLinkDto } from './dto/create-affiliate-link.dto';
import { UpdateTrackingSettingsDto } from './dto/update-tracking-settings.dto';
import {AffiliateRegistration, AffiliateLeadStatus} from './entities/affiliate-registration.entity';

@Injectable()
export class AffiliateProgramService {
  constructor(
    @InjectRepository(AffiliateOffer)
    private offersRepository: Repository<AffiliateOffer>,

    @InjectRepository(AffiliateOfferGeoRule)
    private geoRulesRepository: Repository<AffiliateOfferGeoRule>,

    @InjectRepository(AffiliateLink)
    private linksRepository: Repository<AffiliateLink>,

    @InjectRepository(AffiliateClick)
    private clicksRepository: Repository<AffiliateClick>,

    @InjectRepository(AffiliateRegistration)
    private registrationsRepository: Repository<AffiliateRegistration>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Affiliate)
    private affiliatesRepository: Repository<Affiliate>,

    private configService: ConfigService,
  ) {}

  private async ensureAffiliateUser(userId: string): Promise<{ user: User; affiliate: Affiliate }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }

    const affiliate = await this.affiliatesRepository.findOne({ where: { user_id: userId } });
    if (!affiliate) {
      throw new NotFoundException('Affiliate profile not found');
    }

    return { user, affiliate };
  }

  /**
   * Профиль аффа + простой summary.
   */
  async getAffiliateDashboard(userId: string) {
    const { user, affiliate } = await this.ensureAffiliateUser(userId);

    // Пока делаем простой summary (без тяжёлых агрегаций)
    const links = await this.linksRepository.find({
      where: { affiliate_user: { id: user.id } },
    });

    const linkIds = links.map((l) => l.id);
    let clicksCount = 0;
    let registrationsCount = 0;

    if (linkIds.length > 0) {
      clicksCount = await this.clicksRepository
        .createQueryBuilder('c')
        .where('c.linkId IN (:...linkIds)', { linkIds })
        .getCount();

      registrationsCount = await this.registrationsRepository
        .createQueryBuilder('r')
        .where('r.linkId IN (:...linkIds)', { linkIds })
        .getCount();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      affiliate: {
        user_id: affiliate.user_id,
        account_type: affiliate.account_type,
        company_name: affiliate.company_name,
        website_url: affiliate.website_url,
        traffic_sources: affiliate.traffic_sources,
        promo_geo: affiliate.promo_geo,
        monthly_traffic: affiliate.monthly_traffic,
        payout_method: affiliate.payout_method,
        payout_details: affiliate.payout_details,
        telegram: affiliate.telegram,
        whatsapp: affiliate.whatsapp,
        skype: affiliate.skype,
        notes: affiliate.notes,
        default_postback_url: affiliate.default_postback_url || null,
        default_fb_pixel_code: affiliate.default_fb_pixel_code || null,
        default_ga_tag_code: affiliate.default_ga_tag_code || null,
      },
      summary: {
        clicks: clicksCount,
        registrations: registrationsCount,
        qualified: 0,
        employerDeposits: 0,
        totalRevenue: 0,
      },
    };
  }

  /**
   * Обновление глобальных трекинг-настроек аффилейта.
   */
  async updateTrackingSettings(userId: string, dto: UpdateTrackingSettingsDto) {
    const { affiliate } = await this.ensureAffiliateUser(userId);

    if (dto.defaultPostbackUrl !== undefined) {
      affiliate.default_postback_url = dto.defaultPostbackUrl || null;
    }
    if (dto.defaultFbPixelCode !== undefined) {
      affiliate.default_fb_pixel_code = dto.defaultFbPixelCode || null;
    }
    if (dto.defaultGaTagCode !== undefined) {
      affiliate.default_ga_tag_code = dto.defaultGaTagCode || null;
    }

    await this.affiliatesRepository.save(affiliate);

    return {
      defaultPostbackUrl: affiliate.default_postback_url || null,
      defaultFbPixelCode: affiliate.default_fb_pixel_code || null,
      defaultGaTagCode: affiliate.default_ga_tag_code || null,
    };
  }

  /**
   * Список активных офферов для аффа.
   */
  async listOffersForAffiliate(userId: string) {
    await this.ensureAffiliateUser(userId);

    const offers = await this.offersRepository.find({
      where: { is_active: true },
    });

    return offers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      targetRole: offer.target_role,
      payoutModel: offer.payout_model,
      defaultCpaAmount: offer.default_cpa_amount,
      defaultRevsharePercent: offer.default_revshare_percent,
      currency: offer.currency,
      brand: offer.brand,
    }));
  }

  /**
   * Создание личной ссылки.
   */
  async createLinkForAffiliate(userId: string, dto: CreateAffiliateLinkDto) {
    const { user } = await this.ensureAffiliateUser(userId);

    const offer = await this.offersRepository.findOne({
      where: { id: dto.offerId, is_active: true },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found or inactive');
    }

    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    const link = this.linksRepository.create({
      affiliate_user: user,
      offer,
      code,
      landing_path: dto.landingPath || null,
      comment: dto.comment || null,
      is_active: true,
    });

    const saved = await this.linksRepository.save(link);

    const baseSite = this.configService
      .get<string>('BASE_URL')!
      .replace(/\/api\/?$/, '');

    return {
      id: saved.id,
      code: saved.code,
      fullUrl: `${baseSite}/aff/c/${encodeURIComponent(saved.code)}`,
      offer: {
        id: offer.id,
        name: offer.name,
        targetRole: offer.target_role,
      },
      comment: saved.comment,
      landingPath: saved.landing_path,
      created_at: saved.created_at,
    };
  }

  /**
   * Список ссылок аффа с базовой статистикой.
   */
  async listLinksForAffiliate(userId: string) {
    const { user } = await this.ensureAffiliateUser(userId);

    const qb = this.linksRepository
      .createQueryBuilder('link')
      .leftJoin('link.offer', 'offer')
      .leftJoin('link.clicks', 'click')
      .leftJoin('link.registrations', 'reg')
      .where('link.affiliate_user_id = :uid', { uid: user.id })
      .groupBy('link.id')
      .addGroupBy('offer.id')
      .orderBy('link.created_at', 'DESC')
      .select([
        'link.id AS id',
        'link.code AS code',
        'link.comment AS comment',
        'link.landing_path AS landing_path',
        'link.created_at AS created_at',
        'offer.id AS offer_id',
        'offer.name AS offer_name',
        'offer.target_role AS offer_target_role',
        'COUNT(DISTINCT click.id) AS clicks_count',
        'COUNT(DISTINCT reg.id) AS registrations_count',
      ]);

    const raw = await qb.getRawMany<{
      id: string;
      code: string;
      comment: string | null;
      landing_path: string | null;
      created_at: Date;
      offer_id: string;
      offer_name: string;
      offer_target_role: string;
      clicks_count: string;
      registrations_count: string;
    }>();

    const baseSite = this.configService
      .get<string>('BASE_URL')!
      .replace(/\/api\/?$/, '');

    return raw.map((row) => ({
      id: row.id,
      code: row.code,
      fullUrl: `${baseSite}/aff/c/${encodeURIComponent(row.code)}`,
      comment: row.comment,
      landingPath: row.landing_path,
      offer: {
        id: row.offer_id,
        name: row.offer_name,
        targetRole: row.offer_target_role,
      },
      stats: {
        clicks: parseInt(row.clicks_count, 10) || 0,
        registrations: parseInt(row.registrations_count, 10) || 0,
        qualified: 0,
        revenue: 0,
      },
      created_at: row.created_at,
    }));
  }

  async handleClick(params: {
    code: string;
    ip?: string;
    userAgent?: string;
    country?: string | null;
    sub1?: string;
    sub2?: string;
    sub3?: string;
    sub4?: string;
    sub5?: string;
  }): Promise<{ redirectTo: string; clickId: string }> {
    const { code, ip, userAgent, country, sub1, sub2, sub3, sub4, sub5 } = params;

    const link = await this.linksRepository.findOne({
      where: { code, is_active: true },
      relations: ['offer'],
    });
    if (!link) {
      throw new NotFoundException('Affiliate link not found');
    }

    const clickId = crypto.randomUUID();

    const click = this.clicksRepository.create({
      link,
      click_id: clickId,
      ip: ip || null,
      user_agent: userAgent || null,
      country: country || null,
      sub1: sub1 || null,
      sub2: sub2 || null,
      sub3: sub3 || null,
      sub4: sub4 || null,
      sub5: sub5 || null,
    });

    await this.clicksRepository.save(click);

    const baseSite = this.configService
      .get<string>('BASE_URL')!
      .replace(/\/api\/?$/, '');

    const path =
      link.landing_path && link.landing_path.startsWith('/')
        ? link.landing_path
        : '/role-selection';

    const glue = path.includes('?') ? '&' : '?';
    const redirectTo = `${baseSite}${path}${glue}aff=${encodeURIComponent(
      link.code,
    )}`;

    return { redirectTo, clickId };
  }

    async trackRegistration(params: {
    userId: string;
    role: 'jobseeker' | 'employer';
    affCode?: string;
    clickId?: string | null;
    country?: string | null;
  }): Promise<AffiliateRegistration | null> {
    const { userId, role, affCode, clickId, country } = params;

    if (!affCode && !clickId) {
      return null;
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      return null;
    }

    let link: AffiliateLink | null = null;
    let click: AffiliateClick | null = null;

    if (clickId) {
      click = await this.clicksRepository.findOne({
        where: { click_id: clickId },
        relations: ['link', 'link.offer', 'link.affiliate_user'],
      });
      if (click) {
        link = click.link;
      }
    }

    if (!link && affCode) {
      link = await this.linksRepository.findOne({
        where: { code: affCode, is_active: true },
        relations: ['offer', 'affiliate_user'],
      });
    }

    if (!link) {
      return null;
    }

    const reg = this.registrationsRepository.create({
      link,
      click: click || null,
      user,
      role,
      status: 'unqualified',
      country: country || user.country || null,
      payout_status: 'pending',
    });

    return await this.registrationsRepository.save(reg);
  }

  async listRegistrationsForAffiliate(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      role?: 'jobseeker' | 'employer';
      status?: AffiliateLeadStatus;
    },
  ) {
    const { user } = await this.ensureAffiliateUser(userId);

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limitRaw = options?.limit && options.limit > 0 ? options.limit : 20;
    const limit = Math.min(limitRaw, 100);
    const skip = (page - 1) * limit;

    const qb = this.registrationsRepository
      .createQueryBuilder('reg')
      .leftJoinAndSelect('reg.link', 'link')
      .leftJoinAndSelect('reg.user', 'user')
      .leftJoinAndSelect('link.offer', 'offer')
      .where('link.affiliate_user_id = :uid', { uid: user.id })
      .orderBy('reg.registered_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (options?.role) {
      qb.andWhere('reg.role = :role', { role: options.role });
    }
    if (options?.status) {
      qb.andWhere('reg.status = :status', { status: options.status });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      items: rows.map((r) => ({
        id: r.id,
        role: r.role,
        status: r.status,
        country: r.country,
        registered_at: r.registered_at,
        payout_status: r.payout_status,
        payout_amount: r.payout_amount,
        payout_currency: r.payout_currency,
        link: {
          id: r.link.id,
          code: r.link.code,
          comment: r.link.comment,
        },
        offer: r.link.offer
          ? {
              id: r.link.offer.id,
              name: r.link.offer.name,
              targetRole: r.link.offer.target_role,
            }
          : null,
        user: {
          id: r.user.id,
          email: r.user.email,
          role: r.user.role,
          created_at: r.user.created_at,
        },
      })),
    };
  }

  async getStatsForAffiliate(
    userId: string,
    options: {
      range: 'today' | 'yesterday' | '7d' | '30d' | 'custom';
      from?: Date;
      to?: Date;
    },
  ) {
    const { user } = await this.ensureAffiliateUser(userId);

    const now = new Date();

    const startOfUtcDay = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    let from: Date;
    let to: Date;

    switch (options.range) {
      case 'today':
        from = startOfUtcDay(now);
        to = now;
        break;
      case 'yesterday': {
        const todayStart = startOfUtcDay(now);
        to = todayStart;
        const y = new Date(todayStart);
        y.setUTCDate(y.getUTCDate() - 1);
        from = y;
        break;
      }
      case '7d': {
        to = now;
        const s = new Date(now);
        s.setUTCDate(s.getUTCDate() - 7);
        from = s;
        break;
      }
      case '30d': {
        to = now;
        const s = new Date(now);
        s.setUTCDate(s.getUTCDate() - 30);
        from = s;
        break;
      }
      case 'custom':
        if (!options.from || !options.to) {
          throw new BadRequestException('from and to are required for custom range');
        }
        from = options.from;
        to = options.to;
        break;
      default:
        throw new BadRequestException('Invalid range');
    }

    const links = await this.linksRepository.find({
      where: { affiliate_user: { id: user.id } },
    });
    const linkIds = links.map((l) => l.id);

    if (!linkIds.length) {
      return {
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        totals: { clicks: 0, registrations: 0, jobseekers: 0, employers: 0 },
        byRole: [],
        byCountry: [],
      };
    }

    const clicksTotal = await this.clicksRepository
      .createQueryBuilder('c')
      .where('c.linkId IN (:...linkIds)', { linkIds })
      .andWhere('c.created_at >= :from AND c.created_at < :to', {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .getCount();

    const registrationsRaw = await this.registrationsRepository
      .createQueryBuilder('r')
      .leftJoin('r.link', 'link')
      .where('link.affiliate_user_id = :uid', { uid: user.id })
      .andWhere('r.registered_at >= :from AND r.registered_at < :to', {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .select('r.role', 'role')
      .addSelect('r.country', 'country')
      .addSelect('COUNT(r.id)', 'cnt')
      .groupBy('r.role')
      .addGroupBy('r.country')
      .getRawMany<{ role: 'jobseeker' | 'employer'; country: string | null; cnt: string }>();

    let totalRegistrations = 0;
    let jobseekers = 0;
    let employers = 0;

    const byCountryMap = new Map<
      string,
      { country: string; registrations: number; jobseekers: number; employers: number }
    >();

    for (const row of registrationsRaw) {
      const cnt = parseInt(row.cnt, 10) || 0;
      totalRegistrations += cnt;
      if (row.role === 'jobseeker') jobseekers += cnt;
      if (row.role === 'employer') employers += cnt;

      const countryKey = row.country || 'UN';
      const current = byCountryMap.get(countryKey) || {
        country: countryKey,
        registrations: 0,
        jobseekers: 0,
        employers: 0,
      };
      current.registrations += cnt;
      if (row.role === 'jobseeker') current.jobseekers += cnt;
      if (row.role === 'employer') current.employers += cnt;
      byCountryMap.set(countryKey, current);
    }

    const byCountry = Array.from(byCountryMap.values()).sort(
      (a, b) => b.registrations - a.registrations,
    );

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totals: {
        clicks: clicksTotal,
        registrations: totalRegistrations,
        jobseekers,
        employers,
      },
      byRole: [
        { role: 'jobseeker', registrations: jobseekers },
        { role: 'employer', registrations: employers },
      ],
      byCountry,
    };
  }
}
