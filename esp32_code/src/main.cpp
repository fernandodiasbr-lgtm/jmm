#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <WebServer.h>
#include <ModbusMaster.h>
#include "time.h"

// ========== CONFIGURAÇÕES MODBUS ==========
#define RX2_PIN 16
#define TX2_PIN 17
#define LED_PIN 2
#define DE_RE_PIN 4

// Configuração NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = -3 * 3600;
const int daylightOffset_sec = 0;

ModbusMaster node;

// ========== CONFIGURAÇÕES WIFI ==========
const char* AP_SSID = "Multimedidor_ESP32";
const char* AP_PASSWORD = "12345678";

WebServer server(80);

// Variáveis de configuração
String wifiSSID = "";
String wifiPassword = "";
String platformURL = "http://192.168.1.183:8080/api/data";
bool isConfigured = false;

// ========== REGISTROS COMPLETOS MULT-K ==========
struct KronRegister {
  uint16_t address;
  String description;
  String unit;
  bool isFloat32;
  uint8_t quantity;
};

KronRegister kronRegisters[] = {
  // ========== SISTEMA TRIFÁSICO ==========
  {0x0002, "Tensao_Trifasica", "V", true, 2},
  {0x0004, "Corrente_Trifasica", "A", true, 2},
  {0x0006, "Fator_Potencia_Trifasico", "", true, 2},
  {0x0008, "Potencia_Aparente_Trifasica", "VA", true, 2},
  {0x000A, "Potencia_Reativa_Trifasica", "Var", true, 2},
  {0x000C, "Potencia_Ativa_Trifasica", "W", true, 2},
  
  // ========== MEDIDAS BÁSICAS ==========
  {0x000E, "Frequencia", "Hz", true, 2},
  
  // ========== TENSÕES DE FASE ==========
  {0x0010, "Tensao_Fase_1", "V", true, 2},
  {0x0012, "Tensao_Fase_2", "V", true, 2},
  {0x0014, "Tensao_Fase_3", "V", true, 2},
  
  // ========== CORRENTES ==========
  {0x0016, "Corrente_Fase_1", "A", true, 2},
  {0x0018, "Corrente_Fase_2", "A", true, 2},
  {0x001A, "Corrente_Fase_3", "A", true, 2},
  
  // ========== POTÊNCIAS ATIVAS POR FASE ==========
  {0x001C, "Potencia_Ativa_Fase_1", "W", true, 2},
  {0x001E, "Potencia_Ativa_Fase_2", "W", true, 2},
  {0x0020, "Potencia_Ativa_Fase_3", "W", true, 2},
  
  // ========== POTÊNCIAS REATIVAS POR FASE ==========
  {0x0022, "Potencia_Reativa_Fase_1", "Var", true, 2},
  {0x0024, "Potencia_Reativa_Fase_2", "Var", true, 2},
  {0x0026, "Potencia_Reativa_Fase_3", "Var", true, 2},
  
  // ========== POTÊNCIAS APARENTES POR FASE ==========
  {0x0028, "Potencia_Aparente_Fase_1", "VA", true, 2},
  {0x002A, "Potencia_Aparente_Fase_2", "VA", true, 2},
  {0x002C, "Potencia_Aparente_Fase_3", "VA", true, 2},
  
  // ========== FATORES DE POTÊNCIA POR FASE ==========
  {0x002E, "Fator_Potencia_Fase_1", "", true, 2},
  {0x0030, "Fator_Potencia_Fase_2", "", true, 2},
  {0x0032, "Fator_Potencia_Fase_3", "", true, 2},
  
  // ========== ENERGIA ==========
  {0x0034, "Energia_Ativa_Positiva", "kWh", true, 2},
  {0x0036, "Energia_Reativa_Positiva", "kVARh", true, 2},
  {0x0038, "Energia_Ativa_Negativa", "kWh", true, 2},
  {0x003A, "Energia_Reativa_Negativa", "kVARh", true, 2},
  
  // ========== DEMANDA ==========
  {0x003C, "Demanda_Maxima_Ativa", "W", true, 2},
  {0x003E, "Demanda_Ativa", "W", true, 2},
  {0x0040, "Demanda_Maxima_Aparente", "VA", true, 2},
  {0x0042, "Demanda_Aparente", "VA", true, 2},
  
  // ========== TENSÕES ENTRE LINHAS ==========
  {0x0054, "Tensao_Linha_12", "V", true, 2},
  {0x0056, "Tensao_Linha_23", "V", true, 2},
  {0x0058, "Tensao_Linha_31", "V", true, 2},
  
  // ========== VALORES MÁXIMOS ==========
  {0x005A, "Tensao_Maxima_Trifasica", "V", true, 2},
  {0x005C, "Corrente_Maxima_Trifasica", "A", true, 2},
  
  // ========== THD ==========
  {0x00C8, "THD_Tensao_Fase_1", "%", false, 1},
  {0x00C9, "THD_Tensao_Fase_2", "%", false, 1},
  {0x00CA, "THD_Tensao_Fase_3", "%", false, 1},
  {0x00CB, "THD_Corrente_Fase_1", "%", false, 1},
  {0x00CC, "THD_Corrente_Fase_2", "%", false, 1},
  {0x00CD, "THD_Corrente_Fase_3", "%", false, 1}
};

