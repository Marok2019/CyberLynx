import React, { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Stack,
    LinearProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    Help,
    Assessment,
} from '@mui/icons-material';
import { ChecklistSummary as ChecklistSummaryType } from '../types/Checklist';
import { checklistService } from '../services/checklistService';

interface ChecklistSummaryProps {
    checklistId: number;
}

const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ checklistId }) => {
    const [summary, setSummary] = useState<ChecklistSummaryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSummary();
    }, [checklistId]);

    const loadSummary = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await checklistService.getChecklistSummary(checklistId);
            setSummary(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error loading summary');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !summary) {
        return (
            <Alert severity="error">
                {error || 'Failed to load summary'}
            </Alert>
        );
    }

    const { summary: stats } = summary;

    return (
        <Box>
            {/* Main Statistics */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                sx={{ mb: 3 }}
            >
                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <CheckCircle color="success" />
                                <Typography variant="h6">{stats.yes_count}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Compliant
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Cancel color="error" />
                                <Typography variant="h6">{stats.no_count}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Non-Compliant
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Help color="disabled" />
                                <Typography variant="h6">{stats.na_count}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Not Applicable
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Assessment color="primary" />
                                <Typography variant="h6">{stats.compliance_rate}%</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Compliance Rate
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Stack>

            {/* Overall Progress Bar */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Overall Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={(stats.answered_questions / stats.total_questions) * 100}
                                sx={{ height: 10, borderRadius: 5 }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {stats.answered_questions} / {stats.total_questions}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* Breakdown by Severity */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Breakdown by Severity
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Severity</TableCell>
                                    <TableCell align="center">Total</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <CheckCircle fontSize="small" color="success" />
                                            Yes
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <Cancel fontSize="small" color="error" />
                                            No
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <Help fontSize="small" color="disabled" />
                                            N/A
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">Unanswered</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(stats.severity_breakdown).map(([severity, counts]) => (
                                    <TableRow key={severity}>
                                        <TableCell>
                                            <Chip
                                                label={severity}
                                                size="small"
                                                color={
                                                    severity === 'Critical' ? 'error' :
                                                        severity === 'High' ? 'warning' :
                                                            severity === 'Medium' ? 'info' : 'success'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="center">{counts.total}</TableCell>
                                        <TableCell align="center">{counts.yes}</TableCell>
                                        <TableCell align="center">{counts.no}</TableCell>
                                        <TableCell align="center">{counts.na}</TableCell>
                                        <TableCell align="center">{counts.unanswered}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ChecklistSummary;