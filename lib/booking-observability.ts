import { randomUUID } from 'node:crypto';
import type { ProfessionalId } from './booking-config.ts';
export type AuditEvent = 'booking.availability.request' | 'booking.created' | 'booking.conflict' | 'booking.failed' | 'booking.google.created' | 'booking.google.reconciled' | 'booking.google.failed' | 'booking.google.uncertain' | 'booking.test_cleanup.failed' | 'admin.schedule.updated' | 'admin.exception.created' | 'admin.exception.updated' | 'admin.exception.deleted' | 'auth.login.failed' | 'admin.failed';
export type AuditDetails = { requestId: string; professionalId?: ProfessionalId; status?: number; code?: string };
export const errorId = () => 'REAC-' + randomUUID().slice(0, 8).toUpperCase();
export function audit(event: AuditEvent, details: AuditDetails) {
  // Explicit allowlist: never spread request data, exceptions or provider bodies.
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, requestId: details.requestId,
    ...(details.professionalId ? { professionalId: details.professionalId } : {}),
    ...(details.status ? { status: details.status } : {}), ...(details.code ? { code: details.code } : {}) }));
}
