import { useState } from 'react';

interface ValidationResult {
    canGenerate: boolean;
    error?: string;
    details?: {
        total_checklists: number;
        completed_checklists: number;
        incomplete_checklists: string[];
    };
}

/**
 * Hook personalizado para validar y generar reportes de auditoría
 * US-006: Generación de reportes con validación de completitud
 */
export const useAuditReports = () => {
    const [loading, setLoading] = useState(false);

    /**
     * Valida si una auditoría puede generar reportes
     * Requiere que todos los checklists estén completados
     */
    const validateAuditCompletion = async (auditId: number): Promise<ValidationResult> => {
        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/audits/${auditId}/validate-completion`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            const data = await response.json();

            if (response.ok) {
                return {
                    canGenerate: true,
                    details: {
                        total_checklists: data.total_checklists,
                        completed_checklists: data.completed_checklists,
                        incomplete_checklists: []
                    }
                };
            } else {
                return {
                    canGenerate: false,
                    error: data.error,
                    details: {
                        total_checklists: data.total_checklists || 0,
                        completed_checklists: data.completed_checklists || 0,
                        incomplete_checklists: data.incomplete_checklists || []
                    }
                };
            }
        } catch (error) {
            console.error('Error validando auditoría:', error);
            return {
                canGenerate: false,
                error: 'Error de conexión al validar auditoría'
            };
        }
    };

    /**
     * Genera y descarga un reporte de auditoría
     * Valida completitud antes de generar
     */
    const generateReport = async (
        auditId: number,
        format: 'pdf' | 'xlsx' | 'csv'
    ): Promise<boolean> => {
        setLoading(true);

        try {
            // 1. Validar completitud de la auditoría
            console.log(`🔍 Validando auditoría ${auditId}...`);
            const validation = await validateAuditCompletion(auditId);

            if (!validation.canGenerate) {
                // Mostrar error específico con detalles
                let errorMessage = validation.error || 'No se puede generar reporte';

                if (validation.details?.incomplete_checklists && validation.details.incomplete_checklists.length > 0) {
                    errorMessage += `\n\nChecklists incompletos:\n- ${validation.details.incomplete_checklists.join('\n- ')}`;
                }

                alert(errorMessage);
                setLoading(false);
                return false;
            }

            console.log(`✅ Validación exitosa. Generando reporte ${format.toUpperCase()}...`);

            // 2. Generar reporte
            const response = await fetch(
                `http://127.0.0.1:5000/api/audits/${auditId}/report?format=${format}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.ok) {
                // Descargar archivo automáticamente
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_${auditId}_report_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert(`✅ Reporte ${format.toUpperCase()} descargado exitosamente`);
                setLoading(false);
                return true;
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Error generando reporte');
                setLoading(false);
                return false;
            }
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error de conexión al generar reporte');
            setLoading(false);
            return false;
        }
    };

    return {
        validateAuditCompletion,
        generateReport,
        loading
    };
};