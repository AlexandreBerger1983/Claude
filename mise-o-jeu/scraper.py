"""
Scraper Playwright pour miseojeuplus.espacejeux.com.
Connexion via OAuth Loto-Québec (connexion.lotoquebec.com).
"""

import logging
import re
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
        self._browser = self._playwright.chromium.launch(
            headless=headless,
            args=["--ignore-certificate-errors", "--disable-web-security"],
        )
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

        logger.info("Chargement du site Mise O Jeu+…")
        self.page.goto(config.MOJ_SPORTS_URL, wait_until="domcontentloaded", timeout=30_000)

        try:
            # Cliquer sur le bouton "Connexion" en haut à droite
            logger.info("Clic sur le bouton Connexion…")
            self.page.click('a:has-text("Connexion"), button:has-text("Connexion")', timeout=15_000)

            # Attendre la page OAuth de Loto-Québec
            self.page.wait_for_url("**/connexion.lotoquebec.com/**", timeout=20_000)
            logger.info("Page OAuth Loto-Québec chargée.")

            # Étape 1 : courriel ou nom d'utilisateur
            self.page.fill('input[type="email"], input[name*="user"], input[id*="username"]', config.USERNAME, timeout=10_000)
            self.page.click('button:has-text("Continuer"), button[type="submit"]')

            # Étape 2 : mot de passe (parfois sur une deuxième page)
            self.page.wait_for_selector('input[type="password"]', timeout=10_000)
            self.page.fill('input[type="password"]', config.PASSWORD)
            self.page.click('button:has-text("Continuer"), button[type="submit"]')

            # Attendre le retour sur le site principal
            self.page.wait_for_url("**/espacejeux.com/**", timeout=30_000)
            logger.info("Connexion réussie.")
            return True

        except PlaywrightTimeout as exc:
            logger.error("Délai dépassé lors de la connexion: %s", exc)
            logger.error("URL courante: %s", self.page.url)
            return False
        except Exception as exc:
            logger.error("Erreur lors de la connexion: %s", exc)
            return False

    def get_balance(self) -> Optional[float]:
        """Retourne le solde du compte en dollars."""
        try:
            balance_text = self.page.locator(
                '[class*="balance"], [class*="solde"], [class*="amount"], [data-testid*="balance"]'
            ).first.inner_text(timeout=10_000)
            balance = float(re.sub(r'[^\d.]', '', balance_text.replace(",", ".")))
            logger.info("Solde: $%.2f", balance)
            return balance
        except Exception as exc:
            logger.warning("Impossible de lire le solde: %s", exc)
            return None

    def fetch_available_bets(self) -> list[dict]:
        """Retourne les paris disponibles depuis la page sports."""
        logger.info("Récupération des paris disponibles…")
        self.page.goto(config.MOJ_SPORTS_URL, wait_until="domcontentloaded", timeout=30_000)

        bets = []
        try:
            self.page.wait_for_selector(
                '[class*="event"], [class*="match"], [class*="game"], [class*="selection"]',
                timeout=20_000,
            )
            cards = self.page.locator(
                '[class*="event-card"], [class*="match-card"], [class*="game-row"], [class*="event-row"]'
            ).all()
            logger.info("%d événements trouvés.", len(cards))
            for card in cards:
                bet = _parse_event_card(card)
                if bet:
                    bets.append(bet)
        except PlaywrightTimeout:
            logger.warning("Délai dépassé lors de la récupération des paris.")

        return bets

    def place_bet(self, bet_id: str, amount: float) -> bool:
        if config.DRY_RUN:
            logger.info("[DRY_RUN] Pari simulé: id=%s montant=$%.2f", bet_id, amount)
            return True

        logger.info("Placement du pari: id=%s montant=$%.2f", bet_id, amount)
        try:
            odds_btn = self.page.locator(
                f'[data-event-id="{bet_id}"] [class*="odds"], [data-id="{bet_id}"]'
            ).first
            odds_btn.click()

            self.page.wait_for_selector('[class*="betslip"], [class*="coupon"]', timeout=10_000)
            amount_input = self.page.locator(
                '[class*="betslip"] input[type="number"], [class*="coupon"] input[type="number"]'
            ).first
            amount_input.fill(str(round(amount, 2)))

            confirm_btn = self.page.locator(
                '[class*="betslip"] button[class*="confirm"], [class*="coupon"] button[class*="place"]'
            ).first
            confirm_btn.click()
            self.page.wait_for_load_state("networkidle", timeout=10_000)

            logger.info("Pari placé avec succès.")
            return True
        except Exception as exc:
            logger.error("Erreur lors du placement du pari: %s", exc)
            return False


def _parse_event_card(card) -> Optional[dict]:
    try:
        text = card.inner_text()

        odds_matches = re.findall(r'\b(1\.\d{2,4}|[12]\.\d{2,4})\b', text)
        if not odds_matches:
            return None
        odds = float(odds_matches[0])

        date_match = re.search(
            r'(\d{1,2})\s+(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)[a-z]*\.?\s+(\d{4})[\s,]+(\d{1,2}):(\d{2})',
            text, re.IGNORECASE,
        )
        if not date_match:
            return None

        month_map = {
            'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5,
            'juin': 6, 'juil': 7, 'août': 8, 'sept': 9, 'oct': 10,
            'nov': 11, 'déc': 12,
        }
        event_start = datetime(
            int(date_match.group(3)),
            month_map.get(date_match.group(2).lower()[:4].rstrip('.'), 1),
            int(date_match.group(1)),
            int(date_match.group(4)),
            int(date_match.group(5)),
            tzinfo=timezone.utc,
        )

        event_id = (
            card.get_attribute("data-event-id")
            or card.get_attribute("data-id")
            or str(hash(text[:80]))
        )

        return {
            "id": event_id,
            "description": text[:100].strip().replace("\n", " "),
            "odds": odds,
            "event_start": event_start,
            "event_end": None,
            "sport": "inconnu",
        }
    except Exception:
        return None
