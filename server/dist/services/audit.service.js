"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../db");
class AuditService {
    logTaskAction(params) {
        const log = {
            id: `audit-${(0, uuid_1.v4)().substring(0, 8)}`,
            taskId: params.taskId,
            userId: params.user.id,
            userName: params.user.name,
            userRole: params.user.role,
            action: params.action,
            fieldChanged: params.fieldChanged,
            oldValue: params.oldValue,
            newValue: params.newValue,
            timestamp: new Date().toISOString(),
            details: params.details
        };
        return db_1.db.insertAuditLog(log);
    }
    getHistoryForTask(taskId) {
        return db_1.db.getAuditLogsForTask(taskId);
    }
    getAllLogs(limit = 100) {
        return db_1.db.getAllAuditLogs(limit);
    }
}
exports.auditService = new AuditService();
