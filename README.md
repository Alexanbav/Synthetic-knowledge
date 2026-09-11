# Synthetic Knowledge

Application web de tests utilisateurs synthétiques et A/B sur des prototypes accessibles par URL.

## Démarrage

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run db:push
npm run dev
```

Ouvrez `http://localhost:3000`, créez une étude et lancez ses sessions. Le bouton
« Charger la démo » configure deux variantes locales immédiatement testables.

## Modèle LLM

Ajoutez `OPENAI_API_KEY` dans `.env` pour activer la navigation multimodale. Sans
clé, un agent déterministe est utilisé sur le prototype de démonstration, ce qui
permet de vérifier tout le parcours localement.

Les domaines peuvent être restreints via `SYNTHETIC_ALLOWED_DOMAINS`. Les
sessions sont bornées à 25 étapes, n'autorisent que HTTP(S), et ne doivent pas
être utilisées pour des paiements réels ou des actions destructrices.

## Limites

Les résultats synthétiques servent à identifier des hypothèses UX. Ils ne
remplacent ni des entretiens avec de vraies personnes ni un A/B test avec un
échantillon statistiquement significatif. Les prototypes authentifiés nécessitent
encore une intégration dédiée ; un mot de passe affiché dans la page peut être
fourni dans les instructions d'accès.