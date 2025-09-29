require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Monday.com Service
class MondayService {
    constructor() {
        this.apiToken = process.env.MONDAY_API_TOKEN;
        this.boardId = process.env.MONDAY_BOARD_ID;
    }

    async createItem(itemName, columnValues = {}) {
        const query = `
            mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
                create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
                    id
                    name
                }
            }
        `;

        const variables = {
            boardId: parseInt(this.boardId),
            itemName: itemName,
            columnValues: JSON.stringify(columnValues)
        };

        try {
            const response = await axios.post('https://api.monday.com/v2', {
                query,
                variables
            }, {
                headers: {
                    'Authorization': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Monday API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getBoardColumns() {
        const query = `
            query GetBoard($boardId: ID!) {
                boards(ids: [$boardId]) {
                    columns {
                        id
                        title
                        type
                    }
                }
            }
        `;

        const variables = {
            boardId: parseInt(this.boardId)
        };

        try {
            const response = await axios.post('https://api.monday.com/v2', {
                query,
                variables
            }, {
                headers: {
                    'Authorization': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.data.boards[0].columns;
        } catch (error) {
            console.error('Error fetching board columns:', error);
            return null;
        }
    }
}

const mondayService = new MondayService();

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Google Forms to Monday.com Webhook Server',
        status: 'Running',
        endpoints: {
            webhook: 'POST /google-forms-webhook',
            health: 'GET /health',
            test: 'GET /test-monday',
            testBoard: 'POST /test-your-board'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test Monday.com connection
app.get('/test-monday', async (req, res) => {
    try {
        const columns = await mondayService.getBoardColumns();
        res.json({
            success: true,
            message: 'Monday.com connection successful',
            boardId: process.env.MONDAY_BOARD_ID,
            columns: columns
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Monday.com connection failed',
            error: error.message
        });
    }
});

// Google Forms Webhook Endpoint
app.post('/google-forms-webhook', async (req, res) => {
    console.log('📥 Received Google Forms webhook:', JSON.stringify(req.body, null, 2));

    try {
        const webhookData = req.body;
        
        // Validate webhook data structure
        if (!webhookData || !webhookData.formResponse) {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook data: missing formResponse'
            });
        }

        // Process Google Forms data
        const formData = processGoogleFormsData(webhookData);
        
        if (!formData.taskName) {
            return res.status(400).json({
                success: false,
                message: 'No task name found in form submission'
            });
        }

        // Create item in Monday.com
        const result = await mondayService.createItem(
            formData.taskName,
            formData.columnValues
        );

        console.log('✅ Successfully created Monday.com item:', result.create_item);

        res.json({
            success: true,
            message: 'Form submission processed successfully',
            mondayItem: result.create_item,
            formData: formData
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process form submission',
            error: error.message
        });
    }
});

// FIXED: Process Google Forms data with correct field mapping
function processGoogleFormsData(webhookData) {
    const response = webhookData.formResponse;
    
    let formData = {};
    
    if (response.answers) {
        const answers = response.answers || {};
        formData = extractFromGoogleForms(answers);
    } else {
        formData = response;
    }

    console.log('📊 Raw form data extracted:', formData);

    // Prepare Monday.com column values WITH CORRECT MAPPINGS
    const columnValues = {};
    
    // Map to your actual Monday.com column IDs
    if (formData.email) {
        columnValues['email_mkw8f7ya'] = { "email": formData.email, "text": formData.email };
    }
    
    // FIXED: Event Name should NOT be mapped to a separate column
    // Only the main item name will be "Test Registration"
    // if (formData.eventName) {
    //     columnValues['text_mkw8j1kx'] = formData.eventName;
    // }
    
    if (formData.eventAddress) {
        columnValues['text_mkw8xk3j'] = formData.eventAddress;
    }
    if (formData.eventTiming) {
        columnValues['text_mkw8vyva'] = formData.eventTiming;
    }
    
    // FIXED: Event Type should map from event_type field
    if (formData.eventType) {
        console.log('🎭 Event Type value:', formData.eventType);
        columnValues['color_mkw861jn'] = { "label": formData.eventType };
    }
    
    // Organization is a TEXT column
    if (formData.organization) {
        columnValues['text_mkw8jv7b'] = formData.organization;
    }
    
    // FIXED: Days to Attend - handle multiple selections properly
    if (formData.daysToAttend) {
        console.log('📅 Days to Attend raw value:', formData.daysToAttend);
        
        let daysArray;
        
        // Handle different formats from Google Forms
        if (Array.isArray(formData.daysToAttend)) {
            daysArray = formData.daysToAttend;
        } else if (typeof formData.daysToAttend === 'string') {
            // Check if it's a comma-separated string
            if (formData.daysToAttend.includes(',')) {
                daysArray = formData.daysToAttend.split(',').map(day => day.trim());
            } else {
                daysArray = [formData.daysToAttend];
            }
        } else {
            daysArray = [formData.daysToAttend];
        }
        
        console.log('📅 Days to Attend processed:', daysArray);
        columnValues['dropdown_mkw8k62a'] = { "labels": daysArray };
    }
    
    // Dietary Restrictions - single selection dropdown
    if (formData.dietaryRestrictions) {
        columnValues['dropdown_mkw8jbs5'] = { "labels": [formData.dietaryRestrictions] };
    }
    
    // FIXED: Checkbox - handle Google Forms checkbox format correctly
    if (formData.acknowledgement !== undefined && formData.acknowledgement !== '') {
        console.log('✅ Checkbox raw value:', formData.acknowledgement);
        
        // For checkbox questions, if there's any value it means it's checked
        const isChecked = formData.acknowledgement === "Yes" || 
                         formData.acknowledgement === "true" || 
                         formData.acknowledgement === true ||
                         (Array.isArray(formData.acknowledgement) && formData.acknowledgement.length > 0);
        
        console.log('✅ Checkbox processed - isChecked:', isChecked);
        columnValues['boolean_mkw82yxh'] = isChecked ? { "checked": "true" } : {};
    }

    // Always set status to new
    columnValues['status'] = { "label": "New" };

    console.log('📊 Processed form data:', formData);
    console.log('🎯 Monday.com column values:', columnValues);

    return {
        ...formData,
        columnValues: columnValues
    };
}

// FIXED: Correct field extraction for your specific Google Form
function extractFromGoogleForms(answers) {
    const formData = {
        taskName: '',
        email: '',
        eventName: '',
        eventAddress: '',
        eventTiming: '',
        eventType: '',
        organization: '',
        daysToAttend: '',
        dietaryRestrictions: '',
        acknowledgement: ''
    };

    console.log('🔍 Extracting from Google Forms answers:');
    console.log('Available keys:', Object.keys(answers));

    // Map Google Forms answers to our data structure
    for (const [key, answer] of Object.entries(answers)) {
        console.log(`Processing field: ${key}`, JSON.stringify(answer, null, 2));

        // Extract value based on answer type
        let value = '';
        
        if (answer.textAnswers) {
            value = answer.textAnswers.answers[0]?.value || '';
            console.log(`📝 Text field ${key}: ${value}`);
        } else if (answer.email) {
            value = answer.email || '';
            console.log(`📧 Email field ${key}: ${value}`);
        } else if (answer.choiceQuestions) {
            // Handle both single choice and multiple choices
            if (answer.choiceQuestions.answers && answer.choiceQuestions.answers.length > 0) {
                if (answer.choiceQuestions.answers.length === 1) {
                    value = answer.choiceQuestions.answers[0]?.value || '';
                    console.log(`✅ Single choice ${key}: ${value}`);
                } else {
                    // Multiple choices - keep as array
                    value = answer.choiceQuestions.answers.map(a => a.value);
                    console.log(`✅ Multiple choices ${key}:`, value);
                }
            }
        }

        // FIXED: Correct mapping based on your actual field names
        if (key === 'event_name') {
            formData.eventName = value;
            formData.taskName = value; // Use as main task name
            console.log(`🎯 Mapped ${key} → eventName & taskName`);
        } else if (key === 'email') {
            formData.email = value;
            console.log(`🎯 Mapped ${key} → email`);
        } else if (key === 'event_type') {
            formData.eventType = value;
            console.log(`🎯 Mapped ${key} → eventType`);
        } else if (key === 'organization') {
            formData.organization = value;
            console.log(`🎯 Mapped ${key} → organization`);
        } else if (key === 'what_days_will_you_attend') {
            formData.daysToAttend = value; // This will be an array
            console.log(`🎯 Mapped ${key} → daysToAttend (as array)`);
        } else if (key === 'dietary_restrictions') {
            formData.dietaryRestrictions = value;
            console.log(`🎯 Mapped ${key} → dietaryRestrictions`);
        } else if (key === 'i_understand_that_i_will_have_to_pay_10_upon_arrival') {
            formData.acknowledgement = value;
            console.log(`🎯 Mapped ${key} → acknowledgement`);
        }
    }

    console.log('📋 Final extracted formData:', formData);
    return formData;
}

// Test endpoint with CORRECT mappings
app.post('/test-your-board', async (req, res) => {
    try {
        const result = await mondayService.createItem(
            "Test Event - " + new Date().toLocaleTimeString(),
            {
                "email_mkw8f7ya": { "email": "test@example.com", "text": "test@example.com" },
                "text_mkw8xk3j": "123 Test Street, City",
                "text_mkw8vyva": "January 15, 2024 at 2:00 PM",
                "color_mkw861jn": { "label": "Conference" },
                "text_mkw8jv7b": "Tech Corp",
                "dropdown_mkw8k62a": { "labels": ["Day 1", "Day 2", "Day 3"] },
                "dropdown_mkw8jbs5": { "labels": ["Vegetarian"] },
                "boolean_mkw82yxh": { "checked": "true" },
                "status": { "label": "New" }
            }
        );

        res.json({
            success: true,
            message: 'Test item created on your board',
            mondayItem: result.create_item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Test failed',
            error: error.message
        });
    }
});

// Simple form endpoint (for your local form)
app.post('/create-task', async (req, res) => {
    try {
        const { taskName, email, eventName, eventAddress, eventTiming, eventType, organization, daysToAttend, dietaryRestrictions, acknowledgement } = req.body;

        if (!taskName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Task name is required' 
            });
        }

        // Prepare column values
        const columnValues = {};
        
        if (email) columnValues['email_mkw8f7ya'] = { "email": email, "text": email };
        if (eventAddress) columnValues['text_mkw8xk3j'] = eventAddress;
        if (eventTiming) columnValues['text_mkw8vyva'] = eventTiming;
        if (eventType) columnValues['color_mkw861jn'] = { "label": eventType };
        if (organization) columnValues['text_mkw8jv7b'] = organization;
        
        // Handle multiple days
        if (daysToAttend) {
            let daysArray = Array.isArray(daysToAttend) ? daysToAttend : [daysToAttend];
            columnValues['dropdown_mkw8k62a'] = { "labels": daysArray };
        }
        
        if (dietaryRestrictions) columnValues['dropdown_mkw8jbs5'] = { "labels": [dietaryRestrictions] };
        
        // Handle checkbox
        if (acknowledgement) {
            const isChecked = acknowledgement === "Yes" || acknowledgement === "true" || acknowledgement === true;
            columnValues['boolean_mkw82yxh'] = isChecked ? { "checked": "true" } : {};
        }
        
        columnValues['status'] = { "label": "New" };

        const result = await mondayService.createItem(taskName, columnValues);
        
        res.json({ 
            success: true, 
            message: 'Event created successfully!',
            taskId: result.create_item.id
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create event: ' + error.message 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Google Forms webhook: POST http://localhost:${PORT}/google-forms-webhook`);
    console.log(`🎯 Test your board: POST http://localhost:${PORT}/test-your-board`);
});