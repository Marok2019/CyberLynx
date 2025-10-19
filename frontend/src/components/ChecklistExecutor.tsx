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

// Componente: Ejecutor de checklist pregunta por pregunta (US-005)
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

    // Restaurar índice guardado al montar el componente
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

    // Guardar respuesta y manejar navegación
    const handleSubmitAnswer = async () => {
        try {
            setSubmitting(true);
            setError(null);

            const data: AnswerQuestionRequest = {
                question_id: currentItem.question.id,
                answer: answer,
                notes: notes
            };

            // Guardar respuesta en backend
            await checklistService.answerQuestion(auditId, checklistId, data);

            // Avanzar índice antes de recargar datos
            if (!isLastQuestion) {
                const nextIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIndex);

                // Guardar progreso en localStorage
                const storageKey = `checklist_${checklistId}_index`;
                localStorage.setItem(storageKey, nextIndex.toString());
            } else {
                // Si es la última pregunta, limpiar localStorage
                const storageKey = `checklist_${checklistId}_index`;
                localStorage.removeItem(storageKey);
            }

            // Refrescar datos solo al completar checklist
            if (isLastQuestion) {
                onAnswerSubmitted();
            }
            // Si no es la última pregunta, NO llamamos onAnswerSubmitted()
            // para evitar recargas innecesarias y el bug de navegación

        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al guardar respuesta');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            const newIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(newIndex);

            // Actualizar localStorage al navegar manualmente
            const storageKey = `checklist_${checklistId}_index`;
            localStorage.setItem(storageKey, newIndex.toString());
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questionsWithResponses.length - 1) {
            const newIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(newIndex);

            // Actualizar localStorage al navegar manualmente
            const storageKey = `checklist_${checklistId}_index`;
            localStorage.setItem(storageKey, newIndex.toString());
        }
    };

    // Navegación directa desde mini-mapa
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
                        Pregunta {currentQuestionIndex + 1} de {questionsWithResponses.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {Math.round(progress)}% Completado
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

                    {/* Indicador de respuesta existente */}
                    {currentItem.response && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Esta pregunta fue respondida anteriormente. Puedes modificar tu respuesta abajo.
                        </Alert>
                    )}

                    <RadioGroup value={answer} onChange={(e) => setAnswer(e.target.value as any)}>
                        <FormControlLabel
                            value="Yes"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircle color="success" fontSize="small" />
                                    <span>Sí - Cumple</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="No"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Error color="error" fontSize="small" />
                                    <span>No - No cumple</span>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="N/A"
                            control={<Radio />}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HelpOutline color="disabled" fontSize="small" />
                                    <span>N/A - No aplica</span>
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
                        placeholder="Agrega notas u observaciones relevantes..."
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
                                    Omitir
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmitAnswer}
                                variant="contained"
                                disabled={submitting}
                            >
                                {submitting ? 'Guardando...' : (isLastQuestion ? 'Guardar y Finalizar' : 'Guardar y Siguiente')}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Vista rápida de progreso */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
                {questionsWithResponses.map((item, index) => (
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