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

            onAnswerSubmitted();

            // Avanzar a la siguiente pregunta si no es la última
            if (!isLastQuestion) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
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
                        Question {currentQuestionIndex + 1} of {questionsWithResponses.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {Math.round(progress)}% Complete
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
                            label={currentItem.question.severity}
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
                            disabled={currentQuestionIndex === 0}
                        >
                            Previous
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!isLastQuestion && (
                                <Button
                                    onClick={handleNext}
                                    variant="outlined"
                                >
                                    Skip
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmitAnswer}
                                variant="contained"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : (isLastQuestion ? 'Finish' : 'Save & Next')}
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