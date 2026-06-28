import os
from dotenv import load_dotenv

load_dotenv()

USERNAME = os.getenv("MOJ_USERNAME", "")
PASSWORD = os.getenv("MOJ_PASSWORD", "")

MAX_ODDS = float(os.getenv("MAX_ODDS", "1.08"))
MAX_EVENT_HOURS = int(os.getenv("MAX_EVENT_HOURS", "2"))
BET_FRACTION = float(os.getenv("BET_FRACTION", "0.50"))
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
FALLBACK_BALANCE = float(os.getenv("FALLBACK_BALANCE", "0"))

MOJ_BASE_URL = "https://miseojeuplus.espacejeux.com"
MOJ_SPORTS_URL = f"{MOJ_BASE_URL}/sports/fr/"
MOJ_LIVE_URL = f"{MOJ_BASE_URL}/sports/fr/live"
MOJ_LOGIN_URL = f"{MOJ_BASE_URL}/sports/fr/"  # La connexion se fait via OAuth depuis le site principal
