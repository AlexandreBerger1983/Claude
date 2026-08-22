# Accès distant sécurisé - Johnny-Mow

Pour piloter le robot depuis chez toi vers un chalet à distance, il faut :
1. une **authentification** sur l'interface (fait — voir plus bas),
2. un **tunnel sécurisé** vers le réseau du chalet (VPN),
3. idéalement du **HTTPS**.

> ⚠️ **Ne jamais ouvrir de port (port-forwarding) sur la box du chalet** pour
> exposer le robot sur internet. Une lame + des moteurs pilotables par
> n'importe qui = danger réel. Toujours passer par un VPN.

---

## 1. Authentification (déjà en place)

L'interface exige un identifiant et un mot de passe. Configurer dans
`config/robot.yaml` :

```yaml
web:
  secret_key: "<clé unique - voir ci-dessous>"
  auth:
    username: "admin"
    password_hash: "<hash - voir ci-dessous>"
```

Générer la clé de session :
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Générer le hash du mot de passe (ne pas stocker le mot de passe en clair) :
```bash
python -c "from werkzeug.security import generate_password_hash as g; print(g('MON_MOT_DE_PASSE'))"
```

Protections incluses :
- Toutes les pages ET les WebSocket exigent une session valide
- Verrouillage de l'IP après 5 échecs (5 min) contre la force brute
- Cookies `HttpOnly` + `SameSite=Lax`

---

## 2. VPN — Tailscale (recommandé, gratuit, le plus simple)

Tailscale crée un réseau privé entre tes appareils, sans configuration de box.

### Sur le Raspberry Pi (au chalet)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Noter le nom/IP Tailscale du Pi (ex. `100.x.y.z` ou `robot.tail-xxxx.ts.net`).

### Sur ton téléphone / ordinateur (à la maison)
Installer l'app Tailscale, se connecter au **même compte**.

### Accès
Ouvrir simplement :
```
http://robot.tail-xxxx.ts.net:5000
```
Ça fonctionne de n'importe où, comme si tu étais sur le réseau du chalet.

> Avec Tailscale, tu peux même activer **HTTPS automatique** :
> `sudo tailscale cert` + `tailscale serve`, ce qui donne une URL
> `https://robot.tail-xxxx.ts.net`. Renseigner alors `allowed_origins`
> dans la config avec cette URL.

---

## 3. VPN — WireGuard (alternative auto-hébergée)

Plus de contrôle, mais nécessite un point d'entrée avec IP publique/DDNS.
Utiliser [PiVPN](https://pivpn.io) pour installer WireGuard sur le Pi :
```bash
curl -L https://install.pivpn.io | bash
pivpn add        # crée un profil client
pivpn -qr        # QR code pour l'app mobile WireGuard
```

---

## 4. Connectivité au chalet

| Situation | Solution |
|-----------|----------|
| Wi-Fi fiable au chalet | Tailscale sur le Pi via Wi-Fi |
| Wi-Fi faible dehors | Antenne Wi-Fi USB + point d'accès extérieur |
| Pas de Wi-Fi / peu fiable | **Clé 4G/LTE USB** ou routeur cellulaire ; Tailscale fonctionne par-dessus la 4G |

> Prévoir un forfait data : le flux vidéo consomme (~0,3–1 Go/h selon la
> qualité). Baisser `camera.stream_quality` et couper la vidéo quand elle
> n'est pas nécessaire pour économiser.

---

## Récapitulatif de mise en route

1. Générer `secret_key` + `password_hash`, les mettre dans `robot.yaml`
2. Installer Tailscale sur le Pi et sur ton appareil
3. Vérifier l'accès local : `http://<ip-pi>:5000` → page de connexion
4. Vérifier l'accès distant : `http://robot.tail-xxxx.ts.net:5000`
5. (Option) Activer HTTPS via `tailscale serve`