// ========== FUNÇÕES MODBUS ==========
float hexTo32Float(uint16_t word1, uint16_t word2) {
    uint16_t w1_swapped = (word1 << 8) | (word1 >> 8);
    uint16_t w2_swapped = (word2 << 8) | (word2 >> 8);
    uint32_t combined = ((uint32_t)w2_swapped << 16) | w1_swapped;
    
    union { uint32_t i; float f; } converter;
    converter.i = combined;
    return converter.f;
}

float readKronRegister(uint16_t address, bool isFloat32, uint8_t quantity) {
    node.begin(1, Serial2);
    uint8_t result = node.readInputRegisters(address, quantity);
    
    if (result == node.ku8MBSuccess) {
        if (isFloat32 && quantity == 2) {
            uint16_t reg1 = node.getResponseBuffer(0);
            uint16_t reg2 = node.getResponseBuffer(1);
            return hexTo32Float(reg1, reg2);
        } else if (!isFloat32 && quantity == 1) {
            uint16_t value = node.getResponseBuffer(0);
            return value * 0.1; // THD vem como inteiro * 10
        }
    }
    return NAN;
}

String getDateTime() {
    struct tm timeinfo;
    if(!getLocalTime(&timeinfo)){
        return "0000-00-00 00:00:00";
    }
    
    char buffer[20];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
    return String(buffer);
}

// ========== FUNÇÕES WIFI ==========
void loadConfig() {
    Serial.println("📖 Carregando configurações...");
    
    String testSSID = EEPROM.readString(0);
    if(testSSID.length() > 0) {
        wifiSSID = testSSID;
        wifiPassword = EEPROM.readString(50);
        isConfigured = true;
        Serial.println("✅ Configuração carregada: " + wifiSSID);
    } else {
        Serial.println("📝 Nenhuma configuração salva - Modo AP");
    }
}

void saveConfig() {
    Serial.println("💾 Salvando configurações...");
    
    EEPROM.writeString(0, wifiSSID);
    EEPROM.writeString(50, wifiPassword);
    EEPROM.commit();
    
    isConfigured = true;
    Serial.println("✅ Configuração salva: " + wifiSSID);
}

void startAccessPoint() {
    Serial.println("📡 Criando Access Point do ESP32...");
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    
    Serial.println("📍 Acesse: http://192.168.4.1");
    Serial.println("📶 SSID: " + String(AP_SSID));
    Serial.println("🔑 Senha: " + String(AP_PASSWORD));
    Serial.println("💡 Conecte-se e configure seu WiFi!");
}

void connectToWiFi() {
    if (wifiSSID.length() == 0) {
        Serial.println("❌ Nenhuma rede WiFi configurada - Iniciando AP");
        startAccessPoint();
        return;
    }
    
    Serial.println("📶 Conectando ao WiFi: " + wifiSSID);
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    
    Serial.print("⏳ Aguardando conexão");
    for(int i = 0; i < 20; i++) {
        if(WiFi.status() == WL_CONNECTED) {
            Serial.println();
            Serial.println("✅ Conectado! IP: " + WiFi.localIP().toString());
            Serial.println("📡 Gateway: " + WiFi.gatewayIP().toString());
            return;
        }
        delay(1000);
        Serial.print(".");
    }
    Serial.println();
    Serial.println("❌ Não conectou ao WiFi - Iniciando AP");
    startAccessPoint();
}

