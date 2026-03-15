import { supabaseClient } from '../../infra/supabaseClient';
import { PlanType, User } from '../../types/domain';
import { AppError, QuotaExceededError } from '../../types/errors';
import { planService } from '../billing/planService';

export interface UsageService {
  checkAndConsumeDaily(user: User, plan: PlanType): Promise<void>;
  getTodayUsage(userId: string): Promise<{ date: Date; requestsCount: number }>;
}

function getTodayDateUtc(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const usageService: UsageService = {
  async checkAndConsumeDaily(user: User, plan: PlanType): Promise<void> {
    const limit = planService.getDailyQuota(plan);
    if (limit <= 0) {
      return;
    }

    const date = getTodayDateUtc();

    const { data, error } = await supabaseClient.rpc('increment_usage_daily', {
      p_user_id: user.id,
      p_date: date,
    });

    if (error) {
      throw new AppError('Failed to update usage', 'db_error', 500);
    }

    const newCount: number = typeof data === 'number' ? data : 0;

    if (newCount > limit) {
      throw new QuotaExceededError();
    }
  },

  async getTodayUsage(userId: string): Promise<{ date: Date; requestsCount: number }> {
    const dateStr = getTodayDateUtc();

    const { data: rows, error } = await supabaseClient
      .from('usage_daily')
      .select('requests_count')
      .eq('user_id', userId)
      .eq('date', dateStr);

    if (error) {
      throw new AppError('Failed to load usage', 'db_error', 500);
    }

    const current = rows && rows[0];
    const requestsCount: number = current?.requests_count ?? 0;

    return {
      date: new Date(`${dateStr}T00:00:00.000Z`),
      requestsCount
    };
  }
};
