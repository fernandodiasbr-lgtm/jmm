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

// DASHBOARD COMPLETO COM FASES E THD
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multimedidor UFRJ - Dashboard Completo v2.0</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                color: #333;
            }
            .container { max-width: 1400px; margin: 0 auto; }
            
            .header { 
                background: rgba(255, 255, 255, 0.95);
                padding: 30px; 
                border-radius: 20px; 
                margin-bottom: 20px; 
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                border: 3px solid #2c3e50;
            }
            .header h1 { 
                color: #2c3e50; 
                font-size: 2.8em; 
                margin-bottom: 10px;
            }
            .header h2 {
                color: #e74c3c;
                font-size: 1.8em;
                margin-bottom: 10px;
            }
            .version {
                background: #3498db;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.9em;
                display: inline-block;
                margin-top: 10px;
            }
            
            .status-bar {
                display: flex;
                justify-content: space-around;
                align-items: center;
                background: rgba(255, 255, 255, 0.9);
                padding: 20px;
                border-radius: 15px;
                margin-bottom: 20px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                flex-wrap: wrap;
                gap: 15px;
            }
            .status-item {
                text-align: center;
                flex: 1;
                min-width: 120px;
            }
            .status-value {
                font-size: 1.8em;
                font-weight: bold;
                color: #2c3e50;
            }
            .status-label {
                font-size: 0.9em;
                color: #7f8c8d;
                margin-top: 5px;
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
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .btn-primary {
                background: #3498db;
                color: white;
            }
            .btn-success {
                background: #27ae60;
                color: white;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .grid-principal { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 20px; 
                margin-bottom: 30px;
            }
            
            .grid-fases {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .card {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                border-left: 5px solid #3498db;
            }
            .card-tensao { border-left-color: #e74c3c; }
            .card-corrente { border-left-color: #2ecc71; }
            .card-potencia { border-left-color: #f39c12; }
            .card-frequencia { border-left-color: #9b59b6; }
            .card-thd { border-left-color: #e67e22; }
            
            .card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.3em;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
            }
            
            .valor {
                font-size: 2.5em;
                font-weight: bold;
                color: #2c3e50;
                margin: 15px 0;
            }
            
            .unidade {
                font-size: 1.1em;
                color: #7f8c8d;
                margin-left: 8px;
            }
            
            .fase-card {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                border-left: 5px solid #3498db;
            }
            .fase-1 { border-left-color: #e74c3c; }
            .fase-2 { border-left-color: #2ecc71; }
            .fase-3 { border-left-color: #f39c12; }
            
            .fase-titulo {
                font-size: 1.5em;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 20px;
                text-align: center;
                padding: 10px;
                border-radius: 8px;
            }
            .fase-1 .fase-titulo { background: rgba(231, 76, 60, 0.1); }
            .fase-2 .fase-titulo { background: rgba(46, 204, 113, 0.1); }
            .fase-3 .fase-titulo { background: rgba(243, 156, 18, 0.1); }
            
            .parametro {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #ecf0f1;
            }
            .parametro:last-child {
                border-bottom: none;
            }
            .param-nome {
                color: #7f8c8d;
                font-size: 1em;
            }
            .param-valor {
                font-weight: bold;
                color: #2c3e50;
                font-size: 1.1em;
            }
            
            .atualizacao {
                text-align: center;
                color: #7f8c8d;
                margin-top: 30px;
                font-size: 0.9em;
                background: rgba(255, 255, 255, 0.8);
                padding: 15px;
                border-radius: 10px;
            }
            
            @media (max-width: 768px) {
                .grid-principal, .grid-fases {
                    grid-template-columns: 1fr;
                }
                .status-bar {
                    flex-direction: column;
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
                <h1>🏛️ MULTIMEDIDOR UFRJ</h1>
                <h2>DASHBOARD COMPLETO - FASES E THD</h2>
                <p>Sistema de Monitoramento de Energia em Tempo Real</p>
                <div class="version">Versão 2.0 - Análise Detalhada por Fase</div>
            </div>
            
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-value" id="totalLeituras">0</div>
                    <div class="status-label">Total de Leituras</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="ultimaAtualizacao">--:--:--</div>
                    <div class="status-label">Última Atualização</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="statusDispositivo">🟢 Online</div>
                    <div class="status-label">Status do Dispositivo</div>
                </div>
            </div>
            
            <div class="controls">
                <button class="btn btn-primary" onclick="atualizarDados()">
                    🔄 Atualizar Dados
                </button>
                <button class="btn btn-success" onclick="exportarDados()">
                    📊 Exportar CSV
                </button>
            </div>
            
            <!-- CARDS PRINCIPAIS -->
            <div class="grid-principal">
                <div class="card card-tensao">
                    <h3>⚡ Tensão Trifásica</h3>
                    <div class="valor" id="tensaoTrifasica">--</div>
                    <div class="unidade">V</div>
                </div>
                
                <div class="card card-corrente">
                    <h3>🔌 Corrente Trifásica</h3>
                    <div class="valor" id="correnteTrifasica">--</div>
                    <div class="unidade">A</div>
                </div>
                
                <div class="card card-potencia">
                    <h3>💡 Potência Ativa</h3>
                    <div class="valor" id="potenciaAtiva">--</div>
                    <div class="unidade">W</div>
                </div>
                
                <div class="card card-frequencia">
                    <h3>📊 Frequência</h3>
                    <div class="valor" id="frequencia">--</div>
                    <div class="unidade">Hz</div>
                </div>
                
                <div class="card card-thd">
                    <h3>🎯 THD Tensão F1</h3>
                    <div class="valor" id="thdTensaoF1">--</div>
                    <div class="unidade">%</div>
                </div>
            </div>
            
            <!-- FASES DETALHADAS -->
            <div class="header">
                <h2>🔍 ANÁLISE DETALHADA POR FASE</h2>
            </div>
            
            <div class="grid-fases">
                <!-- FASE 1 -->
                <div class="fase-card fase-1">
                    <div class="fase-titulo">🔴 FASE 1</div>
                    
                    <div class="parametro">
                        <span class="param-nome">Tensão:</span>
                        <span class="param-valor" id="tensaoF1">-- V</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Corrente:</span>
                        <span class="param-valor" id="correnteF1">-- A</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Ativa:</span>
                        <span class="param-valor" id="potenciaF1">-- W</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Reativa:</span>
                        <span class="param-valor" id="reativaF1">-- Var</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Fator de Potência:</span>
                        <span class="param-valor" id="fpF1">--</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Tensão:</span>
                        <span class="param-valor" id="thdF1">-- %</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Corrente:</span>
                        <span class="param-valor" id="thdCorrenteF1">-- %</span>
                    </div>
                </div>
                
                <!-- FASE 2 -->
                <div class="fase-card fase-2">
                    <div class="fase-titulo">🟢 FASE 2</div>
                    
                    <div class="parametro">
                        <span class="param-nome">Tensão:</span>
                        <span class="param-valor" id="tensaoF2">-- V</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Corrente:</span>
                        <span class="param-valor" id="correnteF2">-- A</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Ativa:</span>
                        <span class="param-valor" id="potenciaF2">-- W</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Reativa:</span>
                        <span class="param-valor" id="reativaF2">-- Var</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Fator de Potência:</span>
                        <span class="param-valor" id="fpF2">--</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Tensão:</span>
                        <span class="param-valor" id="thdF2">-- %</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Corrente:</span>
                        <span class="param-valor" id="thdCorrenteF2">-- %</span>
                    </div>
                </div>
                
                <!-- FASE 3 -->
                <div class="fase-card fase-3">
                    <div class="fase-titulo">🟡 FASE 3</div>
                    
                    <div class="parametro">
                        <span class="param-nome">Tensão:</span>
                        <span class="param-valor" id="tensaoF3">-- V</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Corrente:</span>
                        <span class="param-valor" id="correnteF3">-- A</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Ativa:</span>
                        <span class="param-valor" id="potenciaF3">-- W</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Potência Reativa:</span>
                        <span class="param-valor" id="reativaF3">-- Var</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">Fator de Potência:</span>
                        <span class="param-valor" id="fpF3">--</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Tensão:</span>
                        <span class="param-valor" id="thdF3">-- %</span>
                    </div>
                    
                    <div class="parametro">
                        <span class="param-nome">THD Corrente:</span>
                        <span class="param-valor" id="thdCorrenteF3">-- %</span>
                    </div>
                </div>
            </div>
            
            <div class="atualizacao" id="tempoAtualizacao">
                Atualizado em: --
            </div>
        </div>

        <script>
            // Formatar números
            function formatarNumero(valor, decimais = 2) {
                if (valor == null || isNaN(valor)) return '--';
                return valor.toFixed(decimais);
            }
            
            // Atualizar display com dados
            function atualizarDisplay(dados) {
                console.log('Atualizando display com:', dados);
                
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
                document.getElementById('fpF1').textContent = formatarNumero(dados.Fator_Potencia_Fase_1);
                document.getElementById('thdF1').textContent = formatarNumero(dados.THD_Tensao_Fase_1) + ' %';
                document.getElementById('thdCorrenteF1').textContent = formatarNumero(dados.THD_Corrente_Fase_1) + ' %';
                
                // Fase 2
                document.getElementById('tensaoF2').textContent = formatarNumero(dados.Tensao_Fase_2) + ' V';
                document.getElementById('correnteF2').textContent = formatarNumero(dados.Corrente_Fase_2) + ' A';
                document.getElementById('potenciaF2').textContent = formatarNumero(dados.Potencia_Ativa_Fase_2) + ' W';
                document.getElementById('reativaF2').textContent = formatarNumero(dados.Potencia_Reativa_Fase_2) + ' Var';
                document.getElementById('fpF2').textContent = formatarNumero(dados.Fator_Potencia_Fase_2);
                document.getElementById('thdF2').textContent = formatarNumero(dados.THD_Tensao_Fase_2) + ' %';
                document.getElementById('thdCorrenteF2').textContent = formatarNumero(dados.THD_Corrente_Fase_2) + ' %';
                
                // Fase 3
                document.getElementById('tensaoF3').textContent = formatarNumero(dados.Tensao_Fase_3) + ' V';
                document.getElementById('correnteF3').textContent = formatarNumero(dados.Corrente_Fase_3) + ' A';
                document.getElementById('potenciaF3').textContent = formatarNumero(dados.Potencia_Ativa_Fase_3) + ' W';
                document.getElementById('reativaF3').textContent = formatarNumero(dados.Potencia_Reativa_Fase_3) + ' Var';
                document.getElementById('fpF3').textContent = formatarNumero(dados.Fator_Potencia_Fase_3);
                document.getElementById('thdF3').textContent = formatarNumero(dados.THD_Tensao_Fase_3) + ' %';
                document.getElementById('thdCorrenteF3').textContent = formatarNumero(dados.THD_Corrente_Fase_3) + ' %';
                
                // Atualizar timestamp
                const agora = new Date();
                document.getElementById('ultimaAtualizacao').textContent = agora.toLocaleTimeString();
                document.getElementById('tempoAtualizacao').textContent = 'Atualizado em: ' + agora.toLocaleString();
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
                    } else {
                        document.getElementById('statusDispositivo').textContent = '🟡 Aguardando dados';
                    }
                } catch (erro) {
                    console.error('Erro buscando dados:', erro);
                    document.getElementById('statusDispositivo').textContent = '🔴 Erro conexão';
                }
            }
            
            // Atualizar dados
            function atualizarDados() {
                buscarDados();
                alert('Dados atualizados!');
            }
            
            // Exportar dados
            async function exportarDados() {
                alert('Exportação em desenvolvimento...');
            }
            
            // Inicializar
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Dashboard COMPLETO carregado - buscando dados...');
                buscarDados();
                // Atualizar a cada 5 segundos
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
    console.log(`🚀 Servidor Multimedidor UFRJ rodando na porta ${PORT}`);
    console.log(`📊 Dashboard COMPLETO: http://localhost:${PORT}`);
    console.log(`✅ Com análise detalhada por fase e THD`);
    console.log(`🆕 Versão 2.0 - Dashboard Completo`);
});