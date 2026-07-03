export interface CallLog {
  id: string;
  customer_id?: string;
  phone: string;
  direction: "INBOUND" | "OUTBOUND";
  status:
    | "QUEUED"
    | "RINGING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "NO_ANSWER"
    | "BUSY"
    | "FAILED";
  start_time: string;
  end_time?: string;
  duration: number;
  extension?: string;
  recording_url?: string;
}

export interface PBXProvider {
  initialize(settings: any): Promise<boolean>;
  syncExtensions(): Promise<any[]>;
  initiateCall(phone: string, scriptUrl?: string): Promise<boolean>;
  getCallStatus(callId: string): Promise<string>;
}

export class BrilliantPBXProvider implements PBXProvider {
  private settings: any;

  async initialize(settings: any): Promise<boolean> {
    this.settings = settings;
    console.log(
      `Initialized Brilliant PBX Provider for number ${settings.pbx_number}`,
    );
    return true;
  }

  async syncExtensions(): Promise<any[]> {
    // Implementation for syncing extensions with Brilliant PBX API
    console.log(
      `Syncing extensions from Brilliant PBX API: ${this.settings?.api_base_url}`,
    );
    // Return dummy extensions as per the interface since no real credentials are provided initially
    return [
      {
        extension_number: "1001",
        employee_name: "Admin",
        role: "Admin",
        status: "ACTIVE",
      },
      {
        extension_number: "1002",
        employee_name: "Sales",
        role: "Sales",
        status: "ACTIVE",
      },
      {
        extension_number: "1003",
        employee_name: "Accounts",
        role: "Accounts",
        status: "ACTIVE",
      },
      {
        extension_number: "1004",
        employee_name: "Support",
        role: "Support",
        status: "ACTIVE",
      },
      {
        extension_number: "1005",
        employee_name: "Owner",
        role: "Owner",
        status: "ACTIVE",
      },
    ];
  }

  async initiateCall(phone: string, scriptUrl?: string): Promise<boolean> {
    console.log(`Initiating outbound call to ${phone} via Brilliant PBX API.`);
    // Fake the API call to provider
    return true;
  }

  async getCallStatus(callId: string): Promise<string> {
    return "COMPLETED";
  }
}
