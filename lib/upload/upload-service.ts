import { createClient } from '@/lib/supabase/client';
import { ChunkedUploadManager } from './chunked-upload';

export class UploadService {
  private supabase = createClient();
  
  async uploadFile(file: File, bucket: string, path: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) throw error;
    return data;
  }
  
  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
  
  async deleteFile(bucket: string, path: string) {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
  }
  
  createChunkedUploadManager() {
    return new ChunkedUploadManager();
  }
}

export const uploadService = new UploadService();