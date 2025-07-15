import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export async function checkQueueHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  queues: Record<string, {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
  }>;
}> {
  const queueNames = ['transcription', 'email', 'webhook', 'ai-processing'];
  const queues: Record<string, any> = {};
  
  try {
    for (const name of queueNames) {
      const queue = new Queue(name, { connection: redis });
      const [active, waiting, completed, failed] = await Promise.all([
        queue.getActiveCount(),
        queue.getWaitingCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      
      queues[name] = { active, waiting, completed, failed };
    }
    
    return { status: 'healthy', queues };
  } catch (error) {
    console.error('Queue health check failed:', error);
    return { status: 'unhealthy', queues: {} };
  }
}