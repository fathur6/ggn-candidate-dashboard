/**
 * DATABASE & CONFIGURATION
 * SSoT: ggn-candidate-dashboard
 */
const SHEET_NAME = "Data";
const ADMIN_SHEET_NAME = "Admin";

/**
 * Test function to verify google.script.run RPC is working.
 */
function testPing() {
  return { pong: true, time: new Date().toISOString() };
}

/**
 * Tiny diagnostic to verify RPC channel.
 */
function getStats() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rowCount = sheet.getLastRow() - 1;
    return { success: true, rowCount: rowCount, dbId: spreadsheetId };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Sets up the database ID if not already configured.
 */
function ensureDatabaseSetup() {
  const existing = PropertiesService.getScriptProperties().getProperty('DB_ID');
  if (!existing) {
    PropertiesService.getScriptProperties().setProperty('DB_ID', '1knHUuDCGZPuMkkuBxpakYv_z2Ozh2TQtXPLpjUIm6Aw');
  }
}

/**
 * Setup endpoint: Visit ?setup to initialize the database connection.
 */
function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter.setup === '1') {
      return HtmlService.createHtmlOutput(
        '<h3>Setup...</h3><pre>' +
        runSetup() +
        '</pre><p>You can close this tab and reopen the dashboard.</p>'
      ).setTitle('Setup');
    }
    if (e.parameter.action === 'getStudents') {
      return ContentService.createTextOutput(JSON.stringify(getStudents()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (e.parameter.action === 'getStudentsJSONP') {
      const data = getStudents();
      const callback = e.parameter.callback || 'handleData';
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }
  
  const template = HtmlService.createTemplateFromFile('index');
  
  try {
    template.appsScriptUrl = ScriptApp.getService().getUrl();
  } catch(e) {
    template.appsScriptUrl = "";
  }
  
  // Ambil emel pengguna Google Workspace secara automatik
  const email = Session.getActiveUser().getEmail().toLowerCase();
  template.userEmail = email;
  
  // Tentukan peranan (Role) secara pelayan (Server-side)
  let role = 'unauthorized';
  if (email) {
    if (isAdminEmail(email)) {
      role = 'admin';
    } else if (email.endsWith('@unisza.edu.my')) {
      role = 'viewer';
    }
  }
  template.userRole = role;
  
  ensureDatabaseSetup();
  
  return template.evaluate()
      .setTitle('Dashboard Status Calon Siswazah PPS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function runSetup() {
  try {
    ensureDatabaseSetup();
    const dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    let result = 'DB_ID: ' + dbId + '\n';
    if (dbId) {
      const ss = SpreadsheetApp.openById(dbId);
      result += 'Spreadsheet: ' + ss.getName() + '\n';
      result += 'Sheets: ' + ss.getSheets().map(s => s.getName()).join(', ') + '\n';
    }
    return result;
  } catch (err) {
    return 'Error: ' + err.toString();
  }
}

/**
 * Lapisan Keselamatan Pelayan: Semak status admin untuk fungsi kritikal
 */
function verifyServerAdmin() {
  const email = Session.getActiveUser().getEmail().toLowerCase();
  if (!isAdminEmail(email)) {
    throw new Error("Akses Ditolak: Hanya Pentadbir PPS dibenarkan membuat perubahan.");
  }
}

/**
 * Mengambil data pelajar
 */
function getStudents() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Tab 'Data' tidak dijumpai.");
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, data: [], lastUpdated: new Date().toISOString() };
    }
    
    const studentsList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; 
      
      let tarikhDaftar = row[13]; 
      if (tarikhDaftar instanceof Date) {
        tarikhDaftar = Utilities.formatDate(tarikhDaftar, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }

      let warganegara = row[15] ? row[15].toString().trim().toUpperCase() : 'MALAYSIA'; 
      let jenis = (warganegara && !warganegara.includes('MALAYSIA')) ? 'international' : 'local';
      
      studentsList.push({
        noMatrik: row[0],
        nama: row[1],
        sesi: row[2],
        kodProgram: row[3],
        namaProgram: row[4],
        program: row[5],
        fakulti: row[6],
        status: row[7],
        mod: row[8],
        jantina: row[9],
        negeriLahir: row[10],
        alamat: row[11],
        noTelefon: row[12],
        tarikhDaftar: tarikhDaftar,
        kodAgama: row[14],
        warganegara: warganegara,
        jenis: jenis,
        emel: row[16],
        penyelia: row[17],
        kategori: row[18],
        tarikhKemaskini: row[19]
      });
    }
    
    return { success: true, data: studentsList, lastUpdated: new Date().toISOString() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Returns a chunk of students. Used by the client to load large datasets
 * in pieces via google.script.run (which has a response size limit).
 */
function getStudentsChunk(start, count) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Tab 'Data' tidak dijumpai.");
    
    const allData = sheet.getDataRange().getValues();
    const headerRow = allData[0];
    const dataRows = allData.slice(1).filter(r => r[0]);
    const total = dataRows.length;
    
    const end = Math.min(start + count, total);
    const chunk = [];
    
    for (let i = start; i < end; i++) {
      const row = dataRows[i];
      let tarikhDaftar = row[13];
      if (tarikhDaftar instanceof Date) {
        tarikhDaftar = Utilities.formatDate(tarikhDaftar, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      let warganegara = row[15] ? row[15].toString().trim().toUpperCase() : 'MALAYSIA';
      let jenis = (warganegara && !warganegara.includes('MALAYSIA')) ? 'international' : 'local';
      
      chunk.push({
        noMatrik: row[0],
        nama: row[1],
        sesi: row[2],
        kodProgram: row[3],
        namaProgram: row[4],
        program: row[5],
        fakulti: row[6],
        status: row[7],
        mod: row[8],
        jantina: row[9],
        negeriLahir: row[10],
        alamat: row[11],
        noTelefon: row[12],
        tarikhDaftar: tarikhDaftar,
        kodAgama: row[14],
        warganegara: warganegara,
        jenis: jenis,
        emel: row[16],
        penyelia: row[17],
        kategori: row[18],
        tarikhKemaskini: row[19]
      });
    }
    
    return { success: true, chunk: chunk, total: total, start: start, end: end, lastUpdated: new Date().toISOString() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Menyimpan data (HANYA ADMIN)
 */
function importStudents(payloadList) {
  try {
    verifyServerAdmin(); // Semak keselamatan
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Tab 'Data' tidak dijumpai.");
    
    const data = sheet.getDataRange().getValues();
    const matrikMap = new Map();
    for (let i = 1; i < data.length; i++) {
        if(data[i][0]) matrikMap.set(data[i][0].toString().trim().toLowerCase(), i + 1);
    }
    
    const tarikhKemaskini = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    payloadList.forEach(student => {
        const matrikKey = (student.noMatrik || "").toString().trim().toLowerCase();
        const rowData = [
            student.noMatrik || "", student.nama || "", student.sesi || "", student.kodProgram || "", 
            student.namaProgram || "", student.program || "", student.fakulti || "", student.status || "", 
            student.mod || "", student.jantina || "", student.negeriLahir || "", student.alamat || "", 
            student.noTelefon || "", student.tarikhDaftar || "", student.kodAgama || "", student.warganegara || "", 
            student.emel || "", student.penyelia || "", student.kategori || "", tarikhKemaskini
        ];

        if (matrikMap.has(matrikKey)) {
            const rowIndex = matrikMap.get(matrikKey);
            sheet.getRange(rowIndex, 1, 1, 20).setValues([rowData]);
        } else {
            sheet.appendRow(rowData);
            matrikMap.set(matrikKey, sheet.getLastRow());
        }
    });
    
    return { success: true, count: payloadList.length };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Bahagian Pengurusan Admin
 */
function getAdmins() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    if (!sheet) return { success: false, error: "Tab 'Admin' tidak dijumpai." };
    
    const data = sheet.getRange("A2:A").getValues();
    const emails = data.map(row => row[0].toString().trim().toLowerCase()).filter(e => e !== "");
    return { success: true, data: emails };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

function addAdmin(newEmail) {
  try {
    verifyServerAdmin(); // Semak keselamatan
    
    if(!newEmail || !newEmail.includes('@')) throw new Error("Format emel tidak sah");
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    if (!sheet) throw new Error("Tab 'Admin' tidak dijumpai.");
    
    const data = sheet.getRange("A2:A").getValues();
    const emails = data.map(row => row[0].toString().trim().toLowerCase());
    const cleanEmail = newEmail.trim().toLowerCase();
    
    if(emails.includes(cleanEmail)) {
        throw new Error("Emel sudah wujud dalam sistem.");
    }
    
    sheet.appendRow([cleanEmail]);
    return { success: true };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

function isAdminEmail(email) {
  if (!email) return false;
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    if (!sheet) return false;
    const data = sheet.getRange("A2:A").getValues();
    const adminEmailsList = data.map(row => row[0].toString().trim().toLowerCase());
    return adminEmailsList.includes(email.trim().toLowerCase());
  } catch(err) {
    return false;
  }
}