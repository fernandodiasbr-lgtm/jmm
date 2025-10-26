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

// DASHBOARD UFRJ PREMIUM - VERSÃO DEFINITIVA
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multimedidor UFRJ - Dashboard Premium</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <style>
            :root {
                --primary: #2c3e50;
                --secondary: #3498db;
                --success: #27ae60;
                --warning: #f39c12;
                --danger: #e74c3c;
                --info: #17a2b8;
                --light: #ecf0f1;
                --dark: #34495e;
                --ufrj-blue: #0047a0;
                --ufrj-gold: #ffd700;
            }
            
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, var(--ufrj-blue) 0%, #00264d 100%);
                min-height: 100vh;
                color: #333;
                overflow-x: hidden;
            }
            
            .container { 
                max-width: 1400px; 
                margin: 0 auto; 
                padding: 20px;
            }
            
            /* HEADER UFRJ */
            .header-ufrj {
                background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%);
                padding: 30px; 
                border-radius: 20px; 
                margin-bottom: 25px; 
                text-align: center;
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                border: 3px solid var(--ufrj-gold);
                position: relative;
                overflow: hidden;
            }
            
            .header-ufrj::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 5px;
                background: linear-gradient(90deg, var(--ufrj-blue), var(--ufrj-gold), var(--ufrj-blue));
            }
            
            .logo-ufrj {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                margin-bottom: 15px;
            }
            
            .logo-ufrj h1 {
                color: var(--ufrj-blue);
                font-size: 3em;
                font-weight: 800;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            
            .logo-badge {
                background: var(--ufrj-gold);
                color: var(--ufrj-blue);
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 1.1em;
                box-shadow: 0 4px 15px rgba(255,215,0,0.3);
            }
            
            .header-subtitle {
                color: var(--dark);
                font-size: 1.4em;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .version-badge {
                background: linear-gradient(45deg, var(--success), var(--secondary));
                color: white;
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: 600;
                display: inline-block;
                margin-top: 10px;
                box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
            }
            
            /* STATUS BAR */
            .status-bar {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }
            
            .status-card {
                background: rgba(255, 255, 255, 0.95);
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                border-left: 4px solid var(--secondary);
                transition: all 0.3s ease;
            }
            
            .status-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 30px rgba(0,0,0,0.15);
            }
            
            .status-value {
                font-size: 2em;
                font-weight: 800;
                color: var(--primary);
                margin-bottom: 5px;
            }
            
            .status-label {
                color: var(--dark);
                font-size: 0.9em;
                font-weight: 500;
            }
            
            /* CONTROLS */
            .controls {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 15px 30px;
                border: none;
                border-radius: 12px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .btn-primary {
                background: linear-gradient(45deg, var(--secondary), #2980b9);
                color: white;
            }
            
            .btn-success {
                background: linear-gradient(45deg, var(--success), #229954);
                color: white;
            }
            
            .btn-warning {
                background: linear-gradient(45deg, var(--warning), #e67e22);
                color: white;
            }
            
            .btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            }
            
            /* MAIN GRID */
            .grid-main { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
                gap: 25px; 
                margin-bottom: 30px;
            }
            
            .metric-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%);
                padding: 25px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-left: 5px solid;
                transition: all 0.4s ease;
                position: relative;
                overflow: hidden;
            }
            
            .metric-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: inherit;
                opacity: 0.3;
            }
            
            .metric-card:hover {
                transform: translateY(-8px) scale(1.02);
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            }
            
            .card-tensao { border-left-color: var(--danger); }
            .card-corrente { border-left-color: var(--success); }
            .card-potencia { border-left-color: var(--warning); }
            .card-frequencia { border-left-color: var(--info); }
            .card-demanda { border-left-color: #9b59b6; }
            .card-thd { border-left-color: #e67e22; }
            
            .metric-card h3 {
                color: var(--primary);
                margin-bottom: 15px;
                font-size: 1.3em;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
            }
            
            .metric-value {
                font-size: 2.8em;
                font-weight: 800;
                color: var(--primary);
                margin: 15px 0;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            
            .metric-unit {
                font-size: 1.1em;
                color: var(--dark);
                margin-left: 8px;
                font-weight: 500;
            }
            
            .metric-trend {
                font-size: 0.9em;
                padding: 4px 12px;
                border-radius: 15px;
                font-weight: 600;
                display: inline-block;
                margin-top: 10px;
            }
            
            .trend-up { background: rgba(231, 76, 60, 0.1); color: var(--danger); }
            .trend-down { background: rgba(39, 174, 96, 0.1); color: var(--success); }
            .trend-stable { background: rgba(52, 152, 219, 0.1); color: var(--secondary); }
            
            /* PHASE ANALYSIS */
            .section-title {
                color: white;
                font-size: 2.2em;
                text-align: center;
                margin: 40px 0 30px 0;
                font-weight: 700;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .section-subtitle {
                color: var(--light);
                text-align: center;
                margin-bottom: 30px;
                font-size: 1.2em;
                font-weight: 300;
            }
            
            .grid-phases {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }
            
            .phase-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%);
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 12px 35px rgba(0,0,0,0.1);
                transition: all 0.4s ease;
                border-top: 4px solid;
                position: relative;
                overflow: hidden;
            }
            
            .phase-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 100%;
                background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%);
                pointer-events: none;
            }
            
            .phase-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 45px rgba(0,0,0,0.15);
            }
            
            .phase-1 { border-top-color: var(--danger); }
            .phase-2 { border-top-color: var(--success); }
            .phase-3 { border-top-color: var(--warning); }
            
            .phase-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid var(--light);
            }
            
            .phase-title {
                font-size: 1.6em;
                font-weight: 700;
                color: var(--primary);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .phase-badge {
                padding: 6px 15px;
                border-radius: 20px;
                font-size: 0.8em;
                font-weight: 600;
                color: white;
            }
            
            .badge-1 { background: var(--danger); }
            .badge-2 { background: var(--success); }
            .badge-3 { background: var(--warning); }
            
            .phase-params {
                display: grid;
                gap: 12px;
            }
            
            .param-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid rgba(0,0,0,0.1);
            }
            
            .param-row:last-child {
                border-bottom: none;
            }
            
            .param-name {
                color: var(--dark);
                font-size: 1em;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .param-value {
                font-weight: 700;
                color: var(--primary);
                font-size: 1.1em;
            }
            
            /* CHARTS SECTION */
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }
            
            .chart-container {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .chart-title {
                text-align: center;
                color: var(--primary);
                margin-bottom: 20px;
                font-size: 1.4em;
                font-weight: 600;
            }
            
            /* FOOTER */
            .footer {
                text-align: center;
                color: var(--light);
                margin-top: 50px;
                padding: 25px;
                background: rgba(0,0,0,0.2);
                border-radius: 15px;
                font-size: 0.9em;
            }
            
            .update-time {
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 10px;
                margin-top: 20px;
                color: var(--light);
                font-size: 0.9em;
            }
            
            /* RESPONSIVE */
            @media (max-width: 768px) {
                .grid-main, .grid-phases, .charts-grid {
                    grid-template-columns: 1fr;
                }
                
                .logo-ufrj h1 {
                    font-size: 2em;
                }
                
                .metric-value {
                    font-size: 2.2em;
                }
                
                .controls {
                    flex-direction: column;
                    align-items: center;
                }
                
                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* ANIMATIONS */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .pulse {
                animation: pulse 2s infinite;
            }
            
            .fade-in {
                animation: fadeIn 0.8s ease-in;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- HEADER UFRJ -->
            <div class="header-ufrj fade-in">
                <div class="logo-ufrj">
                    <h1>🏛️ MULTIMEDIDOR UFRJ</h1>
                    <div class="logo-badge">SISTEMA OFICIAL</div>
                </div>
                <div class="header-subtitle">
                    Sistema Inteligente de Monitoramento de Energia Elétrica
                </div>
                <div class="version-badge">
                    🚀 VERSÃO PREMIUM - ANÁLISE COMPLETA POR FASES
                </div>
            </div>
            
            <!-- STATUS BAR -->
            <div class="status-bar fade-in">
                <div class="status-card">
                    <div class="status-value" id="totalLeituras">0</div>
                    <div class="status-label">Total de Leituras</div>
                </div>
                <div class="status-card">
                    <div class="status-value" id="ultimaAtualizacao">--:--:--</div>
                    <div class="status-label">Última Atualização</div>
                </div>
                <div class="status-card">
                    <div class="status-value" id="statusDispositivo">🟢 Online</div>
                    <div class="status-label">Status do Sistema</div>
                </div>
                <div class="status-card">
                    <div class="status-value" id="tempoOperacao">00:00:00</div>
                    <div class="status-label">Tempo de Operação</div>
                </div>
            </div>
            
            <!-- CONTROLS -->
            <div class="controls fade-in">
                <button class="btn btn-primary" onclick="atualizarDados()">
                    🔄 Atualizar Dados em Tempo Real
                </button>
                <button class="btn btn-success" onclick="exportarDados()">
                    📊 Exportar Relatório Completo
                </button>
                <button class="btn btn-warning" onclick="capturarDashboard()">
                    📷 Capturar Dashboard
                </button>
            </div>
            
            <!-- METRICAS PRINCIPAIS -->
            <div class="grid-main">
                <div class="metric-card card-tensao fade-in">
                    <h3>⚡ Tensão Trifásica</h3>
                    <div class="metric-value" id="tensaoTrifasica">--</div>
                    <div class="metric-unit">Volts</div>
                    <div class="metric-trend trend-stable" id="tensaoTrend">● Estável</div>
                </div>
                
                <div class="metric-card card-corrente fade-in">
                    <h3>🔌 Corrente Trifásica</h3>
                    <div class="metric-value" id="correnteTrifasica">--</div>
                    <div class="metric-unit">Amperes</div>
                    <div class="metric-trend trend-stable" id="correnteTrend">● Estável</div>
                </div>
                
                <div class="metric-card card-potencia fade-in">
                    <h3>💡 Potência Ativa</h3>
                    <div class="metric-value" id="potenciaAtiva">--</div>
                    <div class="metric-unit">Watts</div>
                    <div class="metric-trend trend-stable" id="potenciaTrend">● Estável</div>
                </div>
                
                <div class="metric-card card-frequencia fade-in">
                    <h3>📊 Frequência</h3>
                    <div class="metric-value" id="frequencia">--</div>
                    <div class="metric-unit">Hertz</div>
                    <div class="metric-trend trend-stable" id="frequenciaTrend">● Estável</div>
                </div>
                
                <div class="metric-card card-demanda fade-in">
                    <h3>📈 Demanda Ativa</h3>
                    <div class="metric-value" id="demandaAtiva">--</div>
                    <div class="metric-unit">Watts</div>
                    <div class="metric-trend trend-stable" id="demandaTrend">● Estável</div>
                </div>
                
                <div class="metric-card card-thd fade-in">
                    <h3>🎯 THD Tensão F1</h3>
                    <div class="metric-value" id="thdTensaoF1">--</div>
                    <div class="metric-unit">Percentual</div>
                    <div class="metric-trend trend-stable" id="thdTrend">● Estável</div>
                </div>
            </div>
            
            <!-- ANÁLISE DETALHADA POR FASES -->
            <h2 class="section-title fade-in">🔍 ANÁLISE DETALHADA POR FASES</h2>
            <div class="section-subtitle fade-in">
                Monitoramento individual de cada fase com parâmetros completos de qualidade de energia
            </div>
            
            <div class="grid-phases">
                <!-- FASE 1 -->
                <div class="phase-card phase-1 fade-in">
                    <div class="phase-header">
                        <div class="phase-title">
                            🔴 Fase 1
                        </div>
                        <div class="phase-badge badge-1">PRIMÁRIA</div>
                    </div>
                    <div class="phase-params">
                        <div class="param-row">
                            <span class="param-name">📊 Tensão</span>
                            <span class="param-value" id="tensaoF1">-- V</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ Corrente</span>
                            <span class="param-value" id="correnteF1">-- A</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">💡 Potência Ativa</span>
                            <span class="param-value" id="potenciaF1">-- W</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🔄 Potência Reativa</span>
                            <span class="param-value" id="reativaF1">-- Var</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">📈 Potência Aparente</span>
                            <span class="param-value" id="aparenteF1">-- VA</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🎯 Fator de Potência</span>
                            <span class="param-value" id="fpF1">--</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚠️ THD Tensão</span>
                            <span class="param-value" id="thdF1">-- %</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ THD Corrente</span>
                            <span class="param-value" id="thdCorrenteF1">-- %</span>
                        </div>
                    </div>
                </div>
                
                <!-- FASE 2 -->
                <div class="phase-card phase-2 fade-in">
                    <div class="phase-header">
                        <div class="phase-title">
                            🟢 Fase 2
                        </div>
                        <div class="phase-badge badge-2">SECUNDÁRIA</div>
                    </div>
                    <div class="phase-params">
                        <div class="param-row">
                            <span class="param-name">📊 Tensão</span>
                            <span class="param-value" id="tensaoF2">-- V</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ Corrente</span>
                            <span class="param-value" id="correnteF2">-- A</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">💡 Potência Ativa</span>
                            <span class="param-value" id="potenciaF2">-- W</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🔄 Potência Reativa</span>
                            <span class="param-value" id="reativaF2">-- Var</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">📈 Potência Aparente</span>
                            <span class="param-value" id="aparenteF2">-- VA</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🎯 Fator de Potência</span>
                            <span class="param-value" id="fpF2">--</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚠️ THD Tensão</span>
                            <span class="param-value" id="thdF2">-- %</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ THD Corrente</span>
                            <span class="param-value" id="thdCorrenteF2">-- %</span>
                        </div>
                    </div>
                </div>
                
                <!-- FASE 3 -->
                <div class="phase-card phase-3 fade-in">
                    <div class="phase-header">
                        <div class="phase-title">
                            🟡 Fase 3
                        </div>
                        <div class="phase-badge badge-3">TERCIÁRIA</div>
                    </div>
                    <div class="phase-params">
                        <div class="param-row">
                            <span class="param-name">📊 Tensão</span>
                            <span class="param-value" id="tensaoF3">-- V</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ Corrente</span>
                            <span class="param-value" id="correnteF3">-- A</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">💡 Potência Ativa</span>
                            <span class="param-value" id="potenciaF3">-- W</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🔄 Potência Reativa</span>
                            <span class="param-value" id="reativaF3">-- Var</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">📈 Potência Aparente</span>
                            <span class="param-value" id="aparenteF3">-- VA</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">🎯 Fator de Potência</span>
                            <span class="param-value" id="fpF3">--</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚠️ THD Tensão</span>
                            <span class="param-value" id="thdF3">-- %</span>
                        </div>
                        <div class="param-row">
                            <span class="param-name">⚡ THD Corrente</span>
                            <span class="param-value" id="thdCorrenteF3">-- %</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- GRÁFICOS -->
            <h2 class="section-title fade-in">📈 VISUALIZAÇÃO GRÁFICA</h2>
            <div class="section-subtitle fade-in">
                Análise temporal e comparativa dos principais parâmetros elétricos
            </div>
            
            <div class="charts-grid">
                <div class="chart-container fade-in">
                    <div class="chart-title">Tensão por Fase (V)</div>
                    <canvas id="tensaoChart"></canvas>
                </div>
                <div class="chart-container fade-in">
                    <div class="chart-title">THD por Fase (%)</div>
                    <canvas id="thdChart"></canvas>
                </div>
            </div>
            
            <!-- FOOTER -->
            <div class="footer fade-in">
                <div>🏛️ Universidade Federal do Rio de Janeiro - UFRJ</div>
                <div>🔬 Laboratório de Medições Elétricas - Departamento de Engenharia Elétrica</div>
                <div class="update-time" id="tempoAtualizacao">
                    ⏰ Sistema inicializado - Aguardando dados...
                </div>
            </div>
        </div>

        <script>
            let tensaoChart, thdChart;
            let startTime = new Date();
            
            // Formatar números
            function formatarNumero(valor, decimais = 2) {
                if (valor == null || isNaN(valor)) return '--';
                return parseFloat(valor).toFixed(decimais);
            }
            
            // Atualizar tempo de operação
            function atualizarTempoOperacao() {
                const agora = new Date();
                const diff = agora - startTime;
                const horas = Math.floor(diff / 3600000);
                const minutos = Math.floor((diff % 3600000) / 60000);
                const segundos = Math.floor((diff % 60000) / 1000);
                
                document.getElementById('tempoOperacao').textContent = 
                    `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            }
            
            // Atualizar display com dados
            function atualizarDisplay(dados) {
                console.log('🎯 Dashboard Premium - Atualizando dados:', dados);
                
                // Cards principais
                document.getElementById('tensaoTrifasica').textContent = formatarNumero(dados.Tensao_Trifasica);
                document.getElementById('correnteTrifasica').textContent = formatarNumero(dados.Corrente_Trifasica);
                document.getElementById('potenciaAtiva').textContent = formatarNumero(dados.Potencia_Ativa_Trifasica);
                document.getElementById('frequencia').textContent = formatarNumero(dados.Frequencia);
                document.getElementById('demandaAtiva').textContent = formatarNumero(dados.Demanda_Ativa);
                document.getElementById('thdTensaoF1').textContent = formatarNumero(dados.THD_Tensao_Fase_1);
                
                // Fase 1
                document.getElementById('tensaoF1').textContent = formatarNumero(dados.Tensao_Fase_1) + ' V';
                document.getElementById('correnteF1').textContent = formatarNumero(dados.Corrente_Fase_1) + ' A';
                document.getElementById('potenciaF1').textContent = formatarNumero(dados.Potencia_Ativa_Fase_1) + ' W';
                document.getElementById('reativaF1').textContent = formatarNumero(dados.Potencia_Reativa_Fase_1) + ' Var';
                document.getElementById('aparenteF1').textContent = formatarNumero(dados.Potencia_Aparente_Fase_1) + ' VA';
                document.getElementById('fpF1').textContent = formatarNumero(dados.Fator_Potencia_Fase_1);
                document.getElementById('thdF1').textContent = formatarNumero(dados.THD_Tensao_Fase_1) + ' %';
                document.getElementById('thdCorrenteF1').textContent = formatarNumero(dados.THD_Corrente_Fase_1) + ' %';
                
                // Fase 2
                document.getElementById('tensaoF2').textContent = formatarNumero(dados.Tensao_Fase_2) + ' V';
                document.getElementById('correnteF2').textContent = formatarNumero(dados.Corrente_Fase_2) + ' A';
                document.getElementById('potenciaF2').textContent = formatarNumero(dados.Potencia_Ativa_Fase_2) + ' W';
                document.getElementById('reativaF2').textContent = formatarNumero(dados.Potencia_Reativa_Fase_2) + ' Var';
                document.getElementById('aparenteF2').textContent = formatarNumero(dados.Potencia_Aparente_Fase_2) + ' VA';
                document.getElementById('fpF2').textContent = formatarNumero(dados.Fator_Potencia_Fase_2);
                document.getElementById('thdF2').textContent = formatarNumero(dados.THD_Tensao_Fase_2) + ' %';
                document.getElementById('thdCorrenteF2').textContent = formatarNumero(dados.THD_Corrente_Fase_2) + ' %';
                
                // Fase 3
                document.getElementById('tensaoF3').textContent = formatarNumero(dados.Tensao_Fase_3) + ' V';
                document.getElementById('correnteF3').textContent = formatarNumero(dados.Corrente_Fase_3) + ' A';
                document.getElementById('potenciaF3').textContent = formatarNumero(dados.Potencia_Ativa_Fase_3) + ' W';
                document.getElementById('reativaF3').textContent = formatarNumero(dados.Potencia_Reativa_Fase_3) + ' Var';
                document.getElementById('aparenteF3').textContent = formatarNumero(dados.Potencia_Aparente_Fase_3) + ' VA';
                document.getElementById('fpF3').textContent = formatarNumero(dados.Fator_Potencia_Fase_3);
                document.getElementById('thdF3').textContent = formatarNumero(dados.THD_Tensao_Fase_3) + ' %';
                document.getElementById('thdCorrenteF3').textContent = formatarNumero(dados.THD_Corrente_Fase_3) + ' %';
                
                // Atualizar timestamp
                const agora = new Date();
                document.getElementById('ultimaAtualizacao').textContent = agora.toLocaleTimeString();
                document.getElementById('tempoAtualizacao').textContent = 
                    '⏰ Última atualização: ' + agora.toLocaleString() + ' | Sistema operando normalmente';
                
                // Atualizar gráficos
                atualizarGraficos(dados);
            }
            
            // Atualizar gráficos
            function atualizarGraficos(dados) {
                const coresFases = ['#e74c3c', '#2ecc71', '#f39c12'];
                
                // Gráfico de Tensão
                if (tensaoChart) {
                    tensaoChart.data.datasets[0].data = [
                        dados.Tensao_Fase_1 || 0,
                        dados.Tensao_Fase_2 || 0,
                        dados.Tensao_Fase_3 || 0
                    ];
                    tensaoChart.update('none');
                } else {
                    const ctx1 = document.getElementById('tensaoChart').getContext('2d');
                    tensaoChart = new Chart(ctx1, {
                        type: 'bar',
                        data: {
                            labels: ['Fase 1', 'Fase 2', 'Fase 3'],
                            datasets: [{
                                label: 'Tensão (V)',
                                data: [
                                    dados.Tensao_Fase_1 || 0,
                                    dados.Tensao_Fase_2 || 0,
                                    dados.Tensao_Fase_3 || 0
                                ],
                                backgroundColor: coresFases,
                                borderColor: coresFases.map(cor => cor.replace('0.8', '1')),
                                borderWidth: 2,
                                borderRadius: 8
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 13 }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: {
                                        color: 'rgba(0,0,0,0.1)'
                                    },
                                    ticks: {
                                        font: { size: 12 }
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        font: { size: 12, weight: 'bold' }
                                    }
                                }
                            }
                        }
                    });
                }
                
                // Gráfico de THD
                if (thdChart) {
                    thdChart.data.datasets[0].data = [
                        dados.THD_Tensao_Fase_1 || 0,
                        dados.THD_Tensao_Fase_2 || 0,
                        dados.THD_Tensao_Fase_3 || 0
                    ];
                    thdChart.update('none');
                } else {
                    const ctx2 = document.getElementById('thdChart').getContext('2d');
                    thdChart = new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: ['Fase 1', 'Fase 2', 'Fase 3'],
                            datasets: [{
                                label: 'THD Tensão (%)',
                                data: [
                                    dados.THD_Tensao_Fase_1 || 0,
                                    dados.THD_Tensao_Fase_2 || 0,
                                    dados.THD_Tensao_Fase_3 || 0
                                ],
                                backgroundColor: coresFases,
                                borderColor: coresFases.map(cor => cor.replace('0.8', '1')),
                                borderWidth: 2,
                                borderRadius: 8
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(0,0,0,0.8)'
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: {
                                        color: 'rgba(0,0,0,0.1)'
                                    },
                                    ticks: {
                                        font: { size: 12 }
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        font: { size: 12, weight: 'bold' }
                                    }
                                }
                            }
                        }
                    });
                }
            }
            
            // Buscar dados
            async function buscarDados() {
                try {
                    const resposta = await fetch('/api/latest');
                    const resultado = await resposta.json();
                    
                    if (resultado.latest) {
                        document.getElementById('totalLeituras').textContent = resultado.totalReadings;
                        atualizarDisplay(resultado.latest);
                        document.getElementById('statusDispositivo').textContent = '🟢 Online';
                        document.getElementById('statusDispositivo').className = 'status-value pulse';
                    } else {
                        document.getElementById('statusDispositivo').textContent = '🟡 Aguardando dados';
                        document.getElementById('statusDispositivo').className = 'status-value';
                    }
                } catch (erro) {
                    console.error('Erro buscando dados:', erro);
                    document.getElementById('statusDispositivo').textContent = '🔴 Erro conexão';
                    document.getElementById('statusDispositivo').className = 'status-value';
                }
            }
            
            // Atualizar dados
            function atualizarDados() {
                buscarDados();
                mostrarNotificacao('🔄 Dados atualizados com sucesso!', 'success');
            }
            
            // Exportar dados
            async function exportarDados() {
                try {
                    const response = await fetch('/api/history?limit=1000');
                    const data = await response.json();
                    
                    if (data.length === 0) {
                        mostrarNotificacao('❌ Nenhum dado para exportar!', 'error');
                        return;
                    }
                    
                    const headers = ['Timestamp', 'Tensão Trifásica (V)', 'Corrente Trifásica (A)', 'Potência Ativa (W)', 
                                   'Frequência (Hz)', 'Demanda Ativa (W)', 'Tensão F1 (V)', 'Tensão F2 (V)', 'Tensão F3 (V)',
                                   'THD F1 (%)', 'THD F2 (%)', 'THD F3 (%)'];
                    
                    const csvContent = [
                        headers.join(','),
                        ...data.map(row => [
                            `"${row.timestamp}"`,
                            row.Tensao_Trifasica || '',
                            row.Corrente_Trifasica || '',
                            row.Potencia_Ativa_Trifasica || '',
                            row.Frequencia || '',
                            row.Demanda_Ativa || '',
                            row.Tensao_Fase_1 || '',
                            row.Tensao_Fase_2 || '',
                            row.Tensao_Fase_3 || '',
                            row.THD_Tensao_Fase_1 || '',
                            row.THD_Tensao_Fase_2 || '',
                            row.THD_Tensao_Fase_3 || ''
                        ].join(','))
                    ].join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `relatorio_ufrj_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    mostrarNotificacao('📊 Relatório exportado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro exportando dados:', error);
                    mostrarNotificacao('❌ Erro ao exportar dados!', 'error');
                }
            }
            
            // Capturar dashboard
            function capturarDashboard() {
                html2canvas(document.body).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `dashboard_ufrj_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                    mostrarNotificacao('📷 Captura de tela salva!', 'success');
                });
            }
            
            // Mostrar notificação
            function mostrarNotificacao(mensagem, tipo) {
                // Criar elemento de notificação
                const notification = document.createElement('div');
                notification.textContent = mensagem;
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${tipo === 'success' ? '#27ae60' : '#e74c3c'};
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 14px;
                    animation: slideIn 0.3s ease;
                `;
                
                document.body.appendChild(notification);
                
                // Remover após 3 segundos
                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    }, 300);
                }, 3000);
            }
            
            // Inicializar sistema
            document.addEventListener('DOMContentLoaded', function() {
                console.log('🚀 Dashboard UFRJ Premium - Sistema inicializado!');
                console.log('✅ Análise completa por fases ativada');
                console.log('📊 Gráficos e visualizações prontos');
                
                buscarDados();
                setInterval(atualizarTempoOperacao, 1000);
                
                // Atualizar a cada 3 segundos
                setInterval(buscarDados, 3000);
                
                // Adicionar estilo para animações
                const style = document.createElement('style');
                style.textContent = \`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                \`;
                document.head.appendChild(style);
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
    console.log(`🚀 Servidor Multimedidor UFRJ Premium rodando na porta ${PORT}`);
    console.log(`🎨 Dashboard Premium: http://localhost:${PORT}`);
    console.log(`✅ Análise completa por fases e THD`);
    console.log(`📊 Gráficos interativos ativos`);
    console.log(`🏛️ Sistema UFRJ - Versão Definitiva`);
});