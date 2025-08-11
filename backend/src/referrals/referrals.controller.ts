import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from '../admin/admin.service';

@Controller('ref')
export class ReferralsController {
  constructor(private adminService: AdminService) {}

  @Get(':refCode')
  async handleReferral(@Param('refCode') refCode: string, @Res() res: Response) {
    console.log(`Handling referral for refCode: ${refCode}`);
    try {
      const jobPostId = await this.adminService.incrementClick(refCode);
      const redirectUrl = `/jobs/${jobPostId}?ref=${refCode}`;
      console.log(`Redirecting to: ${redirectUrl}`);
      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error(`Error handling referral for refCode ${refCode}:`, error);
      if (error instanceof NotFoundException) {
        res.status(404).send('Referral link not found');
      } else {
        res.status(500).send('Internal server error');
      }
    }
  }
}