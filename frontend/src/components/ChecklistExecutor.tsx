import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Radio,
    RadioGroup,
    FormControlLabel,
    TextField,
    Button,
    Box,
    LinearProgress,
    Alert,
} from '@mui/material';
import { CheckCircle, Error, HelpOutline, Warning } from '@mui/icons-material';
import { QuestionWithResponse, AnswerQuestionRequest } from '../types/Checklist';
import { checklistService } from '../services/checklistService';

interface ChecklistExecutorProps {
    auditId: number;
    checklistId: number;
    questionsWithResponses: QuestionWithResponse[];
    progress: number;
    onAnswerSubmitted: () => void;
}

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'Critical': return 'error';
        case 'High': return 'warning';
        case 'Medium': return 'info';
        case 'Low': return 'success';
        default: return 'default';
    }
};

const getAnswerIcon = (answer: string | undefined) => {
    switch (answer) {
        case 'Yes': return <CheckCircle color="success" />;
        case 'No': return <Error color="error" />;
        case 'N/A': return <HelpOutline color="disabled" />;
        default: return null;
    }
};

const translateSeverity = (severity: string): string => {
    const translations: { [key: string]: string } = {
        'Critical': 'Crítico',
        'High': 'Alto',
        'Medium': 'Medio',
        'Low': 'Bajo'
    };
    return translations[severity] || severity;
};

