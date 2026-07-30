/**
 * Trust Hunter - Code.gs
 * 메인 백엔드: 설정, 라우팅, 사용자 관리, 사례 CRUD, CSV 내보내기, OWID API 연동
 */

// ==================== 설정 ====================
var CONFIG = {
  APP_NAME: 'Trust Hunter',
  VERSION: '1.0.0',
  SPREADSHEET_ID: '1bZMbfw5E2M4MJvyKLFhhYJ_pHezlwRrHYMoVIrgn1SQ',
  SHEET_DATABASE: 'Database',
  SHEET_USERS: 'Users',
  INITIAL_ADMIN: 'Trust Hunter',
  OWID_API_BASE: 'https://api.ourworldindata.org/v1',
  FOLDER_NAME: 'TrustHunter_Attachments'
};

// 데이터베이스 시트 컬럼 인덱스 (0-based)
var DB = {
  NICKNAME: 0,        // A 닉네임
  TIMESTAMP: 1,       // B Timestamp
  TOPIC: 2,           // C 신뢰 사례 및 허위 사례 주제
  DESCRIPTION: 3,      // D 신뢰 사례 및 허위 사례 1가지 이상 설명
  EVIDENCE: 4,        // E 신뢰 사례 및 허위 사례 2가지 이상의 증거 자료
  STATUS: 5,          // F 신뢰 사례 및 허위 사례 현황
  PATTERN: 6,         // G 행동 패턴 분석
  COMMON_TRAITS: 7,   // H 신뢰 사례와 신뢰를 잃은 사례별 공통 특성 노출
  CRITERIA: 8,        // I 신뢰 판단 기준 정의
  JUDGMENT: 9,        // J 신뢰 판단 기준 기반 신뢰 판단, 미래 결과 예측
  ACTUAL_TRUTH: 10,   // K 실제 신뢰 여부
  ACTUAL_RESULT: 11,  // L 실제 결과
  WEIGHT_ADJUST: 12,  // M 신뢰 판단 기준, 가중치 수정
  APPLY_OTHERS: 13,   // N 다른 사례에 신뢰 판단 기준, 가중치 적용
  AI_APPLY: 14,       // O AI가 다른 사례에 신뢰 판단 기준, 가중치 적용 [출시 예정]
  AI_TRUST_SCORE: 15, // P AI 자동 Trust Score 산출 [출시 예정]
  REPORT_ID: 16,      // Q report_id
  IS_DELETED: 17      // R is_deleted
};

var DB_HEADERS = [
  '닉네임', 'Timestamp', '신뢰 사례 및 허위 사례 주제',
  '신뢰 사례 및 허위 사례 1가지 이상 설명',
  '신뢰 사례 및 허위 사례 2가지 이상의 증거 자료',
  '신뢰 사례 및 허위 사례 현황',
  '행동 패턴 분석',
  '신뢰 사례와 신뢰를 잃은 사례별 공통 특성 노출',
  '신뢰 판단 기준 정의',
  '신뢰 판단 기준 기반 신뢰 판단, 미래 결과 예측',
  '실제 신뢰 여부',
  '실제 결과',
  '신뢰 판단 기준, 가중치 수정',
  '다른 사례에 신뢰 판단 기준, 가중치 적용',
  'AI가 다른 사례에 신뢰 판단 기준, 가중치 적용 [출시 예정]',
  'AI가 자동으로 신뢰 판단 기준 기반 진위 확인, 미래 결과 예측 신뢰 점수 Trust Score 산출 [출시 예정]',
  'report_id', 'is_deleted'
];

// 사용자 시트 컬럼 인덱스 (0-based)
var US = {
  NICKNAME: 0,        // A 닉네임
  ROLE: 1,            // B 역할 (user / admin)
  APPROVAL_STATUS: 2, // C 승인여부 (pending / approved)
  APPROVAL_DATE: 3,   // D 승인일
  APPROVER: 4,        // E 승인자
  JOIN_DATE: 5,       // F 가입일
  IS_DELETED: 6       // G is_deleted
};

