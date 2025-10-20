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

// Lógica de color (sin cambios)
const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'Critical': return 'error';
        case 'High': return 'warning';
        case 'Medium': return 'info';
        case 'Low': return 'success';
        default: return 'default';
    }
};

// Lógica de íconos (sin cambios)
const getAnswerIcon = (answer: string | undefined) => {
    switch (answer) {
        case 'Yes': return <CheckCircle color="success" />;
        case 'No': return <Error color="error" />;
        case 'N/A': return <HelpOutline color="disabled" />;
        default: return null;
    }
};

// ✅ NUEVA FUNCIÓN DE TRADUCCIÓN
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

    const currentItem = questionsWithResponses[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questionsWithResponses.length - 1;

    // Pre-cargar respuesta si existe
    React.useEffect(() => {
        if (currentItem?.response) {
            setAnswer(currentItem.response.answer);
            setNotes(currentItem.response.notes || '');
        } else {
            setAnswer('Yes');
            setNotes('');
        }
    }, [currentQuestionIndex, currentItem]);

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

            if (!isLastQuestion) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                onAnswerSubmitted();
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
                <Alert severity="error" sx={{ mb: 2 }}>
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

                            label={translateSeverity(currentItem.question.severity)}
                            size="small"
                            color={getSeverityColor(currentItem.question.severity) as any}
                        />
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
                            disabled={currentQuestionIndex === 0}
                        >
                            Anterior
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isLastQuestion && (
                                <Button
                                    onClick={handleNext}
                                    variant="outlined"
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

            {/* Vista rápida de progreso */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
                {questionsWithResponses.map((item, index) => (
                    <Box
                        key={item.question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
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
                            '&:hover': { bgcolor: 'action.hover' }
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