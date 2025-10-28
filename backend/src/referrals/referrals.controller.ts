import { Controller, Get, Param, Res, NotFoundException, Post, Body, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from '../admin/admin.service';

@Controller('ref')
export class ReferralsController {
  constructor(private adminService: AdminService) {}

  @Get(':refCode')
  async handleReferral(@Param('refCode') refCode: string, @Res() res: Response) {
    try {
      const { redirectTo } = await this.adminService.resolveAndIncrementClick(refCode);

      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      res.cookie('ref', refCode, {
        maxAge: maxAgeMs,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      res.cookie('jf_ref', refCode, {
        maxAge: maxAgeMs,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      res.cookie('ref_to', encodeURIComponent(redirectTo), {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      return res.redirect(302, redirectTo);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(404).send('Referral link not found');
      }
      return res.status(500).send('Internal server error');
    }
  }

  @Post('track')
  async trackClick(@Body('ref') ref: string, @Res() res: Response) {
    if (!ref) throw new BadRequestException('ref is required');

    const meta: any = await this.adminService.resolveAndIncrementClick(ref);

    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
    res.cookie('ref', ref, {
      maxAge: maxAgeMs,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.cookie('jf_ref', ref, {
      maxAge: maxAgeMs,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    const refTo = encodeURIComponent(meta?.redirectTo || '/');
    res.cookie('ref_to', refTo, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return res.json({ ok: true, ...meta });
  }
}