var USER_HEADERS = ['닉네임', '역할', '승인여부', '승인일', '승인자', '가입일', 'is_deleted'];

// ==================== 진입점 ====================

/**
 * 웹앱 접속 시 HTML 화면을 띄워주는 함수
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Trust Hunter | Trust Score로 신뢰를 수치화하는 곳')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .addMetaTag('description', 'Trust Hunter - 수많은 사례를 분석하여 신뢰 판단 기준으로 진위 여부를 파악하고 미래 결과를 예측합니다.')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * POST 요청 처리 - 모든 API 호출을 라우팅
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

    switch (action) {
      case 'register':            result = registerUser(data.nickname, data.role); break;
      case 'login':               result = loginUser(data.nickname); break;
      case 'checkNickname':       result = checkNickname(data.nickname); break;
      case 'getUsers':            result = getUsers(); break;
      case 'getPendingApprovals': result = getPendingApprovals(); break;
      case 'approveUser':         result = approveUser(data.nickname, data.approver); break;
      case 'revokeAdmin':         result = revokeAdmin(data.nickname, data.approver); break;
      case 'saveReport':          result = saveReport(data.report); break;
      case 'updateReport':        result = updateReport(data.reportId, data.report); break;
      case 'deleteReport':        result = deleteReport(data.reportId, data.nickname); break;
      case 'getReports':          result = getReports(data.nickname, data.isAdmin); break;
      case 'getReportById':       result = getReportById(data.reportId, data.nickname, data.isAdmin); break;
      case 'exportCSV':           result = exportCSV(); break;
      case 'getServerInfo':       result = getServerInfo(); break;
      case 'getOWIDData':         result = getOWIDData(data.indicator); break;
      case 'uploadFile':          result = uploadFile(data.fileName, data.mimeType, data.base64); break;
      case 'initialize':          result = initializeSystem(); break;
      default:                   result = { success: false, message: '알 수 없는 요청입니다: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== 초기화 ====================

/**
 * 시스템 초기화 - 시트 생성 및 최초 관리자 등록
 */
function initializeSystem() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // Database 시트 확인/생성
  var dbSheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  if (!dbSheet) {
    dbSheet = ss.insertSheet(CONFIG.SHEET_DATABASE);
  }
  if (dbSheet.getLastColumn() < DB_HEADERS.length || dbSheet.getLastRow() < 1) {
    dbSheet.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
    dbSheet.getRange(1, 1, 1, DB_HEADERS.length)
      .setBackground('#1e4620').setFontColor('#ffffff').setFontWeight('bold');
    dbSheet.setFrozenRows(1);
  }

  // Users 시트 확인/생성
  var userSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(CONFIG.SHEET_USERS);
  }
  if (userSheet.getLastColumn() < USER_HEADERS.length || userSheet.getLastRow() < 1) {
    userSheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
    userSheet.getRange(1, 1, 1, USER_HEADERS.length)
      .setBackground('#1e4620').setFontColor('#ffffff').setFontWeight('bold');
    userSheet.setFrozenRows(1);
  }

  // 최초 관리자 'Trust Hunter' 생성
  var users = getAllUsersRaw();
  var adminExists = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.NICKNAME] === CONFIG.INITIAL_ADMIN && users[i][US.IS_DELETED] !== 'TRUE') {
      adminExists = true;
      break;
    }
  }
  if (!adminExists) {
    var nowStr = now();
    userSheet.appendRow([
      CONFIG.INITIAL_ADMIN, 'admin', 'approved', nowStr, 'SYSTEM', nowStr, 'FALSE'
    ]);
  }

  return { success: true, message: '시스템이 초기화되었습니다. 최초 관리자: ' + CONFIG.INITIAL_ADMIN };
}

// ==================== 사용자 관리 ====================

/**
 * 닉네임 중복 확인
 */
