"""
Scraper Playwright pour miseojeu.com.
Gère la connexion, la récupération du solde et la liste des paris disponibles.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from playwright.sync_api import Page, sync_playwright, TimeoutError as PlaywrightTimeout

import config

logger = logging.getLogger(__name__)


class MiseOJeuScraper:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self.page: Optional[Page] = None

    def start(self, headless: bool = True):
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=headless)
        context = self._browser.new_context(
            locale="fr-CA",
            timezone_id="America/Montreal",
            ignore_https_errors=True,
        )
        self.page = context.new_page()
        logger.info("Navigateur démarré.")

    def stop(self):
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()
        logger.info("Navigateur fermé.")

    def login(self) -> bool:
        if not config.USERNAME or not config.PASSWORD:
            raise ValueError("MOJ_USERNAME et MOJ_PASSWORD doivent être définis dans .env")

        logger.info("Connexion à Mise O Jeu…")
        self.page.goto(config.MOJ_LOGIN_URL, wait_until="networkidle")

        try:
            self.page.fill('input[name="username"], input[id*="username"], input[type="email"]', config.USERNAME)
            self.page.fill('input[name="password"], input[id*="password"], input[type="password"]', config.PASSWORD)
            self.page.click('button[type="submit"], input[type="submit"]')
            self.page.wait_for_load_state("networkidle", timeout=15_000)
        except PlaywrightTimeout:
            logger.error("Délai dépassé lors de la connexion.")
            return False

        if "connexion" in self.page.url or "login" in self.page.url:
            logger.error("Échec de la connexion — vérifiez vos identifiants.")
            return False

        logger.info("Connexion réussie.")
        return True

    def get_balance(self) -> Optional[float]:
        """Retourne le solde du compte en dollars."""
        try:
            self.page.goto(config.MOJ_BASE_URL, wait_until="networkidle")
            # Le solde est affiché dans un élément contenant "$" ou "solde"
            balance_el = self.page.locator(
                '[class*="balance"], [class*="solde"], [data-testid*="balance"]'
            ).first
            balance_text = balance_el.inner_text(timeout=10_000)
            balance = float(balance_text.replace("$", "").replace(",", ".").replace(" ", "").strip())
            logger.info("Solde: $%.2f", balance)
            return balance
        except Exception as exc:
            logger.warning("Impossible de lire le solde: %s", exc)
            return None

    def fetch_available_bets(self) -> list[dict]:
        """
        Retourne la liste de tous les paris disponibles sous forme de dicts:
        {
            'id': str,
            'description': str,
            'odds': float,          # cote décimale (ex: 1.015)
            'event_start': datetime,
            'event_end': datetime,  # None si inconnu
            'sport': str,
        }
        """
        logger.info("Récupération des paris disponibles…")
        self.page.goto(config.MOJ_SPORTS_URL, wait_until="networkidle")

        bets = []
        try:
            # Attendre que les éléments de paris soient chargés
            self.page.wait_for_selector('[class*="event"], [class*="match"], [class*="game"]', timeout=15_000)

            event_cards = self.page.locator('[class*="event-card"], [class*="match-card"], [class*="game-row"]').all()
            logger.info("%d événements trouvés.", len(event_cards))

            for card in event_cards:
                bet = _parse_event_card(card)
                if bet:
                    bets.append(bet)

        except PlaywrightTimeout:
            logger.warning("Délai dépassé lors de la récupération des paris.")

        return bets

    def place_bet(self, bet_id: str, amount: float) -> bool:
        """
        Place un pari. En mode DRY_RUN, simule seulement.
        Retourne True si le pari a été placé avec succès.
        """
        if config.DRY_RUN:
            logger.info("[DRY_RUN] Pari simulé: id=%s montant=$%.2f", bet_id, amount)
            return True

        logger.info("Placement du pari: id=%s montant=$%.2f", bet_id, amount)
        try:
            # Cliquer sur la cote pour l'ajouter au coupon
            odds_btn = self.page.locator(f'[data-event-id="{bet_id}"] [class*="odds"], [data-id="{bet_id}"]').first
            odds_btn.click()

            # Remplir le montant dans le coupon de paris
            self.page.wait_for_selector('[class*="betslip"], [class*="coupon"]', timeout=10_000)
            amount_input = self.page.locator('[class*="betslip"] input[type="number"], [class*="coupon"] input[type="number"]').first
            amount_input.fill(str(round(amount, 2)))

            # Confirmer le pari
            confirm_btn = self.page.locator('[class*="betslip"] button[class*="confirm"], [class*="coupon"] button[class*="place"]').first
            confirm_btn.click()
            self.page.wait_for_load_state("networkidle", timeout=10_000)

            logger.info("Pari placé avec succès.")
            return True

        except Exception as exc:
            logger.error("Erreur lors du placement du pari: %s", exc)
            return False


def _parse_event_card(card) -> Optional[dict]:
    """Extrait les informations d'une carte d'événement Playwright."""
    try:
        text = card.inner_text()

        # Extraire la cote — cherche un nombre décimal entre 1.00 et 2.00
        import re
        odds_matches = re.findall(r'\b(1\.\d{2,4}|[12]\.\d{2,4})\b', text)
        if not odds_matches:
            return None
        odds = float(odds_matches[0])

        # Extraire la date/heure de début (format québécois: "28 juin 2026 20:00")
        date_match = re.search(
            r'(\d{1,2})\s+(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)[a-z]*\.?\s+(\d{4})[\s,]+(\d{1,2}):(\d{2})',
            text, re.IGNORECASE
        )
        if not date_match:
            return None

        month_map = {
            'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5,
            'juin': 6, 'juil': 7, 'août': 8, 'sept': 9, 'oct': 10,
            'nov': 11, 'déc': 12,
        }
        day = int(date_match.group(1))
        month = month_map.get(date_match.group(2).lower()[:4].rstrip('.'), 1)
        year = int(date_match.group(3))
        hour = int(date_match.group(4))
        minute = int(date_match.group(5))
        event_start = datetime(year, month, day, hour, minute, tzinfo=timezone.utc)

        # ID unique — tenter data-event-id sinon utiliser le texte haché
        event_id = card.get_attribute("data-event-id") or card.get_attribute("data-id") or str(hash(text[:80]))

        description = text[:100].strip().replace("\n", " ")

        return {
            "id": event_id,
            "description": description,
            "odds": odds,
            "event_start": event_start,
            "event_end": None,
            "sport": "inconnu",
        }

    except Exception:
        return None
