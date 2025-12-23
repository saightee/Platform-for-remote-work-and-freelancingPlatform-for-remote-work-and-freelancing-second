import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TalentsService } from './talents.service';
type JobSearchStatus = 'actively_looking' | 'open_to_offers' | 'hired';

@Controller('talents')
export class TalentsController {
  constructor(private talentsService: TalentsService) {}

  @Get()
  async searchTalents(
    @Query('skills') skills: string | string[],
    @Query('skills[]') skillsBracket: string | string[],
    @Query('experience') experience: string,
    @Query('description') description: string,
    @Query('rating') rating: string,
    @Query('timezone') timezone: string,
    @Query('job_search_status') job_search_status: JobSearchStatus,
    @Query('expected_salary_min') expected_salary_min: string,
    @Query('expected_salary_max') expected_salary_max: string,
    @Query('expected_salary_type') expected_salary_type: 'per month' | 'per day',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort_by') sort_by: 'average_rating' | 'profile_views',
    @Query('sort_order') sort_order: 'ASC' | 'DESC',
    @Query('has_avatar') has_avatar?: string,
    @Query('country') country?: string,
    @Query('countries') countries?: string | string[],
    @Query('languages') languages?: string | string[],
    @Query('languages_mode') languages_mode?: 'any' | 'all',
    @Query('has_resume') has_resume?: 'true' | 'false',
    @Query('preferred_job_types') preferred_job_types?: string | string[],
    @Query('preferred_job_types[]') preferred_job_types_bracket?: string | string[],
  ) {
    const toArray = (v?: string | string[]) =>
      Array.isArray(v)
        ? v.flatMap(s => (s.includes(',') ? s.split(',') : [s])).map(s => s.trim()).filter(Boolean)
        : (typeof v === 'string' && v.length ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

    const normalizeLanguage = (s: string) => {
      const x = s.trim();
      const m = {
        en: 'English', eng: 'English', english: 'English',
        es: 'Spanish', spa: 'Spanish', spanish: 'Spanish',
        pt: 'Portuguese', por: 'Portuguese', portuguese: 'Portuguese',
        fr: 'French', fra: 'French', fre: 'French', french: 'French',
        de: 'German', ger: 'German', deu: 'German', german: 'German',
        ru: 'Russian', rus: 'Russian', russian: 'Russian',
        ar: 'Arabic', ara: 'Arabic', arabic: 'Arabic',
        zh: 'Chinese', zho: 'Chinese', chi: 'Chinese', chinese: 'Chinese',
        hi: 'Hindi', hin: 'Hindi', hindi: 'Hindi',
        it: 'Italian', ita: 'Italian', italian: 'Italian',
        tr: 'Turkish', tur: 'Turkish', turkish: 'Turkish',
        uk: 'Ukrainian', ukr: 'Ukrainian', ukrainian: 'Ukrainian',
        pl: 'Polish', pol: 'Polish', polish: 'Polish',
        ja: 'Japanese', jpn: 'Japanese', japanese: 'Japanese',
        ko: 'Korean', kor: 'Korean', korean: 'Korean',
      } as Record<string,string>;
      const key = x.toLowerCase();
      if (m[key]) return m[key];
      return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
    };

    const normalizeCountryToISO2 = (s: string): string | null => {
      const t = s.trim();
      if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
      const map: Record<string,string> = {
        'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
        'canada': 'CA', 'mexico': 'MX',
        'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'britain': 'GB', 'england': 'GB',
        'germany': 'DE', 'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'portugal': 'PT',
        'netherlands': 'NL', 'belgium': 'BE', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
        'poland': 'PL', 'czech republic': 'CZ', 'czechia': 'CZ', 'slovakia': 'SK',
        'romania': 'RO', 'bulgaria': 'BG', 'hungary': 'HU', 'austria': 'AT', 'switzerland': 'CH',
        'ireland': 'IE', 'iceland': 'IS', 'estonia': 'EE', 'latvia': 'LV', 'lithuania': 'LT',
        'russia': 'RU', 'россия': 'RU', 'российская федерация': 'RU',
        'ukraine': 'UA', 'turkey': 'TR', 'türkiye': 'TR',
        'israel': 'IL', 'united arab emirates': 'AE', 'uae': 'AE', 'saudi arabia': 'SA',
        'egypt': 'EG', 'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE',
        'india': 'IN', 'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK', 'nepal': 'NP',
        'china': 'CN', 'japan': 'JP', 'south korea': 'KR', 'korea, republic of': 'KR',
        'vietnam': 'VN', 'thailand': 'TH', 'philippines': 'PH', 'indonesia': 'ID', 'malaysia': 'MY',
        'australia': 'AU', 'new zealand': 'NZ', 'brazil': 'BR', 'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO',
        'georgia': 'GE', 'armenia': 'AM', 'azerbaijan': 'AZ', 'kazakhstan': 'KZ',
      };
      const k = t.toLowerCase();
      return map[k] || null;
    };

    const filters: any = {};

    const skillsArr = [
      ...(Array.isArray(skills) ? skills : skills ? [skills] : []),
      ...(Array.isArray(skillsBracket) ? skillsBracket : skillsBracket ? [skillsBracket] : []),
    ];
    if (skillsArr.length) filters.skills = skillsArr;

    if (experience) filters.experience = experience;
    if (description) filters.description = description;

    if (rating) {
      const r = parseFloat(rating);
      if (isNaN(r) || r < 0 || r > 5) throw new BadRequestException('Rating must be between 0 and 5');
      filters.rating = r;
    }

    if (timezone) filters.timezone = timezone;

    if (job_search_status) {
      const allowed: JobSearchStatus[] = ['actively_looking', 'open_to_offers', 'hired'];
      if (!allowed.includes(job_search_status)) {
        throw new BadRequestException('job_search_status must be: actively_looking | open_to_offers | hired');
      }
      filters.job_search_status = job_search_status;
    }

    if (expected_salary_min !== undefined) {
      const v = parseFloat(expected_salary_min);
      if (!isNaN(v) && v >= 0) filters.expected_salary_min = v;
      else if (expected_salary_min) throw new BadRequestException('expected_salary_min must be a non-negative number');
    }
    if (expected_salary_max !== undefined) {
      const v = parseFloat(expected_salary_max);
      if (!isNaN(v) && v >= 0) filters.expected_salary_max = v;
      else if (expected_salary_max) throw new BadRequestException('expected_salary_max must be a non-negative number');
    }
    if (expected_salary_type) {
      const allowed = ['per month', 'per day'];
    if (!allowed.includes(expected_salary_type)) {
      throw new BadRequestException('expected_salary_type must be: per month | per day');
    }
      filters.expected_salary_type = expected_salary_type;
    }

    if (page) {
      const p = parseInt(page, 10);
      if (isNaN(p) || p < 1) throw new BadRequestException('Page must be a positive integer');
      filters.page = p;
    }
    if (limit) {
      const l = parseInt(limit, 10);
      if (isNaN(l) || l < 1) throw new BadRequestException('Limit must be a positive integer');
      filters.limit = l;
    }
    if (sort_by) {
      if (!['average_rating', 'profile_views'].includes(sort_by)) {
        throw new BadRequestException('Sort_by must be average_rating or profile_views');
      }
      filters.sort_by = sort_by;
    }
    if (sort_order) {
      if (!['ASC', 'DESC'].includes(sort_order)) {
        throw new BadRequestException('Sort_order must be ASC or DESC');
      }
      filters.sort_order = sort_order;
    }

    const countriesInput = [
      ...(country ? [country] : []),
      ...toArray(countries),
    ];
    const isoList = countriesInput
      .map(normalizeCountryToISO2)
      .filter((x): x is string => !!x);
    if (isoList.length === 1) filters.country = isoList[0];
    if (isoList.length > 1) filters.countries = isoList;

    const langs = toArray(languages).map(normalizeLanguage);
    if (langs.length) filters.languages = langs;
    if (languages_mode === 'all' || languages_mode === 'any') filters.languages_mode = languages_mode;

    if (has_resume === 'true') filters.has_resume = true;
    if (has_resume === 'false') filters.has_resume = false;

    if (has_avatar === 'true') filters.has_avatar = 'true';

    const jobTypesArr = [
      ...(Array.isArray(preferred_job_types) ? preferred_job_types : preferred_job_types ? [preferred_job_types] : []),
      ...(Array.isArray(preferred_job_types_bracket) ? preferred_job_types_bracket : preferred_job_types_bracket ? [preferred_job_types_bracket] : []),
    ];

    if (jobTypesArr.length) {
      const allowed = ['Full-time', 'Part-time', 'Project-based'];
      const invalid = jobTypesArr.filter(v => !allowed.includes(v));
      if (invalid.length > 0) {
        throw new BadRequestException(
          'preferred_job_types must be: Full-time | Part-time | Project-based'
        );
      }
    filters.preferred_job_types = jobTypesArr;
  }

    return this.talentsService.searchTalents(filters);
  }
}