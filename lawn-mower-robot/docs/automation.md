# Automatisation & notifications (Blocs 4-5) - Johnny-Mow

Pour qu'un robot au chalet fonctionne **sans intervention** : tâches
programmées, gestion de la pluie, et alertes à distance.

---

## Planificateur

Déclenche automatiquement la tonte et la gestion des poubelles selon un
horaire. Configuré dans `robot.yaml` :

```yaml
scheduler:
  enabled: true
  tasks:
    mow:
      days: ["mar", "ven"]   # mardi et vendredi
      at: "10:00"
      skip_if_rain: true     # reporte s'il pleut
    trash_out:
      days: ["mer"]          # veille de collecte, au soir
      at: "19:00"
    trash_in:
      days: ["jeu"]          # jour de collecte
      at: "18:00"
```

Jours acceptés : `lun mar mer jeu ven sam dim` (ou `mon tue wed…`).
Une tâche ne se déclenche qu'**une fois par jour**, à l'heure prévue ou après.

---

## Poubelles automatiques

Séquence complète cabanon → bord de rue → cabanon, avec navigation GPS RTK.

1. Relever les coordonnées GPS du **bord de rue** et du **cabanon** (via
   l'éditeur de zone `/zone`, bouton « Ajouter position actuelle » en plaçant
   le robot à chaque endroit).
2. Les inscrire dans `robot.yaml` :

```yaml
trash:
  curb: {lat: 45.5017, lon: -73.5673}   # bord de rue
  shed: {lat: 45.5019, lon: -73.5675}   # rangement
```

Déclenchement : automatique (planificateur) ou manuel via les boutons
« Sortir / Rentrer » de l'interface.

> Sans GPS, seules les séquences de bras s'exécutent ; le déplacement se pilote
> alors manuellement à distance.

---

## Capteur de pluie

Capteur de pluie numérique (~3 $) sur un GPIO. Empêche la tonte sur gazon
mouillé (mauvais pour la pelouse et la traction).

```yaml
sensors:
  rain_sensor: 8    # GPIO (sortie numérique, 0 = pluie)
```

---

## Notifications à distance

Alertes sur les événements importants : tâche terminée, danger de sécurité,
robot coincé, batterie faible (Bloc 3), erreurs.

```yaml
notifications:
  enabled: true
  channels: ["email"]        # "email", "sms", "webhook"
  min_level: "info"          # info | warning | critical
  email:
    smtp_host: "smtp.gmail.com"
    smtp_port: 587
    username: "vous@gmail.com"
    password: "mot-de-passe-application"
    to: "vous@email.com"
    sms_to: "5145551234@msg.telus.com"   # passerelle SMS de l'opérateur
  webhook:
    url: "https://discord.com/api/webhooks/..."   # Discord/Slack/domotique
```

### Gmail
Utiliser un **mot de passe d'application** (pas le mot de passe du compte) :
compte Google → Sécurité → Validation en 2 étapes → Mots de passe des
applications.

### SMS gratuit
Beaucoup d'opérateurs offrent une passerelle courriel→SMS :
| Opérateur | Adresse |
|-----------|---------|
| Telus / Koodo | `numero@msg.telus.com` |
| Bell | `numero@txt.bell.ca` |
| Rogers / Fido | `numero@pcs.rogers.com` |
| Vidéotron | `numero@vmobile.ca` |

### Webhook
N'importe quel service acceptant un POST JSON (Discord, Slack, Telegram via
bot, Home Assistant). Le payload contient `content`/`text`/`title`/`message`/`level`.

Anti-spam : chaque type d'événement est limité par `cooldown_seconds`.
