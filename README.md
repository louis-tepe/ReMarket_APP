# Projet de Scraping de Produit avec Botasaurus

Ce projet utilise [Botasaurus](https://github.com/omkarcloud/botasaurus) pour scraper les informations détaillées d'une page produit.

## 1. Configuration de l'Environnement

Ce guide suppose que vous utilisez `pyenv` pour la gestion des versions de Python et `poetry` pour la gestion des dépendances.

### Prérequis
- **pyenv**: [Guide d'installation](https://github.com/pyenv/pyenv#installation)
- **poetry**: [Guide d'installation](https://python-poetry.org/docs/#installation)

### Étapes de configuration

1.  **Installer et définir la version de Python**

    Naviguez jusqu'à la racine du projet et exécutez les commandes suivantes pour installer une version de Python récente et la définir pour ce projet.

    ```bash
    pyenv install 3.11.5
    pyenv local 3.11.5
    ```

2.  **Installer les dépendances**

    Utilisez Poetry pour créer un environnement virtuel et installer les packages nécessaires définis dans `pyproject.toml`.

    ```bash
    poetry install
    ```

## 2. Lancement du Scraper

Pour lancer le scraper, exécutez la commande suivante depuis la racine du projet :

```bash
poetry run python scraper/main.py
```

Le scraper se lancera, ouvrira un navigateur pour collecter les données de la page, puis traitera les informations.

## 3. Résultats

Les données extraites seront sauvegardées automatiquement dans le fichier suivant :

- `output/product_data.json`

Ce fichier contiendra toutes les informations structurées du produit.
