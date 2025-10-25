console.log("🚀 SERVIDOR MULTIMEDIDOR UFRJ - INICIANDO...");

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();

// ========== CONFIGURAÇÃO PARA PRODUÇÃO ==========
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

// ========== CONFIGURAÇÃO DO BANCO DE DADOS ==========
const dbPath = isProduction ? ':memory:' : path.join(__dirname, 'dados_multimedidor.db');
console.log('📁 Caminho do banco:', dbPath);
console.log('🌐 Ambiente:', isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite.');
    }
});

// Função para criar tabela COMPLETA
function criarTabela() {
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS leituras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        timestamp TEXT,
        
        -- SISTEMA TRIFÁSICO
        Tensao_Trifasica REAL,
        Corrente_Trifasica REAL,
        Fator_Potencia_Trifasico REAL,
        Potencia_Aparente_Trifasica REAL,
        Potencia_Reativa_Trifasica REAL,
        Potencia_Ativa_Trifasica REAL,
        
        -- MEDIDAS BÁSICAS
        Frequencia REAL,
        
        -- TENSÕES DE FASE
        Tensao_Fase_1 REAL,
        Tensao_Fase_2 REAL,
        Tensao_Fase_3 REAL,
        
        -- CORRENTES
        Corrente_Fase_1 REAL,
        Corrente_Fase_2 REAL,
        Corrente_Fase_3 REAL,
        
        -- POTÊNCIAS ATIVAS POR FASE
        Potencia_Ativa_Fase_1 REAL,
        Potencia_Ativa_Fase_2 REAL,
        Potencia_Ativa_Fase_3 REAL,
        
        -- POTÊNCIAS REATIVAS POR FASE
        Potencia_Reativa_Fase_1 REAL,
        Potencia_Reativa_Fase_2 REAL,
        Potencia_Reativa_Fase_3 REAL,
        
        -- POTÊNCIAS APARENTES POR FASE
        Potencia_Aparente_Fase_1 REAL,
        Potencia_Aparente_Fase_2 REAL,
        Potencia_Aparente_Fase_3 REAL,
        
        -- FATORES DE POTÊNCIA POR FASE
        Fator_Potencia_Fase_1 REAL,
        Fator_Potencia_Fase_2 REAL,
        Fator_Potencia_Fase_3 REAL,
        
        -- ENERGIA
        Energia_Ativa_Positiva REAL,
        Energia_Reativa_Positiva REAL,
        Energia_Ativa_Negativa REAL,
        Energia_Reativa_Negativa REAL,
        
        -- DEMANDA
        Demanda_Maxima_Ativa REAL,
        Demanda_Ativa REAL,
        Demanda_Maxima_Aparente REAL,
        Demanda_Aparente REAL,
        
        -- TENSÕES ENTRE LINHAS
        Tensao_Linha_12 REAL,
        Tensao_Linha_23 REAL,
        Tensao_Linha_31 REAL,
        
        -- VALORES MÁXIMOS
        Tensao_Maxima_Trifasica REAL,
        Corrente_Maxima_Trifasica REAL,
        
        -- THD
        THD_Tensao_Fase_1 REAL,
        THD_Tensao_Fase_2 REAL,
        THD_Tensao_Fase_3 REAL,
        THD_Corrente_Fase_1 REAL,
        THD_Corrente_Fase_2 REAL,
        THD_Corrente_Fase_3 REAL,
        
        -- METADADOS
        client_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    db.run(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela:', err.message);
        } else {
            console.log('✅ Tabela "leituras" criada/verificada com sucesso.');
            console.log('📊 Total de colunas: 52');
        }
    });
}

// Função para salvar leitura no banco
function salvarLeitura(dados) {
    return new Promise((resolve, reject) => {
        const sql = `
        INSERT INTO leituras (
            device_id, timestamp, 
            Tensao_Trifasica, Corrente_Trifasica, Fator_Potencia_Trifasico,
            Potencia_Aparente_Trifasica, Potencia_Reativa_Trifasica, Potencia_Ativa_Trifasica,
            Frequencia,
            Tensao_Fase_1, Tensao_Fase_2, Tensao_Fase_3,
            Corrente_Fase_1, Corrente_Fase_2, Corrente_Fase_3,
            Energia_Ativa_Positiva, Energia_Reativa_Positiva,
            Demanda_Maxima_Ativa, Demanda_Ativa,
            Tensao_Linha_12, Tensao_Linha_23, Tensao_Linha_31,
            THD_Tensao_Fase_1, THD_Tensao_Fase_2, THD_Tensao_Fase_3,
            THD_Corrente_Fase_1, THD_Corrente_Fase_2, THD_Corrente_Fase_3,
            client_ip
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`;

        const params = [
            dados.device_id || 'multimedidor_ufrj_001',
            dados.timestamp || new Date().toLocaleString('pt-BR'),
            dados.Tensao_Trifasica || null,
            dados.Corrente_Trifasica || null,
            dados.Fator_Potencia_Trifasico || null,
            dados.Potencia_Aparente_Trifasica || null,
            dados.Potencia_Reativa_Trifasica || null,
            dados.Potencia_Ativa_Trifasica || null,
            dados.Frequencia || null,
            dados.Tensao_Fase_1 || null,
            dados.Tensao_Fase_2 || null,
            dados.Tensao_Fase_3 || null,
            dados.Corrente_Fase_1 || null,
            dados.Corrente_Fase_2 || null,
            dados.Corrente_Fase_3 || null,
            dados.Energia_Ativa_Positiva || null,
            dados.Energia_Reativa_Positiva || null,
            dados.Demanda_Maxima_Ativa || null,
            dados.Demanda_Ativa || null,
            dados.Tensao_Linha_12 || null,
            dados.Tensao_Linha_23 || null,
            dados.Tensao_Linha_31 || null,
            dados.THD_Tensao_Fase_1 || null,
            dados.THD_Tensao_Fase_2 || null,
            dados.THD_Tensao_Fase_3 || null,
            dados.THD_Corrente_Fase_1 || null,
            dados.THD_Corrente_Fase_2 || null,
            dados.THD_Corrente_Fase_3 || null,
            dados.clientIP || '127.0.0.1'
        ];

        console.log('💾 Tentando salvar dados no banco...');
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ ERRO ao salvar no banco:', err.message);
                reject(err);
            } else {
                console.log(`✅ Dados salvos no banco. ID: ${this.lastID}`);
                resolve(this.lastID);
            }
        });
    });
}

// ========== FUNÇÕES DE EXPORTAÇÃO CSV ==========