function checkNickname(nickname) {
  if (!nickname || nickname.trim() === '') {
    return { available: false, message: '닉네임을 입력해주세요.' };
  }
  var users = getAllUsersRaw();
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.NICKNAME] === nickname && users[i][US.IS_DELETED] !== 'TRUE') {
      return { available: false, message: '이미 사용 중인 닉네임입니다.' };
    }
  }
  return { available: true, message: '사용 가능한 닉네임입니다.' };
}

/**
 * 회원가입 - 닉네임과 역할 선택
 * 관리자 선택 시 승인 대기 상태로 등록
 */
function registerUser(nickname, role) {
  nickname = (nickname || '').trim();
  if (!nickname) {
    return { success: false, message: '닉네임을 입력해주세요.' };
  }

  var check = checkNickname(nickname);
  if (!check.available) {
    return { success: false, message: check.message };
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  var nowStr = now();
  var userRole = (role === 'admin') ? 'admin' : 'user';
  var approvalStatus = (userRole === 'admin') ? 'pending' : 'approved';

  sheet.appendRow([
    nickname, userRole, approvalStatus, '', '', nowStr, 'FALSE'
  ]);

  return {
    success: true,
    message: approvalStatus === 'pending'
      ? '회원가입이 완료되었습니다. 관리자 승인 대기 중입니다.'
      : '회원가입이 완료되었습니다. 로그인해주세요.',
    user: { nickname: nickname, role: userRole, approvalStatus: approvalStatus }
  };
}

/**
 * 닉네임으로 로그인
 */
function loginUser(nickname) {
  nickname = (nickname || '').trim();
  if (!nickname) {
    return { success: false, message: '닉네임을 입력해주세요.' };
  }

  var users = getAllUsersRaw();
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.NICKNAME] === nickname && users[i][US.IS_DELETED] !== 'TRUE') {
      var role = users[i][US.ROLE];
      var approvalStatus = users[i][US.APPROVAL_STATUS];

      // 관리자 미승인 시 사용자로 로그인
      if (role === 'admin' && approvalStatus !== 'approved') {
        return {
          success: false,
          message: '관리자 승인 대기 중입니다. 승인 전까지는 사용자로 활동할 수 없습니다.'
        };
      }

      return {
        success: true,
        message: '로그인되었습니다.',
        user: {
          nickname: nickname,
          role: role,
          approvalStatus: approvalStatus
        }
      };
    }
  }
  return { success: false, message: '존재하지 않는 닉네임입니다. 회원가입을 먼저 해주세요.' };
}

/**
 * 전체 사용자 목록 조회 (관리자용)
 */
function getUsers() {
  var users = getAllUsersRaw();
  var result = [];
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.IS_DELETED] !== 'TRUE') {
      result.push({
        nickname: users[i][US.NICKNAME],
        role: users[i][US.ROLE],
        approvalStatus: users[i][US.APPROVAL_STATUS],
        approvalDate: users[i][US.APPROVAL_DATE],
        approver: users[i][US.APPROVER],
        joinDate: users[i][US.JOIN_DATE]
      });
    }
  }
  return { success: true, users: result };
}

/**
 * 관리자 승인 대기 목록 조회
 */
function getPendingApprovals() {
  var users = getAllUsersRaw();
  var result = [];
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.ROLE] === 'admin' &&
        users[i][US.APPROVAL_STATUS] === 'pending' &&
        users[i][US.IS_DELETED] !== 'TRUE') {
      result.push({
        nickname: users[i][US.NICKNAME],
        joinDate: users[i][US.JOIN_DATE]
      });
    }
  }
  return { success: true, pending: result };
}

/**
 * 관리자 승인 - 닉네임으로 승인
 */
