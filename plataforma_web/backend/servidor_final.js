const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Database file
const DB_FILE = 'database.json';

// Initialize database
function initializeDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { readings: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('📁 Database criado:', DB_FILE);
    }
}

// Load database
function loadDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('❌ Erro carregando database, criando novo...');
        return { readings: [] };
    }
}

// Save to database
function saveToDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erro salvando database:', error);
        return false;
    }
}

// API Routes
app.post('/api/data', (req, res) => {
    console.log('📥 Dados recebidos do ESP32:', req.body.device_id);
    
    const db = loadDatabase();
    const newReading = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...req.body
    };
    
    db.readings.unshift(newReading);
    
    // Manter apenas últimos 1000 registros
    if (db.readings.length > 1000) {
        db.readings = db.readings.slice(0, 1000);
    }
    
    if (saveToDatabase(db)) {
        console.log('✅ Dados salvos. Total:', db.readings.length, 'registros');
        res.json({ status: 'success', message: 'Dados recebidos', count: db.readings.length });
    } else {
        res.status(500).json({ status: 'error', message: 'Erro salvando dados' });
    }
});

app.get('/api/latest', (req, res) => {
    const db = loadDatabase();
    const latest = db.readings[0] || null;
    
    res.json({
        latest: latest,
        totalReadings: db.readings.length
    });
});

app.get('/api/history', (req, res) => {
    const db = loadDatabase();
    const limit = parseInt(req.query.limit) || 100;
    
    const history = db.readings.slice(0, limit).map(reading => ({
        timestamp: reading.timestamp,
        Tensao_Trifasica: reading.Tensao_Trifasica,
        Corrente_Trifasica: reading.Corrente_Trifasica,
        Potencia_Ativa_Trifasica: reading.Potencia_Ativa_Trifasica,
        Frequencia: reading.Frequencia,
        Demanda_Ativa: reading.Demanda_Ativa,
        Tensao_Fase_1: reading.Tensao_Fase_1,
        Tensao_Fase_2: reading.Tensao_Fase_2,
        Tensao_Fase_3: reading.Tensao_Fase_3,
        THD_Tensao_Fase_1: reading.THD_Tensao_Fase_1,
        THD_Tensao_Fase_2: reading.THD_Tensao_Fase_2,
        THD_Tensao_Fase_3: reading.THD_Tensao_Fase_3
    }));
    
    res.json(history);
});

// API para dados de demanda (mantendo a estrutura original)
app.get('/api/demanda-diaria', (req, res) => {
    const db = loadDatabase();
    const hoje = new Date().toISOString().split('T')[0];
    
    const dadosHoje = db.readings.filter(reading => 
        reading.timestamp.includes(hoje)
    ).slice(0, 50);
    
    const demandaDiaria = dadosHoje.map(reading => ({
        timestamp: reading.timestamp,
        demanda: reading.Demanda_Ativa || 0,
        tensao: reading.Tensao_Trifasica || 0
    }));
    
    res.json(demandaDiaria);
});

app.get('/api/demanda-mensal', (req, res) => {
    // Simular dados mensais para demonstração
    const demandaMensal = [
        { mes: 'Jan', demanda: 4500, tensao: 220 },
        { mes: 'Fev', demanda: 5200, tensao: 218 },
        { mes: 'Mar', demanda: 4800, tensao: 222 },
        { mes: 'Abr', demanda: 5100, tensao: 219 },
        { mes: 'Mai', demanda: 4900, tensao: 221 },
        { mes: 'Jun', demanda: 5300, tensao: 217 }
    ];
    
    res.json(demandaMensal);
});

app.get('/api/demanda-tempo-real', (req, res) => {
    const db = loadDatabase();
    const dadosRecentes = db.readings.slice(0, 20).map(reading => ({
        timestamp: reading.timestamp,
        demanda: reading.Demanda_Ativa || 0,
        tensao: reading.Tensao_Trifasica || 0,
        potencia: reading.Potencia_Ativa_Trifasica || 0
    }));
    
    res.json(dadosRecentes);
});

