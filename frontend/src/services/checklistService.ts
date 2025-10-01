import api from './api';
import {
    ChecklistTemplate,
    ChecklistQuestion,
    AuditChecklist,
    QuestionWithResponse,
    ChecklistSummary,
    StartChecklistRequest,
    AnswerQuestionRequest
} from '../types/Checklist';

interface TemplateListResponse {
    templates: ChecklistTemplate[];
    total: number;
}

interface TemplateDetailResponse {
    template: ChecklistTemplate;
    questions: ChecklistQuestion[];
}

interface StartChecklistResponse {
    message: string;
    checklist: AuditChecklist;
}

interface AnswerQuestionResponse {
    message: string;
    checklist: AuditChecklist;
}

interface ChecklistDetailResponse {
    checklist: AuditChecklist;
    template: ChecklistTemplate;
    questions_with_responses: QuestionWithResponse[];
}

interface AuditChecklistsResponse {
    audit: any;
    checklists: AuditChecklist[];
    total: number;
}

export const checklistService = {
    // US-005: Listar plantillas disponibles
    getTemplates: async (category?: string): Promise<TemplateListResponse> => {
        const params = category ? { category } : undefined;
        const response = await api.get('/checklists/templates', { params });
        return response.data;
    },

    // US-005: Obtener detalle de plantilla con preguntas
    getTemplateDetail: async (templateId: number): Promise<TemplateDetailResponse> => {
        const response = await api.get(`/checklists/templates/${templateId}`);
        return response.data;
    },

    // US-005: Iniciar checklist en auditoría
    startChecklist: async (auditId: number, data: StartChecklistRequest): Promise<StartChecklistResponse> => {
        const response = await api.post(`/audits/${auditId}/checklist/start`, data);
        return response.data;
    },

    // US-005: Responder pregunta
    answerQuestion: async (
        auditId: number,
        checklistId: number,
        data: AnswerQuestionRequest
    ): Promise<AnswerQuestionResponse> => {
        const response = await api.post(`/audits/${auditId}/checklist/${checklistId}/answer`, data);
        return response.data;
    },

    // US-005: Obtener checklist con respuestas
    getChecklistDetail: async (auditId: number, checklistId: number): Promise<ChecklistDetailResponse> => {
        const response = await api.get(`/audits/${auditId}/checklist/${checklistId}`);
        return response.data;
    },

    // US-005: Listar checklists de una auditoría
    getAuditChecklists: async (auditId: number): Promise<AuditChecklistsResponse> => {
        const response = await api.get(`/audits/${auditId}/checklists`);
        return response.data;
    },

    // US-005: Obtener resumen estadístico
    getChecklistSummary: async (checklistId: number): Promise<ChecklistSummary> => {
        const response = await api.get(`/checklists/${checklistId}/summary`);
        return response.data;
    },
};