const ChecklistExecutor: React.FC<ChecklistExecutorProps> = ({
    auditId,
    checklistId,
    questionsWithResponses,
    progress,
    onAnswerSubmitted
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState<'Yes' | 'No' | 'N/A'>('Yes');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [localResponses, setLocalResponses] = useState<Map<number, any>>(new Map());

    const currentItem = questionsWithResponses[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questionsWithResponses.length - 1;

    const unansweredCount = questionsWithResponses.filter(qwr => {
        return !localResponses.has(qwr.question.id) && !qwr.response;
    }).length;

    const hasUnansweredQuestions = unansweredCount > 0;

    // Inicializar respuestas locales
    React.useEffect(() => {
        const initialResponses = new Map();
        questionsWithResponses.forEach(qwr => {
            if (qwr.response) {
                initialResponses.set(qwr.question.id, qwr.response);
            }
        });
        setLocalResponses(initialResponses);
    }, [checklistId]);

    // Restaurar índice al montar
    React.useEffect(() => {
        setCurrentQuestionIndex(0);

        const storageKey = `checklist_${checklistId}_index`;
        localStorage.removeItem(storageKey);
    }, [checklistId]);

    // Pre-cargar respuesta
    React.useEffect(() => {
        if (currentItem?.response) {
            setAnswer(currentItem.response.answer);
            setNotes(currentItem.response.notes || '');
        } else {
            setAnswer('Yes');
            setNotes('');
        }
    }, [currentQuestionIndex]);

    const handleSubmitAnswer = async () => {
        try {
            setSubmitting(true);
            setError(null);

            const data: AnswerQuestionRequest = {
                question_id: currentItem.question.id,
                answer: answer,
                notes: notes
            };

            await checklistService.answerQuestion(auditId, checklistId, data);

            setLocalResponses(prev => {
                const newMap = new Map(prev);
                newMap.set(currentItem.question.id, {
                    answer,
                    notes,
                    answered_at: new Date().toISOString()
                });
                return newMap;
            });

            if (isLastQuestion) {
                const stillUnanswered = questionsWithResponses.filter(qwr => {
                    const hasLocalOrCurrent = localResponses.has(qwr.question.id) || qwr.question.id === currentItem.question.id;
                    return !hasLocalOrCurrent && !qwr.response;
                }).length;

                if (stillUnanswered > 0) {
                    setError(`❌ Checklist incompleto. Faltan ${stillUnanswered} preguntas por responder.`);

                    const firstUnansweredIndex = questionsWithResponses.findIndex(qwr => {
                        const hasLocalOrCurrent = localResponses.has(qwr.question.id) || qwr.question.id === currentItem.question.id;
                        return !hasLocalOrCurrent && !qwr.response;
                    });

                    if (firstUnansweredIndex !== -1) {
                        setTimeout(() => {
                            setCurrentQuestionIndex(firstUnansweredIndex);
                            setError(null);
                        }, 3000);
                    }

                    setSubmitting(false);
                    return;
                }

                try {
                    await checklistService.completeChecklist(checklistId);
                    onAnswerSubmitted();
                    alert('✅ Checklist completado exitosamente');
                } catch (completeErr: any) {
                    setError(completeErr.response?.data?.error || 'Error al completar checklist');
                    setSubmitting(false);
                    return;
                }

            } else {
                const nextIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIndex);
            }

        } catch (err: any) {
            setError(err.response?.data?.error || 'Error submitting answer');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questionsWithResponses.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const goToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Pregunta {currentQuestionIndex + 1} de {questionsWithResponses.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {Math.round(progress)}% Completado
                    </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} />
            </Box>

            {hasUnansweredQuestions && unansweredCount > 0 && (
                <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
                    ⚠️ Hay <strong>{unansweredCount}</strong> {unansweredCount === 1 ? 'pregunta' : 'preguntas'} sin responder.
                    Debe completar todas antes de finalizar el checklist.
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {(currentItem.response || localResponses.has(currentItem.question.id)) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Esta pregunta ya fue respondida. Puede modificar su respuesta a continuación.
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            {currentItem.question.question_text}
                        </Typography>
                        <Box
                            sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: getSeverityColor(currentItem.question.severity) === 'error' ? '#ffebee' :
                                    getSeverityColor(currentItem.question.severity) === 'warning' ? '#fff3e0' :
                                        getSeverityColor(currentItem.question.severity) === 'info' ? '#e3f2fd' : '#e8f5e9',
                                color: getSeverityColor(currentItem.question.severity) === 'error' ? '#c62828' :
                                    getSeverityColor(currentItem.question.severity) === 'warning' ? '#ef6c00' :
                                        getSeverityColor(currentItem.question.severity) === 'info' ? '#1565c0' : '#2e7d32'
                            }}
                        >
                            <Typography variant="caption" fontWeight="bold">
                                {translateSeverity(currentItem.question.severity)}
                            </Typography>
                        </Box>
                    </Box>

                    <RadioGroup value={answer} onChange={(e) => setAnswer(e.target.value as any)}>
                        <FormControlLabel
                            value="Yes"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircle color="success" fontSize="small" />
                                    <span>Sí - Conforme</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="No"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Error color="error" fontSize="small" />
                                    <span>No - No Conforme</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="N/A"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HelpOutline color="disabled" fontSize="small" />
                                    <span>N/A - No Aplica</span>
                                </Box>
                            }
                        />
                    </RadioGroup>

                    <TextField
                        label="Notas (opcional)"
                        multiline
                        rows={3}
                        fullWidth
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        placeholder="Añada notas u observaciones relevantes..."
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0 || submitting}
                        >
                            Anterior
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isLastQuestion && (
                                <Button
                                    onClick={handleNext}
                                    variant="outlined"
                                    disabled={submitting}
                                >
                                    Saltar
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmitAnswer}
                                variant="contained"
                                disabled={submitting}
                            >
                                {submitting ? 'Guardando...' : (isLastQuestion ? 'Finalizar' : 'Guardar y Siguiente')}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
                {questionsWithResponses.map((item, index) => {
                    const isAnswered = localResponses.has(item.question.id) || item.response;
                    const answerValue = localResponses.get(item.question.id)?.answer || item.response?.answer;

                    return (
                        <Box
                            key={item.question.id}
                            onClick={() => goToQuestion(index)}
                            sx={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid',
                                borderColor: index === currentQuestionIndex ? 'primary.main' : 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                bgcolor: isAnswered ? 'success.light' : 'transparent',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: 'all 0.2s'
                            }}
                        >
                            {isAnswered ? getAnswerIcon(answerValue) : (
                                <Typography variant="caption">{index + 1}</Typography>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default ChecklistExecutor;