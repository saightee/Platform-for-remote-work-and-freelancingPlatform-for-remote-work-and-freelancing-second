import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserFingerprint } from './entities/user-fingerprint.entity';
import { User } from '../users/entities/user.entity';
import axios from 'axios';

type RiskBreakdown = {
  duplicateIp: number;
  proxyHosting: number;
  duplicateFingerprint: number;
};

@Injectable()
export class AntiFraudService {
  constructor(
    @InjectRepository(UserFingerprint)
    private fingerprintRepository: Repository<UserFingerprint>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private weights = {
    duplicateIpBase: 30,
    duplicateIpScaleCap: 15,
    proxyHosting: 45,
    duplicateFingerprint: 60,
  };

  private clamp(v: number, min=0, max=100) { return Math.max(min, Math.min(max, v)); }

  async calculateRiskScore(userId: string, fingerprint: string, ip: string): Promise<{
    riskScore: number;
    breakdown: RiskBreakdown;
  }> {
    const ipCount = await this.fingerprintRepository.count({ where: { ip, user_id: Not(userId) } });
    let duplicateIpScore = 0;
    if (ipCount > 0) {
      const scaled = Math.min(ipCount, 5) / 5;
      duplicateIpScore = this.weights.duplicateIpBase + Math.round(scaled * this.weights.duplicateIpScaleCap);
    }

    let is_proxy = false;
    let is_hosting = false;

    const existingForIp = await this.fingerprintRepository.findOne({ where: { user_id: userId, ip } });
    if (existingForIp) {
      is_proxy = existingForIp.is_proxy;
      is_hosting = existingForIp.is_hosting;
    } else {
      try {
        const resp = await axios.get(`http://ip-api.com/json/${ip}?fields=proxy,hosting`);
        is_proxy = !!resp.data?.proxy;
        is_hosting = !!resp.data?.hosting;
      } catch (e) {
      }
    }
    const proxyHostingScore = (is_proxy || is_hosting) ? this.weights.proxyHosting : 0;

    const fpCount = await this.fingerprintRepository.count({
      where: { fingerprint, user_id: Not(userId) },
    });
    const duplicateFingerprintScore = fpCount > 0 ? this.weights.duplicateFingerprint : 0;

    const raw = duplicateIpScore + proxyHostingScore + duplicateFingerprintScore;
    const riskScore = this.clamp(raw);

    const existing = await this.fingerprintRepository.findOne({ where: { user_id: userId, fingerprint, ip } });
    if (existing) {
      existing.is_proxy = is_proxy;
      existing.is_hosting = is_hosting;
      existing.seen_count = (existing.seen_count || 1) + 1;
      await this.fingerprintRepository.save(existing);
    } else {
      const userFingerprint = this.fingerprintRepository.create({
        user_id: userId,
        fingerprint,
        ip,
        is_proxy,
        is_hosting,
        seen_count: 1,
      });
      await this.fingerprintRepository.save(userFingerprint);
    }

    await this.usersRepository.update({ id: userId }, { risk_score: riskScore });

    return {
      riskScore,
      breakdown: {
        duplicateIp: duplicateIpScore,
        proxyHosting: proxyHostingScore,
        duplicateFingerprint: duplicateFingerprintScore,
      }
    };
  }

  async getRiskScore(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const fingerprints = await this.fingerprintRepository.find({ where: { user_id: userId } });
    const ipCount = await this.fingerprintRepository.count({
      where: { ip: In(fingerprints.map(f => f.ip)), user_id: Not(userId) },
    });
    const fingerprintCount = await this.fingerprintRepository.count({
      where: { fingerprint: In(fingerprints.map(f => f.fingerprint)), user_id: Not(userId) },
    });
    const proxyDetected = fingerprints.some(f => f.is_proxy || f.is_hosting);

    return {
      userId,
      riskScore: user.risk_score,
      details: {
        duplicateIp: ipCount > 0,
        proxyDetected,
        duplicateFingerprint: fingerprintCount > 0,
      },
    };
  }
}