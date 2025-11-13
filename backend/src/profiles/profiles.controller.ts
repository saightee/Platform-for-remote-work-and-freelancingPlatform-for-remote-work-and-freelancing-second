import {
  Controller,
  Get,
  Put,
  Post,
  Headers,
  UnauthorizedException,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProfilesService } from './profiles.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

import { S3StorageService } from '../storage/s3-storage.service';
import { pickCdnBaseByHost } from '../common/cdn.util';

const FILES_DRIVER = process.env.FILES_DRIVER || 's3';

@Controller('profile')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly jwtService: JwtService,
    private readonly s3: S3StorageService,
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

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token);
        isAuthenticated = !!payload?.sub;
      } catch {
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
      country?: string;
      // jobseeker:
      skillIds?: string[];
      experience?: string;
      job_experience?: string;
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
      languages?: string[];
      date_of_birth?: string;
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
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png/;
        const okExt = allowed.test(extname(file.originalname).toLowerCase());
        const okMime = allowed.test(file.mimetype);
        return okExt && okMime
          ? cb(null, true)
          : cb(new BadRequestException('Only JPEG, JPG, and PNG files are allowed'), false);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Headers('authorization') authHeader: string,
    @Headers('host') host: string,
    @UploadedFile() avatar: Express.Multer.File,
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

    let url: string;

    if (FILES_DRIVER === 's3' && process.env.AWS_S3_BUCKET) {
      const { key } = await this.s3.uploadBuffer(avatar.buffer, {
        prefix: 'avatars',
        originalName: avatar.originalname,
        contentType: avatar.mimetype,
      });
      url = `${pickCdnBaseByHost(host)}/${key}`;
    } else {
      const ext = extname(avatar.originalname) || '';
      const name = `${randomUUID()}${ext}`;
      const dir = './uploads/avatars';
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(join(dir, name), avatar.buffer);
      url = `${process.env.BASE_URL}/uploads/avatars/${name}`;
    }

    return this.profilesService.uploadAvatar(userId, url);
  }

  @Post('upload-identity')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|pdf/;
        const okExt = allowed.test(extname(file.originalname).toLowerCase());
        const okMime = allowed.test(file.mimetype);
        return okExt && okMime
          ? cb(null, true)
          : cb(
              new BadRequestException('Only JPEG, JPG, PNG, and PDF files are allowed'),
              false,
            );
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadIdentity(
    @Headers('authorization') authHeader: string,
    @Headers('host') host: string,
    @UploadedFile() document: Express.Multer.File,
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

    let url: string;

    if (FILES_DRIVER === 's3' && process.env.AWS_S3_BUCKET) {
      const { key } = await this.s3.uploadBuffer(document.buffer, {
        prefix: 'documents',
        originalName: document.originalname,
        contentType: document.mimetype,
      });
      url = `${pickCdnBaseByHost(host)}/${key}`;
    } else {
      const ext = extname(document.originalname) || '';
      const name = `${randomUUID()}${ext}`;
      const dir = './uploads/documents';
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(join(dir, name), document.buffer);
      url = `${process.env.BASE_URL}/uploads/documents/${name}`;
    }

    return this.profilesService.uploadIdentityDocument(userId, url);
  }

  @Post('upload-resume')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowed = /pdf|doc|docx/;
        const okExt = allowed.test(extname(file.originalname).toLowerCase());
        const okMime = allowed.test(file.mimetype);
        return okExt && okMime
          ? cb(null, true)
          : cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed'), false);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadResume(
    @Headers('authorization') authHeader: string,
    @Headers('host') host: string,
    @UploadedFile() resume: Express.Multer.File,
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

    let url: string;

    if (FILES_DRIVER === 's3' && process.env.AWS_S3_BUCKET) {
      const { key } = await this.s3.uploadBuffer(resume.buffer, {
        prefix: 'resumes',
        originalName: resume.originalname,
        contentType: resume.mimetype,
      });
      url = `${pickCdnBaseByHost(host)}/${key}`;
    } else {
      const ext = extname(resume.originalname) || '';
      const name = `${randomUUID()}${ext}`;
      const dir = './uploads/resumes';
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(join(dir, name), resume.buffer);
      url = `${process.env.BASE_URL}/uploads/resumes/${name}`;
    }

    return this.profilesService.uploadResume(userId, url);
  }

  @Post(':id/increment-view')
  async incrementProfileView(@Param('id') userId: string) {
    return this.profilesService.incrementProfileView(userId);
  }
}