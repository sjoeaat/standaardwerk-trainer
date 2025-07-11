// =====================================================================
// Standaardwerk AI Trainer - Main Application
// =====================================================================

class StandaardwerkTrainer {
    constructor() {
        this.trainingData = [];
        this.trainingResults = [];
        this.isTraining = false;
        this.currentIteration = 0;
        this.maxIterations = 5;
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedData();
        this.updateDashboard();
        this.initializeCharts();
        lucide.createIcons();
    }

    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');
        
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFileUpload(e);
        });
        
        // Auto-save
        setInterval(() => this.autoSave(), 5 * 60 * 1000); // Every 5 minutes
    }

    // Tab Management
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Remove active class from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.remove('hidden');
        document.getElementById(tabName).classList.add('slide-in');
        
        // Add active class to clicked nav tab
        event.target.classList.add('active');
        
        // Update tab-specific content
        this.updateTabContent(tabName);
    }

    updateTabContent(tabName) {
        switch(tabName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'reports':
                this.updateReports();
                break;
            case 'data':
                this.updateTrainedData();
                break;
        }
    }

    // File Upload Handling
    handleFileUpload(event) {
        const files = event.target.files || event.dataTransfer.files;
        
        Array.from(files).forEach(file => {
            if (this.isValidFile(file)) {
                this.processFile(file);
            } else {
                this.showNotification('Ongeldig bestandsformaat: ' + file.name, 'error');
            }
        });
    }

    isValidFile(file) {
        const validTypes = ['.txt', '.doc', '.docx', '.pdf'];
        return validTypes.some(type => file.name.toLowerCase().endsWith(type));
    }

    async processFile(file) {
        try {
            const content = await this.readFileContent(file);
            const processedData = this.analyzeContent(content);
            
            this.trainingData.push({
                id: Date.now() + Math.random(),
                filename: file.name,
                size: file.size,
                content: content,
                processedData: processedData,
                uploadDate: new Date().toISOString()
            });
            
            this.updateUploadedFilesList();
            this.updateDashboard();
            this.showNotification('Bestand succesvol geüpload: ' + file.name, 'success');
        } catch (error) {
            this.showNotification('Fout bij uploaden: ' + error.message, 'error');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Kan bestand niet lezen'));
            reader.readAsText(file);
        });
    }

    analyzeContent(content) {
        const analysis = {
            steps: [],
            variables: [],
            conditions: [],
            patterns: [],
            statistics: {}
        };

        const lines = content.split('\\n');
        let currentStep = null;
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            // Analyze step patterns
            if (this.isStepLine(line)) {
                if (currentStep) {
                    analysis.steps.push(currentStep);
                }
                currentStep = this.parseStep(line, index + 1);
            }
            // Analyze conditions
            else if (this.isConditionLine(line)) {
                const condition = this.parseCondition(line, index + 1);
                analysis.conditions.push(condition);
                if (currentStep) {
                    currentStep.conditions.push(condition);
                }
            }
            // Analyze variables
            else if (this.isVariableLine(line)) {
                const variable = this.parseVariable(line, index + 1);
                analysis.variables.push(variable);
            }
        });

        if (currentStep) {
            analysis.steps.push(currentStep);
        }

        analysis.statistics = {
            totalLines: lines.length,
            totalSteps: analysis.steps.length,
            totalVariables: analysis.variables.length,
            totalConditions: analysis.conditions.length,
            complexity: this.calculateComplexity(analysis)
        };

        return analysis;
    }

    isStepLine(line) {
        return /^(RUST|SCHRITT|STAP|STEP|KLAAR|FERTIG|END)\\s*[:.]?\\s*/i.test(line);
    }

    isConditionLine(line) {
        return /^\\s*[-+]\\s*/.test(line) || /^\\s*(NIET|NOT|NICHT)\\s/i.test(line);
    }

    isVariableLine(line) {
        return /^\\s*\\w+\\s*=/.test(line) || /^(TIJD|TIME|ZEIT|STORING|MELDING)\\s*[:=]/i.test(line);
    }

    parseStep(line, lineNumber) {
        const match = line.match(/^(RUST|SCHRITT|STAP|STEP|KLAAR|FERTIG|END)\\s*(?:(\\d+)\\s*)?[:.]?\\s*(.*)$/i);
        if (!match) return null;

        return {
            type: match[1].toUpperCase(),
            number: match[2] ? parseInt(match[2]) : 0,
            description: match[3] || '',
            lineNumber: lineNumber,
            conditions: [],
            confidence: 0.8
        };
    }

    parseCondition(line, lineNumber) {
        const isOr = line.trim().startsWith('+');
        const isNot = /^\\s*[-+]?\\s*(NIET|NOT|NICHT)\\s/i.test(line);
        const text = line.replace(/^\\s*[-+]?\\s*(NIET|NOT|NICHT)?\\s*/i, '').trim();

        return {
            text: text,
            operator: isOr ? 'OR' : 'AND',
            negated: isNot,
            lineNumber: lineNumber,
            confidence: 0.7
        };
    }

    parseVariable(line, lineNumber) {
        const match = line.match(/^\\s*(\\w+)\\s*=\\s*(.*)$/);
        if (!match) return null;

        return {
            name: match[1],
            value: match[2].trim(),
            lineNumber: lineNumber,
            type: this.determineVariableType(match[1], match[2]),
            confidence: 0.6
        };
    }

    determineVariableType(name, value) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('tijd') || nameLower.includes('time')) return 'timer';
        if (nameLower.includes('storing') || nameLower.includes('fault')) return 'storing';
        if (nameLower.includes('melding') || nameLower.includes('message')) return 'melding';
        if (nameLower.includes('marker') || nameLower.includes('flag')) return 'marker';
        return 'hulpmerker';
    }

    calculateComplexity(analysis) {
        return Math.min(100, (analysis.totalSteps * 2) + (analysis.totalConditions * 1.5) + (analysis.totalVariables * 1));
    }

    // Manual Program Input
    addManualProgram() {
        const name = document.getElementById('programName').value;
        const content = document.getElementById('programContent').value;
        
        if (!name || !content) {
            this.showNotification('Vul zowel naam als inhoud in', 'error');
            return;
        }

        const processedData = this.analyzeContent(content);
        
        this.trainingData.push({
            id: Date.now() + Math.random(),
            filename: name + '.txt',
            size: content.length,
            content: content,
            processedData: processedData,
            uploadDate: new Date().toISOString(),
            isManual: true
        });

        document.getElementById('programName').value = '';
        document.getElementById('programContent').value = '';
        
        this.updateUploadedFilesList();
        this.updateDashboard();
        this.showNotification('Programma succesvol toegevoegd: ' + name, 'success');
    }

    previewProgram() {
        const content = document.getElementById('programContent').value;
        if (!content) {
            this.showNotification('Geen content om te previewing', 'error');
            return;
        }

        const analysis = this.analyzeContent(content);
        const preview = this.generatePreviewHTML(analysis);
        
        const modal = this.createModal('Programma Preview', preview);
        document.body.appendChild(modal);
    }

    generatePreviewHTML(analysis) {
        return `
            <div class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${analysis.statistics.totalSteps}</div>
                        <div class="text-sm text-gray-600">Stappen</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${analysis.statistics.totalConditions}</div>
                        <div class="text-sm text-gray-600">Condities</div>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">${analysis.statistics.totalVariables}</div>
                        <div class="text-sm text-gray-600">Variabelen</div>
                    </div>
                    <div class="text-center p-4 bg-orange-50 rounded-lg">
                        <div class="text-2xl font-bold text-orange-600">${analysis.statistics.complexity}</div>
                        <div class="text-sm text-gray-600">Complexiteit</div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <h4 class="font-semibold text-gray-800">Gevonden Stappen:</h4>
                    ${analysis.steps.map(step => `
                        <div class="p-3 bg-gray-50 rounded-lg">
                            <div class="font-medium">${step.type} ${step.number}: ${step.description}</div>
                            <div class="text-sm text-gray-600">${step.conditions.length} condities</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Training Functions
    async startTraining() {
        if (this.trainingData.length === 0) {
            this.showNotification('Geen training data beschikbaar', 'error');
            return;
        }

        this.isTraining = true;
        this.currentIteration = 0;
        this.maxIterations = parseInt(document.getElementById('maxIterations').value);
        
        document.getElementById('trainingProgress').style.display = 'block';
        this.updateTrainingUI();
        
        try {
            const results = await this.performTraining();
            this.trainingResults.push(results);
            this.showNotification('Training succesvol voltooid!', 'success');
        } catch (error) {
            this.showNotification('Training gefaald: ' + error.message, 'error');
        } finally {
            this.isTraining = false;
            this.updateTrainingUI();
        }
    }

    async performTraining() {
        const trainingLog = document.getElementById('trainingLog');
        this.logMessage('🚀 Training gestart...');
        
        const results = {
            startTime: new Date().toISOString(),
            iterations: [],
            finalMetrics: {},
            learnedPatterns: []
        };

        for (let i = 0; i < this.maxIterations; i++) {
            this.currentIteration = i + 1;
            this.logMessage(`📊 Iteratie ${this.currentIteration} gestart`);
            
            const iterationResult = await this.performIteration();
            results.iterations.push(iterationResult);
            
            this.updateTrainingProgress((i + 1) / this.maxIterations * 100);
            
            // Simulate training delay
            await this.delay(2000);
            
            if (iterationResult.converged) {
                this.logMessage('✅ Training geconvergeerd!');
                break;
            }
        }

        results.endTime = new Date().toISOString();
        results.finalMetrics = this.calculateFinalMetrics(results);
        
        this.logMessage('🎉 Training voltooid!');
        return results;
    }

    async performIteration() {
        const allData = this.trainingData.map(d => d.processedData);
        const patterns = this.extractPatterns(allData);
        const suggestions = this.generateSuggestions(patterns);
        
        this.logMessage(`🔍 ${patterns.length} patronen gevonden`);
        this.logMessage(`💡 ${suggestions.length} suggesties gegenereerd`);
        
        return {
            iteration: this.currentIteration,
            patterns: patterns,
            suggestions: suggestions,
            metrics: this.calculateIterationMetrics(patterns, suggestions),
            converged: this.checkConvergence(patterns, suggestions)
        };
    }

    extractPatterns(allData) {
        const patterns = [];
        const patternMap = new Map();
        
        allData.forEach(data => {
            // Extract step patterns
            data.steps.forEach(step => {
                const key = `${step.type}_${step.conditions.length}`;
                if (!patternMap.has(key)) {
                    patternMap.set(key, {
                        type: 'step',
                        pattern: step.type,
                        frequency: 0,
                        confidence: 0,
                        examples: []
                    });
                }
                const pattern = patternMap.get(key);
                pattern.frequency++;
                pattern.examples.push(step.description);
                pattern.confidence = Math.min(0.95, pattern.frequency / 10);
            });
            
            // Extract condition patterns
            data.conditions.forEach(condition => {
                const key = `condition_${condition.operator}_${condition.negated}`;
                if (!patternMap.has(key)) {
                    patternMap.set(key, {
                        type: 'condition',
                        pattern: `${condition.operator}${condition.negated ? '_NOT' : ''}`,
                        frequency: 0,
                        confidence: 0,
                        examples: []
                    });
                }
                const pattern = patternMap.get(key);
                pattern.frequency++;
                pattern.examples.push(condition.text);
                pattern.confidence = Math.min(0.95, pattern.frequency / 10);
            });
        });
        
        return Array.from(patternMap.values());
    }

    generateSuggestions(patterns) {
        return patterns
            .filter(p => p.confidence > 0.5)
            .map(pattern => ({
                type: 'pattern_optimization',
                pattern: pattern.pattern,
                suggestion: `Optimize ${pattern.type} pattern: ${pattern.pattern}`,
                confidence: pattern.confidence,
                frequency: pattern.frequency
            }));
    }

    calculateIterationMetrics(patterns, suggestions) {
        return {
            totalPatterns: patterns.length,
            highConfidencePatterns: patterns.filter(p => p.confidence > 0.8).length,
            totalSuggestions: suggestions.length,
            avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
            timestamp: new Date().toISOString()
        };
    }

    checkConvergence(patterns, suggestions) {
        const threshold = parseFloat(document.getElementById('convergenceThreshold').value);
        const highConfidenceRatio = patterns.filter(p => p.confidence > 0.8).length / patterns.length;
        return highConfidenceRatio > (1 - threshold);
    }

    calculateFinalMetrics(results) {
        const lastIteration = results.iterations[results.iterations.length - 1];
        return {
            totalIterations: results.iterations.length,
            finalAccuracy: lastIteration.metrics.avgConfidence,
            totalPatternsLearned: lastIteration.patterns.length,
            convergenceAchieved: lastIteration.converged,
            trainingDuration: new Date(results.endTime) - new Date(results.startTime)
        };
    }

    stopTraining() {
        this.isTraining = false;
        this.logMessage('⏹️ Training gestopt door gebruiker');
        this.updateTrainingUI();
    }

    startQuickTraining() {
        document.getElementById('maxIterations').value = '3';
        document.querySelector('input[name="trainingMode"][value="quick"]').checked = true;
        this.showTab('training');
        this.startTraining();
    }

    // UI Updates
    updateDashboard() {
        const totalFiles = this.trainingData.length;
        const totalSteps = this.trainingData.reduce((sum, d) => sum + d.processedData.statistics.totalSteps, 0);
        const totalPatterns = this.trainingResults.reduce((sum, r) => sum + r.finalMetrics.totalPatternsLearned, 0);
        const avgAccuracy = this.trainingResults.length > 0 ? 
            this.trainingResults.reduce((sum, r) => sum + r.finalMetrics.finalAccuracy, 0) / this.trainingResults.length : 0;
        const lastTraining = this.trainingResults.length > 0 ? 
            new Date(this.trainingResults[this.trainingResults.length - 1].endTime).toLocaleDateString() : 'Nooit';

        document.getElementById('totalFiles').textContent = totalFiles;
        document.getElementById('learnedPatterns').textContent = totalPatterns;
        document.getElementById('accuracy').textContent = Math.round(avgAccuracy * 100) + '%';
        document.getElementById('lastTraining').textContent = lastTraining;
        
        document.getElementById('parsingEfficiency').textContent = Math.round(avgAccuracy * 100) + '%';
        document.getElementById('parsingBar').style.width = Math.round(avgAccuracy * 100) + '%';
        
        document.getElementById('patternRecognition').textContent = Math.min(100, totalPatterns) + '%';
        document.getElementById('patternBar').style.width = Math.min(100, totalPatterns) + '%';
        
        this.updateRecentActivity();
    }

    updateRecentActivity() {
        const activity = document.getElementById('recentActivity');
        const activities = [];
        
        if (this.trainingResults.length > 0) {
            activities.push({
                icon: 'zap',
                text: `Training voltooid met ${this.trainingResults[this.trainingResults.length - 1].finalMetrics.totalPatternsLearned} patronen`,
                time: new Date(this.trainingResults[this.trainingResults.length - 1].endTime).toLocaleString(),
                type: 'success'
            });
        }
        
        this.trainingData.slice(-3).forEach(data => {
            activities.push({
                icon: 'upload',
                text: `Bestand geüpload: ${data.filename}`,
                time: new Date(data.uploadDate).toLocaleString(),
                type: 'info'
            });
        });
        
        activity.innerHTML = activities.map(act => `
            <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div class="w-8 h-8 rounded-full bg-${act.type === 'success' ? 'green' : 'blue'}-100 flex items-center justify-center">
                    <i data-lucide="${act.icon}" class="w-4 h-4 text-${act.type === 'success' ? 'green' : 'blue'}-600"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${act.text}</p>
                    <p class="text-xs text-gray-500">${act.time}</p>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    }

    updateUploadedFilesList() {
        const container = document.getElementById('uploadedFiles');
        
        if (this.trainingData.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Geen bestanden geüpload</p>';
            return;
        }
        
        container.innerHTML = this.trainingData.map(file => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-4">
                    <i data-lucide="${file.isManual ? 'edit' : 'file'}" class="w-5 h-5 text-gray-600"></i>
                    <div>
                        <p class="font-medium text-gray-900">${file.filename}</p>
                        <p class="text-sm text-gray-500">${this.formatFileSize(file.size)} • ${file.processedData.statistics.totalSteps} stappen</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="trainer.previewFile('${file.id}')">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800 text-sm" onclick="trainer.deleteFile('${file.id}')">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    }

    updateTrainingUI() {
        const progressDiv = document.getElementById('trainingProgress');
        
        if (this.isTraining) {
            progressDiv.style.display = 'block';
            document.getElementById('currentIteration').textContent = this.currentIteration;
        } else {
            progressDiv.style.display = 'none';
        }
    }

    updateTrainingProgress(percentage) {
        document.getElementById('overallProgress').textContent = Math.round(percentage) + '%';
        document.getElementById('overallBar').style.width = percentage + '%';
    }

    updateReports() {
        this.updateCharts();
    }

    updateTrainedData() {
        const container = document.getElementById('trainedPatterns');
        
        if (this.trainingResults.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Geen training resultaten beschikbaar</p>';
            return;
        }
        
        const allPatterns = this.trainingResults.flatMap(r => 
            r.iterations.flatMap(i => i.patterns)
        );
        
        const patternGroups = this.groupPatterns(allPatterns);
        
        container.innerHTML = Object.entries(patternGroups).map(([type, patterns]) => `
            <div class="bg-gray-50 rounded-lg p-6 mb-4">
                <h4 class="font-semibold text-gray-800 mb-4">${type.charAt(0).toUpperCase() + type.slice(1)} Patronen</h4>
                <div class="space-y-3">
                    ${patterns.slice(0, 5).map(pattern => `
                        <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div>
                                <p class="font-medium text-gray-900">${pattern.pattern}</p>
                                <p class="text-sm text-gray-500">${pattern.frequency}x gebruikt • ${Math.round(pattern.confidence * 100)}% confidence</p>
                            </div>
                            <div class="w-16 h-2 bg-gray-200 rounded-full">
                                <div class="h-2 bg-blue-500 rounded-full" style="width: ${pattern.confidence * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    groupPatterns(patterns) {
        const groups = {};
        patterns.forEach(pattern => {
            if (!groups[pattern.type]) {
                groups[pattern.type] = [];
            }
            groups[pattern.type].push(pattern);
        });
        
        // Sort by confidence
        Object.keys(groups).forEach(type => {
            groups[type].sort((a, b) => b.confidence - a.confidence);
        });
        
        return groups;
    }

    initializeCharts() {
        const ctx1 = document.getElementById('efficiencyChart')?.getContext('2d');
        const ctx2 = document.getElementById('patternChart')?.getContext('2d');
        
        if (ctx1) {
            this.charts.efficiency = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Training Efficiency',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Training Efficiency Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        if (ctx2) {
            this.charts.patterns = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Steps', 'Conditions', 'Variables'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgb(59, 130, 246)',
                            'rgb(16, 185, 129)',
                            'rgb(245, 101, 101)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Pattern Type Distribution'
                        }
                    }
                }
            });
        }
    }

    updateCharts() {
        if (this.trainingResults.length === 0) return;
        
        // Update efficiency chart
        if (this.charts.efficiency) {
            const labels = this.trainingResults.map((_, i) => `Training ${i + 1}`);
            const data = this.trainingResults.map(r => r.finalMetrics.finalAccuracy * 100);
            
            this.charts.efficiency.data.labels = labels;
            this.charts.efficiency.data.datasets[0].data = data;
            this.charts.efficiency.update();
        }
        
        // Update pattern chart
        if (this.charts.patterns) {
            const allPatterns = this.trainingResults.flatMap(r => 
                r.iterations.flatMap(i => i.patterns)
            );
            
            const stepPatterns = allPatterns.filter(p => p.type === 'step').length;
            const conditionPatterns = allPatterns.filter(p => p.type === 'condition').length;
            const variablePatterns = allPatterns.filter(p => p.type === 'variable').length;
            
            this.charts.patterns.data.datasets[0].data = [stepPatterns, conditionPatterns, variablePatterns];
            this.charts.patterns.update();
        }
    }

    // Utility Functions
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logMessage(message) {
        const log = document.getElementById('trainingLog');
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        log.scrollTop = log.scrollHeight;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm slide-in ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="w-5 h-5"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        lucide.createIcons();
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">${title}</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div>${content}</div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        lucide.createIcons();
        return modal;
    }

    previewFile(fileId) {
        const file = this.trainingData.find(f => f.id == fileId);
        if (!file) return;
        
        const preview = this.generatePreviewHTML(file.processedData);
        const modal = this.createModal(file.filename, preview);
        document.body.appendChild(modal);
    }

    deleteFile(fileId) {
        if (confirm('Weet je zeker dat je dit bestand wilt verwijderen?')) {
            this.trainingData = this.trainingData.filter(f => f.id != fileId);
            this.updateUploadedFilesList();
            this.updateDashboard();
            this.showNotification('Bestand verwijderd', 'success');
        }
    }

    generateReport() {
        const report = this.createTrainingReport();
        const modal = this.createModal('Training Rapport', report);
        document.body.appendChild(modal);
    }

    createTrainingReport() {
        const totalFiles = this.trainingData.length;
        const totalTrainings = this.trainingResults.length;
        const avgAccuracy = this.trainingResults.length > 0 ? 
            this.trainingResults.reduce((sum, r) => sum + r.finalMetrics.finalAccuracy, 0) / this.trainingResults.length : 0;
        
        return `
            <div class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${totalFiles}</div>
                        <div class="text-sm text-gray-600">Totaal Bestanden</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${totalTrainings}</div>
                        <div class="text-sm text-gray-600">Training Sessies</div>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">${Math.round(avgAccuracy * 100)}%</div>
                        <div class="text-sm text-gray-600">Gem. Accuracy</div>
                    </div>
                    <div class="text-center p-4 bg-orange-50 rounded-lg">
                        <div class="text-2xl font-bold text-orange-600">${this.trainingResults.reduce((sum, r) => sum + r.finalMetrics.totalPatternsLearned, 0)}</div>
                        <div class="text-sm text-gray-600">Geleerde Patronen</div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-6">
                    <h4 class="font-semibold text-gray-800 mb-4">Training Geschiedenis</h4>
                    <div class="space-y-3">
                        ${this.trainingResults.map((result, i) => `
                            <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div>
                                    <p class="font-medium text-gray-900">Training ${i + 1}</p>
                                    <p class="text-sm text-gray-500">${new Date(result.endTime).toLocaleString()}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-medium text-gray-900">${Math.round(result.finalMetrics.finalAccuracy * 100)}%</p>
                                    <p class="text-sm text-gray-500">${result.finalMetrics.totalPatternsLearned} patronen</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: this.trainingData.length,
                totalTrainings: this.trainingResults.length,
                avgAccuracy: this.trainingResults.length > 0 ? 
                    this.trainingResults.reduce((sum, r) => sum + r.finalMetrics.finalAccuracy, 0) / this.trainingResults.length : 0
            },
            trainingData: this.trainingData,
            trainingResults: this.trainingResults
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Rapport geëxporteerd', 'success');
    }

    loadSavedData() {
        try {
            const savedData = localStorage.getItem('standaardwerk-trainer-data');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.trainingData = data.trainingData || [];
                this.trainingResults = data.trainingResults || [];
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    autoSave() {
        try {
            const data = {
                trainingData: this.trainingData,
                trainingResults: this.trainingResults,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('standaardwerk-trainer-data', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
}

// Global functions for onclick handlers
let trainer;

window.showTab = function(tabName) {
    trainer.showTab(tabName);
};

window.startQuickTraining = function() {
    trainer.startQuickTraining();
};

window.addManualProgram = function() {
    trainer.addManualProgram();
};

window.previewProgram = function() {
    trainer.previewProgram();
};

window.startTraining = function() {
    trainer.startTraining();
};

window.stopTraining = function() {
    trainer.stopTraining();
};

window.generateReport = function() {
    trainer.generateReport();
};

window.exportReport = function() {
    trainer.exportReport();
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    trainer = new StandaardwerkTrainer();
});