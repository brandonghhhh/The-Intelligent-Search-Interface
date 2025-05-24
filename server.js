require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// In-memory session store (for demo; use Redis or DB for production)
const sessions = {};

// List of allowed Simple® product names and their types
const simpleProductsData = [
    { name: "Daily Skin Detox Purifying Gel Facial Wash" },
    { name: "Kind To Skin Refreshing Facial Wash" },
    { name: "Water Boost Micellar Gel Facial Wash" },
    { name: "Kind To Skin Purifying Cleansing Lotion" },
    { name: "Kind To Skin Moisturising Face Wash" },
    { name: "Kind To Skin Hydrating Cleansing Oil" },
    { name: "Age Resisting Facial Wash" },
    { name: "Kind To Skin Smoothing Facial Scrub" },
    { name: "Daily Skin Detox Pore Polishing Face Scrub" },
    { name: "Kind To Skin Refreshing Shower Gel" },
    { name: "Kind To Skin Nourishing Shower Gel" },
    { name: "Kind To Skin Eye Make-up Remover" },
    { name: "Kind To Eyes Soothing Eye Balm" },
    { name: "Kind To Skin Soothing Facial Toner" },
    { name: "Water Boost Cleansing Micellar Water" },
    { name: "Kind To Skin Micellar Cleansing Water" },
    { name: "Age Resisting Night Cream" },
    { name: "Kind To Skin Hydrating Light Moisturiser" },
    { name: "Age Resisting Day Cream Spf 15" },
    { name: "Kind To Skin Vital Vitamin Night Cream" },
    { name: "Daily Skin Detox Clear Matte Cleansing Wipes" },
    { name: "Kind To Skin Micellar Facial Wipes" },
    { name: "3 Hyaluronic Acid & Vitamin B5 Booster Serum" },
    { name: "10 Niacinamide (Vitamin B3) Booster Serum" }
];

// API: Create a new session/thread
app.post('/api/thread', async (req, res) => {
    try {
        console.log('Creating new thread...');
        const thread = await openai.beta.threads.create();
        console.log('Thread created successfully:', thread.id);

        // Add welcome message to the thread
        const welcomeMessage = await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: "Welcome! I am Lumina, your Simple® skincare assistant. How can I help you with Simple® products today?"
        });

        // Run the assistant to get the welcome response
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: process.env.ASSISTANT_ID,
            instructions: `You are Lumina, a friendly and knowledgeable skincare assistant. When providing steps or instructions:
1. Use numbered format (1., 2., 3., etc.)
2. Each step should be on a new line
3. Keep responses concise and conversational
4. Use clear, simple language
5. Add a blank line between steps for better readability

IMPORTANT RULES:
1. Only recommend, mention, or discuss products from the following list. Do NOT mention, suggest, or refer to any products, brands, or companies that are not in this list, under any circumstances.

2. You are not allowed to discuss or answer any questions unrelated to skincare, including general knowledge, personal questions, or unrelated definitions. If the user asks something off-topic such as "What is poop" or "What's 2+2," you are to politely redirect them by saying something like "I'm here to help with anything skincare-related – from routines to ingredient tips."

Product List:
${simpleProductsData.map(p => p.name).join('\n')}

If the user requests a link to the Simple website, respond with: "You can visit the Simple website at https://www.simple.co.uk."`
        });

        // Wait for the welcome message to be generated
        let runStatus = run.status;
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 25;
        while (runStatus !== 'completed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            const statusCheck = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            runStatus = statusCheck.status;
            attempts++;
        }

        // Get the welcome message
        const messages = await openai.beta.threads.messages.list(thread.id);
        const welcomeResponse = messages.data[0].content[0].text.value;

        res.json({ 
            threadId: thread.id,
            welcomeMessage: welcomeResponse
        });
    } catch (error) {
        console.error('Error creating thread:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ 
            error: 'Failed to create thread',
            details: error.message,
            type: error.type || 'unknown'
        });
    }
});

