/**
 * Faithful local mock of the sms.net.bd API, used to verify the SMS pipeline
 * end-to-end in environments with no outbound access to api.sms.net.bd.
 *
 *   node scripts/mock-sms-net-bd.mjs           # listens on :8899
 *   SMS_NET_BD_BASE_URL=http://127.0.0.1:8899 npm run dev
 *
 * It implements the documented contract: JSON body { error, msg, data },
 * error 405 for a bad key, 416 for a bad number, 417 for no balance.
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 8899);
const VALID_KEY = process.env.MOCK_API_KEY || "VALID_TEST_KEY";
let balance = Number(process.env.MOCK_BALANCE ?? 42.5);
let nextRequestId = 5000;
export const sent = [];

const json = (res, obj) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const params = new URLSearchParams(req.method === "POST" ? body : url.search);
    const apiKey = params.get("api_key") || url.searchParams.get("api_key");

    if (url.pathname === "/sendsms") {
      if (apiKey !== VALID_KEY) return json(res, { error: 405, msg: "Authorization required" });
      const to = params.get("to") || "";
      const msg = params.get("msg") || "";
      if (!msg.trim()) return json(res, { error: 414, msg: "Message is empty" });
      const numbers = to.split(",").filter((n) => /^8801[3-9]\d{8}$/.test(n));
      if (!numbers.length) return json(res, { error: 416, msg: "No valid number found" });
      if (balance <= 0) return json(res, { error: 417, msg: "Insufficient balance" });
      balance -= 0.35 * numbers.length;
      const request_id = nextRequestId++;
      sent.push({ request_id, to: numbers, msg });
      console.log(`[mock sms.net.bd] accepted request_id=${request_id} to=${numbers.join(",")}`);
      return json(res, { error: 0, msg: "Request successfully submitted", data: { request_id } });
    }

    if (url.pathname.startsWith("/report/request/")) {
      if (apiKey !== VALID_KEY) return json(res, { error: 405, msg: "Authorization required" });
      const id = Number(url.pathname.split("/").filter(Boolean)[2]);
      const rec = sent.find((s) => s.request_id === id);
      if (!rec) return json(res, { error: 404, msg: "Not found" });
      return json(res, {
        error: 0,
        msg: "Success",
        data: {
          request_id: id,
          request_status: "Complete",
          request_charge: "0.3500",
          recipients: rec.to.map((n) => ({ number: n, charge: "0.3500", status: "Sent" })),
        },
      });
    }

    if (url.pathname.startsWith("/user/balance")) {
      if (apiKey !== VALID_KEY) return json(res, { error: 405, msg: "Authorization required" });
      return json(res, { error: 0, msg: "Success", data: { balance: balance.toFixed(4) } });
    }

    json(res, { error: 404, msg: "Not found" });
  });
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`[mock sms.net.bd] listening on http://127.0.0.1:${PORT} (api_key=${VALID_KEY})`),
);
