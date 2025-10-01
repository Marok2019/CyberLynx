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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import ChecklistTemplateSelector from '../components/ChecklistTemplateSelector';
import ChecklistExecutor from '../components/ChecklistExecutor';
import ChecklistSummary from '../components/ChecklistSummary';
import { checklistService } from '../services/checklistService';
import { auditService } from '../services/auditService';
import { AuditChecklist, QuestionWithResponse } from '../types/Checklist';

const AuditChecklistPage: React.FC = () => {
    const { auditId } = useParams<{ auditId: string }>();
    const navigate = useNavigate();

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

    const loadAuditAndChecklists = async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar información de auditoría
            const auditResponse = await auditService.getAudits();
            const audit = auditResponse.audits.find(a => a.id === parseInt(auditId!));
            if (audit) {
                setAuditName(audit.name);
            }

            // Cargar checklists de la auditoría
            const response = await checklistService.getAuditChecklists(parseInt(auditId!));
            setChecklists(response.checklists);

            // Si hay checklists, seleccionar el primero en progreso o el último
            if (response.checklists.length > 0) {
                const inProgress = response.checklists.find(c => c.status === 'In_Progress');
                const toSelect = inProgress || response.checklists[0];
                await loadChecklistDetail(toSelect);
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
            await loadAuditAndChecklists();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error starting checklist');
        }
    };

    const handleAnswerSubmitted = async () => {
        if (selectedChecklist) {
            await loadChecklistDetail(selectedChecklist);
            await loadAuditAndChecklists(); // Refrescar lista
        }
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
                        Back to Audits
                    </Button>
                    <Typography variant="h4">
                        Audit Checklists
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {auditName}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setTemplateSelectorOpen(true)}
                >
                    Start New Checklist
                </Button>
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
                            No checklists started yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Start your first security checklist for this audit
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<StartIcon />}
                            onClick={() => setTemplateSelectorOpen(true)}
                        >
                            Start Checklist
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Selector de checklist */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Active Checklists
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {checklists.map((checklist) => (
                                <Chip
                                    key={checklist.id}
                                    label={`${checklist.template_name} (${Math.round(checklist.progress)}%)`}
                                    onClick={() => loadChecklistDetail(checklist)}
                                    color={selectedChecklist?.id === checklist.id ? 'primary' : 'default'}
                                    variant={selectedChecklist?.id === checklist.id ? 'filled' : 'outlined'}
                                    icon={checklist.status === 'Completed' ? <SummaryIcon /> : <StartIcon />}
                                />
                            ))}
                        </Box>
                    </Box>

                    {selectedChecklist && (
                        <>
                            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
                                <Tab label="Execute Checklist" value="execute" />
                                <Tab label="View Summary" value="summary" />
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