function exportarDadosCompletos(res) {
    console.log('📤 Exportando dados completos para CSV...');
    
    const sql = `SELECT * FROM leituras ORDER BY created_at DESC LIMIT 10000`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao exportar CSV:', err);
            return res.status(500).json({ error: 'Erro ao exportar dados' });
        }
        
        if (rows.length === 0) {
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
        
        const csvLines = rows.map(row => {
            const values = [
                row.id,
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
        
        console.log(`✅ CSV exportado: ${rows.length} registros`);
    });
}

function exportarDadosResumidos(res) {
    console.log('📤 Exportando dados resumidos para CSV...');
    
    const sql = `
    SELECT 
        created_at as "Data_Hora",
        Tensao_Trifasica as "Tensao_Trifasica_V",
        Corrente_Trifasica as "Corrente_Trifasica_A",
        Potencia_Ativa_Trifasica as "Potencia_Ativa_W",
        Demanda_Ativa as "Demanda_Ativa_W",
        Frequencia as "Frequencia_Hz",
        Fator_Potencia_Trifasico as "Fator_Potencia",
        Energia_Ativa_Positiva as "Energia_Ativa_kWh",
        THD_Tensao_Fase_1 as "THD_Tensao_F1_%"
    FROM leituras 
    ORDER BY created_at DESC
    LIMIT 5000
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao exportar CSV resumido:', err);
            return res.status(500).json({ error: 'Erro ao exportar dados' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum dado encontrado para exportação' });
        }
        
        const headers = Object.keys(rows[0]).join(';');
        const csvLines = rows.map(row => {
            return Object.values(row).map(value => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                return str.includes(';') ? `"${str}"` : str;
            }).join(';');
        });
        
        const csvContent = [headers, ...csvLines].join('\r\n');
        const filename = `dados_resumidos_multimedidor_${formatDateForFilename(new Date())}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
        
        console.log(`✅ CSV resumido exportado: ${rows.length} registros`);
    });
}

