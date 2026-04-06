"""
Twilio SMS Campaign Script
--------------------------
Usage:
  1. pip install twilio
  2. Fill prospects.csv with name,phone columns
  3. Set your credentials via environment variables (recommended):
       export TWILIO_SID=ACxxxxxxxx
       export TWILIO_AUTH=xxxxxxxxxx
       export TWILIO_FROM=+1XXXXXXXXXX
  4. Run: python send_campaign.py

Note: Phone numbers must be in E.164 format (+1XXXXXXXXXX)
"""

import csv
import os
import time
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# ── Credentials (use env vars in production) ──────────────────────────────────
ACCOUNT_SID = os.environ["TWILIO_SID"]    # export TWILIO_SID=ACxxxx
AUTH_TOKEN  = os.environ["TWILIO_AUTH"]   # export TWILIO_AUTH=xxxx
FROM_NUMBER = os.environ["TWILIO_FROM"]   # export TWILIO_FROM=+1XXXXXXXXXX

# ── Campaign settings ─────────────────────────────────────────────────────────
PROSPECTS_FILE  = "prospects.csv"
DELAY_BETWEEN   = 1       # seconds between messages (avoid rate limits)
DRY_RUN         = False   # set True to preview without sending

# ── Message template (personalized per recipient) ─────────────────────────────
def build_message(name: str) -> str:
    return (
        f"Bonjour {name}! 👋 "
        "Profitez de notre offre spéciale : lavage de vitres, nettoyage de gouttières "
        "et pavés à Laval, Terrebonne & Saint-Jérôme. "
        "Obtenez votre soumission gratuite ➜ https://fouadaberkane37.github.io "
        "Répondez STOP pour vous désabonner."
    )

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("campaign_log.txt"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

# ── Main ──────────────────────────────────────────────────────────────────────
def run_campaign():
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    sent = failed = skipped = 0

    with open(PROSPECTS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        prospects = list(reader)

    log.info(f"Starting campaign — {len(prospects)} prospects | DRY_RUN={DRY_RUN}")

    for row in prospects:
        name  = row.get("name", "").strip()
        phone = row.get("phone", "").strip()

        if not phone.startswith("+"):
            log.warning(f"Skipping {name} — invalid number format: {phone}")
            skipped += 1
            continue

        body = build_message(name)

        if DRY_RUN:
            log.info(f"[DRY RUN] To: {phone} | {body}")
            sent += 1
            continue

        try:
            msg = client.messages.create(
                body=body,
                from_=FROM_NUMBER,
                to=phone,
            )
            log.info(f"Sent to {name} ({phone}) — SID: {msg.sid}")
            sent += 1
        except TwilioRestException as e:
            log.error(f"Failed for {name} ({phone}): {e}")
            failed += 1

        time.sleep(DELAY_BETWEEN)

    log.info(f"Campaign done — Sent: {sent} | Failed: {failed} | Skipped: {skipped}")

if __name__ == "__main__":
    run_campaign()
