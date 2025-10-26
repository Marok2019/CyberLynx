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
    audit_status?: string;
}

interface AnswerQuestionResponse {
    message: string;
    checklist: AuditChecklist;
    audit_status?: string;
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

interface CompleteChecklistResponse {
    message: string;
    checklist: AuditChecklist;
}

interface DeleteChecklistResponse {
    message: string;
    deleted_responses: number;
    audit_status: string;
}

export const checklistService = {
    /**
     * US-005: Obtener lista de templates de checklist disponibles
     */
    getTemplates: async (category?: string): Promise<TemplateListResponse> => {
        const params = category ? { category } : undefined;
        const response = await api.get('/checklists/templates', { params });
        return response.data;
    },

    /**
     * US-005: Obtener detalle de un template con sus preguntas
     */
    getTemplateDetail: async (templateId: number): Promise<TemplateDetailResponse> => {
        const response = await api.get(`/checklists/templates/${templateId}`);
        return response.data;
    },

    /**
     * US-005: Iniciar un checklist en una auditoría
     */
    startChecklist: async (auditId: number, data: StartChecklistRequest): Promise<StartChecklistResponse> => {
        const response = await api.post(`/audits/${auditId}/checklist/start`, data);
        return response.data;
    },

    /**
     * US-005: Responder una pregunta del checklist
     */
    answerQuestion: async (
        auditId: number,
        checklistId: number,
        data: AnswerQuestionRequest
    ): Promise<AnswerQuestionResponse> => {
        const response = await api.post(`/audits/${auditId}/checklist/${checklistId}/answer`, data);
        return response.data;
    },

    /**
     * US-005: Obtener detalle completo de un checklist con sus respuestas
     */
    getChecklistDetail: async (auditId: number, checklistId: number): Promise<ChecklistDetailResponse> => {
        const response = await api.get(`/audits/${auditId}/checklist/${checklistId}`);
        return response.data;
    },

    /**
     * US-005: Listar todos los checklists de una auditoría
     */
    getAuditChecklists: async (auditId: number): Promise<AuditChecklistsResponse> => {
        const response = await api.get(`/audits/${auditId}/checklists`);
        return response.data;
    },

    /**
     * US-005: Obtener resumen estadístico de un checklist
     */
    getChecklistSummary: async (checklistId: number): Promise<ChecklistSummary> => {
        const response = await api.get(`/checklists/${checklistId}/summary`);
        return response.data;
    },

    /**
     * US-005: Marcar checklist como completado
     * Valida que todas las preguntas estén respondidas
     */
    completeChecklist: async (checklistId: number): Promise<CompleteChecklistResponse> => {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `http://127.0.0.1:5000/api/checklists/audit-checklists/${checklistId}/complete`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw { response: { data: error } };
        }

        return response.json();
    },

    /**
     * Eliminar un checklist de una auditoría
     * Si está completado, requiere confirm=true
     */
    deleteChecklist: async (
        auditId: number,
        checklistId: number,
        confirm: boolean = false
    ): Promise<DeleteChecklistResponse> => {
        const token = localStorage.getItem('token');
        const confirmParam = confirm ? '?confirm=true' : '';

        const response = await fetch(
            `http://127.0.0.1:5000/api/audits/${auditId}/checklists/${checklistId}${confirmParam}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw error;
        }

        return response.json();
    },
};