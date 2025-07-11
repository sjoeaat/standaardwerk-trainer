// Demo data for Standaardwerk AI Trainer
const DEMO_DATA = {
    programs: [
        {
            name: "Käserei Productie v1.0",
            content: `RUST: Wachten op start signaal
- Start knop ingedrukt
- Veiligheidsdeuren gesloten
- Geen actieve storingen

SCHRITT 1: Initialiseren systeem
- SETZEN Motorstart = TRUE
- Motor.Running
- TIJD T#5s
- (Vulsysteem SCHRITT 3+4+5)

SCHRITT 2: Product doseren
STORING 23 = Doseerklep vastgelopen
Teller1 = 5
MELDING "Dosering actief"
- Doseerklep.Open
- NIET Niveausensor.Max
+ Tank.Leeg
+ Noodstop.Actief

SCHRITT 3: Mengen product  
TIJD Mengtijd = T#2m30s
Marker1 = SCHRITT 2-4
- Mengmotor.Aan
- Temperatuur > 45.5 graden
- Druk < 2.5 bar

SCHRITT 4: Kwaliteitscontrole
- Viscositeit = OK
- pH = 7.2 - 7.8  
- SETZEN Goedkeuring
- RÜCKSETZEN Afkeur

SCHRITT 5: Product afvoeren
- Afvoerklep = OPEN
- Tankniveau < 10%
+ Pompstoring
+ Overloopbeveiliging

KLAAR: Process voltooid
- RÜCKSETZEN alle kleppen
- Statusmelding = "Gereed voor nieuwe batch"`
        },
        {
            name: "Salzbad Reiniging v2.0",
            content: `RUST: Standby modus
- Systeem ingeschakeld
- Geen actieve alarmen
- Temperatuur stabiel

SCHRITT 1: Voorbereiden reiniging
- Afvoerklep sluiten
- Vulklep openen
- Reinigingsvloeistof toevoegen
- TIJD Vultijd = T#3m

SCHRITT 2: Reiniging starten
STORING 45 = Pomp defect
MELDING "Reiniging gestart"
- Circulatiepomp aan
- Verwarmingselement aan
- Temperatuur = 60°C
- TIJD Reinigingstijd = T#15m

SCHRITT 3: Spoelen
- Reinigingsvloeistof afvoeren
- Schoon water toevoegen
- Spoelcyclus draaien
- TIJD Spoeltijd = T#5m

SCHRITT 4: Controle
- Waterkwaliteit meten
- pH niveau controleren
- Conductiviteit meten
+ Kwaliteit niet OK (terug naar SCHRITT 3)

KLAAR: Reiniging voltooid
- Alle kleppen sluiten
- Systeem uitschakelen
- Logboek bijwerken`
        },
        {
            name: "Formenlager Transport v0.5",
            content: `RUST: Wachten op transport opdracht
- Transportsysteem gereed
- Geen blokkering detectie
- Veiligheidsschakeling actief

SCHRITT 1: Vorm ophalen
- Transportband naar positie A
- Grijper activeren
- Vorm vastpakken
- TIJD Grijd = T#2s
- (Vormenmagazijn SCHRITT 1+2)

SCHRITT 2: Transport naar perskop
- Transportband naar positie B
- Vorm positioneren
- Grijper deactiveren
- TIJD Transport = T#10s

SCHRITT 3: Vorm in perskop plaatsen
STORING 12 = Perskop blokkering
MELDING "Vorm geplaatst"
- Perskop openen
- Vorm invoeren
- Perskop sluiten
- Positie controleren

SCHRITT 4: Leeg transport terug
- Transportband naar positie A
- Startpositie innemen
- Gereed voor volgende vorm
+ Noodstop actief (naar RUST)

KLAAR: Transport cyclus voltooid
- Teller verhogen
- Status updaten
- Volgende opdracht gereed`
        }
    ],
    
    trainingResults: [
        {
            startTime: "2025-07-09T10:00:00.000Z",
            endTime: "2025-07-09T10:15:00.000Z",
            iterations: [
                {
                    iteration: 1,
                    patterns: [
                        {
                            type: "step",
                            pattern: "RUST",
                            frequency: 12,
                            confidence: 0.95,
                            examples: ["Wachten op start signaal", "Standby modus", "Wachten op transport opdracht"]
                        },
                        {
                            type: "step", 
                            pattern: "SCHRITT",
                            frequency: 48,
                            confidence: 0.92,
                            examples: ["Initialiseren systeem", "Product doseren", "Mengen product"]
                        },
                        {
                            type: "condition",
                            pattern: "AND",
                            frequency: 67,
                            confidence: 0.88,
                            examples: ["Start knop ingedrukt", "Motor.Running", "Doseerklep.Open"]
                        },
                        {
                            type: "condition",
                            pattern: "OR",
                            frequency: 23,
                            confidence: 0.85,
                            examples: ["Tank.Leeg", "Noodstop.Actief", "Pompstoring"]
                        }
                    ],
                    metrics: {
                        totalPatterns: 150,
                        highConfidencePatterns: 45,
                        totalSuggestions: 89,
                        avgConfidence: 0.72
                    }
                }
            ],
            finalMetrics: {
                totalIterations: 3,
                finalAccuracy: 0.89,
                totalPatternsLearned: 156,
                convergenceAchieved: true,
                trainingDuration: 900000
            }
        },
        {
            startTime: "2025-07-09T14:30:00.000Z",
            endTime: "2025-07-09T14:45:00.000Z",
            iterations: [
                {
                    iteration: 1,
                    patterns: [
                        {
                            type: "variable",
                            pattern: "TIJD",
                            frequency: 15,
                            confidence: 0.91,
                            examples: ["T#5s", "T#2m30s", "T#15m"]
                        },
                        {
                            type: "variable",
                            pattern: "STORING",
                            frequency: 8,
                            confidence: 0.87,
                            examples: ["Doseerklep vastgelopen", "Pomp defect", "Perskop blokkering"]
                        },
                        {
                            type: "variable",
                            pattern: "MELDING",
                            frequency: 6,
                            confidence: 0.83,
                            examples: ["Dosering actief", "Reiniging gestart", "Vorm geplaatst"]
                        }
                    ],
                    metrics: {
                        totalPatterns: 124,
                        highConfidencePatterns: 38,
                        totalSuggestions: 67,
                        avgConfidence: 0.79
                    }
                }
            ],
            finalMetrics: {
                totalIterations: 2,
                finalAccuracy: 0.93,
                totalPatternsLearned: 132,
                convergenceAchieved: true,
                trainingDuration: 450000
            }
        }
    ]
};

// Function to load demo data
function loadDemoData() {
    if (trainer) {
        // Add demo programs
        DEMO_DATA.programs.forEach(program => {
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
        
        // Add demo training results
        trainer.trainingResults = [...trainer.trainingResults, ...DEMO_DATA.trainingResults];
        
        // Update UI
        trainer.updateDashboard();
        trainer.updateUploadedFilesList();
        trainer.updateTrainedData();
        trainer.updateReports();
        
        trainer.showNotification('Demo data geladen! 🎉', 'success');
    }
}

// Add demo data button to dashboard
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const dashboardContent = document.getElementById('dashboard');
        if (dashboardContent && trainer) {
            const demoButton = document.createElement('div');
            demoButton.className = 'fixed bottom-4 right-4 z-40';
            demoButton.innerHTML = `
                <button 
                    onclick="loadDemoData()" 
                    class="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                    title="Laad demo data voor testing"
                >
                    <i data-lucide="database" class="w-5 h-5"></i>
                    <span>Demo Data</span>
                </button>
            `;
            document.body.appendChild(demoButton);
            lucide.createIcons();
        }
    }, 1000);
});