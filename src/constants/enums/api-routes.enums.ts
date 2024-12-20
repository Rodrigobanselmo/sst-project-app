export enum ApiRoutesEnum {
    ABSENTEEISMS = '/absenteeism/:companyId',
    OS = '/os/:companyId',
    FORGOT_PASS_EMAIL = '/forgot-password',
    ALERT = '/alert/:companyId',
    CATS = '/cat/:companyId',
    DOCUMENT_MODEL = '/document-model/:companyId',
    AUTH_GROUP = '/auth/group/:companyId',
    CEP = '/company/cep',
    CHARACTERIZATIONS = '/company/:companyId/workspace/:workspaceId/characterizations',
    IMAGE_GALLERY = '/company/:companyId/image-gallery',
    CHARACTERIZATIONS_PHOTO = '/company/:companyId/workspace/:workspaceId/characterizations/photo',
    CHECKLIST = '/checklist',
    CNAES = '/company/cnae',
    CNPJ = '/company/cnpj',
    SYNC = '/sync',
    COMPANIES = '/company',
    COMPANY = '/company/:companyId',
    COMPANY_GROUP = '/company/:companyId/group',
    CONTACTS = '/company/:companyId/contact',
    PROFESSIONAL_RESP = '/company/:companyId/professionals-responsible',
    DATABASE_TABLE = '/files/database-tables',
    DOCUMENTS_BASE = '/documents/base',
    DOCUMENTS_BASE_ATTACHMENTS = '/documents/base/:docId/attachment',
    DOCUMENTS_PGR = '/documents/pgr',
    DOCUMENTS_PGR_PLAN = '/documents/pgr/action-plan',
    DOCUMENT = '/company/:companyId/document',
    DOC_VERSIONS = '/document-version/:companyId',
    DOCUMENT_DATA = '/document-data/:companyId',
    DOWNLOAD_CNAE = '/files/cnae',
    DOWNLOAD_EMPLOYEES = '/files/company/employees/download',
    DOWNLOAD_HIERARCHIES = '/files/company/hierarchies/download',
    DOWNLOAD_UNIQUE_EMPLOYEES = '/files/company/download/unique',
    EMPLOYEES = '/employee',
    EMPLOYEE_HISTORY_HIER = '/employee-history/hierarchy',
    EMPLOYEE_HISTORY_EXAM = '/employee-history/exam',
    SCHEDULE_MEDICAL_VISIT = '/company/:companyId/schedule-medical-visit',
    EMPLOYEES_DELETE_SUB_OFFICE = '/employee/:employeeId/sub-office/:subOfficeId/:companyId',
    ENVIRONMENTS = '/company/:companyId/workspace/:workspaceId/environments',
    ENVIRONMENTS_PHOTO = '/company/:companyId/workspace/:workspaceId/environments/photo',
    EPI = '/epi',
    GENERATE_SOURCE = '/generate-source',
    GHO = '/homogeneous-groups',
    HIERARCHY = '/hierarchy',
    INVITES = '/invites',
    ME = '/users/me',
    COUNCIL = '/:companyId/councils',
    PROFESSIONALS = '/professionals',
    REC_MED = '/rec-med',
    EXAM = '/exam',
    EXAM_RISK = '/exam/risk',
    PROTOCOL = '/protocol',
    PROTOCOL_RISK = '/protocol/risk',
    CLINIC_EXAM = '/clinic-exam',
    RISK = '/risk',
    RISK_DATA = '/risk-data',
    RISK_DATA_REC = '/risk-data-rec',
    RISK_DOC_INFO = '/risk-doc-info',
    RISK_GROUP_DATA = '/risk-group-data',
    SESSION = '/session',
    REFRESH = '/refresh',
    SESSION_GOOGLE = '/session/google',
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    UPLOAD_CNAE = '/files/cnae',
    UPLOAD_EMPLOYEES = '/files/company/employees/upload',
    UPLOAD_HIERARCHY = '/files/company/hierarchies/upload',
    UPLOAD_UNIQUE_EMPLOYEES = '/files/company/upload/unique',
    UPLOAD_COMPANY_STRUCTURE = '/files/company/company-structure/upload/:companyId',
    USERS = '/users',
    USERS_HISTORY = '/users/history',
    USERS_RESET_PASS = '/users/reset-password',
    PDF_GUIDE = '/documents/pdf/guide',
    PDF_KIT = '/documents/pdf/kit',
    PDF_VISIT_REPORT = '/documents/pdf/visit-report',
    PDF_EVALUATION = '/documents/pdf/prontuario-evaluation',
    PDF_OS = '/documents/pdf/os',
    COMPANY_DASHBOARD = '/company/:companyId/dashboard',
    ESOCIAL_EVENT_2210 = 'esocial/events/2210',
    ESOCIAL_EVENT_2220 = 'esocial/events/2220',
    ESOCIAL_EVENT_2230 = 'esocial/events/2230',
    ESOCIAL_EVENT_2240 = 'esocial/events/2240',
    ESOCIAL_EVENT_ALL = 'esocial/events/all',
    ESOCIAL18TABLES = 'esocial/table-18',
    ESOCIAL20TABLES = 'esocial/table-20',
    ESOCIAL17TABLES = 'esocial/table-17',
    ESOCIAL13TABLES = 'esocial/table-13',
    ESOCIAL1415TABLES = 'esocial/table-14-15',
    ESOCIAL15TABLES = 'esocial/table-15',
    ESOCIAL6TABLES = 'esocial/table-6',
    ESOCIAL24TABLES = 'esocial/table-24',
    CITIES = 'esocial/cities',
    CITIES_ADDRESS_COMPANY = 'esocial/cities-address',
    CID = 'esocial/cid',
    CBO = 'esocial/cbo',
    ABSENTEEISM_MOTIVES = 'esocial/absenteeism-motives',
    SCHEDULE_BLOCKS = 'schedule-block/:companyId',
    // ESOCIAL18TABLES = 'esocial/table-18',
    NOTIFICATION = '/notification',
    WORKSPACE = '/workspace',

    // Report
    REPORT_CLINIC = '/files/report/clinic/:companyId',
    REPORT_EXPIRED_EXAM = '/files/report/expired-exam/:companyId',
    REPORT_COMPLEMENTARY_EXAM = '/files/report/complementary-exam/:companyId',
    REPORT_DONE_EXAM = '/files/report/done-exam/:companyId',
    MODEL_RISK_DOWNALOD = '/files/models/risk/:companyId',
    MODEL_EMPLOYEE_DOWNALOD = '/files/models/employee/:companyId',
}
