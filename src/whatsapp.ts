import {
  makeWASocket,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { useMongoAuthState, clearMongoAuthState } from "./services/whatsapp/mongoAuthState";

let baileysSock: any = null;
let qrCodeStr: string | null = null;
let connectionState: string = "disconnected";
let activeProvider: "Baileys" | "Disabled" = "Baileys";
let isConnecting: boolean = false;

export function setWhatsAppConfig(config: any) {
  if (!config) return;
  activeProvider = config.activeProvider === "Disabled" ? "Disabled" : "Baileys";
  if (activeProvider === "Baileys" && connectionState === "disconnected") {
    connectToWhatsApp().catch(console.error);
  }
}

export async function connectToWhatsApp() {
  if (activeProvider !== "Baileys") return;

  if (isConnecting) {
    console.log("[WhatsApp] Socket is already in connecting state. Preventing duplicate connection.");
    return;
  }

  if (baileysSock && connectionState === "connected") {
    console.log("[WhatsApp] Already connected. Preventing duplicate socket.");
    return;
  }

  isConnecting = true;
  connectionState = "connecting";
  qrCodeStr = null;

  // Reconnect should destroy old socket first
  if (baileysSock) {
    try {
      console.log("[WhatsApp] Destroying old socket before reconnect...");
      baileysSock.ev.removeAllListeners();
      if (typeof baileysSock.end === "function") {
        baileysSock.end(undefined);
      }
    } catch (err) {
      console.warn("[WhatsApp] Error ending previous socket:", err);
    }
    baileysSock = null;
  }

  try {
    const { state, saveCreds } = await useMongoAuthState();

    baileysSock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: "silent" }) as any,
    });

    baileysSock.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        qrCodeStr = qr;
        connectionState = "qr_ready";
        isConnecting = false;
      }
      if (connection === "close") {
        baileysSock = null;
        connectionState = "disconnected";
        qrCodeStr = null;
        isConnecting = false;

        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log("[WhatsApp] Connection closed. Should reconnect:", shouldReconnect);

        if (!shouldReconnect) {
          // Session is logged out/invalid, clean up MongoDB session
          clearMongoAuthState().catch((e) => console.error("[WhatsApp] Failed to clear MongoDB session on close:", e.message));
        }

        if (shouldReconnect && activeProvider === "Baileys") {
          console.log("[WhatsApp] Reconnecting automatically in 3 seconds...");
          setTimeout(() => connectToWhatsApp(), 3000);
        }
      } else if (connection === "open") {
        console.log("[WhatsApp] Opened connection successfully.");
        connectionState = "connected";
        qrCodeStr = null;
        isConnecting = false;
      }
    });

    baileysSock.ev.on("creds.update", saveCreds);

  } catch (error) {
    console.error("[WhatsApp] Error establishing connection:", error);
    connectionState = "disconnected";
    isConnecting = false;
    baileysSock = null;
  }
}

export function getStatus() {
  return {
    state: connectionState,
    activeProvider,
    qr: qrCodeStr,
  };
}

export function getWhatsAppConfig() {
  return {
    activeProvider,
  };
}

export async function sendMessage(number: string, message: string) {
  if (activeProvider === "Disabled") {
    throw new Error("WhatsApp provider is disabled");
  }

  // format number
  let formattedNumber = number.replace(/[^0-9]/g, "");
  if (formattedNumber.startsWith("01")) {
    formattedNumber = "88" + formattedNumber; 
  }

  await sendBaileysMessage(formattedNumber, message);
  return { provider: "Baileys" };
}

async function sendBaileysMessage(formattedNumber: string, message: string) {
  if (!baileysSock || connectionState !== "connected") {
    throw new Error("Baileys WhatsApp not connected");
  }
  const jid = `${formattedNumber}@s.whatsapp.net`;
  await baileysSock.sendMessage(jid, { text: message });
}

export async function disconnectWhatsApp() {
  try {
    if (baileysSock) {
      await baileysSock.logout().catch(() => {});
      baileysSock = null;
    }
  } catch (err) {
    console.warn("Error during baileysSock logout:", err);
  }
  
  connectionState = "disconnected";
  qrCodeStr = null;
  isConnecting = false;

  // Fully remove MongoDB session to ensure a clean slate
  await clearMongoAuthState().catch((e) => console.error("[WhatsApp] Failed to clear MongoDB session:", e.message));
}
