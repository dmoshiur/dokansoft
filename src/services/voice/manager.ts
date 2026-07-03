import { VoiceProviderConfig } from "../../types.ts";
import { InfoSoftProvider } from "./infosoft.ts";
import { IVoiceProvider } from "./interface.ts";

export class VoiceManager {
  private static instance: VoiceManager;
  private provider: IVoiceProvider | null = null;
  private config: VoiceProviderConfig | null = null;

  private constructor() {}

  static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  setProvider(config: VoiceProviderConfig) {
    this.config = config;
    // For now, we only have InfoSoft. Later we can add more providers.
    this.provider = new InfoSoftProvider(config);
  }

  getProvider(): IVoiceProvider {
    if (!this.provider) {
      throw new Error("Voice provider not initialized. Please configure in settings.");
    }
    return this.provider;
  }
}

export const voiceManager = VoiceManager.getInstance();
