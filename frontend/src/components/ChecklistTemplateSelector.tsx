import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
    Chip,
    Box,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Security as SecurityIcon,
    LockPerson as AccessIcon,
    Shield as DataIcon,
    LocationOn as PhysicalIcon,
    Warning as IncidentIcon,
} from '@mui/icons-material';
import { ChecklistTemplate } from '../types/Checklist';
import { checklistService } from '../services/checklistService';

interface ChecklistTemplateSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelectTemplate: (templateId: number) => void;
    auditId: number;
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Network_Security': return <SecurityIcon />;
        case 'Access_Control': return <AccessIcon />;
        case 'Data_Protection': return <DataIcon />;
        case 'Physical_Security': return <PhysicalIcon />;
        case 'Incident_Response': return <IncidentIcon />;
        default: return <SecurityIcon />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Network_Security': return 'primary';
        case 'Access_Control': return 'secondary';
        case 'Data_Protection': return 'success';
        case 'Physical_Security': return 'warning';
        case 'Incident_Response': return 'error';
        default: return 'default';
    }
};

const ChecklistTemplateSelector: React.FC<ChecklistTemplateSelectorProps> = ({
    open,
    onClose,
    onSelectTemplate,
    auditId
}) => {
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            loadTemplates();
        }
    }, [open]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await checklistService.getTemplates();
            setTemplates(response.templates);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error loading templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = () => {
        if (selectedTemplate) {
            onSelectTemplate(selectedTemplate);
            setSelectedTemplate(null);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Select Checklist Template</DialogTitle>
            <DialogContent>
                {loading && (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && (
                    <List>
                        {templates.map((template) => (
                            <ListItem key={template.id} disablePadding>
                                <ListItemButton
                                    selected={selectedTemplate === template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        {getCategoryIcon(template.category)}
                                        <ListItemText
                                            primary={template.name}
                                            secondary={template.description}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip
                                                label={`${template.questions_count} questions`}
                                                size="small"
                                                color={getCategoryColor(template.category) as any}
                                            />
                                        </Box>
                                    </Box>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}

                {!loading && !error && templates.length === 0 && (
                    <Typography color="text.secondary" align="center" py={4}>
                        No templates available
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSelect}
                    variant="contained"
                    disabled={!selectedTemplate}
                >
                    Start Checklist
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChecklistTemplateSelector;