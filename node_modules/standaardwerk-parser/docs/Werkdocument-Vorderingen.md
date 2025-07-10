# Werkdocument - Vorderingen Programmeer Standaard
## Status en Voortgang RUST/SCHRITT Methodologie

### Laatste Update: 2025-07-08

---

## 1. Huidige Status

### ✅ Voltooide Onderdelen

#### 1.1 Basis Concepten (COMPLEET)
- [x] **RUST logica**: Begrijpen van impliciete `NICHT SCHRITT x` structuur
- [x] **SCHRITT logica**: Expliciete stappen met voorwaarden
- [x] **Voorwaarden plaatsing**: Voorwaarden staan BOVEN de stap die ze activeren
- [x] **Transitie logica**: Van vorige stap + exit condities = volgende stap

#### 1.2 Programmabeschrijving Structuur (COMPLEET)
- [x] **VON SCHRITT** declaraties voor niet-sequentiële transities
- [x] **+ VON SCHRITT** voor OR constructies
- [x] **Cross-referenties**: `(Programmanaam SCHRITT X+Y+Z)` patroon
- [x] **Impliciete voorwaarden**: `NICHT vorige stap` wordt niet geschreven maar wel geprogrammeerd

#### 1.3 Variabele Types (COMPLEET)
- [x] **Hulpmerkers**: `beschrijvingstekst =` → Bool type
  - Alleen voorwaarden → Coil blok
  - SET/RESET tabel → Sr blok
- [x] **Speciale groepen**: `STORING:` en `MELDING:` → Bool type
- [x] **Andere types**: `TIJD =` (Time), `Variabele =` (Int), `Teller =` (Int)

#### 1.4 FBD Implementatie (COMPLEET)
- [x] **XML structuur**: Analyse van FB0 Basic Stepprogram Dutch.xml
- [x] **Netwerk patroon**: A blok (AND) → Sr blok → Coil blok
- [x] **Variabele arrays**: `Stap[0..31]`, `Hulp[1..32]`, `Tijd[1..10]`, `Teller[1..10]`
- [x] **RUST implementatie**: AND blok met alle `NICHT Stap[x]` inputs

#### 1.5 Text Parsing en Normalizatie (COMPLEET)
- [x] **Duitse tekst parsing**: SCHRITT detectie in embedded contexts
- [x] **Word document import**: Normalizatie van Word formatting artifacts
- [x] **Step formatting**: Automatische normalizatie van SCHRITT/RUST patronen
- [x] **Multi-language support**: German, Dutch, English step keywords

### 🔄 In Behandeling

#### 1.6 Systematische Regel Doorloop (IN PROGRESS)
- [ ] **Complexe voorwaarden**: Geneste logica en operatoren
- [ ] **Timer implementatie**: `Zeit 10sek ??` patronen
- [ ] **Fout afhandeling**: Störung en Melding patronen
- [ ] **Parallel processen**: Meerdere stappenprogramma's tegelijk

---

## 2. Belangrijke Inzichten

### 2.1 Cruciale Correcties
1. **Voorwaarden positie**: Voorwaarden staan BOVEN de stap, niet onder!
2. **RUST heeft geen voorwaarden**: Alleen impliciete `NICHT alle stappen`
3. **Exit vs Entry**: Voorwaarden zijn exit conditions van vorige stap
4. **Cross-referentie formaat**: `(Programmanaam SCHRITT X+Y+Z)` = OR constructie

### 2.2 Implementatie Principes
1. **Documentatie ≠ Code**: Programmabeschrijving is documentatie tool
2. **FBD is werkelijkheid**: SR blokken en AND gates zijn echte implementatie
3. **Impliciete logica**: Veel voorwaarden worden niet geschreven maar wel geprogrammeerd
4. **Variabele mapping**: Elk type heeft eigen array in FBD
5. **Text normalizatie**: Consistent parsing vereist pre-processing van input tekst

---

## 3. Voorbeelden Bibliotheek

