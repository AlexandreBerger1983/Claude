"""
Scraper Playwright pour miseojeuplus.espacejeux.com.
Connexion via OAuth Loto-Québec (connexion.lotoquebec.com).

Stratégie d'extraction:
- EN DIRECT : itère sur les onglets de sports visibles (Soccer, Tennis…)
- SPORTS A-Z : itère sur les catégories du menu latéral gauche
- Extraction via JavaScript pour s'adapter au DOM dynamique (SPA React)
"""

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import config

SESSION_FILE = Path("session_cookies.json")

logger = logging.getLogger(__name__)

# Noms de liens à ignorer lors de la découverte des onglets
_NAV_BLACKLIST = {
    "en direct", "résultats", "promotions", "comment jouer",
    "gagnants", "zone experts", "acheter en magasin", "sports a-z",
    "résultats complets", "mes paris", "sports",
}

# Script JavaScript commun pour extraire les paris depuis la page courante
_JS_EXTRACT = """
() => {
    const results = [];

    // Trouver tous les boutons contenant une cote (ex: "1,06" ou "1.98")
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const oddsRe = /^\\d+[,\\.]\\d{2,4}$/;

    const oddsButtons = allButtons.filter(b => {
        const lines = b.innerText.trim().split('\\n').map(s => s.trim()).filter(Boolean);
        return lines.some(l => oddsRe.test(l));
    });

    if (oddsButtons.length === 0) return results;

    // Regrouper par conteneur parent commun (remonter jusqu'à 6 niveaux)
    const containerMap = new Map();
    for (const btn of oddsButtons) {
        let el = btn.parentElement;
        for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
            if (!containerMap.has(el)) containerMap.set(el, new Set());
            containerMap.get(el).add(btn);
        }
    }

    // Garder les conteneurs qui ont au moins 2 boutons de cotes distincts
    const processed = new Set();
    for (const [container, btns] of containerMap.entries()) {
        if (btns.size < 2) continue;

        const containerText = container.innerText || '';
        if (containerText.length < 5 || containerText.length > 3000) continue;

        // Éviter de traiter le même texte deux fois
        const key = containerText.substring(0, 120);
        if (processed.has(key)) continue;
        processed.add(key);

        // Extraire la cote minimale
        const odds = [];
        for (const btn of btns) {
            const lines = btn.innerText.trim().split('\\n').map(s => s.trim());
            for (const line of lines) {
                if (oddsRe.test(line)) {
                    const v = parseFloat(line.replace(',', '.'));
                    if (!isNaN(v) && v >= 1.0 && v <= 100) odds.push(v);
                }
            }
        }
        if (odds.length === 0) continue;
        const minOdds = Math.min(...odds);

        // Chercher l'heure de l'événement dans le texte du conteneur
        // Formats: "20h00", "20:00", "Bientôt", "en cours", "2e", "3e set"
        const timeMatch = containerText.match(/(\\d{1,2})h(\\d{2})|(\\d{1,2}):(\\d{2})/);
        const soonMatch = /bient[oô]t|en cours|live|\\.e\\s/i.test(containerText);

        // ID: data-event-id sur le conteneur ou sur un bouton, sinon hash du texte
        const eventId =
            container.getAttribute('data-event-id') ||
            container.getAttribute('data-id') ||
            [...btns][0].getAttribute('data-selection-id') ||
            [...btns][0].getAttribute('data-id') ||
            key.replace(/\\s+/g, '_').substring(0, 80);

        results.push({
            id: eventId,
            description: containerText.replace(/\\s+/g, ' ').trim().substring(0, 150),
            minOdds: minOdds,
            timeH: timeMatch ? parseInt(timeMatch[1] || timeMatch[3]) : -1,
            timeM: timeMatch ? parseInt(timeMatch[2] || timeMatch[4]) : -1,
            isSoonOrLive: soonMatch,
        });
    }

    return results;
}
"""