// ========== LEITURA DOS DADOS REAIS ==========
String getSensorData() {
    JsonDocument doc;
    
    // Dados básicos do dispositivo
    doc["device_id"] = "multimedidor_ufrj_001";
    doc["timestamp"] = getDateTime();
    
    // Ler todos os registros do Mult-K
    int successCount = 0;
    int totalRegisters = sizeof(kronRegisters)/sizeof(kronRegisters[0]);
    
    Serial.println("🔍 Lendo " + String(totalRegisters) + " registros do Mult-K...");
    
    for (int i = 0; i < totalRegisters; i++) {
        KronRegister reg = kronRegisters[i];
        float value = readKronRegister(reg.address, reg.isFloat32, reg.quantity);
        
        if (!isnan(value)) {
            doc[reg.description] = value;
            successCount++;
            
            // Log dos principais parâmetros
            if (reg.description == "Tensao_Trifasica" || 
                reg.description == "Corrente_Trifasica" || 
                reg.description == "Potencia_Ativa_Trifasica" ||
                reg.description == "Demanda_Ativa" ||
                reg.description == "THD_Tensao_Fase_1") {
                Serial.println("   " + reg.description + ": " + String(value) + " " + reg.unit);
            }
        } else {
            doc[reg.description] = nullptr; // Envia null se não conseguir ler
            Serial.println("   ❌ " + reg.description + ": ERRO");
        }
        
        delay(50); // Pequena pausa entre leituras
    }
    
    Serial.println("📊 Dados lidos com sucesso: " + String(successCount) + "/" + String(totalRegisters));
    
    String jsonString;
    serializeJson(doc, jsonString);
    return jsonString;
}

// ========== ENVIO PARA O SERVIDOR ==========
void sendToPlatform() {
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("🔄 ENVIANDO DADOS COMPLETOS DO MULT-K");
        
        WiFiClient client;
        HTTPClient http;
        
        Serial.println("🌐 Conectando: " + platformURL);
        
        http.begin(client, platformURL);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(20000); // 20 segundos timeout para leitura completa
        
        String jsonData = getSensorData();
        Serial.println("📦 Dados coletados do Mult-K");
        
        Serial.println("🔗 Enviando POST...");
        int httpCode = http.POST(jsonData);
        
        Serial.println("📊 HTTP Code: " + String(httpCode));
        
        if (httpCode > 0) {
            if (httpCode == 200) {
                String response = http.getString();
                Serial.println("🎉 ✅ SUCESSO! Todos os dados enviados!");
                Serial.println("📨 Resposta: " + response);
            } else {
                Serial.println("⚠️ HTTP: " + String(httpCode));
                String response = http.getString();
                if (response.length() > 0) {
                    Serial.println("📨 Resposta: " + response);
                }
            }
        } else {
            Serial.println("❌ Erro: " + http.errorToString(httpCode));
        }
        
        http.end();
        Serial.println("======================================");
        
    } else {
        Serial.println("⚠️ WiFi desconectado");
        connectToWiFi();
    }
}

