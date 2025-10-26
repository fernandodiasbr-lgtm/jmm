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
        <style>
            :root {
                --ufrj-blue: #0047a0;
                --ufrj-gold: #ffd700;
                --danger: #e74c3c;
                --success: #27ae60;
                --warning: #f39c12;
                --dark: #2c3e50;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, var(--ufrj-blue) 0%, #00264d 100%);
                min-height: 100vh;
                color: #333;
                padding: 20px;
            }
            .container { max-width: 1400px; margin: 0 auto; }
            
            /* HEADER UFRJ */
            .header-ufrj {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px; 
                border-radius: 20px; 
                margin-bottom: 25px; 
                text-align: center;
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                border: 3px solid var(--ufrj-gold);
                position: relative;
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
            .header-ufrj h1 { 
                color: var(--ufrj-blue); 
                font-size: 2.8em; 
                margin-bottom: 10px;
                font-weight: 800;
            }
            .header-ufrj h2 {
                color: var(--danger);
                font-size: 1.8em;
                margin-bottom: 10px;
            }
            .version-badge {
                background: linear-gradient(45deg, var(--success), #3498db);
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: 600;
                display: inline-block;
                margin-top: 10px;
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
                transition: transform 0.3s ease;
            }
            .status-card:hover {
                transform: translateY(-5px);
            }
            .status-value {
                font-size: 2em;
                font-weight: 800;
                color: var(--dark);
                margin-bottom: 5px;
            }
            .status-label {
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            /* CONTROLS */
            .controls {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 25px 0;
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
            }
            .btn-primary {
                background: linear-gradient(45deg, #3498db, #2980b9);
                color: white;
            }
            .btn-success {
                background: linear-gradient(45deg, var(--success), #229954);
                color: white;
            }
            .btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            }
            
            /* MAIN GRID */
            .grid-main { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
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
            }
            .metric-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            }
            .card-tensao { border-left-color: var(--danger); }
            .card-corrente { border-left-color: var(--success); }
            .card-potencia { border-left-color: var(--warning); }
            .card-frequencia { border-left-color: #9b59b6; }
            .card-thd { border-left-color: #e67e22; }
            
            .metric-card h3 {
                color: var(--dark);
                margin-bottom: 15px;
                font-size: 1.3em;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .metric-value {
                font-size: 2.8em;
                font-weight: 800;
                color: var(--dark);
                margin: 15px 0;
            }
            .metric-unit {
                font-size: 1.1em;
                color: #7f8c8d;
                margin-left: 8px;
            }
            
            /* PHASE ANALYSIS */
            .section-title {
                color: white;
                font-size: 2.2em;
                text-align: center;
                margin: 40px 0 30px 0;
                font-weight: 700;
            }
            .grid-phases {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
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
                border-bottom: 2px solid #ecf0f1;
            }
            .phase-title {
                font-size: 1.6em;
                font-weight: 700;
                color: var(--dark);
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
                color: #7f8c8d;
                font-size: 1em;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .param-value {
                font-weight: 700;
                color: var(--dark);
                font-size: 1.1em;
            }
            
            /* CHARTS */
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
                color: var(--dark);
                margin-bottom: 20px;
                font-size: 1.4em;
                font-weight: 600;
            }
            
            /* FOOTER */
            .footer {
                text-align: center;
                color: white;
                margin-top: 50px;
                padding: 25px;
                background: rgba(0,0,0,0.2);
                border-radius: 15px;
            }
            .update-time {
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 10px;
                margin-top: 20px;
                color: white;
            }
            
            @media (max-width: 768px) {
                .grid-main, .grid-phases, .charts-grid {
                    grid-template-columns: 1fr;
                }
                .header-ufrj h1 {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- HEADER UFRJ -->
            <div class="header-ufrj">
                <h1>🏛️ MULTIMEDIDOR UFRJ</h1>
                <h2>Sistema Inteligente de Monitoramento de Energia</h2>
                <div class="version-badge">🚀 VERSÃO PREMIUM - ANÁLISE COMPLETA</div>
            </div>
            
            <!-- STATUS BAR -->
            <div class="status-bar">
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
            </div>
            
            <!-- CONTROLS -->
            <div class="controls">
                <button class="btn btn-primary" onclick="atualizarDados()">
                    🔄 Atualizar Dados
                </button>
                <button class="btn btn-success" onclick="exportarDados()">
                    📊 Exportar Relatório
                </button>
            </div>
            
            <!-- METRICAS PRINCIPAIS -->
            <div class="grid-main">
                <div class="metric-card card-tensao">
                    <h3>⚡ Tensão Trifásica</h3>
                    <div class="metric-value" id="tensaoTrifasica">--</div>
                    <div class="metric-unit">Volts</div>
                </div>
                
                <div class="metric-card card-corrente">
                    <h3>🔌 Corrente Trifásica</h3>
                    <div class="metric-value" id="correnteTrifasica">--</div>
                    <div class="metric-unit">Amperes</div>
                </div>
                
                <div class="metric-card card-potencia">
                    <h3>💡 Potência Ativa</h3>
                    <div class="metric-value" id="potenciaAtiva">--</div>
                    <div class="metric-unit">Watts</div>
                </div>
                
                <div class="metric-card card-frequencia">
                    <h3>📊 Frequência</h3>
                    <div class="metric-value" id="frequencia">--</div>
                    <div class="metric-unit">Hertz</div>
                </div>
                
                <div class="metric-card card-thd">
                    <h3>🎯 THD Tensão F1</h3>
                    <div class="metric-value" id="thdTensaoF1">--</div>
                    <div class="metric-unit">Percentual</div>
                </div>
            </div>
            
            <!-- ANÁLISE DETALHADA POR FASES -->
            <h2 class="section-title">🔍 ANÁLISE DETALHADA POR FASES</h2>
            
            <div class="grid-phases">
                <!-- FASE 1 -->
                <div class="phase-card phase-1">
                    <div class="phase-header">
                        <div class="phase-title">🔴 Fase 1</div>
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
                <div class="phase-card phase-2">
                    <div class="phase-header">
                        <div class="phase-title">🟢 Fase 2</div>
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
                <div class="phase-card phase-3">
                    <div class="phase-header">
                        <div class="phase-title">🟡 Fase 3</div>
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
            <h2 class="section-title">📈 VISUALIZAÇÃO GRÁFICA</h2>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-title">Tensão por Fase (V)</div>
                    <canvas id="tensaoChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">THD por Fase (%)</div>
                    <canvas id="thdChart"></canvas>
                </div>
            </div>
            
            <!-- FOOTER -->
            <div class="footer">
                <div>🏛️ Universidade Federal do Rio de Janeiro - UFRJ</div>
                <div class="update-time" id="updateTime">Sistema inicializado - Aguardando dados...</div>
            </div>
        </div>

        <script>
            let tensaoChart, thdChart;
            
            function formatarNumero(valor, decimais = 2) {
                if (valor == null || isNaN(valor)) return '--';
                return parseFloat(valor).toFixed(decimais);
            }
            
            function atualizarDisplay(dados) {
                console.log('🎯 Dashboard Premium - Atualizando dados:', dados);
                
                // Cards principais
                document.getElementById('tensaoTrifasica').textContent = formatarNumero(dados.Tensao_Trifasica);
                document.getElementById('correnteTrifasica').textContent = formatarNumero(dados.Corrente_Trifasica);
                document.getElementById('potenciaAtiva').textContent = formatarNumero(dados.Potencia_Ativa_Trifasica);
                document.getElementById('frequencia').textContent = formatarNumero(dados.Frequencia);
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
                document.getElementById('updateTime').textContent = 'Última atualização: ' + agora.toLocaleString();
                
                atualizarGraficos(dados);
            }
            
            function atualizarGraficos(dados) {
                const coresFases = ['#e74c3c', '#2ecc71', '#f39c12'];
                
                // Gráfico de Tensão
                if (tensaoChart) {
                    tensaoChart.data.datasets[0].data = [
                        dados.Tensao_Fase_1 || 0,
                        dados.Tensao_Fase_2 || 0,
                        dados.Tensao_Fase_3 || 0
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
                                    dados.Tensao_Fase_1 || 0,
                                    dados.Tensao_Fase_2 || 0,
                                    dados.Tensao_Fase_3 || 0
                                ],
                                backgroundColor: coresFases
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true
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
                    thdChart.update();
                } else {
                    const ctx2 = document.getElementById('thdChart').getContext('2d');
                    thdChart = new Chart(ctx2, {
                        type: 'bar',
                        data: {
                            labels: ['Fase 1', 'Fase 2', 'Fase 3'],
                            datasets: [{
                                label: 'THD (%)',
                                data: [
                                    dados.THD_Tensao_Fase_1 || 0,
                                    dados.THD_Tensao_Fase_2 || 0,
                                    dados.THD_Tensao_Fase_3 || 0
                                ],
                                backgroundColor: coresFases
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                }
            }
            
            async function buscarDados() {
                try {
                    const resposta = await fetch('/api/latest');
                    const resultado = await resposta.json();
                    
                    if (resultado.latest) {
                        document.getElementById('totalLeituras').textContent = resultado.totalReadings;
                        atualizarDisplay(resultado.latest);
                        document.getElementById('statusDispositivo').textContent = '🟢 Online';
                    } else {
                        document.getElementById('statusDispositivo').textContent = '🟡 Aguardando dados';
                    }
                } catch (erro) {
                    console.error('Erro buscando dados:', erro);
                    document.getElementById('statusDispositivo').textContent = '🔴 Erro conexão';
                }
            }
            
            function atualizarDados() {
                buscarDados();
                alert('Dados atualizados!');
            }
            
            async function exportarDados() {
                try {
                    const response = await fetch('/api/history?limit=1000');
                    const data = await response.json();
                    
                    if (data.length === 0) {
                        alert('Nenhum dado para exportar!');
                        return;
                    }
                    
                    const headers = ['Timestamp', 'Tensão Trifásica (V)', 'Corrente Trifásica (A)', 'Potência Ativa (W)', 
                                   'Frequência (Hz)', 'Demanda Ativa (W)', 'Tensão F1 (V)', 'Tensão F2 (V)', 'Tensão F3 (V)',
                                   'THD F1 (%)', 'THD F2 (%)', 'THD F3 (%)'];
                    
                    const csvContent = [
                        headers.join(','),
                        ...data.map(row => [
                            row.timestamp,
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
                    link.setAttribute('download', 'relatorio_ufrj.csv');
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    alert('Relatório exportado com sucesso!');
                } catch (error) {
                    console.error('Erro exportando dados:', error);
                    alert('Erro ao exportar dados!');
                }
            }
            
            document.addEventListener('DOMContentLoaded', function() {
                console.log('🚀 Dashboard UFRJ Premium - Sistema carregado!');
                buscarDados();
                setInterval(buscarDados, 5000);
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
    console.log('🚀 Servidor Multimedidor UFRJ Premium rodando na porta ' + PORT);
    console.log('🎨 Dashboard Premium: http://localhost:' + PORT);
    console.log('✅ Análise completa por fases ativada');
});