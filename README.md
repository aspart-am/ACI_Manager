# MSP Gestion - Application de gestion pour Maison de Santé Pluriprofessionnelle

## Description

MSP Gestion est une application web complète développée pour les Maisons de Santé Pluriprofessionnelles (MSP) en France. Elle permet de gérer les finances, les associés, les réunions de concertation pluriprofessionnelle (RCP), les projets et la répartition des revenus entre les professionnels de santé associés.

## Fonctionnalités principales

### 1. Gestion des revenus
- Saisie des dotations ACI (Accord Conventionnel Interprofessionnel) avec montant et date
- Affichage du total des revenus par année
- Calcul automatique des revenus bruts
- Gestion historique des revenus avec possibilité de suppression

### 2. Gestion des associés
- Ajout et suppression de professionnels de santé
- Attribution du statut de co-gérant (avec pondération automatique)
- Modification des informations des associés
- Vue d'ensemble des professionnels par spécialité

### 3. Suivi des charges
- Saisie des charges fixes (loyer, électricité, etc.)
- Enregistrement des dépenses matérielles
- Calcul annuel des dépenses totales
- Catégorisation des différentes charges

### 4. Réunions de concertation pluriprofessionnelle (RCP)
- Planification et suivi des réunions RCP
- Enregistrement des présences des associés
- Calcul automatique du temps de présence 
- Intégration dans le calcul de répartition des revenus

### 5. Projets et missions
- Gestion des projets spécifiques de la MSP
- Attribution de niveaux de contribution par associé
- Suivi des projets actifs et terminés
- Intégration dans le calcul de répartition des revenus

### 6. Répartition des rémunérations
- Calcul automatique selon une formule équitable:
  - 50% du revenu net réparti de façon fixe (avec majoration pour les co-gérants)
  - 25% réparti selon la participation aux réunions RCP
  - 25% réparti selon l'implication dans les projets
- Visualisation claire de la répartition avec graphiques
- Affichage détaillé des calculs et pourcentages

### 7. Paramètres personnalisables
- Ajustement du coefficient des co-gérants
- Configuration des modes de rémunération
- Personnalisation des répartitions entre fixe, RCP et projets

## Architecture technique

### Frontend
- **Framework**: React.js avec TypeScript
- **Interface utilisateur**: Composants shadcn/ui et Tailwind CSS
- **Gestion d'état**: React Hooks et context API
- **Requêtes API**: TanStack Query (React Query)
- **Validation des formulaires**: React Hook Form avec Zod
- **Routage**: wouter pour la navigation
- **Graphiques**: Recharts pour les visualisations

### Backend
- **Langage**: TypeScript avec Node.js
- **Serveur**: Express.js
- **Stockage de données**: Système de fichiers JSON
- **API REST**: Points d'accès complets pour toutes les fonctionnalités
- **Validation de données**: Zod

### Stockage des données
- Stockage en fichiers JSON pour faciliter la sauvegarde et le transfert
- Structure de données optimisée pour les différentes entités:
  - Associés
  - Revenus
  - Dépenses
  - Réunions RCP
  - Projets
  - Paramètres

## Structure du projet

```
msp-gestion/
├── client/                  # Frontend React
│   ├── src/
│   │   ├── components/      # Composants UI réutilisables
│   │   ├── hooks/           # Hooks React personnalisés
│   │   ├── lib/             # Utilitaires et clients API
│   │   ├── pages/           # Pages de l'application
│   │   └── App.tsx          # Point d'entrée principal
├── server/                  # Backend Node.js
│   ├── routes.ts            # Définition des routes API
│   ├── storage.ts           # Gestion du stockage de données
│   ├── index.ts             # Point d'entrée du serveur
│   └── new-distribution-calculator.ts  # Algorithme de répartition
├── shared/                  # Code partagé entre client et serveur
│   └── schema.ts            # Schémas de validation et types
├── data/                    # Dossier de stockage des données JSON
└── vite.config.ts          # Configuration de build
```

## Algorithme de répartition

Le calcul de répartition des revenus est un élément central de l'application. Il suit ces étapes:

1. **Préparation des données**:
   - Calcul du revenu net (revenus ACI - dépenses)
   - Identification des associés, de leur statut et de leurs contributions

2. **Calcul de la part fixe (50%)**:
   - Les co-gérants reçoivent une pondération supérieure (coefficient paramétrable)
   - Calcul du poids total des associés
   - Répartition proportionnelle selon le poids de chaque associé

3. **Calcul de la part RCP (25%)**:
   - Calcul du temps total de présence aux réunions RCP
   - Répartition proportionnelle selon le temps de présence de chaque associé

4. **Calcul de la part projets (25%)**:
   - Somme des niveaux de contribution aux projets
   - Répartition proportionnelle selon la contribution de chaque associé

5. **Consolidation des résultats**:
   - Somme des trois parts pour chaque associé
   - Calcul du pourcentage final du revenu total pour chaque associé

## Démarrage et utilisation

### Prérequis
- Node.js (v16 ou supérieur)
- npm ou yarn

### Installation
```bash
# Cloner le dépôt
git clone https://github.com/votre-organisation/msp-gestion.git
cd msp-gestion

# Installer les dépendances
npm install

# Démarrer l'application en mode développement
npm run dev
```

L'application sera accessible à l'adresse `http://localhost:5000` et comprend à la fois le frontend et le backend.

## Évolutions futures

- Intégration d'un système d'authentification
- Export de données au format Excel
- Génération automatique de rapports financiers
- Système de notification pour les réunions à venir
- Application mobile companion
- Synchronisation cloud des données