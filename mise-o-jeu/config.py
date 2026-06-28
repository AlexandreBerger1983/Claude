import os
from dotenv import load_dotenv

load_dotenv()

USERNAME = os.getenv("MOJ_USERNAME", "")
PASSWORD = os.getenv("MOJ_PASSWORD", "")

MAX_ODDS = float(os.getenv("MAX_ODDS", "1.02"))
MAX_EVENT_HOURS = int(os.getenv("MAX_EVENT_HOURS", "24"))
BET_FRACTION = float(os.getenv("BET_FRACTION", "0.50"))
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"

MOJ_BASE_URL = "https://www.miseojeu.com"
MOJ_LOGIN_URL = f"{MOJ_BASE_URL}/fr/mon-compte/connexion"
MOJ_SPORTS_URL = f"{MOJ_BASE_URL}/fr/sports"
