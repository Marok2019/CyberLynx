import React, { useEffect, useState } from 'react';
import {
    Container,
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    ArrowBack as BackIcon,
    PlayArrow as StartIcon,
    Assessment as SummaryIcon,
    Download as DownloadIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import ChecklistTemplateSelector from '../components/ChecklistTemplateSelector';
import ChecklistExecutor from '../components/ChecklistExecutor';
import ChecklistSummary from '../components/ChecklistSummary';
import { checklistService } from '../services/checklistService';
import { auditService } from '../services/auditService';
import { AuditChecklist, QuestionWithResponse } from '../types/Checklist';
import { useAuditReports } from '../hooks/useAuditReports';

const AuditChecklistPage: React.FC = () => {
    const { auditId } = useParams<{ auditId: string }>();
    const navigate = useNavigate();
    const { generateReport, loading: reportLoading } = useAuditReports();

    const [auditName, setAuditName] = useState('');
    const [checklists, setChecklists] = useState<AuditChecklist[]>([]);
    const [selectedChecklist, setSelectedChecklist] = useState<AuditChecklist | null>(null);
    const [questionsWithResponses, setQuestionsWithResponses] = useState<QuestionWithResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState<'execute' | 'summary'>('execute');

    useEffect(() => {
        if (auditId) {
            loadAuditAndChecklists();
        }
    }, [auditId]);

    const loadAuditAndChecklists = async (selectLatest: boolean = false) => {
        try {
            setLoading(true);
            setError(null);

            const auditResponse = await auditService.getAudits();
            const audit = auditResponse.audits.find(a => a.id === parseInt(auditId!));
            if (audit) {
                setAuditName(audit.name);
            }

            const response = await checklistService.getAuditChecklists(parseInt(auditId!));
            setChecklists(response.checklists);

            if (response.checklists.length > 0) {
                let toSelect;

                if (selectLatest) {
                    toSelect = response.checklists[response.checklists.length - 1];
                } else {
                    const inProgress = response.checklists.find(c => c.status === 'In_Progress');
                    toSelect = inProgress || response.checklists[0];
                }

                await loadChecklistDetail(toSelect);
            } else {
                setSelectedChecklist(null);
                setQuestionsWithResponses([]);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error loading audit checklists');
        } finally {
            setLoading(false);
        }
    };

    const loadChecklistDetail = async (checklist: AuditChecklist) => {
        try {
            const detail = await checklistService.getChecklistDetail(
                parseInt(auditId!),
                checklist.id
            );
            setSelectedChecklist(checklist);
            setQuestionsWithResponses(detail.questions_with_responses);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error loading checklist detail');
        }
    };

    const handleStartNewChecklist = async (templateId: number) => {
        try {
            setError(null);
            await checklistService.startChecklist(parseInt(auditId!), { template_id: templateId });
            setTemplateSelectorOpen(false);
            await loadAuditAndChecklists(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error starting checklist');
        }
    };

    const handleAnswerSubmitted = async () => {
        if (selectedChecklist) {
            await loadChecklistDetail(selectedChecklist);
            await loadAuditAndChecklists();
        }
    };

    const handleDeleteChecklist = async (checklist: AuditChecklist, event: React.MouseEvent) => {
        event.stopPropagation();

        const isCompleted = checklist.status === 'Completed';

        const confirmMessage = isCompleted
            ? `⚠️ ADVERTENCIA: Este checklist está COMPLETADO\n\nChecklist: ${checklist.template_name}\nProgreso: ${checklist.answered_questions}/${checklist.total_questions} preguntas\n\n¿Está seguro de eliminarlo?`
            : `¿Eliminar "${checklist.template_name}"?\n\nProgreso: ${checklist.answered_questions}/${checklist.total_questions} preguntas`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setError(null);

            await checklistService.deleteChecklist(
                parseInt(auditId!),
                checklist.id,
                isCompleted
            );

            if (selectedChecklist?.id === checklist.id) {
                setSelectedChecklist(null);
                setQuestionsWithResponses([]);
            }

            await loadAuditAndChecklists();
            alert('✅ Checklist eliminado exitosamente');
        } catch (err: any) {
            const errorData = err.warning ? err : err.response?.data;

            if (errorData?.warning) {
                const doubleConfirm = window.confirm(
                    `${errorData.warning}\n\n${errorData.message}\n\n¿Confirmar eliminación?`
                );

                if (doubleConfirm) {
                    try {
                        await checklistService.deleteChecklist(parseInt(auditId!), checklist.id, true);

                        if (selectedChecklist?.id === checklist.id) {
                            setSelectedChecklist(null);
                            setQuestionsWithResponses([]);
                        }

                        await loadAuditAndChecklists();
                        alert('✅ Checklist eliminado');
                    } catch (retryErr: any) {
                        setError(retryErr.response?.data?.error || 'Error eliminando checklist');
                    }
                }
            } else {
                setError(errorData?.error || 'Error eliminando checklist');
            }
        }
    };

    const handleGenerateReport = async () => {
        const format = window.prompt(
            '¿En qué formato desea el reporte?\n\nOpciones: pdf, xlsx, csv',
            'pdf'
        )?.toLowerCase();

        if (!format || !['pdf', 'xlsx', 'csv'].includes(format)) {
            if (format) alert('Formato inválido. Use: pdf, xlsx, o csv');
            return;
        }

        await generateReport(parseInt(auditId!), format as 'pdf' | 'xlsx' | 'csv');
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Button
                        startIcon={<BackIcon />}
                        onClick={() => navigate('/audits')}
                        sx={{ mb: 1 }}
                    >
                        Volver a Auditorías
                    </Button>
                    <Typography variant="h4">
                        Checklists de Auditoría
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {auditName}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleGenerateReport}
                        disabled={reportLoading}
                    >
                        {reportLoading ? 'Generando...' : 'Generar Reporte'}
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setTemplateSelectorOpen(true)}
                    >
                        Iniciar Nuevo Checklist
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {checklists.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="h6" gutterBottom>
                            No hay checklists iniciados aún
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Inicia tu primer checklist de seguridad para esta auditoría
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<StartIcon />}
                            onClick={() => setTemplateSelectorOpen(true)}
                        >
                            Iniciar Checklist
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Checklists Activos
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {checklists.filter(c => c.status === 'Completed').length} de {checklists.length} completados
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {checklists.map((checklist) => (
                                <Chip
                                    key={checklist.id}
                                    label={`${checklist.template_name} (${Math.round(checklist.progress)}%)`}
                                    onClick={() => loadChecklistDetail(checklist)}
                                    color={selectedChecklist?.id === checklist.id ? 'primary' : 'default'}
                                    variant={selectedChecklist?.id === checklist.id ? 'filled' : 'outlined'}
                                    icon={checklist.status === 'Completed' ? <SummaryIcon /> : <StartIcon />}
                                    onDelete={(e) => handleDeleteChecklist(checklist, e as any)}
                                    deleteIcon={
                                        <CloseIcon
                                            sx={{
                                                fontSize: 18,
                                                '&:hover': {
                                                    color: 'error.main',
                                                    transform: 'scale(1.2)',
                                                    transition: 'all 0.2s'
                                                }
                                            }}
                                        />
                                    }
                                />
                            ))}
                        </Box>
                    </Box>

                    {selectedChecklist && (
                        <>
                            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
                                <Tab label="Ejecutar Checklist" value="execute" />
                                <Tab label="Ver Resumen" value="summary" />
                            </Tabs>

                            {currentTab === 'execute' && (
                                <ChecklistExecutor
                                    auditId={parseInt(auditId!)}
                                    checklistId={selectedChecklist.id}
                                    questionsWithResponses={questionsWithResponses}
                                    progress={selectedChecklist.progress}
                                    onAnswerSubmitted={handleAnswerSubmitted}
                                />
                            )}

                            {currentTab === 'summary' && (
                                <ChecklistSummary checklistId={selectedChecklist.id} />
                            )}
                        </>
                    )}
                </>
            )}

            <ChecklistTemplateSelector
                open={templateSelectorOpen}
                onClose={() => setTemplateSelectorOpen(false)}
                onSelectTemplate={handleStartNewChecklist}
                auditId={parseInt(auditId!)}
            />
        </Container>
    );
};

export default AuditChecklistPage;