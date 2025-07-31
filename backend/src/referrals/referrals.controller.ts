import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from '../admin/admin.service';

@Controller()
export class ReferralsController {
  constructor(private adminService: AdminService) {}

  @Get('ref/:refCode')
  async handleReferral(@Param('refCode') refCode: string, @Res() res: Response) {
    try {
      const jobPostId = await this.adminService.incrementClick(refCode);
      res.redirect(`/jobs/${jobPostId}?ref=${refCode}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).send('Referral link not found');
      } else {
        res.status(500).send('Internal server error');
      }
    }
  }
}