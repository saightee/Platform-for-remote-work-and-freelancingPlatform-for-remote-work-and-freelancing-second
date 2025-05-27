import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserFingerprint } from './entities/user-fingerprint.entity';
import { User } from '../users/entities/user.entity';
import axios from 'axios';

@Injectable()
export class AntiFraudService {
  constructor(
    @InjectRepository(UserFingerprint)
    private fingerprintRepository: Repository<UserFingerprint>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async calculateRiskScore(userId: string, fingerprint: string, ip: string): Promise<number> {
    let riskScore = 0;

    // Проверка дублирующегося IP
    const ipCount = await this.fingerprintRepository.count({ where: { ip, user_id: Not(userId) } });
    if (ipCount > 0) {
      riskScore += 20;
    }

    // Проверка прокси/VPN через ip-api.com
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=proxy,hosting`);
      const { proxy, hosting } = response.data;
      if (proxy || hosting) {
        riskScore += 30;
      }
    } catch (error) {
      console.error('Error checking proxy:', error.message);
    }

    // Проверка дублирующегося отпечатка
    const fingerprintCount = await this.fingerprintRepository.count({
      where: { fingerprint, user_id: Not(userId) },
    });
    if (fingerprintCount > 0) {
      riskScore += 25;
    }

    // Сохраняем отпечаток
    const userFingerprint = this.fingerprintRepository.create({
      user_id: userId,
      fingerprint,
      ip,
    });
    await this.fingerprintRepository.save(userFingerprint);

    // Обновляем risk_score в users
    await this.usersRepository.update({ id: userId }, { risk_score: riskScore });

    return riskScore;
  }

  async getRiskScore(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fingerprints = await this.fingerprintRepository.find({ where: { user_id: userId } });
    const ipCount = await this.fingerprintRepository.count({
      where: { ip: In(fingerprints.map(f => f.ip)), user_id: Not(userId) },
    });
    const fingerprintCount = await this.fingerprintRepository.count({
      where: { fingerprint: In(fingerprints.map(f => f.fingerprint)), user_id: Not(userId) },
    });

    return {
      userId,
      riskScore: user.risk_score,
      details: {
        duplicateIp: ipCount > 0,
        proxyDetected: false, // Упрощено
        duplicateFingerprint: fingerprintCount > 0,
      },
    };
  }
}