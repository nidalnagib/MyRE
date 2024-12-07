# MyRE - Analyse d'Investissement Immobilier

Une application web complète pour l'analyse d'investissements immobiliers en France.

## Fonctionnalités

- Analyse détaillée des investissements immobiliers
- Calcul de rentabilité et cash-flow
- Support des différentes structures juridiques (LMNP, SCI, etc.)
- Visualisation des données avec graphiques interactifs
- Calcul d'amortissement de prêt
- Interface utilisateur en français

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

## Configuration

1. Créer un fichier `.env` à la racine du projet :
```
SECRET_KEY=votre-clé-secrète
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
│   ├── investment_calculator.py    # Calculs d'investissement
│   └── loan_calculator.py         # Calculs de prêt
├── templates/
│   └── index.html        # Template frontend principal
├── static/
│   ├── css/             # Styles personnalisés
│   └── js/              # JavaScript personnalisé
└── logs/
    └── myre.log         # Logs de l'application
```

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
