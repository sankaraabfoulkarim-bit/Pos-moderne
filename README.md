# 🏪 Digitale Solution POS — Guide d'installation

Application PWA de point de vente pour commerçants africains.  
Fonctionne **hors ligne**, s'installe sur mobile et desktop.

---

## 📁 Structure des fichiers

```
digitale-pwa/
├── index.html       ← Application complète (fichier unique)
├── manifest.json    ← Métadonnées PWA (icônes, nom, couleurs)
├── sw.js            ← Service Worker (cache offline + sync)
├── icon-192.png     ← Icône PWA petite
├── icon-512.png     ← Icône PWA grande
├── vercel.json      ← Configuration déploiement Vercel
└── README.md        ← Ce fichier
```

---

## 🔥 Étape 1 — Configurer Firebase

### 1.1 Créer le projet

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. **Créer un projet** → donner un nom (ex: `digitale-solution-pos`)
3. Désactiver Google Analytics (optionnel)
4. Cliquer **Créer le projet**

### 1.2 Activer Firestore

1. Dans le menu gauche → **Firestore Database**
2. Cliquer **Créer une base de données**
3. Choisir **Mode production**
4. Sélectionner la région : `europe-west1` (Belgique, proche de l'Afrique de l'Ouest)
5. Cliquer **Activer**

### 1.3 Configurer les règles de sécurité Firestore

Dans **Firestore → Règles**, remplacer le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chaque marchand accède uniquement à ses données
    match /merchants/{merchantId}/{document=**} {
      allow read, write: if true;  // Simplifiée — à renforcer en production
    }
  }
}
```

> ⚠️ Ces règles sont ouvertes pour le développement.  
> En production, renforcez avec une authentification Firebase Auth.

### 1.4 Récupérer les clés Firebase

1. Dans le menu gauche → **Paramètres du projet** (⚙️)
2. Onglet **Général** → section **Vos applications**
3. Cliquer **</>** (application Web)
4. Donner un nom → **Enregistrer l'application**
5. Copier l'objet `firebaseConfig` affiché

### 1.5 Injecter les clés dans index.html

Ouvrir `index.html` et chercher la section :

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "votre-projet.firebaseapp.com",
  projectId:         "votre-projet",
  storageBucket:     "votre-projet.firebasestorage.app",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

Remplacer par **vos propres valeurs** copiées depuis Firebase.

---

## 🚀 Étape 2 — Déployer sur Vercel

### Option A — Via l'interface Vercel (recommandé)

1. Aller sur [vercel.com](https://vercel.com) → créer un compte gratuit
2. Cliquer **Add New Project**
3. Importer depuis GitHub **ou** glisser-déposer le dossier
4. Laisser tous les paramètres par défaut
5. Cliquer **Deploy**
6. Votre app est en ligne en ~30 secondes 🎉

### Option B — Via GitHub

```bash
# 1. Créer un repo GitHub et y pousser les fichiers
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/votre-user/votre-repo.git
git push -u origin main

# 2. Sur Vercel : importer le repo GitHub
# 3. Chaque git push déclenche un redéploiement automatique
```

### Option C — Via CLI Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📱 Étape 3 — Installer la PWA sur mobile

### Android (Chrome)
1. Ouvrir l'URL de l'app dans Chrome
2. Bandeau **"Ajouter à l'écran d'accueil"** → Installer
3. Ou : menu ⋮ → **Ajouter à l'écran d'accueil**

### iPhone / iPad (Safari)
1. Ouvrir l'URL dans **Safari** (obligatoire)
2. Icône partage ↑ → **Sur l'écran d'accueil**
3. Confirmer le nom → Ajouter

### Desktop (Chrome / Edge)
1. Icône d'installation dans la barre d'adresse (📥)
2. Ou : menu → **Installer Digitale Solution**

---

## 🔑 Étape 4 — Première connexion

### Accès Admin développeur
```
https://votre-app.vercel.app/?admin=DIGITALE
```
Mot de passe : `admin2024`

> ⚠️ **À changer immédiatement** dans Admin → Configuration

### Créer le premier commerce
1. Aller sur la page d'accueil de l'app
2. Cliquer **Créer un compte**
3. Remplir les informations du commerce
4. L'abonnement d'essai est de **30 jours**

---

## ⚙️ Configuration avancée

### Variables d'environnement Vercel (optionnel)

Si vous avez un backend API (Supabase/Vercel Functions) :

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_KEY` | Clé service Supabase |
| `API_BASE_URL` | URL base de votre API |

Dans Vercel → **Settings → Environment Variables**

### Changer le token admin

Dans `index.html`, chercher :
```javascript
token: 'DIGITALE',
password_hash: DB._hash('admin2024'),
```

Ou plus simplement : connectez-vous en admin → **Configuration** → modifier le mot de passe.

### Personnaliser les plans tarifaires

Admin → **Plans & Tarifs** pour ajuster :
- Prix mensuel (défaut : 6 000 FCFA)
- Prix trimestriel (défaut : 15 000 FCFA)
- Prix annuel (défaut : 50 000 FCFA)

### Configurer les paiements Mobile Money

Admin → **Configuration** :
- Numéro Orange Money
- Numéro Moov Money
- Numéro WhatsApp support

---

## 🌐 Fonctionnement hors ligne

L'app fonctionne **entièrement sans Internet** grâce à :
- **localStorage** → toutes les données stockées localement
- **Service Worker** → cache des ressources statiques
- **Firebase Offline Persistence** → synchronisation automatique au retour de la connexion

Quand la connexion revient :
- Les ventes effectuées hors ligne se synchronisent automatiquement avec Firebase
- Un badge indique le nombre d'actions en attente de sync

---

## 🔧 Dépannage courant

| Problème | Solution |
|----------|----------|
| Page blanche au chargement | Vider le cache navigateur (Ctrl+Shift+R) |
| Service Worker non mis à jour | DevTools → Application → SW → Update |
| Erreur Firebase "unavailable" | Normal hors ligne — l'app fonctionne quand même |
| Impossible d'installer en PWA | Vérifier que l'URL est en HTTPS |
| Admin inaccessible | Vérifier l'URL : `?admin=DIGITALE` |
| PIN caissier oublié | Admin développeur → Configuration → Réinitialiser PIN |

---

## 📞 Support

WhatsApp : [wa.me/22676127809](https://wa.me/22676127809)  
Email : contact@digitalesolution.bf

---

*Digitale Solution — Point de vente pour commerçants africains*  
*Développé à Ouagadougou, Burkina Faso 🇧🇫*