function approveUser(nickname, approver) {
  if (!nickname || !approver) {
    return { success: false, message: '닉네임과 승인자가 필요합니다.' };
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var nowStr = now();

  for (var i = 1; i < data.length; i++) {
    if (data[i][US.NICKNAME] === nickname && data[i][US.IS_DELETED] !== 'TRUE') {
      sheet.getRange(i + 1, US.APPROVAL_STATUS + 1).setValue('approved');
      sheet.getRange(i + 1, US.APPROVAL_DATE + 1).setValue(nowStr);
      sheet.getRange(i + 1, US.APPROVER + 1).setValue(approver);
      return { success: true, message: nickname + '님이 관리자로 승인되었습니다.' };
    }
  }
  return { success: false, message: '사용자를 찾을 수 없습니다.' };
}

/**
 * 관리자 권한 취소
 */
function revokeAdmin(nickname, approver) {
  if (nickname === CONFIG.INITIAL_ADMIN) {
    return { success: false, message: '최초 관리자는 권한을 취소할 수 없습니다.' };
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][US.NICKNAME] === nickname && data[i][US.IS_DELETED] !== 'TRUE') {
      sheet.getRange(i + 1, US.ROLE + 1).setValue('user');
      sheet.getRange(i + 1, US.APPROVAL_STATUS + 1).setValue('approved');
      return { success: true, message: nickname + '님의 관리자 권한이 취소되었습니다.' };
    }
  }
  return { success: false, message: '사용자를 찾을 수 없습니다.' };
}

/**
 * 사용자 시트 원본 데이터 조회
 */
function getAllUsersRaw() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, USER_HEADERS.length).getValues();
}

/**
 * 관리자 여부 확인
 */
function isAdmin(nickname) {
  var users = getAllUsersRaw();
  for (var i = 0; i < users.length; i++) {
    if (users[i][US.NICKNAME] === nickname &&
        users[i][US.ROLE] === 'admin' &&
        users[i][US.APPROVAL_STATUS] === 'approved' &&
        users[i][US.IS_DELETED] !== 'TRUE') {
      return true;
    }
  }
  return false;
}

// ==================== 사례 관리 ====================

/**
 * 사례 저장 (새 사례)
 */
function saveReport(report) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  var nowStr = now();
  var reportId = 'RPT_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);

  var row = [];
  row[DB.NICKNAME] = report.nickname || '';
  row[DB.TIMESTAMP] = nowStr;
  row[DB.TOPIC] = report.topic || '';
  row[DB.DESCRIPTION] = report.description || '';
  row[DB.EVIDENCE] = report.evidence || '';
  row[DB.STATUS] = report.status || '';
  row[DB.PATTERN] = report.pattern || '';
  row[DB.COMMON_TRAITS] = report.commonTraits || '';
  row[DB.CRITERIA] = report.criteria || '';
  row[DB.JUDGMENT] = report.judgment || '';
  row[DB.ACTUAL_TRUTH] = report.actualTruth || '';
  row[DB.ACTUAL_RESULT] = report.actualResult || '';
  row[DB.WEIGHT_ADJUST] = report.weightAdjust || '';
  row[DB.APPLY_OTHERS] = report.applyOthers || '';
  row[DB.AI_APPLY] = '[출시 예정]';
  row[DB.AI_TRUST_SCORE] = '[출시 예정]';
  row[DB.REPORT_ID] = reportId;
  row[DB.IS_DELETED] = 'FALSE';

  sheet.appendRow(row);

  return { success: true, message: '사례가 저장되었습니다.', reportId: reportId };
}

/**
 * 사례 수정 (부분 저장 지원)
 */
