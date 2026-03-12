# Real-Time Chat Application

Une application de messagerie en temps réel construite avec **React**, **Express**, et **Socket.IO**. L'historique des messages est sauvegardé dans un fichier local `messages.json`.


## Architecture & composants

Cette application est organisée en deux grandes couches en communication via WebSocket :

- **Backend** : un serveur Node.js/Express responsable de la logique applicative, de la gestion des salles, des utilisateurs connectés et de l'enregistrement des messages dans des fichiers JSON.
- **Frontend** : une interface React construite avec Vite qui se connecte au serveur Socket.IO‑Client pour envoyer/recevoir des messages et afficher l'état de la discussion.

## Bibliothèques principales

| Côté | Librairies clés | Usage |
|------|-----------------|-------|
| Backend | `express`, `socket.io`, `multer` | Serveur HTTP, communication temps réel, gestion des uploads d'images |
| Frontend | `react`, `socket.io-client`, `@radix-ui/react-avatar`, `emoji-picker-react` | UI réactive, sockets, avatars et sélection d'émojis |


## Fonctionnalités principales

- Envoi/réception de messages en temps réel entre plusieurs clients.
- Salles de discussion multiples avec titres et thèmes.
- Gestion des utilisateurs en ligne.
- Épingler/désépingler des messages.
- Upload et affichage d'images.
- Persistance simple des messages et des salons via fichiers JSON.

## Rôle du frontend et du backend

- Le **backend** expose les endpoints REST nécessaires (upload) et conserve l'état des salons/messages. Il émet également des événements Socket.IO (`chat message`, `rooms list`, etc.) qu'il reçoit et retransmet à tous les clients.
- Le **frontend** gère l'expérience utilisateur : formulaire de saisie, affichage des messages, gestion des états locaux (utilisateur, salon courant, thème, etc.) et consomme les événements Socket.IO envoyés par le serveur.

##  Structure du projet

Le projet est divisé en deux parties principales :
- **Serveur (Backend)** : À la racine du projet (Node.js, Express, Socket.IO). Il gère les connexions en temps réel et sauvegarde l'historique des conversations.
- **Client (Frontend)** : Dans le dossier `/client` (React, Vite, Socket.IO-Client). C'est l'interface utilisateur.

Un aperçu de l'arborescence :

```
Projet-Chat-main/
│   index.js
│   messages.json
│   rooms.json
│   package.json
│   README.md
│   LICENSE
│   uploads/
│
├── client/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
└── ...
```

---



##  Comment lancer l'application

Pour faire fonctionner l'application, vous devez démarrer le serveur ET le client en même temps, chacun dans son propre terminal.

### Étape 1 : Démarrer le Serveur (Backend)

1. Ouvrez un terminal à la racine du projet (dans le dossier `projet-chat`).
2. Installez les dépendances serveur (si ce n'est pas déjà fait) :
   ```bash
   npm install
   ```
   *Aucune configuration d'environnement n'est requise.*
3. Démarrez le serveur :
   ```bash
   npm start
   ```
   *Le terminal devrait indiquer que le serveur est lancé (par défaut sur le port 3000).*

### Étape 2 : Démarrer le Client (Frontend)

1. Ouvrez un **deuxième terminal**.
2. Changez de dossier pour celui du client et installez les dépendances en une seule séquence :
   ```bash
   cd client       # placez-vous dans le sous‑répertoire frontend
   npm install     # n'est nécessaire qu'une fois ou après modification du package
   ```
3. Lancez ensuite l'environnement de développement :
   ```bash
   npm run dev     # reste dans le dossier client, démarre Vite
   ```
4. Ouvrez votre navigateur et allez à l'adresse indiquée par Vite (en général, `http://localhost:5173`).

> Les trois commandes ci‑dessus s'exécutent toutes dans le dossier `client`. Elles peuvent être exécutées l'une après l'autre dans le même terminal.
>
> **Astuce avancée** : pour lancer tout du serveur et du client en une seule série de commandes depuis la racine, vous pouvez utiliser :
> ```bash
> cd "C:\Users\djene\Documents\BDML1_Ingé1\Developpement Web\Projets\Projet-Chat-main" # racine du projet
> npm install          # installe les paquets du backend
> cd client
> npm install          # installe les paquets du frontend
> cd ..
> npm run dev          # démarre le client (Vite) tout en laissant le serveur dans un autre terminal
> ```
> (adaptez le chemin initial selon votre emplacement).
---

## Astuce pour tester

Pour bien voir la fonctionnalité "temps réel" à l'œuvre : 
- Ouvrez le lien de l'application (`http://localhost:5173`) dans **plusieurs onglets** ou **navigateurs différents**.
- Écrivez un message dans le premier onglet, il apparaîtra instantanément dans le deuxième !
- Les messages sont sauvegardés : si vous rafraîchissez la page, vous retrouverez tout votre historique de discussion chargé grâce au fichier `messages.json`.

## 👩🏾‍💻 Autrice & Auteur 👨🏾‍💻

Ce projet a été développé par Djeneba BA et Abdel Founeke DERRA , avec pour objectif de fournir une application de chat fun et coloré.
