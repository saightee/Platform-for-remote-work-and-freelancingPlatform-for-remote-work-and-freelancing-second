import { Controller, Get, Put, Post, Headers, UnauthorizedException, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ProfilesService } from './profiles.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { extname } from 'path';

@Controller('profile')
export class ProfilesController {
  constructor(
    private profilesService: ProfilesService,
    private jwtService: JwtService,
  ) {}

  @Get('myprofile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.getProfile(userId);
  }

  @Get(':id')
  async getProfileById(
    @Param('id') userId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    let isAuthenticated = false;
    let viewerId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token);
        isAuthenticated = true;
        viewerId = payload.sub;
      } catch (error) {
      }
    }

    const profile = await this.profilesService.getProfile(userId, isAuthenticated);

    if (profile.role === 'jobseeker') {
      await this.profilesService.incrementProfileView(userId);
    }

    return profile;
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      role?: string;
      username?: string;
      skillIds?: string[];
      experience?: string;
      description?: string;
      portfolio?: string;
      video_intro?: string;
      resume?: string;
      timezone?: string;
      currency?: string;
      job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired';
      expected_salary?: number;
      linkedin?: string | null;
      instagram?: string | null;
      facebook?: string | null;
      whatsapp?: string | null;
      telegram?: string | null;
    },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.profilesService.updateProfile(userId, body);
  }

  @Post('upload-avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extName = allowedTypes.test(extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (extName && mimeType) {
        return cb(null, true);
      } else {
        cb(new BadRequestException('Only JPEG, JPG, and PNG files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(
    @Headers('authorization') authHeader: string,
    @UploadedFile() avatar: any,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    if (!avatar) {
      throw new BadRequestException('Avatar file is required');
    }

    const avatarPath = `/uploads/avatars/${avatar.filename}`;
    return this.profilesService.uploadAvatar(userId, avatarPath);
  }

  @Post('upload-identity')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('document', {
    storage: diskStorage({
      destination: './uploads/documents',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extName = allowedTypes.test(extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (extName && mimeType) {
        return cb(null, true);
      } else {
        cb(new BadRequestException('Only JPEG, JPG, PNG, and PDF files are allowed'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadIdentity(
    @Headers('authorization') authHeader: string,
    @UploadedFile() document: any,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    if (!document) {
      throw new BadRequestException('Document file is required');
    }

    const documentPath = `/uploads/documents/${document.filename}`;
    return this.profilesService.uploadIdentityDocument(userId, documentPath);
  }

  @Post(':id/increment-view')
  async incrementProfileView(@Param('id') userId: string) {
    return this.profilesService.incrementProfileView(userId);
  }

  @Post('upload-resume')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('resume', {
    storage: diskStorage({
      destination: './uploads/resumes',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /pdf|doc|docx/;
      const extName = allowedTypes.test(extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (extName && mimeType) {
        return cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  async uploadResume(
    @Headers('authorization') authHeader: string,
    @UploadedFile() resume: any,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
  
    if (!resume) {
      throw new BadRequestException('Resume file is required');
    }
  
    const resumePath = `/uploads/resumes/${resume.filename}`;
    return this.profilesService.uploadResume(userId, resumePath);
  }
}