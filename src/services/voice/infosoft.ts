import { IVoiceProvider } from "./interface.ts";
import { VoiceProviderConfig } from "../../types.ts";

export class InfoSoftProvider implements IVoiceProvider {
  private config: VoiceProviderConfig;

  constructor(config: VoiceProviderConfig) {
    this.config = config;
  }

  async sendCall(params: {
    to: string;
    text?: string;
    audioUrl?: string;
    templateId?: string;
    variables?: Record<string, string>;
  }): Promise<{
    success: boolean;
    callId?: string;
    error?: string;
    rawResponse?: any;
  }> {
    try {
      const payload = {
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        caller_id: this.config.callerId,
        to: params.to,
        text: params.text,
        audio_url: params.audioUrl,
        template_id: params.templateId,
        variables: JSON.stringify(params.variables || {}),
        webhook_url: this.config.webhookUrl,
      };

      const response = await fetch(`${this.config.apiUrl}/voice/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success" || data.success) {
        return {
          success: true,
          callId: data.call_id || data.id,
          rawResponse: data,
        };
      }

      return {
        success: false,
        error: data.message || "Unknown error from InfoSoft API",
        rawResponse: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getCallStatus(callId: string): Promise<{
    status: string;
    duration?: number;
    recordingUrl?: string;
    dtmf?: string;
  }> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/voice/status?call_id=${callId}&api_key=${this.config.apiKey}`,
      );
      const data = await response.json();

      return {
        status: data.status,
        duration: data.duration,
        recordingUrl: data.recording_url,
        dtmf: data.dtmf_captured,
      };
    } catch (error) {
      return { status: "FAILED" };
    }
  }
}