// ========== SERVIDOR WEB ==========
void setupServerRoutes() {
    server.on("/", []() {
        String html = "<html><body style='margin:40px;'>";
        html += "<h1>🌐 Multimedidor ESP32 - UFRJ</h1>";
        
        if(WiFi.status() == WL_CONNECTED) {
            html += "<p style='color:green'>✅ Conectado: " + WiFi.localIP().toString() + "</p>";
        } else {
            html += "<p style='color:orange'>📡 Modo Access Point</p>";
            html += "<p>IP: 192.168.4.1</p>";
        }
        
        html += "<form action='/config' method='POST'>";
        html += "WiFi SSID: <input type='text' name='ssid' value='" + wifiSSID + "'><br><br>";
        html += "Senha: <input type='password' name='password' value='" + wifiPassword + "'><br><br>";
        html += "<input type='submit' value='Salvar Configuração'>";
        html += "</form>";
        
        html += "<hr>";
        html += "<p><a href='/send'>📤 Enviar Dados Agora</a></p>";
        html += "<p><a href='/status'>📊 Status do Sistema</a></p>";
        html += "<p><a href='/debug'>🐛 Debug Mult-K</a></p>";
        html += "<p><a href='/teste'>🧪 Teste Completo</a></p>";
        
        html += "</body></html>";
        
        server.send(200, "text/html", html);
    });
    
    server.on("/config", HTTP_POST, []() {
        wifiSSID = server.arg("ssid");
        wifiPassword = server.arg("password");
        saveConfig();
        
        server.send(200, "text/html", "<h1>✅ Salvo! Reiniciando...</h1>");
        delay(2000);
        ESP.restart();
    });
    
    server.on("/send", []() {
        sendToPlatform();
        server.send(200, "text/html", "<h1>📤 Dados Enviados!</h1>");
    });
    
    server.on("/status", []() {
        String html = "<html><body style='margin:40px;'>";
        html += "<h1>📊 Status do Sistema</h1>";
        html += "<p>WiFi: " + String(WiFi.SSID()) + "</p>";
        html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
        html += "<p>Servidor: " + platformURL + "</p>";
        html += "<p>Configurado: " + String(isConfigured ? "Sim" : "Não") + "</p>";
        html += "<p><a href='/'>Voltar</a></p>";
        html += "</body></html>";
        
        server.send(200, "text/html", html);
    });
    
    server.on("/debug", []() {
        // Teste rápido dos registros
        String html = "<html><body style='margin:40px;'>";
        html += "<h1>🐛 Debug Mult-K</h1>";
        html += "<p><strong>Testando leitura de registros...</strong></p>";
        
        // Testar alguns registros importantes
        float tensao = readKronRegister(0x0002, true, 2);
        float corrente = readKronRegister(0x0004, true, 2);
        float potencia = readKronRegister(0x000C, true, 2);
        float frequencia = readKronRegister(0x000E, true, 2);
        float demanda = readKronRegister(0x003E, true, 2);
        float thd_tensao = readKronRegister(0x00C8, false, 1);
        
        html += "<p>Tensão Trifásica: " + String(tensao) + " V</p>";
        html += "<p>Corrente Trifásica: " + String(corrente) + " A</p>";
        html += "<p>Potência Ativa: " + String(potencia) + " W</p>";
        html += "<p>Frequência: " + String(frequencia) + " Hz</p>";
        html += "<p>Demanda Ativa: " + String(demanda) + " W</p>";
        html += "<p>THD Tensão F1: " + String(thd_tensao) + " %</p>";
        
        html += "<p><a href='/send'>📤 Enviar Dados Completos</a></p>";
        html += "<p><a href='/'>Voltar</a></p>";
        html += "</body></html>";
        
        server.send(200, "text/html", html);
    });
    
    server.on("/teste", []() {
        // Teste completo de todos os registros
        String html = "<html><body style='margin:40px;'>";
        html += "<h1>🧪 Teste Completo Mult-K</h1>";
        html += "<p><strong>Lendo todos os " + String(sizeof(kronRegisters)/sizeof(kronRegisters[0])) + " registros...</strong></p>";
        
        int successCount = 0;
        for (int i = 0; i < sizeof(kronRegisters)/sizeof(kronRegisters[0]); i++) {
            KronRegister reg = kronRegisters[i];
            float value = readKronRegister(reg.address, reg.isFloat32, reg.quantity);
            
            if (!isnan(value)) {
                html += "<p style='color:green'>✅ " + reg.description + ": " + String(value) + " " + reg.unit + "</p>";
                successCount++;
            } else {
                html += "<p style='color:red'>❌ " + reg.description + ": ERRO</p>";
            }
            
            delay(50);
        }
        
        html += "<p><strong>Resultado: " + String(successCount) + "/" + String(sizeof(kronRegisters)/sizeof(kronRegisters[0])) + " registros lidos</strong></p>";
        html += "<p><a href='/'>Voltar</a></p>";
        html += "</body></html>";
        
        server.send(200, "text/html", html);
    });
    
    server.begin();
    Serial.println("✅ Servidor web iniciado na porta 80");
}

// ========== SETUP E LOOP ==========
void setup() {
    Serial.begin(115200);
    Serial.println("🚀 MULTIMEDIDOR UFRJ - INICIANDO SISTEMA COMPLETO...");
    
    // Inicializar EEPROM
    EEPROM.begin(512);
    
    // Inicializar MODBUS
    pinMode(LED_PIN, OUTPUT);
    pinMode(DE_RE_PIN, OUTPUT);
    digitalWrite(DE_RE_PIN, LOW);
    
    Serial2.begin(9600, SERIAL_8N1, RX2_PIN, TX2_PIN);
    
    node.preTransmission([]() {
        digitalWrite(DE_RE_PIN, HIGH);
        delay(1);
    });
    
    node.postTransmission([]() {
        delay(1);
        digitalWrite(DE_RE_PIN, LOW);
    });
    
    // Configurar tempo
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    
    // Carregar configurações WiFi
    loadConfig();
    
    if (!isConfigured) {
        Serial.println("🔧 MODO CONFIGURAÇÃO - CONFIGURE O WIFI");
        startAccessPoint();
    } else {
        Serial.println("🚀 MODO OPERACIONAL");
        connectToWiFi();
    }
    
    setupServerRoutes();
    
    // Aguardar sincronização do tempo
    Serial.println("🕐 Sincronizando data/hora...");
    delay(2000);
    
    Serial.println("✅ Sistema Mult-K UFRJ inicializado!");
    Serial.println("📊 Total de registros: " + String(sizeof(kronRegisters)/sizeof(kronRegisters[0])));
    Serial.println("📡 Pronto para coletar e enviar dados completos!");
}

void loop() {
    server.handleClient();
    
    // Enviar dados a cada 15 segundos (tempo maior para leitura completa)
    static unsigned long lastSend = 0;
    if (isConfigured && WiFi.status() == WL_CONNECTED && millis() - lastSend > 15000) {
        sendToPlatform();
        lastSend = millis();
        
        // Piscar LED indicando atividade
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
    }
    
    delay(1000);
}