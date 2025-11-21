import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AffiliateProgramService } from './affiliate-program.service';

@Controller('aff')
export class AffiliatePublicController {
  constructor(private affiliateProgramService: AffiliateProgramService) {}

  @Get('c/:code')
  async handleAffiliateClick(
    @Param('code') code: string,
    @Query('sub1') sub1?: string,
    @Query('sub2') sub2?: string,
    @Query('sub3') sub3?: string,
    @Query('sub4') sub4?: string,
    @Query('sub5') sub5?: string,
    @Req() req?: any,
    @Res() res?: Response,
  ) {
    try {
      const ipHeader =
        req?.headers?.['x-forwarded-for'] ||
        req?.headers?.['x-real-ip'] ||
        req?.socket?.remoteAddress ||
        '';
      const ip = (ipHeader || '').toString().split(',')[0].trim();
      const userAgent = req?.headers?.['user-agent'] as string | undefined;

      // country можно определять позже (по geo ip), пока null
      const { redirectTo, clickId } = await this.affiliateProgramService.handleClick({
        code,
        ip,
        userAgent,
        country: null,
        sub1,
        sub2,
        sub3,
        sub4,
        sub5,
      });

      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

      res!.cookie('aff_code', code, {
        maxAge: maxAgeMs,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      res!.cookie('aff_click_id', clickId, {
        maxAge: maxAgeMs,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      return res!.redirect(302, redirectTo);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res!.status(404).send('Affiliate link not found');
      }
      return res!.status(500).send('Internal server error');
    }
  }
}
