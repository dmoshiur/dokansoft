#!/usr/bin/env python3
"""
gateway_phone.py — bKash Personal SMS Relay for Termux

Runs on the admin's own Android phone (Termux) and forwards bKash
confirmation SMS to the Dokansoft/Lovely ERP backend webhook.

Prerequisites (install inside Termux):
    pkg update && pkg install python
    pkg install termux-api
    pip install requests

Setup:
    1. Copy config.example.json to config.json.
    2. Fill webhook_url (must be HTTPS) and webhook_token (from the admin
       Payment Gateway page).
    3. Run:  python gateway_phone.py
       (Optionally keep it running in background with nohup/termux-wake-lock.)

The script is intentionally lightweight: it polls `termux-sms-list`
(provided by termux-api), parses bKash SMS, POSTs to the webhook with a
Bearer token, and keeps a local retry queue until the server acknowledges.
"""

import json
import logging
import os
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:  # pragma: no cover
    print("Missing dependency: requests. Run: pip install requests")
    sys.exit(1)

BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "config.json"
QUEUE_PATH = BASE_DIR / "pending_queue.json"
LOG_PATH = BASE_DIR / "gateway.log"

DEFAULT_CONFIG = {
    "webhook_url": "https://yourdomain.com/api/gateway/bkash/incoming-sms",
    "webhook_token": "xxxxxxxx",
    "sender_filter": "bKash",
    "poll_interval_seconds": 5,
}

logging.basicConfig(
    filename=str(LOG_PATH),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("gateway_phone")


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
        logger.info("Created default config.json - please edit it before running.")
        print("Created default config.json. Edit it with your webhook settings.")
        sys.exit(1)
    cfg = json.loads(CONFIG_PATH.read_text())
    url = cfg.get("webhook_url", "")
    if not url.startswith("https://"):
        raise ValueError("webhook_url must use HTTPS.")
    if not cfg.get("webhook_token"):
        raise ValueError("webhook_token is missing.")
    return cfg


def load_queue() -> list:
    if QUEUE_PATH.exists():
        try:
            return json.loads(QUEUE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            return []
    return []


def save_queue(queue: list):
    QUEUE_PATH.write_text(json.dumps(queue, indent=2))


def get_sms_list() -> list:
    """Return the latest SMS list from termux-sms-list as a list of dicts."""
    try:
        result = subprocess.run(
            ["termux-sms-list", "-l", "20", "-n", "5"],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return []
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as exc:
        logger.warning("termux-sms-list unavailable: %s", exc)
        return []


def parse_bkash_sms(raw: str) -> dict:
    """Best-effort parser for common bKash cash-in confirmation SMS formats."""
    data: dict = {"raw_message": raw}
    amount = re.search(r"(?:Tk|TK|BDT|৳|Taka|Amount)[.\s:]*([\d,]+(?:\.\d{1,2})?)", raw)
    if amount:
        data["amount"] = amount.group(1)

    trx = re.search(r"(?:TrxID|Trx ID|Transaction[.\s]*ID|TxID)[:\s]*([A-Z0-9]{6,30})", raw)
    if trx:
        data["trx_id"] = trx.group(1).upper()

    sender = re.search(r"(?:From|Sender)[:\s]*(\+?88)?(01[3-9]\d{8})", raw)
    if sender:
        data["sender_number"] = (sender.group(1) or "") + sender.group(2)

    ref = re.search(r"(?:Ref|Reference|Note)[:\s]*([A-Za-z0-9-]{4,40})", raw)
    if ref:
        data["reference"] = ref.group(1)

    return data


def post_payload(cfg: dict, payload: dict) -> bool:
    """POST the payload. Returns True only when HTTP 200 is returned."""
    try:
        resp = requests.post(
            cfg["webhook_url"],
            json=payload,
            headers={"Authorization": "Bearer {}".format(cfg["webhook_token"])},
            timeout=15,
        )
        logger.info("POST -> %s, HTTP %s, body: %s", cfg["webhook_url"], resp.status_code, resp.text[:300])
        return resp.status_code == 200
    except requests.RequestException as exc:
        logger.warning("POST failed: %s", exc)
        return False


def main():
    print("=== gateway_phone.py — bKash SMS Relay ===")
    cfg = load_config()
    filter_sender = cfg.get("sender_filter", "bKash").strip()
    interval = int(cfg.get("poll_interval_seconds", 5))
    logger.info("Started. Webhook: %s", cfg["webhook_url"])

    seen = set()
    queue = load_queue()

    # Drain any locally queued messages from previous runs.
    if queue:
        logger.info("Recovering %d pending payloads from local queue.", len(queue))

    while True:
        # 1. Send queued retries first.
        remaining = []
        for payload in queue:
            if post_payload(cfg, payload):
                logger.info("Queued payload acknowledged and removed.")
            else:
                remaining.append(payload)
        queue = remaining
        save_queue(queue)

        # 2. Poll new SMS.
        for sms in get_sms_list():
            sms_id = sms.get("id") or sms.get("_id") or hash(str(sms))
            if sms_id in seen:
                continue
            seen.add(sms_id)

            sender = sms.get("sender") or sms.get("from") or sms.get("number") or ""
            raw = sms.get("body") or sms.get("text") or sms.get("message") or ""
            if not raw or filter_sender and filter_sender.lower() not in sender.lower():
                continue

            logger.info("Matched SMS from %s: %s", sender, raw[:200])
            payload = parse_bkash_sms(raw)
            payload["received_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

            # Retry up to 3 times; if still failing, keep it in the local queue.
            ok = False
            for attempt in range(3):
                if post_payload(cfg, payload):
                    ok = True
                    break
                time.sleep(2 * (attempt + 1))
            if not ok:
                queue.append(payload)
                save_queue(queue)
                logger.warning("Payload retained in pending_queue.json for retry.")

        time.sleep(interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped.")