class MiseOJeuScraper:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self.page = None

    def start(self, headless: bool = True):
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=headless,
            args=["--ignore-certificate-errors", "--disable-web-security"],
        )
        self._context = self._browser.new_context(
            locale="fr-CA",
            timezone_id="America/Montreal",
            ignore_https_errors=True,
        )
        self.page = self._context.new_page()
        logger.info("Navigateur démarré.")

    def stop(self):
        self._save_session()
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()
        logger.info("Navigateur fermé.")

    # ------------------------------------------------------------------
    # Persistance de session (cookies)
    # ------------------------------------------------------------------

    def _save_session(self):
        try:
            if self._context:
                cookies = self._context.cookies()
                SESSION_FILE.write_text(json.dumps(cookies, ensure_ascii=False), encoding="utf-8")
                logger.debug("Session sauvegardée (%d cookies).", len(cookies))
        except Exception as exc:
            logger.warning("Impossible de sauvegarder la session: %s", exc)

    def _load_session(self) -> bool:
        try:
            if SESSION_FILE.exists():
                cookies = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
                self._context.add_cookies(cookies)
                logger.info("Session précédente restaurée (%d cookies).", len(cookies))
                return True
        except Exception as exc:
            logger.warning("Impossible de charger la session: %s", exc)
        return False

    def is_logged_in(self) -> bool:
        """Vérifie si la session est toujours active sans charger de nouvelle page."""
        try:
            content = self.page.content()
            return any(kw in content for kw in ("Bonjour,", "alexandre", "ALEXANDRE", "Déconnexion"))
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Connexion OAuth avec restauration de session
    # ------------------------------------------------------------------

    def login(self) -> bool:
        if not config.USERNAME or not config.PASSWORD:
            raise ValueError("MOJ_USERNAME et MOJ_PASSWORD doivent être définis dans .env")

        # Tenter de restaurer la session précédente
        self._load_session()

        logger.info("Chargement du site Mise O Jeu+…")
        self.page.goto(config.MOJ_SPORTS_URL, wait_until="domcontentloaded", timeout=30_000)
        self.page.wait_for_timeout(2_000)

        if self.is_logged_in():
            logger.info("Session restaurée — connexion non requise.")
            self._save_session()
            return True

        try:
            logger.info("Clic sur le bouton Connexion…")
            self.page.click('a:has-text("Connexion"), button:has-text("Connexion")', timeout=15_000)
            self.page.wait_for_url("**/connexion.lotoquebec.com/**", timeout=20_000)
            logger.info("Page OAuth Loto-Québec chargée.")

            self.page.fill('input[type="email"], input[name*="user"], input[id*="username"]',
                           config.USERNAME, timeout=10_000)
            self.page.click('button:has-text("Continuer"), button[type="submit"]')

            self.page.wait_for_selector('input[type="password"]', timeout=10_000)
            self.page.fill('input[type="password"]', config.PASSWORD)
            self.page.click('button:has-text("Continuer"), button[type="submit"]')

            self.page.wait_for_url(
                lambda url: "espacejeux.com" in url,
                timeout=30_000,
                wait_until="commit",
            )
            self.page.wait_for_load_state("domcontentloaded", timeout=30_000)
            self._save_session()
            logger.info("Connexion réussie.")
            return True

        except PlaywrightTimeout as exc:
            logger.error("Délai dépassé lors de la connexion: %s", exc)
            return False
        except Exception as exc:
            logger.error("Erreur lors de la connexion: %s", exc)
            return False

    def ensure_logged_in(self) -> bool:
        """Vérifie la session et reconnecte si nécessaire."""
        try:
            self.page.goto(config.MOJ_SPORTS_URL, wait_until="domcontentloaded", timeout=30_000)
            self.page.wait_for_timeout(1_500)
            if self.is_logged_in():
                return True
        except Exception:
            pass
        logger.warning("Session expirée — reconnexion…")
        SESSION_FILE.unlink(missing_ok=True)
        return self.login()

    # ------------------------------------------------------------------
    # Résultats automatiques depuis "Mes paris"
    # ------------------------------------------------------------------

    def fetch_settled_bets(self) -> list[dict]:
        """
        Visite la page historique et retourne les paris réglés (gagnés/perdus).
        Chaque entrée: {description, result: True/False, profit: float}
        """
        settled = []
        try:
            self.page.goto(
                f"{config.MOJ_BASE_URL}/sports/fr/sports/bet-history",
                wait_until="domcontentloaded", timeout=30_000,
            )
            _wait_for_odds(self.page, timeout=15_000)

            raw = self.page.evaluate("""
            () => {
                const results = [];
                // Chercher les éléments qui indiquent gagné/perdu
                const wonRe = /gagn[ée]|won|win/i;
                const lostRe = /perdu|lost|lose/i;
                const amountRe = /[+\\-]?\\d+[,\\.]\\d{2}\\s*\\$/;

                const rows = document.querySelectorAll(
                    '[class*="bet-history"] [class*="row"], '
                    + '[class*="history"] [class*="item"], '
                    + '[class*="ticket"], article'
                );
                for (const row of rows) {
                    const text = row.innerText || '';
                    if (!text.trim()) continue;
                    const won = wonRe.test(text);
                    const lost = lostRe.test(text);
                    if (!won && !lost) continue;
                    const amountMatch = text.match(amountRe);
                    const profit = amountMatch
                        ? parseFloat(amountMatch[0].replace(',', '.').replace('$', '').trim())
                        : null;
                    results.push({
                        description: text.substring(0, 120).replace(/\\s+/g, ' ').trim(),
                        result: won,
                        profit: profit,
                    });
                }
                return results;
            }
            """)
            settled = raw
            logger.info("%d pari(s) réglé(s) trouvé(s) dans l'historique.", len(settled))
        except Exception as exc:
            logger.warning("Impossible de lire l'historique: %s", exc)
        return settled

    # ------------------------------------------------------------------
    # Solde
    # ------------------------------------------------------------------

    def get_balance(self) -> Optional[float]:
        try:
            self.page.wait_for_load_state("networkidle", timeout=20_000)
        except PlaywrightTimeout:
            pass

        for sel in ('[class*="wallet"]', '[class*="credit"]', '[class*="funds"]',
                    '[class*="balance"]', '[class*="solde"]', '[class*="amount"]',
                    'header [class*="money"]', 'header [class*="cash"]'):
            try:
                text = self.page.locator(sel).first.inner_text(timeout=3_000).strip()
                normalized = re.sub(r'[^\d,.]', '', text).replace(",", ".")
                if normalized:
                    b = float(normalized)
                    if 0 < b < 100_000:
                        logger.info("Solde: $%.2f (sélecteur: %s)", b, sel)
                        return b
            except Exception:
                continue

        try:
            for el in self.page.locator('text=/\\d+[,.]\\d+\\s*\\$|\\$\\s*\\d+[,.]\\d+/').all():
                text = el.inner_text(timeout=2_000).strip()
                normalized = re.sub(r'[^\d,.]', '', text).replace(",", ".")
                if normalized:
                    b = float(normalized)
                    if 0 < b < 100_000:
                        logger.info("Solde trouvé par texte: $%.2f", b)
                        return b
        except Exception:
            pass

        logger.warning("Impossible de lire le solde automatiquement.")
        return None

    # ------------------------------------------------------------------
    # Collecte des paris
    # ------------------------------------------------------------------

    def fetch_available_bets(self) -> list[dict]:
        all_bets: list[dict] = []
        seen_ids: set[str] = set()

        def add_bets(bets: list[dict], source: str):
            new = 0
            for b in bets:
                if b["id"] not in seen_ids:
                    seen_ids.add(b["id"])
                    all_bets.append(b)
                    new += 1
            logger.info("  [%s] %d nouveau(x) pari(s).", source, new)

        # 1. EN DIRECT — tous les onglets sport
        logger.info("=== EN DIRECT ===")
        add_bets(self._scrape_live_all_tabs(), "EN DIRECT")

        # 2. Sports à venir — onglets du menu latéral gauche
        logger.info("=== SPORTS A-Z ===")
        sport_urls = self._discover_sidebar_sport_urls()
        for name, url in sport_urls:
            logger.info("Visite: %s", name)
            add_bets(self._extract_from_url(url, is_live=False), name)

        logger.info("TOTAL: %d pari(s) uniques.", len(all_bets))
        return all_bets

    def _scrape_live_all_tabs(self) -> list[dict]:
        """Visite EN DIRECT et clique sur chaque onglet sport."""
        bets: list[dict] = []
        try:
            self.page.goto(config.MOJ_LIVE_URL, wait_until="domcontentloaded", timeout=30_000)
            _wait_for_odds(self.page)

            tabs = self.page.locator(
                '[class*="tab"]:not([class*="betslip"]):not([class*="coupon"]), '
                '[class*="sport-filter"] button, '
                '[class*="category-filter"] button'
            ).all()

            sport_tabs = [t for t in tabs if _is_sport_tab(t)]
            logger.info("%d onglet(s) sport trouvé(s) en EN DIRECT.", len(sport_tabs))

            if sport_tabs:
                for tab in sport_tabs:
                    name = _safe_text(tab)
                    try:
                        tab.click()
                        _wait_for_odds(self.page)
                        tab_bets = self._extract_from_current_page(is_live=True)
                        logger.info("  Onglet '%s': %d pari(s).", name, len(tab_bets))
                        bets.extend(tab_bets)
                    except Exception as exc:
                        logger.warning("  Onglet '%s' ignoré: %s", name, exc)
            else:
                bets = self._extract_from_current_page(is_live=True)

        except Exception as exc:
            logger.warning("Erreur EN DIRECT: %s", exc)

        return bets

    def _discover_sidebar_sport_urls(self) -> list[tuple[str, str]]:
        """
        Récupère les URLs des catégories sport depuis le menu latéral gauche.
        Filtre strictement pour ne garder que miseojeuplus.espacejeux.com/sports/fr/.
        """
        try:
            self.page.goto(config.MOJ_SPORTS_URL, wait_until="domcontentloaded", timeout=30_000)
            _wait_for_odds(self.page)

            links = self.page.locator('a[href*="/sports/fr/"]').all()
            results: list[tuple[str, str]] = []
            seen: set[str] = set()

            for link in links:
                href = (link.get_attribute("href") or "").strip()
                name = _safe_text(link)

                if not href or not name:
                    continue
                if name.lower() in _NAV_BLACKLIST:
                    continue

                full_url = href if href.startswith("http") else f"{config.MOJ_BASE_URL}{href}"

                # Garder uniquement le bon domaine, pas d'URL "résultats" ou historique
                if "espacejeux.com" not in full_url:
                    continue
                skip_keywords = ("result", "bet-history", "en-jeux", "promotion", "login")
                if any(k in full_url for k in skip_keywords):
                    continue
                if full_url in seen:
                    continue

                seen.add(full_url)
                results.append((name, full_url))

            logger.info("Catégories sport trouvées: %s", [n for n, _ in results])
            return results

        except Exception as exc:
            logger.warning("Erreur découverte onglets: %s", exc)
            return []

    def _extract_from_url(self, url: str, is_live: bool) -> list[dict]:
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            _wait_for_odds(self.page)
        except Exception as exc:
            logger.warning("Impossible de charger %s: %s", url, exc)
            return []
        return self._extract_from_current_page(is_live=is_live)

    def _extract_from_current_page(self, is_live: bool) -> list[dict]:
        """Exécute le script JS d'extraction et convertit le résultat."""
        try:
            raw = self.page.evaluate(_JS_EXTRACT)
        except Exception as exc:
            logger.warning("Erreur extraction JS: %s", exc)
            return []

        now = datetime.now(tz=timezone.utc)
        bets: list[dict] = []

        for item in raw:
            if is_live:
                # Un pari en direct est déjà commencé → compte comme "maintenant"
                event_start = now
            else:
                event_start = _parse_event_time(item, now)
                if event_start is None:
                    continue

            bets.append({
                "id": str(item["id"])[:120],
                "description": item["description"][:120],
                "odds": float(item["minOdds"]),
                "event_start": event_start,
                "event_end": None,
                "sport": "inconnu",
                "is_live": is_live,
            })

        return bets

    # ------------------------------------------------------------------
    # Placement du pari
    # ------------------------------------------------------------------

    def place_bet(self, bet_id: str, amount: float) -> bool:
        if config.DRY_RUN:
            logger.info("[DRY_RUN] Pari simulé: id=%s montant=$%.2f", bet_id, amount)
            return True

        logger.info("Placement du pari: id=%s montant=$%.2f", bet_id, amount)
        try:
            btn = self.page.locator(
                f'[data-event-id="{bet_id}"] button, '
                f'[data-id="{bet_id}"] button, '
                f'button[data-selection-id="{bet_id}"]'
            ).first
            btn.click()

            self.page.wait_for_selector('[class*="betslip"], [class*="coupon"]', timeout=10_000)
            self.page.locator(
                '[class*="betslip"] input[type="number"], [class*="coupon"] input[type="number"]'
            ).first.fill(str(round(amount, 2)))

            self.page.locator(
                '[class*="betslip"] button[class*="confirm"], [class*="coupon"] button[class*="place"]'
            ).first.click()
            self.page.wait_for_load_state("networkidle", timeout=10_000)

            logger.info("Pari placé avec succès.")
            return True
        except Exception as exc:
            logger.error("Erreur lors du placement du pari: %s", exc)
            return False


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _wait_for_odds(page, timeout: int = 20_000) -> None:
    """
    Attend que des boutons contenant des cotes (format X,XX ou X.XX)
    soient visibles dans le DOM. Plus fiable qu'un délai fixe sur un SPA.
    Fait défiler la page pour déclencher le chargement paresseux.
    """
    # Attendre que le réseau soit calme
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except PlaywrightTimeout:
        pass

    # Faire défiler pour déclencher le chargement paresseux (lazy loading)
    try:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
        page.wait_for_timeout(800)
        page.evaluate("window.scrollTo(0, 0)")
    except Exception:
        pass

    # Attendre qu'au moins un bouton contenant une cote apparaisse
    try:
        page.wait_for_function(
            """() => {
                const re = /^\\d+[,.]\\d{2,4}$/;
                return Array.from(document.querySelectorAll('button'))
                    .some(b => b.innerText.trim().split('\\n')
                        .some(l => re.test(l.trim())));
            }""",
            timeout=timeout,
        )
        logger.debug("Cotes détectées dans le DOM.")
    except PlaywrightTimeout:
        # Aucune cote visible après le délai — page vide ou hors-saison
        logger.debug("Aucune cote détectée après %dms.", timeout)


def _safe_text(locator) -> str:
    try:
        return locator.inner_text(timeout=2_000).strip()
    except Exception:
        return ""


def _is_sport_tab(locator) -> bool:
    """Retourne True si l'élément ressemble à un onglet sport (texte court, pas de lien externe)."""
    text = _safe_text(locator)
    if not text or len(text) > 30:
        return False
    boring = {"paris simples", "combos", "paramètres", "calculette", "mes paris",
               "vider la calculette", "en direct", "résultats", "sports a-z"}
    return text.lower() not in boring


def _parse_event_time(item: dict, now: datetime) -> Optional[datetime]:
    """
    Construit un datetime pour l'heure de l'événement.
    Retourne None si l'heure est inconnue.
    """
    if item.get("isSoonOrLive"):
        return now  # "Bientôt" ou indicateur live → considéré comme imminent

    h, m = item.get("timeH", -1), item.get("timeM", -1)
    if h < 0 or m < 0:
        return None

    # Construire l'heure pour aujourd'hui (heure locale Montréal → UTC approx)
    candidate = now.replace(hour=h, minute=m, second=0, microsecond=0)
    # Si l'heure est déjà passée, c'est peut-être demain
    if candidate < now:
        candidate += timedelta(days=1)
    return candidate