// DASHBOARD UFRJ - VERSÃO ORIGINAL PROFISSIONAL
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multimedidor UFRJ - Dashboard Profissional</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <style>
            :root {
                --primary: #2c3e50;
                --secondary: #3498db;
                --success: #27ae60;
                --warning: #f39c12;
                --danger: #e74c3c;
                --dark: #34495e;
                --light: #ecf0f1;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 25px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-left: 5px solid #3498db;
                border-right: 5px solid #3498db;
            }
            
            .header h1 {
                color: var(--primary);
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 700;
            }
            
            .header p {
                color: var(--dark);
                font-size: 1.2em;
                margin-bottom: 15px;
            }
            
            .status-bar {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }
            
            .status-card {
                background: rgba(255, 255, 255, 0.95);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                border-top: 4px solid var(--secondary);
            }
            
            .status-value {
                font-size: 1.8em;
                font-weight: bold;
                color: var(--primary);
                margin-bottom: 5px;
            }
            
            .status-label {
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            .controls {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 25px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 12px 25px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-primary {
                background: var(--secondary);
                color: white;
            }
            
            .btn-success {
                background: var(--success);
                color: white;
            }
            
            .btn-warning {
                background: var(--warning);
                color: white;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .card {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }
            
            .card:hover {
                transform: translateY(-5px);
            }
            
            .card h3 {
                color: var(--primary);
                margin-bottom: 15px;
                font-size: 1.3em;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 2px solid var(--light);
                padding-bottom: 10px;
            }
            
            .card-value {
                font-size: 2.5em;
                font-weight: bold;
                color: var(--primary);
                margin: 10px 0;
            }
            
            .card-unit {
                font-size: 1em;
                color: #7f8c8d;
                margin-left: 5px;
            }
            
            .card-details {
                color: #7f8c8d;
                font-size: 0.9em;
                margin-top: 10px;
            }
            
            .charts-section {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .section-title {
                color: var(--primary);
                font-size: 1.8em;
                margin-bottom: 25px;
                text-align: center;
                border-bottom: 2px solid var(--light);
                padding-bottom: 10px;
            }
            
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 25px;
            }
            
            .chart-container {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .chart-title {
                text-align: center;
                color: var(--primary);
                margin-bottom: 15px;
                font-size: 1.2em;
                font-weight: 600;
            }
            
            .detailed-analysis {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .phase-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .phase-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                border-left: 4px solid var(--secondary);
            }
            
            .phase-card.fase-1 { border-left-color: var(--danger); }
            .phase-card.fase-2 { border-left-color: var(--success); }
            .phase-card.fase-3 { border-left-color: var(--warning); }
            
            .phase-title {
                font-size: 1.3em;
                color: var(--primary);
                margin-bottom: 15px;
                text-align: center;
                font-weight: 600;
            }
            
            .phase-parameter {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--light);
            }
            
            .phase-parameter:last-child {
                border-bottom: none;
            }
            
            .param-name {
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            .param-value {
                font-weight: bold;
                color: var(--primary);
            }
            
            .footer {
                text-align: center;
                color: white;
                margin-top: 40px;
                padding: 20px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
            }
            
            .last-update {
                text-align: center;
                color: #7f8c8d;
                margin-top: 20px;
                font-size: 0.9em;
            }
            
            @media (max-width: 768px) {
                .dashboard-grid, .charts-grid, .phase-grid {
                    grid-template-columns: 1fr;
                }
                
                .header h1 {
                    font-size: 2em;
                }
                
                .controls {
                    flex-direction: column;
                }
                
                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ MULTIMEDIDOR UFRJ</h1>
                <p>Sistema de Monitoramento de Energia em Tempo Real</p>
                <div class="status-value" style="color: var(--success); font-size: 1.2em;">✅ Sistema Operacional</div>
            </div>
            
            <div class="status-bar">
                <div class="status-card">
                    <div class="status-value" id="totalReadings">0</div>
                    <div class="status-label">Total de Leituras</div>
                </div>
                <div class="status-card">
                    <div class="status-value" id="lastUpdate">--:--:--</div>
                    <div class="status-label">Última Atualização</div>
                </div>
                <div class="status-card">
                    <div class="status-value" id="deviceStatus">🟢 Online</div>
                    <div class="status-label">Status do Dispositivo</div>
                </div>
            </div>
            
            <div class="controls">
                <button class="btn btn-primary" onclick="refreshData()">
                    🔄 Atualizar Dados
                </button>
                <button class="btn btn-success" onclick="exportData()">
                    📊 Exportar CSV
                </button>
                <button class="btn btn-warning" onclick="screenshot()">
                    📷 Capturar Tela
                </button>
            </div>
            
            <!-- CARDS PRINCIPAIS -->
            <div class="dashboard-grid">
                <div class="card">
                    <h3>⚡ Tensão Trifásica</h3>
                    <div class="card-value" id="tensaoTrifasica">--</div>
                    <div class="card-unit">V</div>
                    <div class="card-details" id="tensaoDetails">Carregando...</div>
                </div>
                
                <div class="card">
                    <h3>🔌 Corrente Trifásica</h3>
                    <div class="card-value" id="correnteTrifasica">--</div>
                    <div class="card-unit">A</div>
                    <div class="card-details" id="correnteDetails">Carregando...</div>
                </div>
                
                <div class="card">
                    <h3>💡 Potência Ativa</h3>
                    <div class="card-value" id="potenciaAtiva">--</div>
                    <div class="card-unit">W</div>
                    <div class="card-details" id="potenciaDetails">Carregando...</div>
                </div>
                
                <div class="card">
                    <h3>📊 Frequência</h3>
                    <div class="card-value" id="frequencia">--</div>
                    <div class="card-unit">Hz</div>
                    <div class="card-details" id="frequenciaDetails">Carregando...</div>
                </div>
                
                <div class="card">
                    <h3>📈 Demanda Ativa</h3>
                    <div class="card-value" id="demandaAtiva">--</div>
                    <div class="card-unit">W</div>
                    <div class="card-details" id="demandaDetails">Carregando...</div>
                </div>
                
                <div class="card">
                    <h3>🎯 THD Tensão F1</h3>
                    <div class="card-value" id="thdTensaoF1">--</div>
                    <div class="card-unit">%</div>
                    <div class="card-details" id="thdDetails">Carregando...</div>
                </div>
            </div>
            
            <!-- GRÁFICOS DE DEMANDA -->
            <div class="charts-section">
                <h2 class="section-title">📈 ANÁLISE DE DEMANDA</h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-title">Demanda Diária</div>
                        <canvas id="demandaDiariaChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-title">Demanda Mensal</div>
                        <canvas id="demandaMensalChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-title">Tempo Real</div>
                        <canvas id="demandaTempoRealChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- ANÁLISE DETALHADA POR FASES -->
            <div class="detailed-analysis">
                <h2 class="section-title">🔍 ANÁLISE DETALHADA POR FASES</h2>
                <div class="phase-grid">
                    <div class="phase-card fase-1">
                        <div class="phase-title">🔴 FASE 1</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão:</span>
                            <span class="param-value" id="tensaoF1">-- V</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente:</span>
                            <span class="param-value" id="correnteF1">-- A</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa:</span>
                            <span class="param-value" id="potenciaF1">-- W</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão:</span>
                            <span class="param-value" id="thdF1">-- %</span>
                        </div>
                    </div>
                    
                    <div class="phase-card fase-2">
                        <div class="phase-title">🟢 FASE 2</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão:</span>
                            <span class="param-value" id="tensaoF2">-- V</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente:</span>
                            <span class="param-value" id="correnteF2">-- A</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa:</span>
                            <span class="param-value" id="potenciaF2">-- W</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão:</span>
                            <span class="param-value" id="thdF2">-- %</span>
                        </div>
                    </div>
                    
                    <div class="phase-card fase-3">
                        <div class="phase-title">🟡 FASE 3</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão:</span>
                            <span class="param-value" id="tensaoF3">-- V</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente:</span>
                            <span class="param-value" id="correnteF3">-- A</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa:</span>
                            <span class="param-value" id="potenciaF3">-- W</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão:</span>
                            <span class="param-value" id="thdF3">-- %</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <div>🏛️ Universidade Federal do Rio de Janeiro - UFRJ</div>
                <div class="last-update" id="updateTime">
                    Atualizado em: --
                </div>
            </div>
        </div>

        <script>
            let demandaDiariaChart, demandaMensalChart, demandaTempoRealChart;
            let currentData = null;
            
            // Format numbers
            function formatNumber(value, decimals = 2) {
                if (value == null || isNaN(value)) return '--';
                return parseFloat(value).toFixed(decimals);
            }
            
            // Update display with latest data
            function updateDisplay(data) {
                currentData = data;
                
                // Main cards
                document.getElementById('tensaoTrifasica').textContent = formatNumber(data.Tensao_Trifasica);
                document.getElementById('correnteTrifasica').textContent = formatNumber(data.Corrente_Trifasica);
                document.getElementById('potenciaAtiva').textContent = formatNumber(data.Potencia_Ativa_Trifasica);
                document.getElementById('frequencia').textContent = formatNumber(data.Frequencia);
                document.getElementById('demandaAtiva').textContent = formatNumber(data.Demanda_Ativa);
                document.getElementById('thdTensaoF1').textContent = formatNumber(data.THD_Tensao_Fase_1);
                
                // Phase 1 details
                document.getElementById('tensaoF1').textContent = formatNumber(data.Tensao_Fase_1) + ' V';
                document.getElementById('correnteF1').textContent = formatNumber(data.Corrente_Fase_1) + ' A';
                document.getElementById('potenciaF1').textContent = formatNumber(data.Potencia_Ativa_Fase_1) + ' W';
                document.getElementById('fpF1').textContent = formatNumber(data.Fator_Potencia_Fase_1);
                document.getElementById('thdF1').textContent = formatNumber(data.THD_Tensao_Fase_1) + ' %';
                
                // Phase 2 details
                document.getElementById('tensaoF2').textContent = formatNumber(data.Tensao_Fase_2) + ' V';
                document.getElementById('correnteF2').textContent = formatNumber(data.Corrente_Fase_2) + ' A';
                document.getElementById('potenciaF2').textContent = formatNumber(data.Potencia_Ativa_Fase_2) + ' W';
                document.getElementById('fpF2').textContent = formatNumber(data.Fator_Potencia_Fase_2);
                document.getElementById('thdF2').textContent = formatNumber(data.THD_Tensao_Fase_2) + ' %';
                
                // Phase 3 details
                document.getElementById('tensaoF3').textContent = formatNumber(data.Tensao_Fase_3) + ' V';
                document.getElementById('correnteF3').textContent = formatNumber(data.Corrente_Fase_3) + ' A';
                document.getElementById('potenciaF3').textContent = formatNumber(data.Potencia_Ativa_Fase_3) + ' W';
                document.getElementById('fpF3').textContent = formatNumber(data.Fator_Potencia_Fase_3);
                document.getElementById('thdF3').textContent = formatNumber(data.THD_Tensao_Fase_3) + ' %';
                
                // Update timestamp
                const now = new Date();
                document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
                document.getElementById('updateTime').textContent = 'Atualizado em: ' + now.toLocaleString();
                
                // Update charts
                updateCharts();
            }
            
            // Update charts
            function updateCharts() {
                updateDemandaDiariaChart();
                updateDemandaMensalChart();
                updateDemandaTempoRealChart();
            }
            
            // Demanda Diária Chart
            async function updateDemandaDiariaChart() {
                try {
                    const response = await fetch('/api/demanda-diaria');
                    const data = await response.json();
                    
                    const labels = data.map(item => {
                        const date = new Date(item.timestamp);
                        return date.toLocaleTimeString();
                    });
                    
                    const demandaData = data.map(item => item.demanda || 0);
                    const tensaoData = data.map(item => item.tensao || 0);
                    
                    if (demandaDiariaChart) {
                        demandaDiariaChart.data.labels = labels;
                        demandaDiariaChart.data.datasets[0].data = demandaData;
                        demandaDiariaChart.data.datasets[1].data = tensaoData;
                        demandaDiariaChart.update();
                    } else {
                        const ctx = document.getElementById('demandaDiariaChart').getContext('2d');
                        demandaDiariaChart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [
                                    {
                                        label: 'Demanda (W)',
                                        data: demandaData,
                                        borderColor: '#3498db',
                                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                        tension: 0.4,
                                        fill: true
                                    },
                                    {
                                        label: 'Tensão (V)',
                                        data: tensaoData,
                                        borderColor: '#e74c3c',
                                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                        tension: 0.4,
                                        fill: true
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'top',
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Erro carregando demanda diária:', error);
                }
            }
            
            // Demanda Mensal Chart
            async function updateDemandaMensalChart() {
                try {
                    const response = await fetch('/api/demanda-mensal');
                    const data = await response.json();
                    
                    const labels = data.map(item => item.mes);
                    const demandaData = data.map(item => item.demanda);
                    
                    if (demandaMensalChart) {
                        demandaMensalChart.data.labels = labels;
                        demandaMensalChart.data.datasets[0].data = demandaData;
                        demandaMensalChart.update();
                    } else {
                        const ctx = document.getElementById('demandaMensalChart').getContext('2d');
                        demandaMensalChart = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Demanda Mensal (W)',
                                    data: demandaData,
                                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                                    borderColor: 'rgba(52, 152, 219, 1)',
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Erro carregando demanda mensal:', error);
                }
            }
            
            // Demanda Tempo Real Chart
            async function updateDemandaTempoRealChart() {
                try {
                    const response = await fetch('/api/demanda-tempo-real');
                    const data = await response.json();
                    
                    const labels = data.map(item => {
                        const date = new Date(item.timestamp);
                        return date.toLocaleTimeString();
                    });
                    
                    const demandaData = data.map(item => item.demanda || 0);
                    
                    if (demandaTempoRealChart) {
                        demandaTempoRealChart.data.labels = labels;
                        demandaTempoRealChart.data.datasets[0].data = demandaData;
                        demandaTempoRealChart.update();
                    } else {
                        const ctx = document.getElementById('demandaTempoRealChart').getContext('2d');
                        demandaTempoRealChart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Demanda (W)',
                                    data: demandaData,
                                    borderColor: '#27ae60',
                                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Erro carregando demanda tempo real:', error);
                }
            }
            
            // Fetch latest data
            async function fetchData() {
                try {
                    const response = await fetch('/api/latest');
                    const result = await response.json();
                    
                    if (result.latest) {
                        document.getElementById('totalReadings').textContent = result.totalReadings;
                        updateDisplay(result.latest);
                        document.getElementById('deviceStatus').textContent = '🟢 Online';
                    } else {
                        document.getElementById('deviceStatus').textContent = '🟡 Aguardando dados';
                    }
                } catch (error) {
                    console.error('Erro buscando dados:', error);
                    document.getElementById('deviceStatus').textContent = '🔴 Erro conexão';
                }
            }
            
            // Refresh data
            function refreshData() {
                fetchData();
                showNotification('Dados atualizados com sucesso!');
            }
            
            // Export data as CSV
            async function exportData() {
                try {
                    const response = await fetch('/api/history?limit=1000');
                    const data = await response.json();
                    
                    if (data.length === 0) {
                        alert('Nenhum dado para exportar!');
                        return;
                    }
                    
                    const headers = ['Timestamp', 'Tensão (V)', 'Corrente (A)', 'Potência (W)', 'Frequência (Hz)', 'Demanda (W)'];
                    const csvContent = [
                        headers.join(','),
                        ...data.map(row => [
                            row.timestamp,
                            row.Tensao_Trifasica || '',
                            row.Corrente_Trifasica || '',
                            row.Potencia_Ativa_Trifasica || '',
                            row.Frequencia || '',
                            row.Demanda_Ativa || ''
                        ].join(','))
                    ].join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'multimedidor_ufrj_dados.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    showNotification('Dados exportados com sucesso!');
                } catch (error) {
                    console.error('Erro exportando dados:', error);
                    alert('Erro ao exportar dados!');
                }
            }
            
            // Take screenshot
            function screenshot() {
                html2canvas(document.body).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'multimedidor_ufrj_dashboard.png';
                    link.href = canvas.toDataURL();
                    link.click();
                    showNotification('Captura de tela salva!');
                });
            }
            
            // Show notification
            function showNotification(message) {
                const notification = document.createElement('div');
                notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #27ae60;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 1000;
                    font-weight: bold;
                \`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            }
            
            // Initialize
            document.addEventListener('DOMContentLoaded', function() {
                fetchData();
                // Update every 5 seconds
                setInterval(fetchData, 5000);
            });
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Initialize and start server
initializeDatabase();
app.listen(PORT, () => {
    console.log('🚀 Servidor Multimedidor UFRJ Profissional rodando na porta ' + PORT);
    console.log('📊 Dashboard: http://localhost:' + PORT);
    console.log('✅ Versão original profissional com análise por fases');
});