export interface WalletPassRequest {
  cardId: string;
  cardSlug: string;
  platform: "apple" | "google";
}

export interface WalletAdapter {
  addPass(request: WalletPassRequest): Promise<{ supported: boolean; message: string }>;
}

class PlaceholderWalletAdapter implements WalletAdapter {
  async addPass({ platform }: WalletPassRequest) {
    return {
      supported: false,
      message:
        platform === "apple"
          ? "Apple Wallet будет доступен после подключения официального сертификата PassKit."
          : "Google Wallet будет доступен после подключения официального Google Wallet API."
    };
  }
}

export const walletAdapter: WalletAdapter = new PlaceholderWalletAdapter();
