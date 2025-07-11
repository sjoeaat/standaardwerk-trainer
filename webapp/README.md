# Standaardwerk AI Trainer Webapp

Een intuïtieve webapplicatie voor het trainen van AI modellen op industriële programmering patronen.

## ✨ Features

### 🎯 **Intuïtieve Interface**
- Modern dashboard met real-time metrics
- Drag & drop file upload
- Handmatige tekst input met live preview
- Tabbed interface voor verschillende functionaliteiten

### 📊 **Data Input & Management**
- Support voor .txt, .doc, .docx, .pdf bestanden
- Automatische content analyse
- File management met preview en delete functies
- Handmatige programma input met syntax highlighting

### 🚀 **AI Training**
- Configureerbare training parameters
- Real-time training progress tracking
- Automatische pattern extraction
- Convergence detection

### 📈 **Rapporten & Visualisaties**
- Interactieve charts met Chart.js
- Training efficiency grafieken
- Pattern distribution visualisaties
- Export functionaliteit

### 🧠 **Getrainde Data Management**
- Overzicht van alle geleerde patronen
- Confidence scores en frequency data
- Pattern type categorisatie
- Performance metrics

## 🚀 **Snel Starten**

### 1. **Download & Setup**
```bash
# Clone de repository
git clone https://github.com/sjoeaat/standaardwerk-trainer.git

# Navigeer naar webapp directory
cd standaardwerk-trainer/webapp

# Start de applicatie
npm start
```

### 2. **Open in Browser**
```
http://localhost:8080
```

### 3. **Upload Data**
- Ga naar "Data Input" tab
- Upload industriële programma bestanden
- Of gebruik handmatige tekst input

### 4. **Start Training**
- Ga naar "Training" tab
- Configureer training parameters
- Klik "Training Starten"

## 📋 **Ondersteunde Formaten**

### **Industriële Programma Patronen:**
```
RUST: Wachten op start signaal
- Start knop ingedrukt
- Veiligheidsdeuren gesloten
- Geen actieve storingen

SCHRITT 1: Initialiseren systeem
- SETZEN Motorstart = TRUE
- Motor.Running
- TIJD T#5s

SCHRITT 2: Product doseren
STORING 23 = Doseerklep vastgelopen
MELDING "Dosering actief"
- Doseerklep.Open
- NIET Niveausensor.Max
+ Tank.Leeg
```

### **Bestandsformaten:**
- `.txt` - Platte tekst bestanden
- `.doc/.docx` - Word documenten
- `.pdf` - PDF bestanden

## 🎯 **Interface Overzicht**

### **Dashboard**
- Quick stats: bestanden, patronen, accuracy
- Recente activiteit feed
- Snelle acties knoppen
- Training progress indicators

### **Data Input**
- Drag & drop upload zone
- Handmatige tekst editor
- File preview functionaliteit
- Upload historie

### **Training**
- Configureerbare parameters
- Real-time progress tracking
- Training log console
- Stop/start controls

### **Rapporten**
- Training efficiency charts
- Pattern distribution grafieken
- Export functionaliteit
- Performance metrics

### **Getrainde Data**
- Pattern overview per type
- Confidence scores
- Frequency statistics
- Data management tools

## 🔧 **Configuratie**

### **Training Parameters:**
- **Max Iteraties:** Maximaal aantal training cycli
- **Min Confidence:** Minimale confidence score
- **Convergence Threshold:** Drempel voor convergentie

### **Training Modi:**
- **Snelle Training:** 5 minuten, 3 iteraties
- **Standaard Training:** 15 minuten, 5 iteraties  
- **Diepgaande Training:** 30 minuten, 10 iteraties

## 📊 **Metrics & Analytics**

### **Performance Metrics:**
- **Parsing Efficiency:** Percentage succesvol geparseerde content
- **Pattern Recognition:** Aantal herkende patronen
- **Training Accuracy:** Gemiddelde confidence score
- **Convergence Rate:** Snelheid van model convergentie

### **Data Metrics:**
- **Totaal Bestanden:** Aantal geüploade bestanden
- **Totaal Stappen:** Aantal gedetecteerde programma stappen
- **Totaal Condities:** Aantal gedetecteerde condities
- **Complexiteit Score:** Berekende complexiteit van programma's

## 🎨 **UI/UX Design**

### **Modern Interface:**
- Gradient backgrounds
- Glassmorphism effects
- Smooth animations
- Responsive design

### **Intuïtieve Navigation:**
- Tabbed interface
- Breadcrumb navigation
- Quick actions
- Contextual controls

### **Visual Feedback:**
- Real-time progress bars
- Success/error notifications
- Loading states
- Interactive charts

## 🔧 **Technische Details**

### **Frontend:**
- **HTML5** - Moderne semantic markup
- **CSS3** - Tailwind CSS framework
- **JavaScript ES6+** - Moderne JS features
- **Chart.js** - Interactive charts
- **Lucide Icons** - Modern icon set

### **Features:**
- **Local Storage** - Automatische data persistence
- **File API** - Drag & drop upload
- **Web Workers** - Background processing
- **Responsive Design** - Mobile-first approach

### **Browser Support:**
- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers

## 🚀 **Deployment**

### **Lokale Development:**
```bash
# Start development server
npm run dev

# Of gebruik Python
python3 -m http.server 8080
```

### **Production Deployment:**
```bash
# Build voor productie
npm run build

# Deploy naar webserver
# Kopieer alle bestanden naar webserver root
```

## 🤝 **Contributing**

1. Fork het project
2. Maak een feature branch
3. Commit je changes
4. Push naar branch
5. Open een Pull Request

## 📄 **License**

MIT License - zie LICENSE file voor details.

## 🎯 **Roadmap**

### **v2.1 Features:**
- [ ] Batch processing
- [ ] Custom pattern templates
- [ ] Advanced filtering
- [ ] Export naar verschillende formaten

### **v2.2 Features:**
- [ ] Real-time collaboration
- [ ] Cloud storage integratie
- [ ] Advanced analytics
- [ ] API endpoints

---

**Gemaakt met ❤️ door het Standaardwerk Team**