function exportarDadosPorPeriodo(res, dataInicio, dataFim) {
    console.log('📤 Exportando dados de ' + dataInicio + ' até ' + dataFim + '...');
    
    const sql = `SELECT * FROM leituras WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC`;
    
    db.all(sql, [dataInicio, dataFim], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao exportar CSV por período:', err);
            return res.status(500).json({ error: 'Erro ao exportar dados' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum dado encontrado para o período especificado' });
        }
        
        const headers = [
            'ID', 'Device ID', 'Timestamp', 'Tensão Trifásica (V)', 'Corrente Trifásica (A)',
            'Fator Potência Trifásico', 'Potência Aparente Trifásica (VA)', 'Potência Reativa Trifásica (Var)',
            'Potência Ativa Trifásica (W)', 'Frequência (Hz)', 'Tensão Fase 1 (V)', 'Tensão Fase 2 (V)',
            'Tensão Fase 3 (V)', 'Corrente Fase 1 (A)', 'Corrente Fase 2 (A)', 'Corrente Fase 3 (A)',
            'Energia Ativa Positiva (kWh)', 'Demanda Máxima Ativa (W)', 'Demanda Ativa (W)',
            'THD Tensão Fase 1 (%)', 'Data/Hora Criação'
        ].join(';');
        
        const csvLines = rows.map(row => {
            const values = [
                row.id,
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
                row.Demanda_Maxima_Ativa || '',
                row.Demanda_Ativa || '',
                row.THD_Tensao_Fase_1 || '',
                `"${row.created_at || ''}"`
            ];
            return values.join(';');
        });
        
        const csvContent = [headers, ...csvLines].join('\r\n');
        const filename = `dados_periodo_${dataInicio}_a_${dataFim}_${formatDateForFilename(new Date())}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
        
        console.log(`✅ CSV por período exportado: ${rows.length} registros`);
    });
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

app.get('/api/exportar/csv/periodo', (req, res) => {
    const { dataInicio, dataFim } = req.query;
    
    if (!dataInicio || !dataFim) {
        return res.status(400).json({ 
            error: 'Parâmetros dataInicio e dataFim são obrigatórios (formato: YYYY-MM-DD)' 
        });
    }
    
    exportarDadosPorPeriodo(res, dataInicio, dataFim);
});

app.get('/api/exportar/csv/ultima-semana', (req, res) => {
    const dataFim = new Date().toISOString().split('T')[0];
    const dataInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    exportarDadosPorPeriodo(res, dataInicio, dataFim);
});

app.get('/api/exportar/csv/ultimo-mes', (req, res) => {
    const dataFim = new Date().toISOString().split('T')[0];
    const dataInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    exportarDadosPorPeriodo(res, dataInicio, dataFim);
});

// ========== ROTAS PARA GRÁFICOS DE DEMANDA ==========
app.get('/api/demanda-diaria', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda diária...');
        
        const sql = `
        SELECT 
            strftime('%H:00', created_at) as hora,
            AVG(Demanda_Ativa) as demanda_media,
            MAX(Demanda_Ativa) as demanda_maxima,
            MIN(Demanda_Ativa) as demanda_minima,
            COUNT(*) as total_registros
        FROM leituras 
        WHERE created_at >= datetime('now', '-1 day')
        AND Demanda_Ativa IS NOT NULL
        AND Demanda_Ativa > 0
        GROUP BY strftime('%H', created_at)
        ORDER BY hora
        `;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar demanda diária:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log(`✅ Dados diários encontrados: ${rows.length} horas`);
            
            const horasCompletas = [];
            for (let i = 0; i < 24; i++) {
                const hora = i.toString().padStart(2, '0') + ':00';
                const dadoHora = rows.find(row => row.hora === hora) || {
                    hora: hora,
                    demanda_media: 0,
                    demanda_maxima: 0,
                    demanda_minima: 0,
                    total_registros: 0
                };
                
                horasCompletas.push({
                    hora: dadoHora.hora,
                    demanda_media: dadoHora.demanda_media ? parseFloat(dadoHora.demanda_media.toFixed(2)) : 0,
                    demanda_maxima: dadoHora.demanda_maxima ? parseFloat(dadoHora.demanda_maxima.toFixed(2)) : 0,
                    demanda_minima: dadoHora.demanda_minima ? parseFloat(dadoHora.demanda_minima.toFixed(2)) : 0,
                    registros: dadoHora.total_registros
                });
            }
            
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
        });
    } catch (error) {
        console.error('❌ Erro na rota demanda-diaria:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/demanda-mensal', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda mensal...');
        
        const sql = `
        SELECT 
            DATE(created_at) as data,
            AVG(Demanda_Ativa) as demanda_media,
            MAX(Demanda_Ativa) as demanda_maxima,
            MIN(Demanda_Ativa) as demanda_minima,
            COUNT(*) as total_registros
        FROM leituras 
        WHERE created_at >= date('now', '-30 days')
        AND Demanda_Ativa IS NOT NULL
        AND Demanda_Ativa > 0
        GROUP BY DATE(created_at)
        ORDER BY data
        `;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar demanda mensal:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log(`✅ Dados mensais encontrados: ${rows.length} dias`);
            
            const dadosFormatados = rows.map(row => {
                const data = new Date(row.data);
                return {
                    data: data.toLocaleDateString('pt-BR'),
                    data_iso: row.data,
                    demanda_media: row.demanda_media ? parseFloat(row.demanda_media.toFixed(2)) : 0,
                    demanda_maxima: row.demanda_maxima ? parseFloat(row.demanda_maxima.toFixed(2)) : 0,
                    demanda_minima: row.demanda_minima ? parseFloat(row.demanda_minima.toFixed(2)) : 0,
                    registros: row.total_registros
                };
            });
            
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
        });
    } catch (error) {
        console.error('❌ Erro na rota demanda-mensal:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/demanda-tempo-real', async (req, res) => {
    try {
        console.log('📊 Buscando dados de demanda em tempo real...');
        
        const sql = `
        SELECT 
            strftime('%Y-%m-%d %H:%M', created_at) as timestamp,
            Demanda_Ativa as demanda,
            Demanda_Maxima_Ativa as demanda_maxima
        FROM leituras 
        WHERE created_at >= datetime('now', '-6 hours')
        AND Demanda_Ativa IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 100
        `;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar demanda tempo real:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log(`✅ Dados tempo real encontrados: ${rows.length} registros`);
            
            const dadosOrdenados = rows.reverse().map(row => {
                const timestamp = new Date(row.timestamp);
                return {
                    timestamp: timestamp.toLocaleTimeString('pt-BR'),
                    timestamp_iso: row.timestamp,
                    demanda: row.demanda ? parseFloat(row.demanda.toFixed(2)) : 0,
                    demanda_maxima: row.demanda_maxima ? parseFloat(row.demanda_maxima.toFixed(2)) : 0
                };
            });
            
            const ultimoRegistro = rows[rows.length - 1];
            const demandaAtual = ultimoRegistro ? (ultimoRegistro.demanda || 0) : 0;
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

// Inicializar banco de dados
criarTabela();

// Array para dados em memória (cache)
let dados = [];

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
        const dadosParaSalvar = {
            ...req.body,
            timestamp: req.body.timestamp || new Date().toLocaleString('pt-BR'),
            clientIP: req.ip
        };

        dados.unshift(dadosParaSalvar);
        if (dados.length > 50) dados = dados.slice(0, 50);

        const idSalvo = await salvarLeitura(dadosParaSalvar);
        
        console.log(`✅ Dados salvos no banco com ID: ${idSalvo}`);
        
        res.json({ 
            status: 'success', 
            message: 'Dados recebidos e salvos!',
            database_id: idSalvo,
            received: req.body
        });

    } catch (error) {
        console.error('❌ ERRO CRÍTICO ao processar dados:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao salvar dados no banco',
            error_details: error.message
        });
    }
});

app.get('/api/data', (req, res) => {
    res.json({
        status: 'online',
        total_dados: dados.length,
        ultima_atualizacao: new Date().toLocaleString('pt-BR'),
        dados: dados.slice(0, 10)
    });
});

app.get('/api/historico', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const historico = await new Promise((resolve, reject) => {
            const sql = `SELECT * FROM leituras ORDER BY created_at DESC LIMIT ?`;
            db.all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
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
        const estatisticas = await new Promise((resolve, reject) => {
            const sql = `
            SELECT 
                COUNT(*) as total_leituras,
                AVG(Tensao_Trifasica) as tensao_media,
                AVG(Corrente_Trifasica) as corrente_media,
                AVG(Potencia_Ativa_Trifasica) as potencia_media,
                MAX(Potencia_Ativa_Trifasica) as potencia_maxima,
                MIN(Potencia_Ativa_Trifasica) as potencia_minima,
                MIN(created_at) as data_inicio,
                MAX(created_at) as data_fim
            FROM leituras
            WHERE Tensao_Trifasica IS NOT NULL
            `;
            db.get(sql, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
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
        database: isProduction ? 'SQLite em memória' : 'SQLite arquivo',
        total_dados_memoria: dados.length,
        timestamp: new Date().toLocaleString('pt-BR')
    });
});

app.post('/api/clear', (req, res) => {
    dados = [];
    res.json({ status: 'success', message: 'Dados em memória limpos com sucesso!' });
});

app.get('/api/db-structure', (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (tables.length === 0) {
            res.json({ message: 'Nenhuma tabela encontrada' });
            return;
        }
        
        db.all("PRAGMA table_info(leituras)", (err, columns) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({ tables, leituras_columns: columns, total_columns: columns.length });
        });
    });
});

// ========== DASHBOARD HTML COMPLETO ==========
app.get('/', (req, res) => {
    const ultimoDado = dados[0] || {};
    
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⚡ Dashboard - Multimedidor UFRJ</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
                color: #333;
                line-height: 1.6;
            }

            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }

            .header-institucional {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                padding: 15px 0;
                border-bottom: 3px solid #3498db;
            }

            .logos {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 20px;
            }

            .logo-item {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
                min-width: 300px;
                justify-content: center;
            }

            .logo-placeholder {
                font-size: 2.5em;
                background: rgba(255, 255, 255, 0.1);
                padding: 10px;
                border-radius: 10px;
                min-width: 60px;
                text-align: center;
            }

            .logo-text {
                font-size: 1.1em;
                font-weight: 600;
                text-align: center;
            }

            .header {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 15px;
                margin-bottom: 25px;
                margin-top: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
            }

            .header-content h1 {
                color: #2c3e50;
                font-size: 2.2em;
                margin-bottom: 5px;
            }

            .header-content p {
                color: #7f8c8d;
                font-size: 1.1em;
            }

            .header-status {
                display: flex;
                gap: 25px;
                flex-wrap: wrap;
            }

            .status-item {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .status-label {
                font-size: 0.9em;
                color: #7f8c8d;
                margin-bottom: 5px;
            }

            .status-online {
                color: #27ae60;
                font-weight: bold;
                font-size: 1.1em;
            }

            .status-value {
                font-weight: bold;
                color: #2c3e50;
                font-size: 1.1em;
            }

            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .card {
                background: rgba(255, 255, 255, 0.95);
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }

            .card-icon {
                font-size: 2.5em;
                flex-shrink: 0;
            }

            .card-content {
                flex: 1;
            }

            .card h3 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 1em;
                font-weight: 600;
            }

            .valor {
                font-size: 2.2em;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
            }

            .unidade {
                color: #7f8c8d;
                font-size: 0.9em;
            }

            .card-tensao { border-left: 4px solid #e74c3c; }
            .card-corrente { border-left: 4px solid #3498db; }
            .card-potencia { border-left: 4px solid #2ecc71; }
            .card-fator { border-left: 4px solid #f39c12; }
            .card-frequencia { border-left: 4px solid #9b59b6; }
            .card-energia { border-left: 4px solid #1abc9c; }
            .card-demanda { border-left: 4px solid #e67e22; }
            .card-thd { border-left: 4px solid #8e44ad; }

            .charts-section {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 25px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
            }

            .charts-section h2 {
                color: #2c3e50;
                margin-bottom: 25px;
                text-align: center;
                font-size: 1.8em;
            }

            .chart-controls {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 30px;
            }

            .btn {
                padding: 12px 24px;
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
                background: #3498db;
                color: white;
            }

            .btn-primary:hover {
                background: #2980b9;
                transform: translateY(-2px);
            }

            .btn-secondary {
                background: #95a5a6;
                color: white;
            }

            .btn-secondary:hover {
                background: #7f8c8d;
                transform: translateY(-2px);
            }

            .btn-info {
                background: #e74c3c;
                color: white;
            }

            .btn-info:hover {
                background: #c0392b;
                transform: translateY(-2px);
            }

            .btn-success {
                background: #27ae60;
                color: white;
            }

            .btn-success:hover {
                background: #219653;
                transform: translateY(-2px);
            }

            .charts-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 25px;
                margin-bottom: 20px;
            }

            .chart-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }

            .chart-card:hover {
                transform: translateY(-5px);
            }

            .chart-card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.2em;
                text-align: center;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }

            .chart-wrapper {
                position: relative;
                height: 250px;
                margin-bottom: 15px;
            }

            .chart-stats {
                display: flex;
                justify-content: space-around;
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid #3498db;
            }

            .stat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .stat-label {
                font-size: 0.8em;
                color: #7f8c8d;
                margin-bottom: 4px;
            }

            .stat-value {
                font-weight: bold;
                color: #2c3e50;
                font-size: 1.1em;
            }

            .export-section {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 25px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
            }

            .export-section h2 {
                color: #2c3e50;
                margin-bottom: 25px;
                text-align: center;
                font-size: 1.8em;
            }

            .export-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 25px;
            }

            .export-card {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                text-align: center;
                border-left: 4px solid #3498db;
            }

            .export-card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                font-size: 1.3em;
            }

            .export-card p {
                color: #7f8c8d;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .export-periodo {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin-top: 20px;
            }

            .export-periodo h4 {
                color: #2c3e50;
                margin-bottom: 15px;
            }

            .periodo-form {
                display: flex;
                gap: 15px;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .form-group label {
                font-weight: 600;
                color: #2c3e50;
                font-size: 0.9em;
            }

            .form-group input {
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 1em;
                transition: border-color 0.3s ease;
            }

            .form-group input:focus {
                outline: none;
                border-color: #3498db;
            }

            .btn-export {
                background: #27ae60;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 10px auto;
            }

            .btn-export:hover {
                background: #219653;
                transform: translateY(-2px);
            }

            .btn-export-secondary {
                background: #95a5a6;
            }

            .btn-export-secondary:hover {
                background: #7f8c8d;
            }

            .export-stats {
                display: flex;
                justify-content: space-around;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                border-left: 4px solid #3498db;
            }

            .advanced-section, .controls-section {
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 25px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
            }

            .advanced-section h2, .controls-section h2 {
                color: #2c3e50;
                margin-bottom: 20px;
                text-align: center;
            }

            .advanced-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }

            .advanced-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            }

            .advanced-card h4 {
                color: #2c3e50;
                margin-bottom: 15px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
            }

            .param-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
                border-bottom: 1px solid #ecf0f1;
            }

            .param-label {
                color: #7f8c8d;
            }

            .param-value {
                font-weight: bold;
                color: #2c3e50;
            }

            .controls-grid {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .footer-institucional {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                padding: 40px 0 20px 0;
                margin-top: 50px;
                border-top: 3px solid #3498db;
            }

            .footer-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin-bottom: 20px;
            }

            .footer-info h4,
            .footer-credits h4,
            .footer-contacts h4 {
                color: #3498db;
                margin-bottom: 15px;
                font-size: 1.2em;
                border-left: 3px solid #3498db;
                padding-left: 10px;
            }

            .footer-info p,
            .footer-credits p,
            .footer-contacts p {
                margin-bottom: 8px;
                line-height: 1.5;
                opacity: 0.9;
            }

            .footer-credits strong {
                color: #2ecc71;
                font-size: 1.1em;
            }

            .loading {
                text-align: center;
                padding: 20px;
                color: #7f8c8d;
            }

            .loading-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 2s linear infinite;
                margin: 0 auto 15px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .container { padding: 10px; }
                .header { flex-direction: column; text-align: center; gap: 15px; }
                .dashboard-grid { grid-template-columns: 1fr; }
                .advanced-grid { grid-template-columns: 1fr; }
                .controls-grid { flex-direction: column; }
                .charts-container { grid-template-columns: 1fr; }
                .chart-controls { flex-direction: column; }
                .chart-stats { flex-direction: column; gap: 10px; }
                .export-options { grid-template-columns: 1fr; }
                .periodo-form { flex-direction: column; }
            }
        </style>
    </head>
    <body>
        <!-- Cabeçalho Institucional UFRJ -->
        <header class="header-institucional">
            <div class="container">
                <div class="logos">
                    <div class="logo-item">
                        <div class="logo-placeholder">🎓</div>
                        <div class="logo-text">UNIVERSIDADE FEDERAL DO RIO DE JANEIRO<br>SISTEMA MULTIMEDIDOR INTELIGENTE</div>
                    </div>
                    <div class="logo-item">
                        <div class="logo-placeholder">⚡</div>
                        <div class="logo-text">ESCRITÓRIO TÉCNICO UNIVERSITÁRIO<br>LABORATÓRIO DE ENERGIA</div>
                    </div>
                </div>
            </div>
        </header>

        <div class="container">
            <!-- Header do Dashboard -->
            <div class="header">
                <div class="header-content">
                    <h1>Dashboard Multimedidor UFRJ</h1>
                    <p>Monitoramento em Tempo Real - Sistema Trifásico Inteligente</p>
                </div>
                <div class="header-status">
                    <div class="status-item">
                        <div class="status-label">Status do Sistema</div>
                        <div class="status-online">● ONLINE</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Dados Recebidos</div>
                        <div class="status-value" id="total-dados">${dados.length}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Última Atualização</div>
                        <div class="status-value" id="ultima-atualizacao">${ultimoDado.timestamp || 'Aguardando...'}</div>
                    </div>
                </div>
            </div>

            <!-- Grid de Cards Principais -->
            <div class="dashboard-grid">
                <div class="card card-tensao">
                    <div class="card-icon">⚡</div>
                    <div class="card-content">
                        <h3>TENSÃO TRIFÁSICA</h3>
                        <div class="valor" id="tensao">${(ultimoDado.Tensao_Trifasica || 0).toFixed(2)}</div>
                        <div class="unidade">Volts (V)</div>
                    </div>
                </div>

                <div class="card card-corrente">
                    <div class="card-icon">🔌</div>
                    <div class="card-content">
                        <h3>CORRENTE TRIFÁSICA</h3>
                        <div class="valor" id="corrente">${(ultimoDado.Corrente_Trifasica || 0).toFixed(2)}</div>
                        <div class="unidade">Amperes (A)</div>
                    </div>
                </div>

                <div class="card card-potencia">
                    <div class="card-icon">💡</div>
                    <div class="card-content">
                        <h3>POTÊNCIA ATIVA</h3>
                        <div class="valor" id="potencia">${(ultimoDado.Potencia_Ativa_Trifasica || 0).toFixed(2)}</div>
                        <div class="unidade">Watts (W)</div>
                    </div>
                </div>

                <div class="card card-frequencia">
                    <div class="card-icon">🔄</div>
                    <div class="card-content">
                        <h3>FREQUÊNCIA</h3>
                        <div class="valor" id="frequencia">${(ultimoDado.Frequencia || 0).toFixed(2)}</div>
                        <div class="unidade">Hertz (Hz)</div>
                    </div>
                </div>

                <div class="card card-energia">
                    <div class="card-icon">🔋</div>
                    <div class="card-content">
                        <h3>ENERGIA ATIVA</h3>
                        <div class="valor" id="energia">${(ultimoDado.Energia_Ativa_Positiva || 0).toFixed(2)}</div>
                        <div class="unidade">kWh</div>
                    </div>
                </div>

                <div class="card card-demanda">
                    <div class="card-icon">📈</div>
                    <div class="card-content">
                        <h3>DEMANDA ATIVA</h3>
                        <div class="valor" id="demanda">${(ultimoDado.Demanda_Ativa || 0).toFixed(2)}</div>
                        <div class="unidade">Watts (W)</div>
                    </div>
                </div>

                <div class="card card-fator">
                    <div class="card-icon">📊</div>
                    <div class="card-content">
                        <h3>FATOR DE POTÊNCIA</h3>
                        <div class="valor" id="fator-potencia">${(ultimoDado.Fator_Potencia_Trifasico || 0).toFixed(2)}</div>
                        <div class="unidade"></div>
                    </div>
                </div>

                <div class="card card-thd">
                    <div class="card-icon">🎚️</div>
                    <div class="card-content">
                        <h3>THD TENSÃO F1</h3>
                        <div class="valor" id="thd-tensao">${(ultimoDado.THD_Tensao_Fase_1 || 0).toFixed(2)}</div>
                        <div class="unidade">%</div>
                    </div>
                </div>
            </div>

            <!-- Seção de Gráficos de Demanda -->
            <div class="charts-section">
                <h2>📈 Gráficos de Demanda</h2>
                
                <div class="chart-controls">
                    <button class="btn btn-primary" onclick="carregarDemandaDiaria()">
                        📅 Demanda Diária
                    </button>
                    <button class="btn btn-secondary" onclick="carregarDemandaMensal()">
                        📊 Demanda Mensal
                    </button>
                    <button class="btn btn-info" onclick="carregarDemandaTempoReal()">
                        ⚡ Tempo Real
                    </button>
                    <button class="btn btn-success" onclick="carregarTodosGraficos()">
                        🔄 Todos os Gráficos
                    </button>
                </div>

                <div class="charts-container">
                    <div class="chart-card">
                        <h3>📅 Demanda Diária (Últimas 24 horas)</h3>
                        <div class="chart-wrapper">
                            <canvas id="demandaDiariaChart"></canvas>
                        </div>
                        <div class="chart-stats" id="stats-diaria">
                            <div class="stat-item">
                                <span class="stat-label">Média:</span>
                                <span class="stat-value" id="media-diaria">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Máxima:</span>
                                <span class="stat-value" id="maxima-diaria">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Mínima:</span>
                                <span class="stat-value" id="minima-diaria">0 W</span>
                            </div>
                        </div>
                    </div>

                    <div class="chart-card">
                        <h3>📊 Demanda Mensal (Últimos 30 dias)</h3>
                        <div class="chart-wrapper">
                            <canvas id="demandaMensalChart"></canvas>
                        </div>
                        <div class="chart-stats" id="stats-mensal">
                            <div class="stat-item">
                                <span class="stat-label">Média:</span>
                                <span class="stat-value" id="media-mensal">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Máxima:</span>
                                <span class="stat-value" id="maxima-mensal">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Mínima:</span>
                                <span class="stat-value" id="minima-mensal">0 W</span>
                            </div>
                        </div>
                    </div>

                    <div class="chart-card">
                        <h3>⚡ Demanda em Tempo Real (Últimas 6 horas)</h3>
                        <div class="chart-wrapper">
                            <canvas id="demandaTempoRealChart"></canvas>
                        </div>
                        <div class="chart-stats" id="stats-tempo-real">
                            <div class="stat-item">
                                <span class="stat-label">Atual:</span>
                                <span class="stat-value" id="demanda-atual">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Máxima:</span>
                                <span class="stat-value" id="maxima-tempo-real">0 W</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Registros:</span>
                                <span class="stat-value" id="registros-tempo-real">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Seção de Exportação de Dados -->
            <div class="export-section">
                <h2>📥 Exportação de Dados</h2>
                
                <div class="export-options">
                    <div class="export-card">
                        <h3>📊 Dados Completos</h3>
                        <p>Exporte todos os dados coletados com todas as colunas disponíveis</p>
                        <button class="btn btn-export" onclick="exportarDadosCompletos()">
                            📥 Exportar Dados Completos
                        </button>
                        <div class="export-stats">
                            <div class="stat-item">
                                <span class="stat-label">Formato</span>
                                <span class="stat-value">CSV</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Colunas</span>
                                <span class="stat-value">52</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Limite</span>
                                <span class="stat-value">10.000</span>
                            </div>
                        </div>
                    </div>

                    <div class="export-card">
                        <h3>📈 Dados Resumidos</h3>
                        <p>Principais parâmetros para análise rápida e relatórios</p>
                        <button class="btn btn-export" onclick="exportarDadosResumidos()">
                            📥 Exportar Dados Resumidos
                        </button>
                        <div class="export-stats">
                            <div class="stat-item">
                                <span class="stat-label">Formato</span>
                                <span class="stat-value">CSV</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Colunas</span>
                                <span class="stat-value">9</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Limite</span>
                                <span class="stat-value">5.000</span>
                            </div>
                        </div>
                    </div>

                    <div class="export-card">
                        <h3>📅 Exportação por Período</h3>
                        <p>Selecione um período específico para exportação</p>
                        
                        <div class="export-periodo">
                            <h4>Selecione o Período</h4>
                            <div class="periodo-form">
                                <div class="form-group">
                                    <label for="dataInicio">Data Início:</label>
                                    <input type="date" id="dataInicio">
                                </div>
                                <div class="form-group">
                                    <label for="dataFim">Data Fim:</label>
                                    <input type="date" id="dataFim">
                                </div>
                            </div>
                            <button class="btn btn-export" onclick="exportarPorPeriodo()">
                                📥 Exportar Período
                            </button>
                        </div>
                    </div>
                </div>

                <div class="export-options">
                    <div class="export-card">
                        <h3>🕐 Última Semana</h3>
                        <p>Dados dos últimos 7 dias</p>
                        <button class="btn btn-export btn-export-secondary" onclick="exportarUltimaSemana()">
                            📥 Exportar Última Semana
                        </button>
                    </div>

                    <div class="export-card">
                        <h3>📆 Último Mês</h3>
                        <p>Dados dos últimos 30 dias</p>
                        <button class="btn btn-export btn-export-secondary" onclick="exportarUltimoMes()">
                            📥 Exportar Último Mês
                        </button>
                    </div>
                </div>
            </div>

            <!-- Seção Avançada - Detalhes por Fase -->
            <div class="advanced-section">
                <h2>📈 Detalhamento por Fase e Parâmetros Avançados</h2>
                <div class="advanced-grid">
                    <div class="advanced-card">
                        <h4>⚡ Tensões por Fase</h4>
                        <div class="param-row">
                            <span class="param-label">Fase 1 (V):</span>
                            <span class="param-value" id="tensao-f1">${(ultimoDado.Tensao_Fase_1 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Fase 2 (V):</span>
                            <span class="param-value" id="tensao-f2">${(ultimoDado.Tensao_Fase_2 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Fase 3 (V):</span>
                            <span class="param-value" id="tensao-f3">${(ultimoDado.Tensao_Fase_3 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Linha 1-2 (V):</span>
                            <span class="param-value" id="linha-12">${(ultimoDado.Tensao_Linha_12 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Linha 2-3 (V):</span>
                            <span class="param-value" id="linha-23">${(ultimoDado.Tensao_Linha_23 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Linha 3-1 (V):</span>
                            <span class="param-value" id="linha-31">${(ultimoDado.Tensao_Linha_31 || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="advanced-card">
                        <h4>🔌 Correntes por Fase</h4>
                        <div class="param-row">
                            <span class="param-label">Fase 1 (A):</span>
                            <span class="param-value" id="corrente-f1">${(ultimoDado.Corrente_Fase_1 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Fase 2 (A):</span>
                            <span class="param-value" id="corrente-f2">${(ultimoDado.Corrente_Fase_2 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Fase 3 (A):</span>
                            <span class="param-value" id="corrente-f3">${(ultimoDado.Corrente_Fase_3 || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="advanced-card">
                        <h4>💡 Potências</h4>
                        <div class="param-row">
                            <span class="param-label">Ativa F1 (W):</span>
                            <span class="param-value" id="potencia-f1">${(ultimoDado.Potencia_Ativa_Fase_1 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Ativa F2 (W):</span>
                            <span class="param-value" id="potencia-f2">${(ultimoDado.Potencia_Ativa_Fase_2 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Ativa F3 (W):</span>
                            <span class="param-value" id="potencia-f3">${(ultimoDado.Potencia_Ativa_Fase_3 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Aparente (VA):</span>
                            <span class="param-value" id="potencia-aparente">${(ultimoDado.Potencia_Aparente_Trifasica || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Reativa (Var):</span>
                            <span class="param-value" id="potencia-reativa">${(ultimoDado.Potencia_Reativa_Trifasica || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="advanced-card">
                        <h4>🎚️ THD e Demanda</h4>
                        <div class="param-row">
                            <span class="param-label">THD Tensão F1 (%):</span>
                            <span class="param-value" id="thd-tensao-f1">${(ultimoDado.THD_Tensao_Fase_1 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">THD Tensão F2 (%):</span>
                            <span class="param-value" id="thd-tensao-f2">${(ultimoDado.THD_Tensao_Fase_2 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">THD Tensão F3 (%):</span>
                            <span class="param-value" id="thd-tensao-f3">${(ultimoDado.THD_Tensao_Fase_3 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">THD Corrente F1 (%):</span>
                            <span class="param-value" id="thd-corrente-f1">${(ultimoDado.THD_Corrente_Fase_1 || 0).toFixed(2)}</span>
                        </div>
                        <div class="param-row">
                            <span class="param-label">Demanda Máx. (W):</span>
                            <span class="param-value" id="demanda-max">${(ultimoDado.Demanda_Maxima_Ativa || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Seção de Controles -->
            <div class="controls-section">
                <h2>🎛️ Controles do Sistema</h2>
                <div class="controls-grid">
                    <button class="btn btn-primary" onclick="atualizarDados()">
                        🔄 Atualizar Dados
                    </button>
                    <button class="btn btn-secondary" onclick="exportarDados()">
                        📥 Exportar CSV
                    </button>
                    <button class="btn btn-info" onclick="limparDados()">
                        🗑️ Limpar Dados
                    </button>
                    <button class="btn btn-primary" onclick="window.open('/api/data', '_blank')">
                        🔍 Ver API
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('/api/health', '_blank')">
                        ❤️ Health Check
                    </button>
                </div>
            </div>
        </div>

        <!-- Rodapé Institucional UFRJ -->
        <footer class="footer-institucional">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-info">
                        <h4>Sobre o Sistema</h4>
                        <p>Sistema Multimedidor Inteligente desenvolvido para monitoramento e análise de parâmetros elétricos em sistemas trifásicos.</p>
                        <p>Versão: 2.0 | UFRJ - Escritório Técnico Universitário</p>
                    </div>
                    
                    <div class="footer-credits">
                        <h4>Desenvolvimento</h4>
                        <p><strong>Desenvolvedor:</strong> Fernando Dias</p>
                        <p><strong>Email:</strong> fernando.silva@etu.ufrj.br</p>
                        <p><strong>Projeto:</strong> Sistema de Monitoramento Energético</p>
                        <p><strong>Instituição:</strong> Universidade Federal do Rio de Janeiro</p>
                    </div>
                    
                    <div class="footer-contacts">
                        <h4>Localização UFRJ</h4>
                        <p>🏛️ Escritório Técnico Universitário</p>
                        <p>📍 Praça Jorge Machado Moreira, 100</p>
                        <p>🏙️ Cidade Universitária</p>
                        <p>🌆 Rio de Janeiro - RJ, 21941-598</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p>&copy; 2024 Universidade Federal do Rio de Janeiro - UFRJ. Todos os direitos reservados.</p>
                    <p style="margin-top: 5px; font-size: 0.9em; opacity: 0.8;">Sistema desenvolvido para pesquisa acadêmica e eficiência energética.</p>
                </div>
            </div>
        </footer>

        <script>
            // Variáveis globais para os gráficos
            let demandaDiariaChart = null;
            let demandaMensalChart = null;
            let demandaTempoRealChart = null;

            // Função para inicializar todos os gráficos
            function inicializarGraficos() {
                carregarTodosGraficos();
            }

            // Carregar todos os gráficos
            function carregarTodosGraficos() {
                carregarDemandaDiaria();
                carregarDemandaMensal();
                carregarDemandaTempoReal();
            }

            // Carregar dados de demanda diária
            function carregarDemandaDiaria() {
                mostrarLoading('demandaDiariaChart', 'Carregando dados diários...');
                
                fetch('/api/demanda-diaria')
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            criarGraficoDemandaDiaria(data.dados, data.estatisticas);
                        } else {
                            mostrarErro('demandaDiariaChart', 'Erro ao carregar dados diários');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar demanda diária:', error);
                        mostrarErro('demandaDiariaChart', 'Erro de conexão');
                    });
            }

            // Carregar dados de demanda mensal
            function carregarDemandaMensal() {
                mostrarLoading('demandaMensalChart', 'Carregando dados mensais...');
                
                fetch('/api/demanda-mensal')
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            criarGraficoDemandaMensal(data.dados, data.estatisticas);
                        } else {
                            mostrarErro('demandaMensalChart', 'Erro ao carregar dados mensais');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar demanda mensal:', error);
                        mostrarErro('demandaMensalChart', 'Erro de conexão');
                    });
            }

            // Carregar dados de demanda em tempo real
            function carregarDemandaTempoReal() {
                mostrarLoading('demandaTempoRealChart', 'Carregando dados em tempo real...');
                
                fetch('/api/demanda-tempo-real')
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            criarGraficoDemandaTempoReal(data.dados, data.estatisticas);
                        } else {
                            mostrarErro('demandaTempoRealChart', 'Erro ao carregar dados em tempo real');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar demanda tempo real:', error);
                        mostrarErro('demandaTempoRealChart', 'Erro de conexão');
                    });
            }

            // Criar gráfico de demanda diária
            function criarGraficoDemandaDiaria(dados, estatisticas) {
                const ctx = document.getElementById('demandaDiariaChart').getContext('2d');
                
                if (demandaDiariaChart) {
                    demandaDiariaChart.destroy();
                }
                
                const horas = dados.map(d => d.hora);
                const demandasMedias = dados.map(d => d.demanda_media);
                const demandasMaximas = dados.map(d => d.demanda_maxima);
                
                demandaDiariaChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: horas,
                        datasets: [
                            {
                                label: 'Demanda Média (W)',
                                data: demandasMedias,
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Demanda Máxima (W)',
                                data: demandasMaximas,
                                borderColor: '#e74c3c',
                                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Demanda por Hora - Últimas 24h'
                            },
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Demanda (W)'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Hora do Dia'
                                }
                            }
                        }
                    }
                });
                
                document.getElementById('media-diaria').textContent = estatisticas.media_geral.toFixed(2) + ' W';
                document.getElementById('maxima-diaria').textContent = estatisticas.maxima_geral.toFixed(2) + ' W';
                document.getElementById('minima-diaria').textContent = estatisticas.minima_geral.toFixed(2) + ' W';
            }

            // Criar gráfico de demanda mensal
            function criarGraficoDemandaMensal(dados, estatisticas) {
                const ctx = document.getElementById('demandaMensalChart').getContext('2d');
                
                if (demandaMensalChart) {
                    demandaMensalChart.destroy();
                }
                
                const datas = dados.map(d => d.data);
                const demandasMedias = dados.map(d => d.demanda_media);
                const demandasMaximas = dados.map(d => d.demanda_maxima);
                
                demandaMensalChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: datas,
                        datasets: [
                            {
                                label: 'Demanda Média Diária (W)',
                                data: demandasMedias,
                                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                                borderColor: '#2980b9',
                                borderWidth: 1
                            },
                            {
                                label: 'Demanda Máxima Diária (W)',
                                data: demandasMaximas,
                                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                                borderColor: '#c0392b',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Demanda Média e Máxima por Dia - Últimos 30 dias'
                            },
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Demanda (W)'
                                }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 45
                                }
                            }
                        }
                    }
                });
                
                document.getElementById('media-mensal').textContent = estatisticas.media_geral.toFixed(2) + ' W';
                document.getElementById('maxima-mensal').textContent = estatisticas.maxima_geral.toFixed(2) + ' W';
                document.getElementById('minima-mensal').textContent = estatisticas.minima_geral.toFixed(2) + ' W';
            }

            // Criar gráfico de demanda em tempo real
            function criarGraficoDemandaTempoReal(dados, estatisticas) {
                const ctx = document.getElementById('demandaTempoRealChart').getContext('2d');
                
                if (demandaTempoRealChart) {
                    demandaTempoRealChart.destroy();
                }
                
                const timestamps = dados.map(d => d.timestamp);
                const demandas = dados.map(d => d.demanda);
                
                demandaTempoRealChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: timestamps,
                        datasets: [
                            {
                                label: 'Demanda Atual (W)',
                                data: demandas,
                                borderColor: '#27ae60',
                                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Demanda em Tempo Real - Últimas 6 horas'
                            },
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Demanda (W)'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Horário'
                                },
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 45
                                }
                            }
                        }
                    }
                });
                
                document.getElementById('demanda-atual').textContent = estatisticas.demanda_atual.toFixed(2) + ' W';
                document.getElementById('maxima-tempo-real').textContent = estatisticas.demanda_maxima.toFixed(2) + ' W';
                document.getElementById('registros-tempo-real').textContent = dados.length;
            }

            // Funções auxiliares para loading e erro
            function mostrarLoading(canvasId, mensagem) {
                const canvas = document.getElementById(canvasId);
                canvas.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div>' + mensagem + '</div></div>';
            }

            function mostrarErro(canvasId, mensagem) {
                const canvas = document.getElementById(canvasId);
                canvas.innerHTML = '<div class="loading" style="color: #e74c3c;"><div>❌ ' + mensagem + '</div></div>';
            }

            // ========== FUNÇÕES DE EXPORTAÇÃO ==========
            function exportarDadosCompletos() {
                console.log('📤 Iniciando exportação de dados completos...');
                window.open('/api/exportar/csv/completo', '_blank');
            }

            function exportarDadosResumidos() {
                console.log('📤 Iniciando exportação de dados resumidos...');
                window.open('/api/exportar/csv/resumido', '_blank');
            }

            function exportarPorPeriodo() {
                const dataInicio = document.getElementById('dataInicio').value;
                const dataFim = document.getElementById('dataFim').value;
                
                if (!dataInicio || !dataFim) {
                    alert('❌ Por favor, selecione ambas as datas (início e fim)');
                    return;
                }
                
                if (dataInicio > dataFim) {
                    alert('❌ A data de início não pode ser maior que a data de fim');
                    return;
                }
                
                console.log('📤 Exportando período: ' + dataInicio + ' até ' + dataFim);
                window.open('/api/exportar/csv/periodo?dataInicio=' + dataInicio + '&dataFim=' + dataFim, '_blank');
            }

            function exportarUltimaSemana() {
                console.log('📤 Exportando última semana...');
                window.open('/api/exportar/csv/ultima-semana', '_blank');
            }

            function exportarUltimoMes() {
                console.log('📤 Exportando último mês...');
                window.open('/api/exportar/csv/ultimo-mes', '_blank');
            }

            // Função para atualizar todos os dados
            function atualizarDados() {
                fetch('/api/data')
                    .then(response => response.json())
                    .then(data => {
                        if (data.dados && data.dados.length > 0) {
                            const ultimo = data.dados[0];
                            atualizarInterface(ultimo, data.total_dados);
                        }
                    })
                    .catch(error => console.error('Erro:', error));
            }

            function atualizarInterface(dado, total) {
                // Cards principais
                document.getElementById('tensao').textContent = (dado.Tensao_Trifasica || 0).toFixed(2);
                document.getElementById('corrente').textContent = (dado.Corrente_Trifasica || 0).toFixed(2);
                document.getElementById('potencia').textContent = (dado.Potencia_Ativa_Trifasica || 0).toFixed(2);
                document.getElementById('frequencia').textContent = (dado.Frequencia || 0).toFixed(2);
                document.getElementById('energia').textContent = (dado.Energia_Ativa_Positiva || 0).toFixed(2);
                document.getElementById('demanda').textContent = (dado.Demanda_Ativa || 0).toFixed(2);
                document.getElementById('fator-potencia').textContent = (dado.Fator_Potencia_Trifasico || 0).toFixed(2);
                document.getElementById('thd-tensao').textContent = (dado.THD_Tensao_Fase_1 || 0).toFixed(2);

                // Detalhes avançados
                document.getElementById('tensao-f1').textContent = (dado.Tensao_Fase_1 || 0).toFixed(2);
                document.getElementById('tensao-f2').textContent = (dado.Tensao_Fase_2 || 0).toFixed(2);
                document.getElementById('tensao-f3').textContent = (dado.Tensao_Fase_3 || 0).toFixed(2);
                document.getElementById('linha-12').textContent = (dado.Tensao_Linha_12 || 0).toFixed(2);
                document.getElementById('linha-23').textContent = (dado.Tensao_Linha_23 || 0).toFixed(2);
                document.getElementById('linha-31').textContent = (dado.Tensao_Linha_31 || 0).toFixed(2);

                document.getElementById('corrente-f1').textContent = (dado.Corrente_Fase_1 || 0).toFixed(2);
                document.getElementById('corrente-f2').textContent = (dado.Corrente_Fase_2 || 0).toFixed(2);
                document.getElementById('corrente-f3').textContent = (dado.Corrente_Fase_3 || 0).toFixed(2);

                document.getElementById('potencia-f1').textContent = (dado.Potencia_Ativa_Fase_1 || 0).toFixed(2);
                document.getElementById('potencia-f2').textContent = (dado.Potencia_Ativa_Fase_2 || 0).toFixed(2);
                document.getElementById('potencia-f3').textContent = (dado.Potencia_Ativa_Fase_3 || 0).toFixed(2);
                document.getElementById('potencia-aparente').textContent = (dado.Potencia_Aparente_Trifasica || 0).toFixed(2);
                document.getElementById('potencia-reativa').textContent = (dado.Potencia_Reativa_Trifasica || 0).toFixed(2);

                document.getElementById('thd-tensao-f1').textContent = (dado.THD_Tensao_Fase_1 || 0).toFixed(2);
                document.getElementById('thd-tensao-f2').textContent = (dado.THD_Tensao_Fase_2 || 0).toFixed(2);
                document.getElementById('thd-tensao-f3').textContent = (dado.THD_Tensao_Fase_3 || 0).toFixed(2);
                document.getElementById('thd-corrente-f1').textContent = (dado.THD_Corrente_Fase_1 || 0).toFixed(2);
                document.getElementById('demanda-max').textContent = (dado.Demanda_Maxima_Ativa || 0).toFixed(2);

                // Status
                document.getElementById('total-dados').textContent = total;
                document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
            }

            function exportarDados() {
                alert('Funcionalidade de exportação disponível na seção de exportação!');
            }

            function limparDados() {
                if (confirm('Tem certeza que deseja limpar todos os dados?')) {
                    fetch('/api/clear', { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            alert('Dados limpos com sucesso!');
                            location.reload();
                        })
                        .catch(error => {
                            alert('Erro ao limpar dados: ' + error);
                        });
                }
            }

            // Configurar datas padrão para o formulário
            document.addEventListener('DOMContentLoaded', function() {
                const hoje = new Date().toISOString().split('T')[0];
                const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                document.getElementById('dataInicio').value = umaSemanaAtras;
                document.getElementById('dataFim').value = hoje;
                
                // Inicialização
                atualizarDados();
                inicializarGraficos();
                
                // Atualização automática a cada 30 segundos
                setInterval(atualizarDados, 30000);
                
                // Atualizar gráficos de tempo real a cada 2 minutos
                setInterval(carregarDemandaTempoReal, 120000);
                
                // Atualizar gráficos diários e mensais a cada 10 minutos
                setInterval(function() {
                    carregarDemandaDiaria();
                    carregarDemandaMensal();
                }, 600000);
            });
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(' ');
    console.log('🚀 SERVIDOR MULTIMEDIDOR UFRJ - DEPLOY PRODUÇÃO');
    console.log('📍 Porta: ' + PORT);
    console.log('🌐 Ambiente: ' + (isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'));
    console.log('💾 Banco de dados: ' + (isProduction ? 'SQLite em memória' : 'SQLite arquivo'));
    console.log('🎓 Universidade Federal do Rio de Janeiro');
    console.log(' ');
    console.log('📊 Endpoints disponíveis:');
    console.log('   📍 GET  /              - Dashboard completo com gráficos');
    console.log('   📍 POST /api/data      - Receber dados do ESP32');
    console.log('   📍 GET  /api/exportar/csv/completo      - Exportar CSV completo');
    console.log('   📍 GET  /api/exportar/csv/resumido      - Exportar CSV resumido');
    console.log('   📍 GET  /api/exportar/csv/periodo       - Exportar por período');
    console.log('   📍 GET  /api/exportar/csv/ultima-semana - Exportar última semana');
    console.log('   📍 GET  /api/exportar/csv/ultimo-mes    - Exportar último mês');
    console.log('   📍 GET  /api/demanda-diaria    - Gráfico demanda diária');
    console.log('   📍 GET  /api/demanda-mensal    - Gráfico demanda mensal');
    console.log('   📍 GET  /api/demanda-tempo-real - Gráfico tempo real');
    console.log(' ');
});