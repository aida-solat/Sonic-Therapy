import { PlanType } from '../../types/domain';

export interface PlanInfo {
  plan: PlanType;
  dailyQuota: number;
  allowWav: boolean;
  commercialLicense: boolean;
}

export interface PlanService {
  getDailyQuota(plan: PlanType): number;
  describePlan(plan: PlanType, usedToday: number): PlanInfo & { usedToday: number };
}

export const planService: PlanService = {
  getDailyQuota(plan: PlanType): number {
    switch (plan) {
      case 'free':
        return 1;
      case 'basic':
        return 5;
      case 'pro':
        return 20;
      case 'ultra':
        return 100;
      default:
        return 0;
    }
  },

  describePlan(plan: PlanType, usedToday: number): PlanInfo & { usedToday: number } {
    const dailyQuota = this.getDailyQuota(plan);
    const allowWav = plan === 'pro' || plan === 'ultra';
    const commercialLicense = plan === 'ultra';

    return {
      plan,
      dailyQuota,
      allowWav,
      commercialLicense,
      usedToday
    };
  }
};
