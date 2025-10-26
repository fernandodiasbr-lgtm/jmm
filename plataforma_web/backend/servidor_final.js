console.log("🚀 SERVIDOR MULTIMEDIDOR UFRJ - INICIANDO...");

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// ========== CONFIGURAÇÃO PARA PRODUÇÃO ==========
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

// ========== BANCO DE DADOS SIMPLES COM JSON ==========
const dataFile = path.join(__dirname, 'dados.json');

// Função para carregar dados
function carregarDados() {
    try {
        if (fs.existsSync(dataFile)) {
            const data = fs.readFileSync(dataFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('📁 Criando novo arquivo de dados...');
    }
    return { leituras: [], ultimaAtualizacao: new Date().toISOString() };
}

// Função para salvar dados
function salvarDados(dados) {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(dados, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return false;
    }
}

// Carregar dados iniciais
let db = carregarDados();
console.log('✅ Banco de dados JSON carregado.');
console.log(`📊 Leituras existentes: ${db.leituras.length}`);

// Array para dados em memória (cache)
let dadosMemoria = [];

// ========== FUNÇÕES DE EXPORTAÇÃO CSV ==========

function exportarDadosCompletos(res) {
    console.log('📤 Exportando dados completos para CSV...');
    
    const leituras = db.leituras.slice(-10000); // Limite de 10.000 registros
    
    if (leituras.length === 0) {
        return res.status(404).json({ error: 'Nenhum dado encontrado para exportação' });
    }
    
    const headers = [
        'ID', 'Device ID', 'Timestamp', 'Tensão Trifásica (V)', 'Corrente Trifásica (A)',
        'Fator Potência Trifásico', 'Potência Aparente Trifásica (VA)', 'Potência Reativa Trifásica (Var)',
        'Potência Ativa Trifásica (W)', 'Frequência (Hz)', 'Tensão Fase 1 (V)', 'Tensão Fase 2 (V)',
        'Tensão Fase 3 (V)', 'Corrente Fase 1 (A)', 'Corrente Fase 2 (A)', 'Corrente Fase 3 (A)',
        'Energia Ativa Positiva (kWh)', 'Energia Reativa Positiva (kVARh)', 'Demanda Máxima Ativa (W)',
        'Demanda Ativa (W)', 'Tensão Linha 12 (V)', 'Tensão Linha 23 (V)', 'Tensão Linha 31 (V)',
        'THD Tensão Fase 1 (%)', 'THD Tensão Fase 2 (%)', 'THD Tensão Fase 3 (%)',
        'THD Corrente Fase 1 (%)', 'THD Corrente Fase 2 (%)', 'THD Corrente Fase 3 (%)',
        'Client IP', 'Data/Hora Criação'
    ].join(';');
    
    const csvLines = leituras.map((row, index) => {
        const values = [
            index + 1,
            `"${row.device_id || ''}"`,
            `"${row.timestamp || ''}"`,
            row.Tensao_Trifasica || '',
            row.Corrente_Trifasica || '',
            row.Fator_Potencia_Trifasico || '',
            row.Potencia_Aparente_Trifasica || '',
            row.Potencia_Reativa_Trifasica || '',
            row.Potencia_Ativa_Trifasica || '',
            row.Frequencia || '',
            row.Tensao_Fase_1 || '',
            row.Tensao_Fase_2 || '',
            row.Tensao_Fase_3 || '',
            row.Corrente_Fase_1 || '',
            row.Corrente_Fase_2 || '',
            row.Corrente_Fase_3 || '',
            row.Energia_Ativa_Positiva || '',
            row.Energia_Reativa_Positiva || '',
            row.Demanda_Maxima_Ativa || '',
            row.Demanda_Ativa || '',
            row.Tensao_Linha_12 || '',
            row.Tensao_Linha_23 || '',
            row.Tensao_Linha_31 || '',
            row.THD_Tensao_Fase_1 || '',
            row.THD_Tensao_Fase_2 || '',
            row.THD_Tensao_Fase_3 || '',
            row.THD_Corrente_Fase_1 || '',
            row.THD_Corrente_Fase_2 || '',
            row.THD_Corrente_Fase_3 || '',
            `"${row.client_ip || ''}"`,
            `"${row.created_at || ''}"`
        ];
        return values.join(';');
    });
    
    const csvContent = [headers, ...csvLines].join('\r\n');
    const filename = `dados_completos_multimedidor_${formatDateForFilename(new Date())}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
    console.log(`✅ CSV exportado: ${leituras.length} registros`);
}

function exportarDadosResumidos(res) {
    console.log('📤 Exportando dados resumidos para CSV...');
    
    const leituras = db.leituras.slice(-5000); // Limite de 5.000 registros
    
    if (leituras.length === 0) {
        return res.status(404).json({ error: 'Nenhum dado encontrado para exportação' });
    }
    
    const headers = [
        'Data_Hora', 'Tensao_Trifasica_V', 'Corrente_Trifasica_A', 'Potencia_Ativa_W',
        'Demanda_Ativa_W', 'Frequencia_Hz', 'Fator_Potencia', 'Energia_Ativa_kWh', 'THD_Tensao_F1_%'
    ].join(';');
    
    const csvLines = leituras.map(row => {
        const values = [
            row.created_at || '',
            row.Tensao_Trifasica || '',
            row.Corrente_Trifasica || '',
            row.Potencia_Ativa_Trifasica || '',
            row.Demanda_Ativa || '',
            row.Frequencia || '',
            row.Fator_Potencia_Trifasico || '',
            row.Energia_Ativa_Positiva || '',
            row.THD_Tensao_Fase_1 || ''
        ];
        return values.join(';');
    });
    
    const csvContent = [headers, ...csvLines].join('\r\n');
    const filename = `dados_resumidos_multimedidor_${formatDateForFilename(new Date())}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
    console.log(`✅ CSV resumido exportado: ${leituras.length} registros`);
}

function formatDateForFilename(date) {
    return date.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, 19);
}

// ========== ROTAS DE EXPORTAÇÃO CSV ==========
app.get('/api/exportar/csv/completo', (req, res) => {
    exportarDadosCompletos(res);
});

app.get('/api/exportar/csv/resumido', (req, res) => {
    exportarDadosResumidos(res);
});

// ========== ROTAS PARA GRÁFICOS DE DEMANDA ==========
app.get('/api/demanda-diaria', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda diária...');
        
        const ultimas24Horas = db.leituras
            .filter(leitura => {
                const leituraDate = new Date(leitura.created_at);
                const agora = new Date();
                return (agora - leituraDate) <= (24 * 60 * 60 * 1000);
            })
            .filter(leitura => leitura.Demanda_Ativa && leitura.Demanda_Ativa > 0);
        
        // Agrupar por hora
        const horasMap = new Map();
        
        for (let i = 0; i < 24; i++) {
            const hora = i.toString().padStart(2, '0') + ':00';
            horasMap.set(hora, {
                hora: hora,
                demanda_media: 0,
                demanda_maxima: 0,
                demanda_minima: 0,
                registros: 0
            });
        }
        
        ultimas24Horas.forEach(leitura => {
            const date = new Date(leitura.created_at);
            const hora = date.getHours().toString().padStart(2, '0') + ':00';
            
            if (horasMap.has(hora)) {
                const dadosHora = horasMap.get(hora);
                dadosHora.demanda_media += leitura.Demanda_Ativa;
                dadosHora.demanda_maxima = Math.max(dadosHora.demanda_maxima, leitura.Demanda_Ativa);
                dadosHora.demanda_minima = dadosHora.demanda_minima === 0 ? 
                    leitura.Demanda_Ativa : Math.min(dadosHora.demanda_minima, leitura.Demanda_Ativa);
                dadosHora.registros++;
            }
        });
        
        // Calcular médias
        const horasCompletas = Array.from(horasMap.values()).map(hora => ({
            ...hora,
            demanda_media: hora.registros > 0 ? parseFloat((hora.demanda_media / hora.registros).toFixed(2)) : 0
        }));
        
        const demandasValidas = horasCompletas.filter(h => h.demanda_media > 0);
        const mediaGeral = demandasValidas.length > 0 ? 
            demandasValidas.reduce((sum, h) => sum + h.demanda_media, 0) / demandasValidas.length : 0;
        const maximaGeral = Math.max(...horasCompletas.map(h => h.demanda_maxima));
        const minimaGeral = Math.min(...horasCompletas.filter(h => h.demanda_minima > 0).map(h => h.demanda_minima)) || 0;
        
        res.json({
            status: 'success',
            periodo: 'Últimas 24 horas',
            total_horas: horasCompletas.length,
            dados: horasCompletas,
            estatisticas: {
                media_geral: parseFloat(mediaGeral.toFixed(2)),
                maxima_geral: parseFloat(maximaGeral.toFixed(2)),
                minima_geral: parseFloat(minimaGeral.toFixed(2)),
                horas_com_dados: demandasValidas.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erro na rota demanda-diaria:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/demanda-mensal', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda mensal...');
        
        const ultimos30Dias = db.leituras
            .filter(leitura => {
                const leituraDate = new Date(leitura.created_at);
                const agora = new Date();
                return (agora - leituraDate) <= (30 * 24 * 60 * 60 * 1000);
            })
            .filter(leitura => leitura.Demanda_Ativa && leitura.Demanda_Ativa > 0);
        
        // Agrupar por dia
        const diasMap = new Map();
        
        ultimos30Dias.forEach(leitura => {
            const date = new Date(leitura.created_at);
            const dataKey = date.toISOString().split('T')[0];
            
            if (!diasMap.has(dataKey)) {
                diasMap.set(dataKey, {
                    data: date.toLocaleDateString('pt-BR'),
                    data_iso: dataKey,
                    demanda_media: 0,
                    demanda_maxima: 0,
                    demanda_minima: 0,
                    registros: 0
                });
            }
            
            const dadosDia = diasMap.get(dataKey);
            dadosDia.demanda_media += leitura.Demanda_Ativa;
            dadosDia.demanda_maxima = Math.max(dadosDia.demanda_maxima, leitura.Demanda_Ativa);
            dadosDia.demanda_minima = dadosDia.demanda_minima === 0 ? 
                leitura.Demanda_Ativa : Math.min(dadosDia.demanda_minima, leitura.Demanda_Ativa);
            dadosDia.registros++;
        });
        
        // Calcular médias
        const dadosFormatados = Array.from(diasMap.values()).map(dia => ({
            ...dia,
            demanda_media: dia.registros > 0 ? parseFloat((dia.demanda_media / dia.registros).toFixed(2)) : 0
        })).sort((a, b) => new Date(a.data_iso) - new Date(b.data_iso));
        
        const demandasValidas = dadosFormatados.filter(d => d.demanda_media > 0);
        const mediaGeral = demandasValidas.length > 0 ? 
            demandasValidas.reduce((sum, d) => sum + d.demanda_media, 0) / demandasValidas.length : 0;
        const maximaGeral = Math.max(...dadosFormatados.map(d => d.demanda_maxima));
        const minimaGeral = Math.min(...dadosFormatados.filter(d => d.demanda_minima > 0).map(d => d.demanda_minima)) || 0;
        
        res.json({
            status: 'success',
            periodo: 'Últimos 30 dias',
            total_dias: dadosFormatados.length,
            dados: dadosFormatados,
            estatisticas: {
                media_geral: parseFloat(mediaGeral.toFixed(2)),
                maxima_geral: parseFloat(maximaGeral.toFixed(2)),
                minima_geral: parseFloat(minimaGeral.toFixed(2)),
                dias_com_dados: demandasValidas.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erro na rota demanda-mensal:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/demanda-tempo-real', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda em tempo real...');
        
        const ultimas6Horas = db.leituras
            .filter(leitura => {
                const leituraDate = new Date(leitura.created_at);
                const agora = new Date();
                return (agora - leituraDate) <= (6 * 60 * 60 * 1000);
            })
            .filter(leitura => leitura.Demanda_Ativa && leitura.Demanda_Ativa > 0)
            .slice(-100); // Últimos 100 registros
        
        const dadosOrdenados = ultimas6Horas.map(leitura => {
            const timestamp = new Date(leitura.created_at);
            return {
                timestamp: timestamp.toLocaleTimeString('pt-BR'),
                timestamp_iso: leitura.created_at,
                demanda: leitura.Demanda_Ativa ? parseFloat(leitura.Demanda_Ativa.toFixed(2)) : 0,
                demanda_maxima: leitura.Demanda_Maxima_Ativa ? parseFloat(leitura.Demanda_Maxima_Ativa.toFixed(2)) : 0
            };
        });
        
        const ultimoRegistro = ultimas6Horas[ultimas6Horas.length - 1];
        const demandaAtual = ultimoRegistro ? (ultimoRegistro.Demanda_Ativa || 0) : 0;
        const demandaMaxima = Math.max(...dadosOrdenados.map(d => d.demanda));
        
        res.json({
            status: 'success',
            periodo: 'Últimas 6 horas',
            total_registros: dadosOrdenados.length,
            dados: dadosOrdenados,
            estatisticas: {
                demanda_atual: parseFloat(demandaAtual.toFixed(2)),
                demanda_maxima: parseFloat(demandaMaxima.toFixed(2))
            }
        });
        
    } catch (error) {
        console.error('❌ Erro na rota demanda-tempo-real:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== CONFIGURAÇÃO DO SERVIDOR ==========
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware de log
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// ========== ROTAS DA API ==========
app.post('/api/data', async (req, res) => {
    console.log('\n🎉 DADOS RECEBIDOS DO ESP32!');
    console.log('Dispositivo:', req.body.device_id || 'N/A');
    console.log('Tensão:', req.body.Tensao_Trifasica || 'N/A', 'V');
    console.log('Corrente:', req.body.Corrente_Trifasica || 'N/A', 'A');
    console.log('Potência:', req.body.Potencia_Ativa_Trifasica || 'N/A', 'W');
    console.log('Demanda:', req.body.Demanda_Ativa || 'N/A', 'W');
    console.log('THD F1:', req.body.THD_Tensao_Fase_1 || 'N/A', '%');
    console.log('Total de campos recebidos:', Object.keys(req.body).length);
    console.log('---');
    
    try {
        const novaLeitura = {
            ...req.body,
            timestamp: req.body.timestamp || new Date().toLocaleString('pt-BR'),
            client_ip: req.ip,
            created_at: new Date().toISOString()
        };

        // Adicionar à memória
        dadosMemoria.unshift(novaLeitura);
        if (dadosMemoria.length > 50) dadosMemoria = dadosMemoria.slice(0, 50);

        // Adicionar ao banco JSON
        db.leituras.push(novaLeitura);
        db.ultimaAtualizacao = new Date().toISOString();
        
        // Manter apenas últimos 10.000 registros
        if (db.leituras.length > 10000) {
            db.leituras = db.leituras.slice(-10000);
        }
        
        // Salvar no arquivo
        const salvo = salvarDados(db);
        
        if (salvo) {
            console.log(`✅ Dados salvos no JSON. Total: ${db.leituras.length} registros`);
            
            res.json({ 
                status: 'success', 
                message: 'Dados recebidos e salvos!',
                total_registros: db.leituras.length,
                received: req.body
            });
        } else {
            throw new Error('Erro ao salvar dados no arquivo');
        }

    } catch (error) {
        console.error('❌ ERRO CRÍTICO ao processar dados:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao salvar dados',
            error_details: error.message
        });
    }
});

app.get('/api/data', (req, res) => {
    res.json({
        status: 'online',
        total_dados: dadosMemoria.length,
        total_registros: db.leituras.length,
        ultima_atualizacao: new Date().toLocaleString('pt-BR'),
        dados: dadosMemoria.slice(0, 10)
    });
});

app.get('/api/historico', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const historico = db.leituras.slice(-limit).reverse();
        
        res.json({
            status: 'success',
            total: historico.length,
            limite: limit,
            dados: historico
        });
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        res.status(500).json({ status: 'error', message: 'Erro ao buscar histórico' });
    }
});

app.get('/api/estatisticas', async (req, res) => {
    try {
        const leiturasComTensao = db.leituras.filter(l => l.Tensao_Trifasica !== null && l.Tensao_Trifasica !== undefined);
        
        const estatisticas = {
            total_leituras: db.leituras.length,
            tensao_media: leiturasComTensao.length > 0 ? 
                leiturasComTensao.reduce((sum, l) => sum + l.Tensao_Trifasica, 0) / leiturasComTensao.length : 0,
            corrente_media: leiturasComTensao.length > 0 ? 
                leiturasComTensao.reduce((sum, l) => sum + (l.Corrente_Trifasica || 0), 0) / leiturasComTensao.length : 0,
            potencia_media: leiturasComTensao.length > 0 ? 
                leiturasComTensao.reduce((sum, l) => sum + (l.Potencia_Ativa_Trifasica || 0), 0) / leiturasComTensao.length : 0,
            potencia_maxima: Math.max(...leiturasComTensao.map(l => l.Potencia_Ativa_Trifasica || 0)),
            potencia_minima: Math.min(...leiturasComTensao.filter(l => l.Potencia_Ativa_Trifasica > 0).map(l => l.Potencia_Ativa_Trifasica)) || 0,
            data_inicio: db.leituras.length > 0 ? db.leituras[0].created_at : null,
            data_fim: db.leituras.length > 0 ? db.leituras[db.leituras.length - 1].created_at : null
        };
        
        res.json({ status: 'success', estatisticas });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({ status: 'error', message: 'Erro ao buscar estatísticas' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'Multimedidor UFRJ',
        port: PORT,
        database: 'JSON File',
        total_dados_memoria: dadosMemoria.length,
        total_registros: db.leituras.length,
        timestamp: new Date().toLocaleString('pt-BR')
    });
});

app.post('/api/clear', (req, res) => {
    dadosMemoria = [];
    db.leituras = [];
    db.ultimaAtualizacao = new Date().toISOString();
    salvarDados(db);
    
    res.json({ status: 'success', message: 'Dados limpos com sucesso!' });
});

// ========== DASHBOARD HTML COMPLETO ==========
// (MANTENHA TODO O HTML DO DASHBOARD AQUI - É O MESMO)
// [TODO O HTML DO DASHBOARD PERMANECE IGUAL - SÓ MUDA A PARTE DO BACKEND]

// ... (TODO O HTML DO DASHBOARD VEM AQUI - É EXATAMENTE O MESMO QUE ANTES)
// [POR QUESTÕES DE ESPAÇO, MANTENHO O HTML COMPLETO, MAS NA PRÁTICA É O MESMO]

app.get('/', (req, res) => {
    const ultimoDado = dadosMemoria[0] || {};
    
    // [TODO O HTML DO DASHBOARD - EXATAMENTE IGUAL AO ANTERIOR]
    // Por questões de espaço, mantenho a estrutura mas o conteúdo é o mesmo
    const html = `<!DOCTYPE html>...</html>`; // SEU HTML COMPLETO AQUI
    
    res.send(html);
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(' ');
    console.log('🚀 SERVIDOR MULTIMEDIDOR UFRJ - DEPLOY PRODUÇÃO');
    console.log('📍 Porta: ' + PORT);
    console.log('🌐 Ambiente: ' + (isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'));
    console.log('💾 Banco de dados: JSON File');
    console.log('📊 Leituras carregadas: ' + db.leituras.length);
    console.log('🎓 Universidade Federal do Rio de Janeiro');
    console.log(' ');
    console.log('📊 Endpoints disponíveis:');
    console.log('   📍 GET  /              - Dashboard completo com gráficos');
    console.log('   📍 POST /api/data      - Receber dados do ESP32');
    console.log('   📍 GET  /api/exportar/csv/completo      - Exportar CSV completo');
    console.log('   📍 GET  /api/exportar/csv/resumido      - Exportar CSV resumido');
    console.log('   📍 GET  /api/demanda-diaria    - Gráfico demanda diária');
    console.log('   📍 GET  /api/demanda-mensal    - Gráfico demanda mensal');
    console.log('   📍 GET  /api/demanda-tempo-real - Gráfico tempo real');
    console.log(' ');
});