### 3.1 Basis Stap Transitie
```
- Freigabe Start Einfuhr
- DT Start Einfuhr
SCHRITT 1: Selektiere 1e zu füllen Horde
```
**FBD**: `SCHRITT 1 = RUST AND (Freigabe Start Einfuhr AND DT Start Einfuhr)`

### 3.2 Niet-Sequentiële Transitie
```
VON SCHRITT 2
- DT Ende Einfuhr
+ VON SCHRITT 3
- Ende Produktion
SCHRITT 4: Start leerdrehen
```
**FBD**: `SCHRITT 4 = (SCHRITT 2 AND NICHT SCHRITT 1 AND DT Ende Einfuhr) OR (SCHRITT 3 AND NICHT SCHRITT 2 AND Ende Produktion)`

### 3.3 Cross-Referentie
```
- Horde vorselektiert (Selektionsprogramm Horde für Einfuhr SCHRITT 2+5+8+11)
SCHRITT 2: Warten bis Horde bereit
```
**FBD**: `Horde vorselektiert = Selektionsprogramm_Horde.SCHRITT_2 OR .SCHRITT_5 OR .SCHRITT_8 OR .SCHRITT_11`

---

## 4. Volgende Stappen

### 4.1 Prioriteit Hoog
- [ ] **Timer patronen**: `Zeit 10sek ??` implementatie
- [ ] **Operator precedence**: AND, OR, NICHT volgorde
- [ ] **Geneste voorwaarden**: Complexe logica structuren

### 4.2 Prioriteit Middel
- [ ] **Fout afhandeling**: STORING en MELDING systematiek
- [ ] **Parallel processing**: Meerdere stappenprogramma's
- [ ] **Optimalisatie**: Best practices voor performantie

### 4.3 Prioriteit Laag
- [ ] **Documentatie**: Aanvullende voorbeelden
- [ ] **Validatie**: Controle van bestaande code
- [ ] **Training**: Materiaal voor team

---

## 5. Issues en Valkuilen

### 5.1 Gevonden Valkuilen
1. **Voorwaarden positie**: Makkelijk om te verwarren met andere methodieën
2. **Impliciete logica**: Niet alles staat in documentatie
3. **RUST definitie**: Kan verwarrend zijn voor nieuwe programmeurs
4. **Cross-referentie format**: Specifieke syntax moet correct zijn

### 5.2 Aandachtspunten
1. **Consistency**: Altijd dezelfde notatie gebruiken
2. **Volledigheid**: Alle impliciete voorwaarden documenteren
3. **Validatie**: FBD moet matchen met beschrijving
4. **Reviews**: Altijd laten controleren door ervaren programmeur
5. **Text import**: Word documents vereisen speciale normalizatie voor correcte parsing

---

## 6. Bronnen en Referenties

### 6.1 Documenten
- `Programmbeschreibung voorbeeld.docx` - Hoofdvoorbeeld
- `FB0 Basic Stepprogram Dutch.xml` - FBD implementatie
- `3.2.1 L01- Hoofdprogramma kraan (FB300).pdf` - Referentie voorbeeld

### 6.2 Gerelateerde Bestanden
- `Programmeer-Standaard.md` - Formele standaard document
- `extracted_programmbeschreibung.txt` - Geanalyseerde content

---

## 7. Changelog

### 2025-07-08 (Ochtend)
- **Initiele versie**: Basis document aangemaakt
- **Concepten**: RUST/SCHRITT logica gedefinieerd
- **Variabele types**: Hulpmerkers, STORING, MELDING, TIJD, etc.
- **FBD mapping**: XML analyse voltooid
- **Voorbeelden**: Basis transitie patronen gedocumenteerd

### 2025-07-08 (Middag)  
- **Duitse tekst parsing**: Fix voor embedded SCHRITT detectie
- **Normalizatie verbetering**: Embedded keywords worden correct gesplitst
- **Test framework**: Duitse sample tekst parsing getest en werkend
- **Git push**: Fixes gepusht naar repository
- **Documentatie**: Werkdocument bijgewerkt met parsing vorderingen

---

*Dit document wordt continu bijgewerkt tijdens de ontwikkeling van de programmeer standaard.*