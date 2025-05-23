# Lumina Skincare Assistant

A personal skincare assistant chatbot built with OpenAI's GPT-4.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your OpenAI API key and Assistant ID:
   ```
   OPENAI_API_KEY=your_api_key_here
   ASSISTANT_ID=your_assistant_id_here
   ```
4. Start the server:
   ```
   npm start
   ```

## Deployment

This project is configured for deployment on Render. To deploy:

1. Create a Render account at https://render.com
2. Connect your GitHub repository
3. Add your environment variables in the Render dashboard:
   - OPENAI_API_KEY
   - ASSISTANT_ID
4. Deploy! 