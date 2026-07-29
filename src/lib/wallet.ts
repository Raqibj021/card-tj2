import { supabase } from "./supabase";

export interface WalletPassRequest {
  cardId: string;
  cardSlug: string;
  platform: "apple" | "google";
}

export interface WalletAdapter {
  addPass(request: WalletPassRequest): Promise<{ supported: boolean; message: string }>;
}

class PlaceholderWalletAdapter implements WalletAdapter {
  async addPass({ platform, cardId, cardSlug }: WalletPassRequest) {
    if (platform === "google" && supabase) {
      const { data, error } = await supabase.functions.invoke("create-google-wallet-pass", {
        body: { cardId, cardSlug }
      });

      if (!error && data?.saveUrl) {
        window.location.assign(String(data.saveUrl));
        return {
          supported: true,
          message: "Открываем Google Wallet…"
        };
      }

      if (data?.code === "GOOGLE_WALLET_NOT_CONFIGURED") {
        return {
          supported: false,
          message: "Google Wallet готов к подключению и ожидает одобрения аккаунта Vizora."
        };
      }

      return {
        supported: false,
        message: String(data?.error ?? "Не удалось создать пропуск Google Wallet. Попробуйте позже.")
      };
    }

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
