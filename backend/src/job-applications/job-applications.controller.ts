import { Controller, Post, Get, Put, Body, Param, Headers, UnauthorizedException, UseGuards, Query, BadRequestException  } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private jobApplicationsService: JobApplicationsService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async applyToJob(
    @Headers('authorization') authHeader: string,
    @Body('job_post_id') jobPostId: string,
    @Body('cover_letter') coverLetter: string,
    @Body('relevant_experience') relevantExperience: string,
    @Body('full_name') fullName?: string,
    @Body('referred_by') referredBy?: string,
    @Body('ref') ref?: string,
    @Body('refCode') refCode?: string,
    ) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid token');
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
    
      return this.jobApplicationsService.applyToJob(
        userId,
        jobPostId,
        coverLetter,
        relevantExperience,
        fullName,
        referredBy,
        ref || refCode,
      );
    }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-applications')
  async getMyApplications(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.getMyApplications(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('job-post/:id')
    async getApplicationsForJobPost(
      @Headers('authorization') authHeader: string,
      @Param('id') jobPostId: string,
    ) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid token');
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (['admin', 'moderator'].includes(payload.role)) {
        return this.jobApplicationsService.getApplicationsForJobPost(userId, jobPostId);  
      }

      if (payload.role !== 'employer') {
        throw new UnauthorizedException('Only employers can view applications for their job posts');
      }

      return this.jobApplicationsService.getApplicationsForJobPost(userId, jobPostId);
    }

  @UseGuards(AuthGuard('jwt'))
  @Post('invitations')
  async createInvitation(
    @Headers('authorization') authHeader: string,
    @Body('job_post_id') jobPostId: string,
    @Body('job_seeker_id') jobSeekerId: string,
    @Body('message') message?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Invalid token');
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.jobApplicationsService.inviteJobSeeker(userId, jobPostId, jobSeekerId, message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('invitations')
  async getMyInvitations(
    @Headers('authorization') authHeader: string,
    @Query('includeAll') includeAll?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Invalid token');
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    const all = String(includeAll || '').toLowerCase() === 'true';
    return this.jobApplicationsService.getMyInvitations(userId, all);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invitations/:id/decline')
  async declineInvitation(
    @Headers('authorization') authHeader: string,
    @Param('id') invitationId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Invalid token');
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.jobApplicationsService.declineInvitation(userId, invitationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invitations/:id/accept')
  async acceptInvitation(
    @Headers('authorization') authHeader: string,
    @Param('id') invitationId: string,
    @Body('cover_letter') coverLetter: string,
    @Body('relevant_experience') relevantExperience: string,
    @Body('full_name') fullName?: string,
    @Body('referred_by') referredBy?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Invalid token');
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.jobApplicationsService.acceptInvitation(userId, invitationId, {
      cover_letter: coverLetter,
      relevant_experience: relevantExperience,
      full_name: fullName,
      referred_by: referredBy,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async updateApplicationStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') applicationId: string,
    @Body('status') status: 'Pending' | 'Accepted' | 'Rejected',
  ) {
    console.log('Received PUT /job-applications/:id', {
      applicationId,
      status,
      authHeader: authHeader ? 'Present' : 'Missing',
    });
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid token error', { authHeader });
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      payload = this.jwtService.verify(token);
      console.log('Token verified', { userId: payload.sub, role: payload.role });
    } catch (error) {
      console.log('Token verification failed', { error: error.message });
      throw new UnauthorizedException('Invalid token');
    }
    const userId = payload.sub;
    const result = await this.jobApplicationsService.updateApplicationStatus(userId, applicationId, status);
    console.log('Update application status result', { result });
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('bulk-reject')
  async bulkReject(
    @Headers('authorization') authHeader: string,
    @Body('applicationIds') applicationIds: string[],
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new BadRequestException('applicationIds must be a non-empty array');
    }
    if (applicationIds.length > 1000) {
      throw new BadRequestException('Too many applicationIds (max 1000)');
    }
  
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
  
    return this.jobApplicationsService.bulkRejectApplications(userId, applicationIds);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getApplicationById(
    @Headers('authorization') authHeader: string,
    @Param('id') applicationId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.getApplicationById(userId, applicationId);
  }

}
