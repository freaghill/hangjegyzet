import Barion from 'node-barion';
import { simplepayService } from '@/lib/payments/simplepay-v2';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendgrid';

export interface PaymentProvider {
  name: 'barion' | 'simplepay' | 'stripe';
  isEnabled: boolean;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description: string;
  userId: string;
  provider: 'barion' | 'simplepay';
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  gatewayUrl?: string;
  error?: string;
}

export class PaymentService {
  private barion: Barion | null = null;
  
  constructor() {
    if (process.env.BARION_POS_KEY) {
      this.barion = new Barion({
        POSKey: process.env.BARION_POS_KEY,
        Environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Test',
      });
    }
  }
  
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { amount, currency, description, userId, provider, metadata } = params;
    
    try {
      if (provider === 'barion' && this.barion) {
        return await this.createBarionPayment(amount, currency, description, userId, metadata);
      } else if (provider === 'simplepay') {
        return await this.createSimplePayPayment(amount, currency, description, userId, metadata);
      } else {
        throw new Error(`Unsupported payment provider: ${provider}`);
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }
  
  private async createBarionPayment(
    amount: number,
    currency: string,
    description: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    if (!this.barion) {
      throw new Error('Barion not configured');
    }
    
    const paymentRequest = {
      PaymentType: 'Immediate' as const,
      PaymentRequestId: `${Date.now()}-${userId}`,
      RedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      CallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments`,
      Transactions: [
        {
          POSTransactionId: `${Date.now()}-${userId}`,
          Payee: process.env.BARION_PAYEE_EMAIL || 'sales@hangjegyzet.hu',
          Total: amount,
          Comment: description,
        },
      ],
      Currency: currency,
    };
    
    const response = await this.barion.startPayment(paymentRequest);
    
    if (response.Errors && response.Errors.length > 0) {
      throw new Error(response.Errors[0].Title);
    }
    
    // Save payment record
    await this.savePaymentRecord({
      paymentId: response.PaymentId,
      userId,
      amount,
      currency,
      provider: 'barion',
      status: 'pending',
      metadata,
    });
    
    return {
      success: true,
      paymentId: response.PaymentId,
      gatewayUrl: response.GatewayUrl,
    };
  }
  
  private async createSimplePayPayment(
    amount: number,
    currency: string,
    description: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    const result = await simplepayService.createPayment({
      amount,
      currency,
      orderRef: `${Date.now()}-${userId}`,
      customerEmail: metadata?.email || '',
      language: 'HU',
      items: [
        {
          ref: 'SUBSCRIPTION',
          title: description,
          amount,
          qty: 1,
        },
      ],
      urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        fail: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
        cancel: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancelled`,
        timeout: `${process.env.NEXT_PUBLIC_APP_URL}/payment/timeout`,
      },
    });
    
    if (!result.success) {
      throw new Error(result.error || 'SimplePay payment failed');
    }
    
    // Save payment record
    await this.savePaymentRecord({
      paymentId: result.transactionId!,
      userId,
      amount,
      currency,
      provider: 'simplepay',
      status: 'pending',
      metadata,
    });
    
    return {
      success: true,
      paymentId: result.transactionId,
      gatewayUrl: result.paymentUrl,
    };
  }
  
  private async savePaymentRecord(data: {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
    provider: string;
    status: string;
    metadata?: Record<string, any>;
  }) {
    const supabase = await createClient();
    
    const { error } = await supabase.from('payments').insert({
      payment_id: data.paymentId,
      user_id: data.userId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      status: data.status,
      metadata: data.metadata,
    });
    
    if (error) throw error;
  }
  
  async processWebhook(provider: string, data: any) {
    if (provider === 'barion') {
      return await this.processBarionWebhook(data);
    } else if (provider === 'simplepay') {
      return await this.processSimplePayWebhook(data);
    }
    
    throw new Error(`Unknown webhook provider: ${provider}`);
  }
  
  private async processBarionWebhook(data: any) {
    if (!this.barion) {
      throw new Error('Barion not configured');
    }
    
    const paymentId = data.PaymentId;
    const state = await this.barion.getPaymentState(paymentId);
    
    // Update payment record
    const supabase = await createClient();
    const { error } = await supabase
      .from('payments')
      .update({
        status: state.Status.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);
    
    if (error) throw error;
    
    // Send confirmation email if successful
    if (state.Status === 'Succeeded') {
      await this.sendPaymentConfirmation(paymentId);
    }
    
    return { success: true };
  }
  
  private async processSimplePayWebhook(data: any) {
    const verified = simplepayService.verifyWebhook(data);
    if (!verified) {
      throw new Error('Invalid webhook signature');
    }
    
    // Update payment record
    const supabase = await createClient();
    const { error } = await supabase
      .from('payments')
      .update({
        status: data.status.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', data.transactionId);
    
    if (error) throw error;
    
    // Send confirmation email if successful
    if (data.status === 'SUCCESS') {
      await this.sendPaymentConfirmation(data.transactionId);
    }
    
    return { success: true };
  }
  
  private async sendPaymentConfirmation(paymentId: string) {
    const supabase = await createClient();
    
    const { data: payment } = await supabase
      .from('payments')
      .select('*, users(*)')
      .eq('payment_id', paymentId)
      .single();
    
    if (!payment || !payment.users) return;
    
    await sendEmail({
      to: payment.users.email,
      subject: 'Sikeres fizetés - Hangjegyzet',
      templateId: 'payment-confirmation',
      dynamicTemplateData: {
        name: payment.users.name,
        amount: payment.amount,
        currency: payment.currency,
        paymentId: payment.payment_id,
        date: new Date().toLocaleDateString('hu-HU'),
      },
    });
  }
}

export const paymentService = new PaymentService();