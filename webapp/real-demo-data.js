// Real demo data based on actual industrial programs
const REAL_DEMO_DATA = {
    programs: [
        {
            name: "Käserei Productie v1.0",
            content: `Hauptprogramm Erweiterte Käseproduktion FB305
Symbolik IDB: Erweiterte_Kaese_Produktion

// Variabelen declaraties
Variable 1 (Aktive Produktionslinie) = 1
Variable 2 (Maximale Kapazität) = 750
Variable 3 (Aktuelle Charge) = 0
Käsezähler Start T12A = 0
Käsezähler Ende T12B = 0
Temperatur Sensor T01 = 0.0
Druk Sensor P01 = 0.0

// Hulpmerkers
Freigabe Start Produktion = 
Aktuell Rezept ist OK = 
Alle Sensoren OK = 
Sicherheitssystem Aktiv = 
Noodstop Actief = 
Produktie Bezig = 
Kwaliteit Controle OK = 

// Storing meldingen
STORING: Temperatuur te hoog = 
STORING: Druk te laag = 
STORING: Sensor defect = 
STORING: Receptuur fout = 

// Melding berichten
MELDING: Productie gestart = 
MELDING: Charge voltooid = 
MELDING: Onderhoud vereist = 

RUHE: Productiesysteem gereed
  Alle sensoren gecontroleerd
  Sicherheitssystem actief
  Temperatuur in normaal bereik (18-22°C)
  Druk stabiel (1.8-2.2 bar)
  Receptuur ingeladen
  Rohstoffe beschikbaar

SCHRITT 1: Productie initialisatie
  Freigabe Start Produktion
  Aktuell Rezept ist OK
  Alle Sensoren OK
  NICHT Noodstop Actief
  Rohstoffe voorraad >= 50%

SCHRITT 2: Systeem voorbereiden
  Sicherheitssystem Aktiv
  Alle tanks gereinigd
  Temperatuur stabiliseren op 32°C
  Druk instellen op 2.1 bar
  Productie Bezig SET

SCHRITT 3: Käse productie starten
Zeit 1800sek ??
  Temperatuur >= 30°C EN <= 35°C
  Druk >= 2.0 bar EN <= 2.5 bar
  Rohstoffe flow actief
  Mixer snelheid 150 rpm
  NICHT STORING: Temperatuur te hoog

SCHRITT 4: Fermentatie proces
Zeit 7200sek ??
[
  pH-waarde tussen 5.8 EN 6.2
  + Temperatuur stabiel binnen 1°C
  + Zuurstof niveau < 5%
  + Fermentatie actief
]
  Roeren elke 30 minuten
  Monster nemen elk uur

SCHRITT 5: Kwaliteit controle
  Kwaliteit Controle OK
  pH-waarde gemeten
  Structuur visueel gecontroleerd
  Smaak test uitgevoerd
  Certificaat afgedrukt

VON SCHRITT 3
  Temperatuur fout detectie
+ VON SCHRITT 4
  Fermentatie probleem
SCHRITT 6: Fout afhandeling
  STORING: Temperatuur te hoog RESET
  STORING: Druk te laag RESET
  STORING: Sensor defect RESET
  Systeem veilig stoppen
  Onderhoud oproepen

SCHRITT 7: Verpakking voorbereiden
  Verpakkings materiaal beschikbaar
  Verpakkings machine gereed
  Etiketten voorraad check
  Gewicht controle systeem actief

// Complexe cross-referenties
Gestartet (Presselektion füllen/entleeren SCHRITT 1)
T15/16 Leer (Entleeren Einfuhrseite Pressen SCHRITT 3)
Entleeren Einfuhrseite pressen fertig (Entleeren Einfuhrseite Pressen RUHE)`,
            isDemo: true
        },
        {
            name: "Salzbad Reiniging v2.0",
            content: `RUHE: Standby modus
  Systeem ingeschakeld
  Geen actieve alarmen
  Temperatuur stabiel

SCHRITT 1: Voorbereiden reiniging
  Afvoerklep sluiten
  Vulklep openen
  Reinigingsvloeistof toevoegen
  TIJD Vultijd = T#3m

SCHRITT 2: Reiniging starten
STORING 45 = Pomp defect
MELDING "Reiniging gestart"
  Circulatiepomp aan
  Verwarmingselement aan
  Temperatuur = 60°C
  TIJD Reinigingstijd = T#15m

SCHRITT 3: Spoelen
  Reinigingsvloeistof afvoeren
  Schoon water toevoegen
  Spoelcyclus draaien
  TIJD Spoeltijd = T#5m

SCHRITT 4: Controle
  Waterkwaliteit meten
  pH niveau controleren
  Conductiviteit meten
+ Kwaliteit niet OK (terug naar SCHRITT 3)

KLAAR: Reiniging voltooid
  Alle kleppen sluiten
  Systeem uitschakelen
  Logboek bijwerken`,
            isDemo: true
        }
    ]
};

// Function to load real demo data
function loadRealDemoData() {
    if (trainer) {
        // Add demo programs
        REAL_DEMO_DATA.programs.forEach(program => {
            const processedData = trainer.analyzeContent(program.content);
            trainer.trainingData.push({
                id: Date.now() + Math.random(),
                filename: program.name + '.txt',
                size: program.content.length,
                content: program.content,
                processedData: processedData,
                uploadDate: new Date().toISOString(),
                isManual: true,
                isDemo: true
            });
        });
        
        // Update UI
        trainer.updateDashboard();
        trainer.updateUploadedFilesList();
        
        trainer.showNotification('Real demo data geladen! 🎉', 'success');
    }
}

// Add demo data button
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const dashboardContent = document.getElementById('dashboard');
        if (dashboardContent && trainer) {
            const demoButton = document.createElement('div');
            demoButton.className = 'fixed bottom-4 right-4 z-40';
            demoButton.innerHTML = `
                <button 
                    onclick="loadRealDemoData()" 
                    class="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                    title="Laad real demo data voor testing"
                >
                    <i data-lucide="database" class="w-5 h-5"></i>
                    <span>Real Demo Data</span>
                </button>
            `;
            document.body.appendChild(demoButton);
            
            // Also add a button to load the real industrial program
            const industrialButton = document.createElement('div');
            industrialButton.className = 'fixed bottom-4 left-4 z-40';
            industrialButton.innerHTML = `
                <button 
                    onclick="loadIndustrialProgram()" 
                    class="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                    title="Laad echte industriële programma"
                >
                    <i data-lucide="file-code" class="w-5 h-5"></i>
                    <span>Laad Industrieel Programma</span>
                </button>
            `;
            document.body.appendChild(industrialButton);
            
            lucide.createIcons();
        }
    }, 1000);
});

// Function to load the actual industrial program
async function loadIndustrialProgram() {
    try {
        const response = await fetch('../training-data/sample-industrial-program.txt');
        if (response.ok) {
            const content = await response.text();
            const processedData = trainer.analyzeContent(content);
            
            trainer.trainingData.push({
                id: Date.now() + Math.random(),
                filename: 'sample-industrial-program.txt',
                size: content.length,
                content: content,
                processedData: processedData,
                uploadDate: new Date().toISOString(),
                isReal: true
            });
            
            trainer.updateDashboard();
            trainer.updateUploadedFilesList();
            trainer.showNotification('Echt industrieel programma geladen!', 'success');
        }
    } catch (error) {
        trainer.showNotification('Kon industrieel programma niet laden: ' + error.message, 'error');
    }
}