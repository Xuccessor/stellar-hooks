declare module "@creit-tech/stellar-wallets-kit/sdk" {
  export const KitEventType: {
    readonly STATE_UPDATED: string;
    readonly WALLET_SELECTED: string;
    readonly DISCONNECT: string;
  };

  export interface KitEvent {
    eventType?: string;
    payload?: {
      address?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface WalletsKitInitOptions {
    modules: unknown[];
    selectedWalletId?: string;
    network?: string;
  }

  export class StellarWalletsKit {
    static init(options: WalletsKitInitOptions): void;
    static on(event: string, handler: (event: KitEvent) => void): () => void;
    static authModal(): Promise<{ address: string }>;
    static getAddress(): Promise<{ address: string }>;
    static signTransaction(
      xdr: string,
      options?: { networkPassphrase?: string; address?: string },
    ): Promise<{ signedTxXdr: string }>;
    static signAuthEntry(
      authEntry: string,
      options?: { networkPassphrase?: string; address?: string },
    ): Promise<{ signedAuthEntry: string }>;
    static signMessage(
      message: string,
      options?: { networkPassphrase?: string; address?: string },
    ): Promise<{ signedMessage: string }>;
  }
}
