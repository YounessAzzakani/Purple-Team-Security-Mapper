# 🧪 Guide de Test — Purple Team Mapper

## Fichiers de test disponibles

```
test-samples/
├── sigma_rules_sample.yml       ← 10 règles Sigma (format multi-document YAML)
└── navigator_layer_sample.json  ← Couche ATT&CK Navigator (20 techniques scorées)
```

---

## 📄 Type 1 : Fichiers Sigma (`.yml` / `.yaml`)

### Format requis
Un fichier Sigma est un fichier YAML avec **au minimum** un champ `tags` contenant des tags ATT&CK :

```yaml
title: Detect PowerShell Encoded Command
id: a1b2c3d4-...          # optionnel mais recommandé
status: stable
tags:
    - attack.execution
    - attack.t1059.001    # ← OBLIGATOIRE — identifiant ATT&CK
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: '-EncodedCommand'
    condition: selection
level: high               # low | medium | high | critical
```

### Ce que le parser extrait
| Champ Sigma | Utilisation dans l'app |
|---|---|
| `tags: attack.tXXXX` | Mapping vers les techniques ATT&CK |
| `title` | Nom de la règle dans la liste |
| `level` | Couleur de la badge (rouge/orange/jaune/bleu) |
| `id` | Identifiant unique (évite les doublons) |

### Fichier multi-règles
Vous pouvez mettre **plusieurs règles** dans un seul fichier en les séparant avec `---` :
```yaml
title: Règle 1
tags:
    - attack.t1059.001
---
title: Règle 2
tags:
    - attack.t1003.001
```

---

## 🗺️ Type 2 : ATT&CK Navigator Layer (`.json`)

### Format requis
Un export JSON depuis [MITRE ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/) :

```json
{
  "name": "Mon layer",
  "versions": { "attack": "15" },
  "domain": "enterprise-attack",
  "techniques": [
    {
      "techniqueID": "T1059.001",
      "tactic": "execution",
      "score": 75,
      "comment": "PowerShell monitored via Splunk"
    }
  ]
}
```

### Ce que le parser extrait
- **`techniqueID`** → technique ATT&CK couverte
- **`score`** → utilisé comme indicateur de couverture
- **`comment`** → devient le nom de la règle importée

---

## 🧪 Scénario de Test Complet (pas à pas)

### Étape 1 — Configurer les contrôles
1. Ouvrir **http://localhost:5173/**
2. Activer les contrôles suivants :
   - ✅ **Email Security** → Secure Email Gateway (SEG)
   - ✅ **Endpoint Security** → EDR + Antivirus
   - ✅ **Identity & Access Management** → MFA + PAM
   - ✅ **SIEM & Monitoring** → SIEM Platform
3. Définir le niveau de maturité : **I** (Intermédiaire) pour EDR et SIEM
4. Cliquer **"Suivant"**

### Étape 2 — Importer les règles Sigma
1. Aller dans l'onglet **📂 Import Fichiers**
2. Glisser-déposer le fichier **`sigma_rules_sample.yml`**
3. ✅ Vérifier : 10 règles importées, 15+ techniques couvertes

**OU**

1. Glisser-déposer **`navigator_layer_sample.json`**
2. ✅ Vérifier : 20 règles importées depuis le layer Navigator

### Étape 3 — Ajouter des groupes de menaces
1. Aller dans l'onglet **🎯 Groupes Menaces**
2. Sélectionner **APT28 (Fancy Bear)** + **LockBit Ransomware**
3. Observer le compteur se mettre à jour

### Étape 4 — Lancer l'analyse
1. Cliquer **"🔍 Lancer l'analyse →"**
2. Résultats attendus (avec les contrôles + règles sigma) :
   - Score de posture : **entre 15 et 35/100**
   - Gaps critiques : **< 80** (moins qu'à vide)
   - Onglet **Menaces** : couverture spécifique contre APT28/LockBit

### Étape 5 — Explorer les résultats
| Action | Où cliquer |
|---|---|
| Voir la heatmap | Onglet **🗺️ Matrice ATT&CK** |
| Filtrer les gaps | Onglet **⚠️ Gaps** → filtre 🔴/🟠/🟡 |
| Détail d'une technique | Cliquer sur n'importe quelle cellule de la matrice |
| Analyse par acteur | Onglet **🎯 Menaces (2)** |
| Exporter | Bouton **🗺️ Navigator JSON** ou **📊 CSV** |

---

## ⚡ Test Rapide (2 minutes)

Si vous voulez juste vérifier que l'import fonctionne :

1. Aller à l'étape 2 directement
2. Importer `sigma_rules_sample.yml`
3. Cliquer "Lancer l'analyse"
4. Le score passera de **0** à **~8/100** (les règles Sigma comblent partiellement les gaps)

---

## 📥 Où trouver de vraies règles Sigma

| Source | URL |
|---|---|
| SigmaHQ (officiel, 3000+ règles) | https://github.com/SigmaHQ/sigma |
| Elastic Detection Rules | https://github.com/elastic/detection-rules |
| Chronicle Security Rules | https://github.com/chronicle/detection-rules |
| Splunk Security Content | https://research.splunk.com/detections/ |

## 🗺️ Où créer un Navigator Layer

1. Aller sur https://mitre-attack.github.io/attack-navigator/
2. Créer un nouveau layer Enterprise
3. Colorer/scorer vos techniques couvertes
4. Exporter en JSON → importer dans Purple Team Mapper