function updateReport(reportId, report) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][DB.REPORT_ID] === reportId && data[i][DB.IS_DELETED] !== 'TRUE') {
      if (report.topic !== undefined)        sheet.getRange(i + 1, DB.TOPIC + 1).setValue(report.topic);
      if (report.description !== undefined)  sheet.getRange(i + 1, DB.DESCRIPTION + 1).setValue(report.description);
      if (report.evidence !== undefined)     sheet.getRange(i + 1, DB.EVIDENCE + 1).setValue(report.evidence);
      if (report.status !== undefined)       sheet.getRange(i + 1, DB.STATUS + 1).setValue(report.status);
      if (report.pattern !== undefined)      sheet.getRange(i + 1, DB.PATTERN + 1).setValue(report.pattern);
      if (report.commonTraits !== undefined)  sheet.getRange(i + 1, DB.COMMON_TRAITS + 1).setValue(report.commonTraits);
      if (report.criteria !== undefined)     sheet.getRange(i + 1, DB.CRITERIA + 1).setValue(report.criteria);
      if (report.judgment !== undefined)     sheet.getRange(i + 1, DB.JUDGMENT + 1).setValue(report.judgment);
      if (report.actualTruth !== undefined)  sheet.getRange(i + 1, DB.ACTUAL_TRUTH + 1).setValue(report.actualTruth);
      if (report.actualResult !== undefined) sheet.getRange(i + 1, DB.ACTUAL_RESULT + 1).setValue(report.actualResult);
      if (report.weightAdjust !== undefined)  sheet.getRange(i + 1, DB.WEIGHT_ADJUST + 1).setValue(report.weightAdjust);
      if (report.applyOthers !== undefined)  sheet.getRange(i + 1, DB.APPLY_OTHERS + 1).setValue(report.applyOthers);
      return { success: true, message: '사례가 저장되었습니다.' };
    }
  }
  return { success: false, message: '사례를 찾을 수 없습니다.' };
}

/**
 * 사례 삭제 (삭제 플래그만 변경 - 소프트 삭제)
 */
function deleteReport(reportId, nickname) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][DB.REPORT_ID] === reportId && data[i][DB.IS_DELETED] !== 'TRUE') {
      // 작성자 본인 또는 관리자만 삭제 가능
      if (data[i][DB.NICKNAME] !== nickname && !isAdmin(nickname)) {
        return { success: false, message: '삭제 권한이 없습니다.' };
      }
      sheet.getRange(i + 1, DB.IS_DELETED + 1).setValue('TRUE');
      return { success: true, message: '사례가 삭제되었습니다.' };
    }
  }
  return { success: false, message: '사례를 찾을 수 없습니다.' };
}

/**
 * 사례 목록 조회 - 작성자 본인 또는 관리자만 조회 가능
 */
function getReports(nickname, isAdminFlag) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, reports: [] };
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, DB_HEADERS.length).getValues();
  var result = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i][DB.IS_DELETED] === 'TRUE') continue;
    // 작성자 본인 또는 관리자만 조회 가능
    if (data[i][DB.NICKNAME] !== nickname && !isAdminFlag) continue;
    result.push(rowToReport(data[i]));
  }
  return { success: true, reports: result };
}

/**
 * 단일 사례 조회 - 작성자 본인 또는 관리자만 조회 가능
 */
function getReportById(reportId, nickname, isAdminFlag) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: '사례를 찾을 수 없습니다.' };
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, DB_HEADERS.length).getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][DB.REPORT_ID] === reportId && data[i][DB.IS_DELETED] !== 'TRUE') {
      if (data[i][DB.NICKNAME] !== nickname && !isAdminFlag) {
        return { success: false, message: '조회 권한이 없습니다.' };
      }
      return { success: true, report: rowToReport(data[i]) };
    }
  }
  return { success: false, message: '사례를 찾을 수 없습니다.' };
}

/**
 * 행 데이터를 사례 객체로 변환
 */
function rowToReport(row) {
  return {
    nickname: row[DB.NICKNAME],
    timestamp: row[DB.TIMESTAMP],
    topic: row[DB.TOPIC],
    description: row[DB.DESCRIPTION],
    evidence: row[DB.EVIDENCE],
    status: row[DB.STATUS],
    pattern: row[DB.PATTERN],
    commonTraits: row[DB.COMMON_TRAITS],
    criteria: row[DB.CRITERIA],
    judgment: row[DB.JUDGMENT],
    actualTruth: row[DB.ACTUAL_TRUTH],
    actualResult: row[DB.ACTUAL_RESULT],
    weightAdjust: row[DB.WEIGHT_ADJUST],
    applyOthers: row[DB.APPLY_OTHERS],
    aiApply: row[DB.AI_APPLY],
    aiTrustScore: row[DB.AI_TRUST_SCORE],
    reportId: row[DB.REPORT_ID]
  };
}

