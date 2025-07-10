# Programmeer Standaard
## RUST/SCHRITT Stappenprogramma Methodologie

### Overzicht
Deze standaard beschrijft de methodologie voor het schrijven van programmabeschrijvingen volgens de RUST/SCHRITT (REST/STEP) methode en de implementatie ervan in Function Block Diagram (FBD) formaat.

---

## 1. Basis Concepten

### 1.1 RUST (REST) Logica
- **Definitie**: `RUST = NICHT SCHRITT 1 AND NICHT SCHRITT 2 AND NICHT SCHRITT 3 AND...`
- **Eigenschap**: Impliciet gedefinieerd, wordt niet expliciet geschreven
- **Implementatie**: Wordt wel geprogrammeerd in FBD met AND blokken
- **Functie**: Default state wanneer geen enkele stap actief is

### 1.2 SCHRITT (STEP) Logica
- **Definitie**: Expliciete sequentiële stappen in het proces
- **Nummering**: SCHRITT 1, SCHRITT 2, SCHRITT 3, etc.
- **Transitie**: Voorwaarden staan BOVEN de stap die ze activeren

---

## 2. Programmabeschrijving Structuur

### 2.1 Stap Declaratie Volgorde
```
[Voorwaarden voor activatie]
SCHRITT X: [Beschrijving van stap]
```

**Belangrijk**: Voorwaarden staan ALTIJD boven de stap die ze activeren!

### 2.2 Transitie Regels

#### Standaard Sequentiële Transitie
```
- [Voorwaarde 1]
- [Voorwaarde 2]
SCHRITT X: [Beschrijving]
```
**Betekenis**: Transitie van vorige stap (X-1) naar stap X

#### Niet-Sequentiële Transitie
```
VON SCHRITT Y
- [Voorwaarden voor Y→X]
+ VON SCHRITT Z
- [Voorwaarden voor Z→X]
SCHRITT X: [Beschrijving]
```
**Betekenis**: Transitie van stap Y OF stap Z naar stap X

---

## 3. Variabele Types

### 3.1 Hulpmerkers (Bool)
```
beschrijvingstekst =
- [Voorwaarden]
```
**Implementatie**: Coil blok

```
beschrijvingstekst =
SET | RESET
----|----
 x  |  y
```
**Implementatie**: Sr blok

### 3.2 Speciale Bool Groepen
```
STORING: beschrijving =
```
```
MELDING: beschrijving =
```

### 3.3 Andere Types
```
TIJD = beschrijving
```
**Type**: Time → `Tijd[]` array

```
Variabele = beschrijving
```
**Type**: Int

```
Teller = beschrijving
```
**Type**: Int → `Teller[]` array

---

## 4. Cross-Referenties

### 4.1 Verwijzingen naar Andere Stappenprogramma's
```
Beschrijvingstekst (Programmanaam SCHRITT X+Y+Z)
```

**Betekenis**: `Programmanaam.SCHRITT_X OR Programmanaam.SCHRITT_Y OR Programmanaam.SCHRITT_Z`

**Voorbeeld**:
```
Horde vorselektiert (Selektionsprogramm Horde für Einfuhr SCHRITT 2+5+8+11)
```

---

## 5. FBD Implementatie

### 5.1 Variabele Structuur
```xml
Stap[0..31] of Bool     // Stappen (stap 0 = RUST)
Stap_A[0..31] of Bool   // Hulp arrays
Stap_B[0..31] of Bool   // Hulp arrays  
Stap_C[0..31] of Bool   // Hulp arrays
Hulp[1..32] of Bool     // Hulpmerkers
Tijd[1..10] of Timer    // Timer arrays
Teller[1..10] of Int    // Teller arrays
```

### 5.2 Netwerk Patroon
1. **A blok** (AND) - Combineert input voorwaarden
2. **Sr blok** (Set-Reset) - Memory element voor stap
3. **Coil blok** - Output activatie

### 5.3 RUST Implementatie
```
RUST = A blok met inputs:
- NICHT Stap[1]
- NICHT Stap[2]
- NICHT Stap[3]
- ...
- NICHT Stap[N]
```

---

## 6. Programmeer Regels

### 6.1 Stap Transitie Logica
```
SCHRITT X = (Vorige_Stap AND NICHT Huidige_Stap) AND [Exit_Voorwaarden]
```

### 6.2 Impliciete Voorwaarden
- Bij `VON SCHRITT Y`: Impliciet `NICHT SCHRITT (Y-1)`
- Bij standaard transitie: Impliciet `NICHT SCHRITT (X-1)`

### 6.3 Documentatie vs Implementatie
- **Programmabeschrijving**: Documentatie tool voor logica beschrijving
- **FBD**: Werkelijke implementatie met SR blokken en AND gates
- **Principe**: Voorwaarden in beschrijving = entry conditions, in FBD = exit conditions

---

## 7. Voorbeelden

### 7.1 Basis Stap Transitie
**Programmabeschrijving**:
```
- Freigabe Start Einfuhr
- DT Start Einfuhr
SCHRITT 1: Selektiere 1e zu füllen Horde
```

**FBD Logica**:
```
SCHRITT 1 = RUST AND (Freigabe Start Einfuhr AND DT Start Einfuhr)
```

### 7.2 Niet-Sequentiële Transitie
**Programmabeschrijving**:
```
VON SCHRITT 2
- DT Ende Einfuhr
+ VON SCHRITT 3  
- Ende Produktion
SCHRITT 4: Start leerdrehen
```

**FBD Logica**:
```
SCHRITT 4 = (SCHRITT 2 AND NICHT SCHRITT 1 AND DT Ende Einfuhr) 
           OR 
           (SCHRITT 3 AND NICHT SCHRITT 2 AND Ende Produktion)
```

---

*Laatste update: 2025-07-08*