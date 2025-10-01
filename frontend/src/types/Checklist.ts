export interface ChecklistTemplate {
    id: number;
    name: string;
    category: 'Network_Security' | 'Access_Control' | 'Data_Protection' | 'Physical_Security' | 'Incident_Response';
    description: string;
    active: boolean;
    created_at: string;
    questions_count: number;
}

export interface ChecklistQuestion {
    id: number;
    template_id: number;
    question_text: string;
    order: number;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    created_at: string;
}

export interface ChecklistResponse {
    id: number;
    audit_checklist_id: number;
    question_id: number;
    question_text: string;
    severity: string;
    answer: 'Yes' | 'No' | 'N/A';
    notes: string;
    answered_at: string;
    answered_by: number;
}

export interface AuditChecklist {
    id: number;
    audit_id: number;
    template_id: number;
    template_name: string;
    status: 'In_Progress' | 'Completed';
    started_at: string;
    completed_at: string | null;
    total_questions: number;
    answered_questions: number;
    progress: number;
}

export interface QuestionWithResponse {
    question: ChecklistQuestion;
    response: ChecklistResponse | null;
}

export interface ChecklistSummary {
    checklist: AuditChecklist;
    summary: {
        total_questions: number;
        answered_questions: number;
        unanswered_questions: number;
        yes_count: number;
        no_count: number;
        na_count: number;
        compliance_rate: number;
        severity_breakdown: {
            [severity: string]: {
                total: number;
                yes: number;
                no: number;
                na: number;
                unanswered: number;
            };
        };
    };
}

export interface StartChecklistRequest {
    template_id: number;
}

export interface AnswerQuestionRequest {
    question_id: number;
    answer: 'Yes' | 'No' | 'N/A';
    notes?: string;
}