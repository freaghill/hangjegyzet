// Type declarations for third-party modules without TypeScript support

declare module 'next-test-api-route-handler' {
  import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
  import { RequestOptions } from 'http';
  
  interface TestApiHandlerOptions {
    handler: NextApiHandler;
    test?: (params: { fetch: (init?: RequestInit) => Promise<Response> }) => Promise<void>;
    url?: string;
    params?: Record<string, string | string[]>;
    headers?: Record<string, string>;
    requestInit?: RequestInit;
  }
  
  export function testApiHandler(options: TestApiHandlerOptions): Promise<void>;
}

declare module 'node-barion' {
  export interface BarionOptions {
    POSKey: string;
    Environment?: 'Test' | 'Production';
    FundingSources?: string[];
    GuestCheckOut?: boolean;
    Locale?: string;
    Currency?: string;
  }

  export interface PaymentTransaction {
    POSTransactionId: string;
    Payee: string;
    Total: number;
    Comment?: string;
    Items?: PaymentItem[];
  }

  export interface PaymentItem {
    Name: string;
    Description: string;
    Quantity: number;
    Unit: string;
    UnitPrice: number;
    ItemTotal: number;
    SKU?: string;
  }

  export interface StartPaymentRequest {
    PaymentType: 'Immediate' | 'Reservation' | 'DelayedCapture';
    ReservationPeriod?: number;
    PaymentWindow?: string;
    GuestCheckOut?: boolean;
    FundingSources?: string[];
    PaymentRequestId: string;
    PayerHint?: string;
    RedirectUrl: string;
    CallbackUrl: string;
    Transactions: PaymentTransaction[];
    Locale?: string;
    Currency?: string;
  }

  export interface StartPaymentResponse {
    PaymentId: string;
    PaymentRequestId: string;
    Status: string;
    GatewayUrl: string;
    Errors?: any[];
  }

  export interface GetPaymentStateResponse {
    PaymentId: string;
    PaymentRequestId: string;
    Status: string;
    PaymentType: string;
    FundingSource: string;
    GuestCheckout: boolean;
    CreatedAt: string;
    CompletedAt?: string;
    Total: number;
  }

  export default class Barion {
    constructor(options: BarionOptions);
    
    startPayment(request: StartPaymentRequest): Promise<StartPaymentResponse>;
    getPaymentState(paymentId: string): Promise<GetPaymentStateResponse>;
    finishReservation(request: any): Promise<any>;
    capturePayment(request: any): Promise<any>;
    refundPayment(request: any): Promise<any>;
  }
}

// Augment existing modules that have incorrect types
declare module '@testing-library/react' {
  export function waitFor<T>(
    callback: () => T | Promise<T>,
    options?: {
      container?: HTMLElement;
      timeout?: number;
      interval?: number;
      onTimeout?: (error: Error) => Error;
      mutationObserverOptions?: MutationObserverInit;
    }
  ): Promise<T>;
}

// Cache manager types
declare module 'cache-manager' {
  export interface Cache {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    reset(): Promise<void>;
    wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
  }

  export interface CachingConfig {
    ttl?: number;
    max?: number;
    store?: 'memory' | 'redis' | string;
    host?: string;
    port?: number;
    auth_pass?: string;
    db?: number;
  }

  export function caching(config: CachingConfig): Promise<Cache>;
}