// API: Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { threadId, message } = req.body;
        if (!threadId) throw new Error('No thread ID provided');
        if (!message) throw new Error('No message provided');

        // Prepare content for OpenAI API
        const imageUrls = [];
        const imgRegex = /<img[^>]+src=\"([^\">]+)\"/g;
        let match;
        while ((match = imgRegex.exec(message)) !== null) {
            imageUrls.push(match[1]);
        }
        const content = [{ type: 'text', text: message }];
        imageUrls.forEach(url => {
            content.push({ type: 'image_url', image_url: { url } });
        });

        // Add message to thread
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: content
        });

        // Run the assistant with no special instructions (default behavior)
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: process.env.ASSISTANT_ID,
            instructions: `IMPORTANT RULES:
1. Only recommend, mention, or discuss products from the following list. Do NOT mention, suggest, or refer to any products, brands, or companies that are not in this list, under any circumstances.

2. You are not allowed to discuss or answer any questions unrelated to skincare, including general knowledge, personal questions, or unrelated definitions. If the user asks something off-topic such as "What is poop" or "What's 2+2," you are to politely redirect them by saying something like "I'm here to help with anything skincare-related – from routines to ingredient tips."

Product List:
${simpleProductsData.map(p => p.name).join('\n')}

If the user requests a link to the Simple website, respond with: "You can visit the Simple website at https://www.simple.co.uk."`
        });

        // Wait for completion
        let runStatus = run.status;
        let attempts = 0;
        const maxAttempts = 40;
        const pollInterval = 50;
        while (runStatus !== 'completed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            const statusCheck = await openai.beta.threads.runs.retrieve(threadId, run.id);
            runStatus = statusCheck.status;
            attempts++;
        }

        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(threadId);
        let assistantMessage = messages.data[0].content[0].text.value;

        // Remove OpenAI file reference artifacts like 【8:0†SimpleSkincare_Dataset.json】
        assistantMessage = assistantMessage.replace(/【\d+:\d+†[^】]+】/g, '');

        // Function to normalize text for matching
        function normalizeText(text) {
            return text.toLowerCase()
                .replace(/[- ]/g, '')
                .replace(/[^a-z0-9]/g, '');
        }

        // Get the full product list from the frontend
        const fullProductList = [
            "Daily Skin Detox Purifying Gel Facial Wash",
            "Kind To Skin Refreshing Facial Wash",
            "Water Boost Micellar Gel Facial Wash",
            "Kind To Skin Purifying Cleansing Lotion",
            "Kind To Skin Moisturising Face Wash",
            "Kind To Skin Hydrating Cleansing Oil",
            "Age Resisting Facial Wash",
            "Kind To Skin Smoothing Facial Scrub",
            "Daily Skin Detox Pore Polishing Face Scrub",
            "Kind To Skin Refreshing Shower Gel",
            "Kind To Skin Nourishing Shower Gel",
            "Kind To Skin Eye Make-up Remover",
            "Kind To Eyes Soothing Eye Balm",
            "Kind To Skin Soothing Facial Toner",
            "Water Boost Cleansing Micellar Water",
            "Kind To Skin Micellar Cleansing Water",
            "Age Resisting Night Cream",
            "Kind To Skin Hydrating Light Moisturiser",
            "Age Resisting Day Cream Spf 15",
            "Kind To Skin Vital Vitamin Night Cream",
            "Daily Skin Detox Clear Matte Cleansing Wipes",
            "Kind To Skin Micellar Facial Wipes",
            "3 Hyaluronic Acid & Vitamin B5 Booster Serum",
            "10 Niacinamide (Vitamin B3) Booster Serum"
        ];

        // Find mentioned products using normalized matching
        const mentionedProducts = fullProductList.filter(productName => {
            const normalizedProductName = normalizeText(productName);
            const normalizedResponse = normalizeText(assistantMessage);
            return normalizedResponse.includes(normalizedProductName);
        });

        // Update the response to use exact product names
        mentionedProducts.forEach(productName => {
            const normalizedProductName = normalizeText(productName);
            const regex = new RegExp(normalizedProductName, 'gi');
            assistantMessage = assistantMessage.replace(regex, productName);
        });

        res.json({
            response: assistantMessage,
            mentionedProducts: mentionedProducts
        });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
});

// Handle image upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No image file uploaded');
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ 
            error: 'Failed to upload image',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Open http://localhost:3000 in your browser');
}); 