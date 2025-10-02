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
    Chip,
    Alert,
} from '@mui/material';
import { CheckCircle, Error, HelpOutline } from '@mui/icons-material';
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

    const currentItem = questionsWithResponses[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questionsWithResponses.length - 1;

    // ✅ NUEVO: Restaurar índice guardado al montar el componente
    React.useEffect(() => {
        const storageKey = `checklist_${checklistId}_index`;
        const savedIndex = localStorage.getItem(storageKey);

        if (savedIndex) {
            const index = parseInt(savedIndex, 10);
            if (index >= 0 && index < questionsWithResponses.length) {
                setCurrentQuestionIndex(index);
            }
        }
    }, [checklistId, questionsWithResponses.length]);

    // Pre-cargar respuesta si existe
    React.useEffect(() => {
        if (currentItem.response) {
            setAnswer(currentItem.response.answer);
            setNotes(currentItem.response.notes || '');
        } else {
            setAnswer('Yes');
            setNotes('');
        }
    }, [currentQuestionIndex, currentItem]);

    // ✅ CORRECCIÓN PRINCIPAL: Reordenamiento de operaciones
    const handleSubmitAnswer = async () => {
        try {
            setSubmitting(true);
            setError(null);

            const data: AnswerQuestionRequest = {
                question_id: currentItem.question.id,
                answer: answer,
                notes: notes
            };

            // 1. Guardar respuesta en backend
            await checklistService.answerQuestion(auditId, checklistId, data);

            // 2. ✅ CRÍTICO: Avanzar índice ANTES de recargar datos
            if (!isLastQuestion) {
                const nextIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIndex);

                // ✅ Guardar progreso en localStorage
                const storageKey = `checklist_${checklistId}_index`;
                localStorage.setItem(storageKey, nextIndex.toString());
            } else {
                // ✅ Si es la última pregunta, limpiar localStorage
                const storageKey = `checklist_${checklistId}_index`;
                localStorage.removeItem(storageKey);
            }

            // 3. ✅ CRÍTICO: Solo refrescar datos al completar checklist
            if (isLastQuestion) {
                onAnswerSubmitted(); // Recarga completa solo al terminar
            }
            // Si no es la última pregunta, NO llamamos onAnswerSubmitted()
            // para evitar recargas innecesarias y el bug de navegación

        } catch (err: any) {
            setError(err.response?.data?.error || 'Error submitting answer');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            const newIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(newIndex);

            // ✅ Actualizar localStorage al navegar manualmente
            const storageKey = `checklist_${checklistId}_index`;
            localStorage.setItem(storageKey, newIndex.toString());
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questionsWithResponses.length - 1) {
            const newIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(newIndex);

            // ✅ Actualizar localStorage al navegar manualmente
            const storageKey = `checklist_${checklistId}_index`;
            localStorage.setItem(storageKey, newIndex.toString());
        }
    };

    // ✅ NUEVO: Navegación directa desde mini-mapa
    const goToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);

        const storageKey = `checklist_${checklistId}_index`;
        localStorage.setItem(storageKey, index.toString());
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Question {currentQuestionIndex + 1} of {questionsWithResponses.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {Math.round(progress)}% Complete
                    </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            {currentItem.question.question_text}
                        </Typography>
                        <Chip
                            label={currentItem.question.severity}
                            size="small"
                            color={getSeverityColor(currentItem.question.severity) as any}
                        />
                    </Box>

                    {/* ✅ NUEVO: Indicador de respuesta existente */}
                    {currentItem.response && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            This question was previously answered. You can modify your response below.
                        </Alert>
                    )}

                    <RadioGroup value={answer} onChange={(e) => setAnswer(e.target.value as any)}>
                        <FormControlLabel
                            value="Yes"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircle color="success" fontSize="small" />
                                    <span>Yes - Compliant</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="No"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Error color="error" fontSize="small" />
                                    <span>No - Non-compliant</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="N/A"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HelpOutline color="disabled" fontSize="small" />
                                    <span>N/A - Not Applicable</span>
                                </Box>
                            }
                        />
                    </RadioGroup>

                    <TextField
                        label="Notes (optional)"
                        multiline
                        rows={3}
                        fullWidth
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        placeholder="Add any relevant notes or observations..."
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0 || submitting}
                        >
                            Previous
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isLastQuestion && (
                                <Button
                                    onClick={handleNext}
                                    variant="outlined"
                                    disabled={submitting}
                                >
                                    Skip
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmitAnswer}
                                variant="contained"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : (isLastQuestion ? 'Save & Finish' : 'Save & Next')}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Vista rápida de progreso (mini-mapa) */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
                {questionsWithResponses.map((item, index) => (
                    <Box
                        key={item.question.id}
                        onClick={() => goToQuestion(index)} // ✅ CORREGIDO: Usar función dedicada
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
                            bgcolor: item.response ? 'success.light' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                            transition: 'all 0.2s'
                        }}
                    >
                        {item.response ? getAnswerIcon(item.response.answer) : (
                            <Typography variant="caption">{index + 1}</Typography>
                        )}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ChecklistExecutor;