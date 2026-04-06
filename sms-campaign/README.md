# SMS Campaign – Setup & Usage

## 1. Install dependency
```bash
pip install twilio
```

## 2. Set credentials as environment variables
```bash
export TWILIO_SID=your_account_sid_here
export TWILIO_AUTH=your_auth_token_here
export TWILIO_FROM=your_twilio_phone_number
```

## 3. Fill prospects.csv
Format: `name,phone` — phone must be E.164 (+1XXXXXXXXXX)

## 4. Test without sending (dry run)
Set `DRY_RUN = True` in `send_campaign.py`, then run:
```bash
python send_campaign.py
```

## 5. Send for real
Set `DRY_RUN = False` and run:
```bash
python send_campaign.py
```

Logs saved to `campaign_log.txt`.

## Legal requirements (Canada – CASL)
- Only message people who gave you **express or implied consent**
- Always include an **opt-out mechanism** (STOP)
- Keep a record of consent
