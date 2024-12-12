# MyRE - Analyse d'Investissement Immobilier

## ⚠️ Avertissement Important

Cette application est fournie à titre informatif uniquement et ne constitue en aucun cas un conseil en investissement ou un conseil fiscal. Les calculs et simulations présentés sont des estimations basées sur les informations fournies et peuvent ne pas refléter avec précision votre situation particulière.

**Avant toute décision d'investissement :**
- Consultez un conseiller fiscal pour une analyse personnalisée de votre situation
- Faites appel à un expert-comptable pour valider vos calculs de rentabilité
- Vérifiez auprès d'un notaire les aspects juridiques et fiscaux spécifiques à votre cas
- Contactez un courtier pour une simulation précise de prêt immobilier

Les auteurs de cette application déclinent toute responsabilité quant aux décisions prises sur la base des résultats fournis.

Une application web complète pour l'analyse d'investissements immobiliers en France.

## Fonctionnalités

- Calcul détaillé des coûts d'acquisition (prix d'achat, frais de notaire)
- Simulation de prêt immobilier avec tableau d'amortissement
- Analyse des charges mensuelles et annuelles
- Calcul de rentabilité avec décomposition (cash-flow, remboursement capital, plus-value)
- Support des régimes fiscaux (Micro-BIC et Réel)
- Calcul d'impact fiscal détaillé (IR, prélèvements sociaux)
- Visualisations interactives :
  - Répartition des charges
  - Impact fiscal par année
  - Évolution du cash-flow
  - Tableau d'amortissement
  - Évolution des fonds propres
  - Métriques de rentabilité

## Prérequis

- Python 3.8+
- pip (gestionnaire de paquets Python)

## Installation

1. Cloner le dépôt :
```bash
git clone [URL_DU_REPO]
cd MyRE
```

2. Créer un environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Sur Unix
venv\Scripts\activate     # Sur Windows
```

3. Installer les dépendances :
```bash
pip install -r requirements.txt
```

## Lancement

1. Démarrer l'application :
```bash
python app.py
```

2. Ouvrir un navigateur et accéder à :
```
http://localhost:5000
```

## Structure du Projet

```
/
├── app.py                 # Application Flask principale
├── requirements.txt       # Dépendances Python
├── README.md             # Documentation
├── models/
│   ├── investment_calculator.py    # Calculs d'investissement et fiscalité
│   └── loan_calculator.py         # Calculs de prêt et amortissement
├── templates/
│   └── index.html        # Interface utilisateur principale
└── static/
    ├── css/             # Styles Bootstrap et personnalisés
    └── js/
        ├── main.js      # Logique principale et graphiques
        └── investment.js # Calculs côté client
```

## Fonctionnement

1. **Saisie des données** :
   - Prix d'achat et frais de notaire
   - Conditions du prêt (montant, taux, durée)
   - Revenus locatifs et charges
   - Régime fiscal et tranche d'imposition

2. **Calculs automatiques** :
   - Mensualités du prêt
   - Cash-flow avant/après impôts
   - Rentabilité globale et détaillée
   - Impact fiscal annuel

3. **Visualisations** :
   - Graphiques interactifs pour chaque aspect
   - Mises à jour en temps réel
   - Format adapté à l'impression

## Régimes Fiscaux Supportés

### Micro-BIC
- Abattement forfaitaire de 50%
- Calcul simplifié des impôts

### Régime Réel
- Déduction des charges réelles
- Amortissement du bien
- Déduction des intérêts d'emprunt

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
