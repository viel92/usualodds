import { createClient } from '@/lib/supabase';
import { apiFootball } from '@/lib/api-football';

export abstract class BaseCollector {
  protected supabase = createClient();
  protected api = apiFootball;

  protected async logDataQuality(
    checkType: string,
    tableName: string,
    checkName: string,
    status: 'passed' | 'failed' | 'warning',
    details?: Record<string, any>
  ) {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: checkType,
        table_name: tableName,
        check_name: checkName,
        status,
        details,
        checked_at: new Date().toISOString()
      });
  }

  protected async rateLimitDelay(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abstract collect(): Promise<void>;
}