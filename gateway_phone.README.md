# bKash Personal Gateway — Termux Companion

This repository includes `gateway_phone.py`, a personal automation relay that
runs on your own Android phone using **Termux**. It watches incoming bKash
confirmation SMS and forwards them to the server's
`POST /api/gateway/bkash/incoming-sms` webhook for automatic payment matching.

> This is designed for your own business phone. It is not an official bKash
> SDK, merchant API, or third-party scraping robot.

## 1. Setup the server side

1. Open **Admin → Notification & Gateway Settings → bKash Personal**.
2. Enable the gateway and enter your personal bKash number.
3. Copy the **Webhook URL** (must be HTTPS) and regenerate/copy the
   **Webhook Token**.
4. Optional: set amount tolerance and pending-order expiry.

## 2. Install on Termux

```bash
pkg update && pkg install python termux-api
pip install requests
```

## 3. Configure

```bash
cp gateway_phone.config.example.json config.json
nano config.json
```

Fill in:

```json
{
  "webhook_url": "https://yourdomain.com/api/gateway/bkash/incoming-sms",
  "webhook_token": "xxxxxxxx",
  "sender_filter": "bKash",
  "poll_interval_seconds": 5
}
```

The token shown in the admin panel is masked after the first save — use the
**Regenerate Token** button and update `config.json` if you need the full token.

## 4. Run

```bash
python gateway_phone.py
```

To keep it running with the screen off:

```bash
python gateway_phone.py &   # or use termux-wake-lock
```

The script keeps a local `pending_queue.json` so failed deliveries retry until
the server returns HTTP 200, and writes verbose logs to `gateway.log`.

## 5. How matching works

1. The server verifies `Authorization: Bearer <webhook_token>`.
2. It rejects duplicate `trx_id` values (replay protection).
3. It parses the raw SMS again server-side as a fallback.
4. It matches pending payments by exact `trx_id`/reference, then by amount
   within the configured tolerance and the pending-order time window.
5. Matched payments are marked **VERIFIED**, a ledger entry is created and the
   customer due is recalculated.
6. Unmatched SMS appears in Admin → bKash Personal → **Unmatched SMS** for
   manual linking.
