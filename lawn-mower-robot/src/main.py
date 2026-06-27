#!/usr/bin/env python3
"""Point d'entrée principal du robot tondeuse/poubelles."""
import signal
import sys

from src.utils import get_config, logger


def main():
    # Import tardif pour éviter l'init GPIO au démarrage du module
    from src.web.server import run as web_run

    cfg = get_config()
    web_cfg = cfg.get("web", {})
    host = web_cfg.get("host", "0.0.0.0")
    port = web_cfg.get("port", 5000)

    logger.info(f"=== Johnny-Mow démarrage sur {host}:{port} ===")
    web_run(host=host, port=port)


if __name__ == "__main__":
    main()
