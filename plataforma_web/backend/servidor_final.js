const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

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
    
    // Calcular estatísticas dos últimos 30 registros
    const recentReadings = db.readings.slice(0, 30);
    
    res.json({
        latest: latest,
        statistics: calculateStatistics(recentReadings),
        totalReadings: db.readings.length
    });
});

app.get('/api/history', (req, res) => {
    const db = loadDatabase();
    const limit = parseInt(req.query.limit) || 50;
    
    const history = db.readings.slice(0, limit).map(reading => ({
        timestamp: reading.timestamp,
        Tensao_Trifasica: reading.Tensao_Trifasica,
        Corrente_Trifasica: reading.Corrente_Trifasica,
        Potencia_Ativa_Trifasica: reading.Potencia_Ativa_Trifasica,
        Frequencia: reading.Frequencia,
        Demanda_Ativa: reading.Demanda_Ativa
    }));
    
    res.json(history);
});

// Calculate statistics
function calculateStatistics(readings) {
    if (readings.length === 0) return {};
    
    const stats = {};
    const numericFields = [
        'Tensao_Trifasica', 'Corrente_Trifasica', 'Potencia_Ativa_Trifasica',
        'Frequencia', 'Demanda_Ativa', 'Tensao_Fase_1', 'Tensao_Fase_2', 'Tensao_Fase_3',
        'Corrente_Fase_1', 'Corrente_Fase_2', 'Corrente_Fase_3',
        'Potencia_Ativa_Fase_1', 'Potencia_Ativa_Fase_2', 'Potencia_Ativa_Fase_3',
        'THD_Tensao_Fase_1', 'THD_Tensao_Fase_2', 'THD_Tensao_Fase_3'
    ];
    
    numericFields.forEach(field => {
        const values = readings
            .map(r => r[field])
            .filter(val => val != null && !isNaN(val));
            
        if (values.length > 0) {
            stats[field] = {
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        }
    });
    
    return stats;
}

// Serve dashboard
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multimedidor UFRJ - Dashboard Completo</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .header {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 20px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                border: 3px solid #2c3e50;
            }
            
            .header h1 {
                color: #2c3e50;
                font-size: 2.5em;
                margin-bottom: 10px;
                background: linear-gradient(45deg, #2c3e50, #3498db);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .header p {
                color: #7f8c8d;
                font-size: 1.2em;
            }
            
            .status-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255, 255, 255, 0.9);
                padding: 15px 25px;
                border-radius: 15px;
                margin-bottom: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .status-item {
                text-align: center;
            }
            
            .status-value {
                font-size: 1.3em;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .status-label {
                font-size: 0.9em;
                color: #7f8c8d;
                margin-top: 5px;
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .card {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                border-left: 5px solid #3498db;
            }
            
            .card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            }
            
            .card-tensao { border-left-color: #e74c3c; }
            .card-corrente { border-left-color: #2ecc71; }
            .card-potencia { border-left-color: #f39c12; }
            .card-frequencia { border-left-color: #9b59b6; }
            .card-demanda { border-left-color: #1abc9c; }
            .card-thd { border-left-color: #e67e22; }
            
            .card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.3em;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .card-value {
                font-size: 2.2em;
                font-weight: bold;
                color: #2c3e50;
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
            
            .detailed-section {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 20px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .section-title {
                color: #2c3e50;
                font-size: 1.8em;
                margin-bottom: 25px;
                text-align: center;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
            }
            
            .phase-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .phase-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 12px;
                border-left: 4px solid #3498db;
            }
            
            .phase-card.fase-1 { border-left-color: #e74c3c; }
            .phase-card.fase-2 { border-left-color: #2ecc71; }
            .phase-card.fase-3 { border-left-color: #f39c12; }
            
            .phase-title {
                font-size: 1.3em;
                color: #2c3e50;
                margin-bottom: 15px;
                text-align: center;
                font-weight: bold;
            }
            
            .phase-parameter {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #ecf0f1;
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
                color: #2c3e50;
            }
            
            .charts-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .chart-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .chart-title {
                text-align: center;
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.2em;
            }
            
            .controls {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin: 20px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 12px 25px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-primary {
                background: linear-gradient(45deg, #3498db, #2980b9);
                color: white;
            }
            
            .btn-success {
                background: linear-gradient(45deg, #27ae60, #229954);
                color: white;
            }
            
            .btn-warning {
                background: linear-gradient(45deg, #f39c12, #e67e22);
                color: white;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .last-update {
                text-align: center;
                color: #7f8c8d;
                font-size: 0.9em;
                margin-top: 20px;
            }
            
            .loading {
                text-align: center;
                padding: 40px;
                color: #7f8c8d;
                font-size: 1.2em;
            }
            
            @media (max-width: 768px) {
                .dashboard-grid {
                    grid-template-columns: 1fr;
                }
                
                .charts-container {
                    grid-template-columns: 1fr;
                }
                
                .status-bar {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .header h1 {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ MULTIMEDIDOR UFRJ - DASHBOARD COMPLETO</h1>
                <p>Sistema de Monitoramento de Energia em Tempo Real</p>
            </div>
            
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-value" id="totalReadings">0</div>
                    <div class="status-label">Total de Leituras</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="lastUpdate">--:--:--</div>
                    <div class="status-label">Última Atualização</div>
                </div>
                <div class="status-item">
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
                <div class="card card-tensao">
                    <h3>⚡ Tensão Trifásica</h3>
                    <div class="card-value" id="tensaoTrifasica">--</div>
                    <div class="card-details" id="tensaoDetails">Carregando...</div>
                </div>
                
                <div class="card card-corrente">
                    <h3>🔌 Corrente Trifásica</h3>
                    <div class="card-value" id="correnteTrifasica">--</div>
                    <div class="card-details" id="correnteDetails">Carregando...</div>
                </div>
                
                <div class="card card-potencia">
                    <h3>💡 Potência Ativa</h3>
                    <div class="card-value" id="potenciaAtiva">--</div>
                    <div class="card-details" id="potenciaDetails">Carregando...</div>
                </div>
                
                <div class="card card-frequencia">
                    <h3>📊 Frequência</h3>
                    <div class="card-value" id="frequencia">--</div>
                    <div class="card-details" id="frequenciaDetails">Carregando...</div>
                </div>
                
                <div class="card card-demanda">
                    <h3>📈 Demanda Ativa</h3>
                    <div class="card-value" id="demandaAtiva">--</div>
                    <div class="card-details" id="demandaDetails">Carregando...</div>
                </div>
                
                <div class="card card-thd">
                    <h3>🎯 THD Tensão F1</h3>
                    <div class="card-value" id="thdTensaoF1">--</div>
                    <div class="card-details" id="thdDetails">Carregando...</div>
                </div>
            </div>
            
            <!-- SEÇÃO DETALHADA - FASES -->
            <div class="detailed-section">
                <h2 class="section-title">🔍 ANÁLISE DETALHADA POR FASE</h2>
                
                <div class="phase-grid">
                    <!-- Fase 1 -->
                    <div class="phase-card fase-1">
                        <div class="phase-title">🔴 FASE 1</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão (V):</span>
                            <span class="param-value" id="tensaoF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente (A):</span>
                            <span class="param-value" id="correnteF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa (W):</span>
                            <span class="param-value" id="potenciaF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Reativa (Var):</span>
                            <span class="param-value" id="reativaF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Aparente (VA):</span>
                            <span class="param-value" id="aparenteF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão (%):</span>
                            <span class="param-value" id="thdF1">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Corrente (%):</span>
                            <span class="param-value" id="thdCorrenteF1">--</span>
                        </div>
                    </div>
                    
                    <!-- Fase 2 -->
                    <div class="phase-card fase-2">
                        <div class="phase-title">🟢 FASE 2</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão (V):</span>
                            <span class="param-value" id="tensaoF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente (A):</span>
                            <span class="param-value" id="correnteF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa (W):</span>
                            <span class="param-value" id="potenciaF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Reativa (Var):</span>
                            <span class="param-value" id="reativaF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Aparente (VA):</span>
                            <span class="param-value" id="aparenteF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão (%):</span>
                            <span class="param-value" id="thdF2">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Corrente (%):</span>
                            <span class="param-value" id="thdCorrenteF2">--</span>
                        </div>
                    </div>
                    
                    <!-- Fase 3 -->
                    <div class="phase-card fase-3">
                        <div class="phase-title">🟡 FASE 3</div>
                        <div class="phase-parameter">
                            <span class="param-name">Tensão (V):</span>
                            <span class="param-value" id="tensaoF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Corrente (A):</span>
                            <span class="param-value" id="correnteF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Ativa (W):</span>
                            <span class="param-value" id="potenciaF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Reativa (Var):</span>
                            <span class="param-value" id="reativaF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Potência Aparente (VA):</span>
                            <span class="param-value" id="aparenteF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Fator de Potência:</span>
                            <span class="param-value" id="fpF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Tensão (%):</span>
                            <span class="param-value" id="thdF3">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">THD Corrente (%):</span>
                            <span class="param-value" id="thdCorrenteF3">--</span>
                        </div>
                    </div>
                </div>
                
                <!-- Gráficos -->
                <div class="charts-container">
                    <div class="chart-card">
                        <div class="chart-title">Tensão por Fase (V)</div>
                        <canvas id="tensaoChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <div class="chart-title">THD Tensão por Fase (%)</div>
                        <canvas id="thdChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- ENERGIA E DEMANDA -->
            <div class="detailed-section">
                <h2 class="section-title">📊 ENERGIA E DEMANDA</h2>
                
                <div class="phase-grid">
                    <div class="phase-card">
                        <div class="phase-title">⚡ Energia Ativa</div>
                        <div class="phase-parameter">
                            <span class="param-name">Positiva (kWh):</span>
                            <span class="param-value" id="energiaPositiva">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Negativa (kWh):</span>
                            <span class="param-value" id="energiaNegativa">--</span>
                        </div>
                    </div>
                    
                    <div class="phase-card">
                        <div class="phase-title">🔁 Energia Reativa</div>
                        <div class="phase-parameter">
                            <span class="param-name">Positiva (kVARh):</span>
                            <span class="param-value" id="reativaPositiva">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Negativa (kVARh):</span>
                            <span class="param-value" id="reativaNegativa">--</span>
                        </div>
                    </div>
                    
                    <div class="phase-card">
                        <div class="phase-title">📈 Demanda</div>
                        <div class="phase-parameter">
                            <span class="param-name">Máx. Ativa (W):</span>
                            <span class="param-value" id="demandaMaxAtiva">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Máx. Aparente (VA):</span>
                            <span class="param-value" id="demandaMaxAparente">--</span>
                        </div>
                        <div class="phase-parameter">
                            <span class="param-name">Atual Aparente (VA):</span>
                            <span class="param-value" id="demandaAparente">--</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="last-update" id="updateTime">
                Atualizado em: --
            </div>
        </div>

        <script>
            let tensaoChart, thdChart;
            let currentData = null;
            
            // Format numbers
            function formatNumber(value, decimals = 2) {
                if (value == null || isNaN(value)) return '--';
                return value.toFixed(decimals);
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
                document.getElementById('tensaoF1').textContent = formatNumber(data.Tensao_Fase_1);
                document.getElementById('correnteF1').textContent = formatNumber(data.Corrente_Fase_1);
                document.getElementById('potenciaF1').textContent = formatNumber(data.Potencia_Ativa_Fase_1);
                document.getElementById('reativaF1').textContent = formatNumber(data.Potencia_Reativa_Fase_1);
                document.getElementById('aparenteF1').textContent = formatNumber(data.Potencia_Aparente_Fase_1);
                document.getElementById('fpF1').textContent = formatNumber(data.Fator_Potencia_Fase_1);
                document.getElementById('thdF1').textContent = formatNumber(data.THD_Tensao_Fase_1);
                document.getElementById('thdCorrenteF1').textContent = formatNumber(data.THD_Corrente_Fase_1);
                
                // Phase 2 details
                document.getElementById('tensaoF2').textContent = formatNumber(data.Tensao_Fase_2);
                document.getElementById('correnteF2').textContent = formatNumber(data.Corrente_Fase_2);
                document.getElementById('potenciaF2').textContent = formatNumber(data.Potencia_Ativa_Fase_2);
                document.getElementById('reativaF2').textContent = formatNumber(data.Potencia_Reativa_Fase_2);
                document.getElementById('aparenteF2').textContent = formatNumber(data.Potencia_Aparente_Fase_2);
                document.getElementById('fpF2').textContent = formatNumber(data.Fator_Potencia_Fase_2);
                document.getElementById('thdF2').textContent = formatNumber(data.THD_Tensao_Fase_2);
                document.getElementById('thdCorrenteF2').textContent = formatNumber(data.THD_Corrente_Fase_2);
                
                // Phase 3 details
                document.getElementById('tensaoF3').textContent = formatNumber(data.Tensao_Fase_3);
                document.getElementById('correnteF3').textContent = formatNumber(data.Corrente_Fase_3);
                document.getElementById('potenciaF3').textContent = formatNumber(data.Potencia_Ativa_Fase_3);
                document.getElementById('reativaF3').textContent = formatNumber(data.Potencia_Reativa_Fase_3);
                document.getElementById('aparenteF3').textContent = formatNumber(data.Potencia_Aparente_Fase_3);
                document.getElementById('fpF3').textContent = formatNumber(data.Fator_Potencia_Fase_3);
                document.getElementById('thdF3').textContent = formatNumber(data.THD_Tensao_Fase_3);
                document.getElementById('thdCorrenteF3').textContent = formatNumber(data.THD_Corrente_Fase_3);
                
                // Energy and demand
                document.getElementById('energiaPositiva').textContent = formatNumber(data.Energia_Ativa_Positiva);
                document.getElementById('energiaNegativa').textContent = formatNumber(data.Energia_Ativa_Negativa);
                document.getElementById('reativaPositiva').textContent = formatNumber(data.Energia_Reativa_Positiva);
                document.getElementById('reativaNegativa').textContent = formatNumber(data.Energia_Reativa_Negativa);
                document.getElementById('demandaMaxAtiva').textContent = formatNumber(data.Demanda_Maxima_Ativa);
                document.getElementById('demandaMaxAparente').textContent = formatNumber(data.Demanda_Maxima_Aparente);
                document.getElementById('demandaAparente').textContent = formatNumber(data.Demanda_Aparente);
                
                // Update charts
                updateCharts(data);
                
                // Update timestamp
                const now = new Date();
                document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
                document.getElementById('updateTime').textContent = 'Atualizado em: ' + now.toLocaleString();
            }
            
            // Update charts
            function updateCharts(data) {
                // Voltage chart
                if (tensaoChart) {
                    tensaoChart.data.datasets[0].data = [
                        data.Tensao_Fase_1 || 0,
                        data.Tensao_Fase_2 || 0,
                        data.Tensao_Fase_3 || 0
                    ];
                    tensaoChart.update();
                } else {
                    const ctx1 = document.getElementById('tensaoChart').getContext('2d');
                    tensaoChart = new Chart(ctx1, {
                        type: 'bar',
                        data: {
                            labels: ['Fase 1', 'Fase 2', 'Fase 3'],
                            datasets: [{
                                label: 'Tensão (V)',
                                data: [
                                    data.Tensao_Fase_1 || 0,
                                    data.Tensao_Fase_2 || 0,
                                    data.Tensao_Fase_3 || 0
                                ],
                                backgroundColor: ['#e74c3c', '#2ecc71', '#f39c12']
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Volts (V)'
                                    }
                                }
                            }
                        }
                    });
                }
                
                // THD chart
                if (thdChart) {
                    thdChart.data.datasets[0].data = [
                        data.THD_Tensao_Fase_1 || 0,
                        data.THD_Tensao_Fase_2 || 0,
                        data.THD_Tensao_Fase_3 || 0
                    ];
                    thdChart.update();
                } else {
                    const ctx2 = document.getElementById('thdChart').getContext('2d');
                    thdChart = new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: ['Fase 1', 'Fase 2', 'Fase 3'],
                            datasets: [{
                                label: 'THD Tensão (%)',
                                data: [
                                    data.THD_Tensao_Fase_1 || 0,
                                    data.THD_Tensao_Fase_2 || 0,
                                    data.THD_Tensao_Fase_3 || 0
                                ],
                                backgroundColor: ['#e74c3c', '#2ecc71', '#f39c12']
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'THD (%)'
                                    }
                                }
                            }
                        }
                    });
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
                        document.getElementById('deviceStatus').innerHTML = '🟢 Online';
                    } else {
                        document.getElementById('deviceStatus').innerHTML = '🟡 Aguardando dados';
                    }
                } catch (error) {
                    console.error('Erro buscando dados:', error);
                    document.getElementById('deviceStatus').innerHTML = '🔴 Erro conexão';
                }
            }
            
            // Refresh data
            function refreshData() {
                fetchData();
                showNotification('Dados atualizados!');
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
                // Create notification element
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #27ae60;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 1000;
                    font-weight: bold;
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                // Remove after 3 seconds
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
    console.log(`🚀 Servidor Multimedidor UFRJ rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/data`);
    console.log(`💾 Database: ${DB_FILE}`);
});