// ==================== CSV 내보내기 ====================

/**
 * 전체 사례 CSV 내보내기 (관리자용)
 */
function exportCSV() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, csv: DB_HEADERS.join(','), count: 0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, DB_HEADERS.length).getValues();
  var csvLines = [];
  csvLines.push(DB_HEADERS.join(','));

  var count = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][DB.IS_DELETED] === 'TRUE') continue;
    var row = [];
    for (var j = 0; j < DB_HEADERS.length; j++) {
      var val = data[i][j] || '';
      val = String(val).replace(/"/g, '""');
      row.push('"' + val + '"');
    }
    csvLines.push(row.join(','));
    count++;
  }

  return { success: true, csv: csvLines.join('\n'), count: count };
}

// ==================== 서버 정보 ====================

/**
 * 서버 정보 및 통계
 */
function getServerInfo() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var dbSheet = ss.getSheetByName(CONFIG.SHEET_DATABASE);
  var userSheet = ss.getSheetByName(CONFIG.SHEET_USERS);

  var reportCount = 0;
  if (dbSheet && dbSheet.getLastRow() > 1) {
    var data = dbSheet.getRange(2, 1, dbSheet.getLastRow() - 1, DB_HEADERS.length).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][DB.IS_DELETED] !== 'TRUE') reportCount++;
    }
  }

  var userCount = 0;
  if (userSheet && userSheet.getLastRow() > 1) {
    var udata = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, USER_HEADERS.length).getValues();
    for (var j = 0; j < udata.length; j++) {
      if (udata[j][US.IS_DELETED] !== 'TRUE') userCount++;
    }
  }

  return {
    success: true,
    info: {
      app: CONFIG.APP_NAME,
      version: CONFIG.VERSION,
      timezone: Session.getScriptTimeZone(),
      reports: reportCount,
      users: userCount,
      timestamp: now()
    }
  };
}

// ==================== OWID API 연동 ====================

/**
 * Our World in Data API에서 실시간 데이터 조회
 * CORS 에러 방지를 위해 서버사이드에서 호출, 실패 시 샘플 데이터 반환
 */
function getOWIDData(indicator) {
  var defaultIndicator = indicator || 'internet_users';
  var url = CONFIG.OWID_API_BASE + '/indicators/' + defaultIndicator + '/data';

  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    });

    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      return { success: true, data: data, sample: false };
    }
    // API 실패 시 샘플 데이터 반환
    return { success: true, data: getSampleOWIDData(), sample: true };
  } catch (err) {
    // CORS 또는 네트워크 에러 시 샘플 데이터 반환
    return { success: true, data: getSampleOWIDData(), sample: true, error: err.toString() };
  }
}

/**
 * 샘플 OWID 데이터 (API 실패 시 예외 처리)
 */
function getSampleOWIDData() {
  return {
    indicator: '인터넷 사용자 비율 (샘플 데이터)',
    indicatorCode: 'internet_users',
    values: [
      { entity: 'World', year: 2020, value: 59.6 },
      { entity: 'World', year: 2021, value: 62.5 },
      { entity: 'World', year: 2022, value: 65.1 },
      { entity: 'World', year: 2023, value: 67.4 }
    ]
  };
}

// ==================== 파일 업로드 ====================

/**
 * 첨부파일 업로드 - Google Drive에 저장 후 URL 반환
 * 이미지, PDF, 영상, 파일 모두 지원
 */
function uploadFile(fileName, mimeType, base64Data) {
  try {
    var folder = getOrCreateFolder();
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName,
      mimeType: mimeType
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * 첨부파일 폴더 확인/생성
 */
function getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.FOLDER_NAME);
}

// ==================== 유틸리티 ====================

/**
 * HTML 템플릿 include 함수
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 현재 시간 문자열
 */
function now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}