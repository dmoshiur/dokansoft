import { voiceManager } from '../voice/manager.ts';
import { repository } from '../db/repository.ts';
import { CallLog } from '../../types.ts';

// Direct asynchronous background task processor wrapper (replaces BullMQ queue)
export const callQueue = {
  add: async (name: string, data: any) => {
    // Process the voice call directly and asynchronously in the background
    processCall(data.callLogId).catch(err => {
      console.error('[Queue Fallback] Direct voice call processing failed:', err);
    });
    return { id: 'direct-' + Date.now() };
  }
};

async function processCall(callLogId: string) {
  const callLog = await repository.getDocument<CallLog>("voice_call_logs", callLogId);
  if (!callLog) throw new Error("Call log not found");

  console.log(`[Queue] Processing call for ${callLog.customerName} (${callLog.phone})`);

  const provider = voiceManager.getProvider();
  
  // Update status to CALLING
  await repository.updateDocument("voice_call_logs", callLogId, { status: "CALLING" });

  const result = await provider.sendCall({
    to: callLog.phone,
    text: callLog.voiceText,
  });

  if (result.success) {
    await repository.updateDocument("voice_call_logs", callLogId, { 
      status: "RINGING",
      apiResponse: result.rawResponse,
      callId: result.callId
    });
  } else {
    await repository.updateDocument("voice_call_logs", callLogId, { 
      status: "FAILED",
      apiResponse: result.rawResponse,
      error: result.error
    });
  }
}

// Keep startWorker for server compatibility, but make it a clean no-op
export const startWorker = () => {
  return null;
};
