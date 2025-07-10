# ✅ Werkopdracht Claude Code – Lightweight Parser & Syntax Evaluator

## 🎯 Doel van deze opdracht
Ontwerp en implementeer een zelfstandige, scriptbare tool (CLI of headless applicatie) die:
- Word-documenten met stappenprogramma’s analyseert,
- Inhoud converteert naar gestructureerde data (JSON/XML),
- De inhoud evalueert aan de hand van syntaxRules uit een extern configuratie-object,
- Automatisch logica-afwijkingen detecteert én voorstellen doet voor regeluitbreiding.

---

## 📥 Invoer
- `.docx`-bestand met stappenprogramma's (zoals in productie gebruikt).
- JSON-configuratiebestand met syntaxRules voor herkenning van:
  - Stappen (RUHE, SCHRITT)
  - Voorwaarden (motorstatus, positie, drukknoppen, sensoren, externe referenties)
  - Variabelen, timers, meldingen, storingen (gebruik de groepen welke we hebben vastgesteld in hoofdapplicatie)
  - Toegestane operatoren en structuren voor vergelijkingen
- (Optioneel) voorbeeld-outputbestanden om parser gedrag te testen.

---

## ⚙️ Uit te voeren taken
1. **Gebruik bestaande parsing-logica als basis**
   - Start met `parseWordDocument(file, syntaxRules)`
   - Geen visuele afhankelijkheden of GUI vereist
   - Focus op robuuste structuurherkenning (per regel)

2. **Produceer een datastructuur met:**
   - Alle herkende stappen (IDLE, READY, SCHRITT X)
   - Overgangsvoorwaarden per stap
   - Gekoppelde markers, timers, variabelen, externe verwijzingen
   - Fouten, onbekende structuren en waarschuwingen

3. **Voer validatie uit op basis van:**
   - `stepValidation`
   - `conditionValidation`
   - `variableDetection` en `patternGroups`

4. **Log alle afwijkingen en onbekende patronen**
   - Geef per onbekende lijn een suggestie voor nieuwe regex-patterns
   - Bereken totalen: aantal stappen, voorwaarden, complexiteit, externe referenties

5. **Stel syntaxRules-updates voor (trainingsloop)**
   - Vergelijk onbekende structuren met bestaande patronen
   - Stel nieuwe regels voor, met commentaar
   - Voeg deze toe aan `syntaxRules.pendingSuggestions[]`

---

## 📤 Uitvoer
- `output.json`: gestructureerde parse-output
- `output.xml`: optioneel, TIA Portal-compatible XML
- `log.txt`: afwijkingen, foutmeldingen, voorstelregels
- `metrics.json`: tellingen per type (steps, voorwaarden, fouten, score)

---

## 🔁 Iteratief gedrag (optioneel uitbreidbaar)
- Bij herhaalde parsing over meerdere bestanden:
  - Statistische analyse van ontbrekende herkenning
  - Leren uit patronen en voorstellen voor syntax-uitbreiding
  - Samenvoegen van context tussen bestanden

---

_Aangemaakt op 2025-07-09 06:13_
