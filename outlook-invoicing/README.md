# 📋 Facturation — Calendrier → Factures (Québec)

Application **Streamlit** qui lit les événements d'un calendrier (Apple Calendar,
Outlook, Google, iCloud… via fichier `.ics` ou URL) et génère des **factures PDF
professionnelles** adaptées au Québec (TPS + TVQ, NEQ, devise CAD).

## Fonctionnalités

- 📅 **Import de calendrier** — fichier `.ics` ou URL (Apple, Outlook, Google, iCloud)
- 👥 **Gestion des clients** — saisie manuelle ou **import depuis Sage 50 Canada** (CSV / Excel)
- 📄 **Factures PDF** — TPS (5 %) et TVQ (9,975 %) séparées, NEQ, logo d'entreprise
- 🧾 **Historique des factures** — statut *Payée / En attente / En retard*, re-téléchargement du PDF
- ⚠️ **Anti-double facturation** — les événements déjà facturés sont décochés automatiquement
- 📊 **Tableau de bord** — revenus et heures par mois / par client, TPS+TVQ facturées
- 📤 **Export vers Sage 50** — fiches de temps en CSV (séparateur et format de date configurables)
- 💾 **Sauvegarde / restauration** — export/import de toute la configuration en JSON

## Déploiement sur Streamlit Community Cloud (gratuit)

L'application est un serveur Python : elle **ne peut pas** tourner sur GitHub Pages
(qui ne sert que des fichiers statiques). Utilisez Streamlit Community Cloud :

1. Allez sur **[share.streamlit.io](https://share.streamlit.io)** et connectez votre compte GitHub.
2. Cliquez sur **New app** puis renseignez :
   - **Repository** : `AlexandreBerger1983/Claude`
   - **Branch** : `claude/outlook-client-invoicing-auyid1`
   - **Main file path** : `outlook-invoicing/app.py`
3. Cliquez sur **Deploy**. Vous obtenez une URL publique du type
   `https://<nom-choisi>.streamlit.app`.

> ⚠️ **Persistance des données** — Sur Streamlit Cloud, le système de fichiers est
> **réinitialisé à chaque redéploiement**. Vos clients, factures et logo sont stockés
> dans `invoice_config.json` (local) et seront perdus lors d'un redéploiement.
> **Exportez régulièrement une sauvegarde** via *Paramètres → Exporter la configuration*,
> et restaurez-la après un redéploiement.

## Lancer en local

```bash
cd outlook-invoicing
pip install -r requirements.txt
streamlit run app.py
```

Ouvrez ensuite http://localhost:8501 dans votre navigateur.

### Accès depuis un autre appareil du réseau local (Windows)

Autorisez le port 8501 dans le pare-feu (PowerShell **Administrateur**) :

```powershell
New-NetFirewallRule -DisplayName "Streamlit 8501" -Direction Inbound -Protocol TCP -LocalPort 8501 -Action Allow
```

L'app est alors accessible à `http://<votre-IP-locale>:8501` (ex. `http://192.168.1.4:8501`).

## Convention de nommage des événements

Pour que le client soit détecté automatiquement, nommez vos événements ainsi :

```
[NomClient] Description de la prestation
```

Exemple : `[Acme Corp] Développement API REST` →
Client : **Acme Corp**, Description : *Développement API REST*.
