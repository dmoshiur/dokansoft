import { CallLog, VoiceProviderConfig } from "../../types.ts";

export interface IVoiceProvider {
  sendCall(params: {
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
  }>;

  getCallStatus(callId: string): Promise<{
    status: string;
    duration?: number;
    recordingUrl?: string;
    dtmf?: string;
  }>;
}
