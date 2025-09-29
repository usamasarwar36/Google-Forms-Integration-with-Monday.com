
# Google Forms to Monday.com Integration

A Node.js application that automatically creates Monday.com items from Google Forms submissions via webhooks.

## 🚀 Features
- Automatically creates Monday.com items when Google Forms are submitted
- Maps Google Form fields to specific Monday.com columns
- Supports multiple field types (text, email, dropdown, checkbox, status)
- Real-time webhook processing
- Easy setup with ngrok for local development

## 📋 Prerequisites
- Node.js (v14 or higher)
- A Monday.com account with API access
- A Google account with Google Forms access
- ngrok account (for webhook testing)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd google-forms-monday
npm install
```

### 2. Monday.com Setup

#### 2.1 Get API Token
1. Go to [Monday.com](https://monday.com)
2. Click your profile picture → **Developers**
3. Go to **API** section → Copy your API token

#### 2.2 Get Board ID
- Open your Monday.com board
- Look at the URL:  
  ```
  https://your-account.monday.com/boards/1234567890
  ```
- The number at the end is your **board ID**

#### 2.3 Create Required Columns
| Column Name                | Type        |
|----------------------------|-------------|
| Email                      | Email        |
| Event Name                 | Text         |
| Event Address (Optional)    | Text         |
| Event Timing (Optional)     | Text         |
| Event Type                  | Status       |
| Organization                | Text         |
| Days to Attend              | Dropdown     |
| Dietary Restrictions        | Dropdown     |
| Payment Acknowledgement      | Checkbox     |

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
MONDAY_API_TOKEN=your_monday_api_token_here
MONDAY_BOARD_ID=your_board_id_here
PORT=5000
```

### 4. Google Forms Setup

#### 4.1 Create Your Google Form
Recommended fields:
- Event Name (Short answer)
- Email (Email)
- Event Type (Multiple choice)
- Organization (Short answer)
- What days will you attend? (Checkbox)
- Dietary restrictions (Multiple choice)
- Payment Acknowledgement (Checkbox)

#### 4.2 Connect Google Forms to Webhook
1. Open your Google Form  
2. Click **3 dots (⋮)** → **Script editor**  
3. Replace existing code with the content from `google-apps-script.js`  
4. Update the `WEBHOOK_URL` with your ngrok URL  
5. Save the script (`Ctrl+S`)  
6. Run `setupTrigger()` from the script editor menu  
7. Authorize the script when prompted  

### 5. Run the Application
```bash
npm start
ngrok http 5000
```
Copy the ngrok URL (e.g., `https://abc-123.ngrok.io`) into the Google Apps Script `WEBHOOK_URL`.

## 📁 Project Structure
```
google-forms-monday/
├── app.js                 # Main server application
├── google-apps-script.js  # Google Apps Script code
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (create this)
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## 🔧 Configuration Files

### Environment Variables (`.env`)
```env
MONDAY_API_TOKEN=your_monday_api_token_here
MONDAY_BOARD_ID=your_board_id_here
PORT=5000
```

### Package.json
```json
{
  "name": "google-forms-monday",
  "version": "1.0.0",
  "description": "Google Forms to Monday.com integration",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.0.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.0"
  }
}
```

## 🌐 API Endpoints
| Method | Endpoint                  | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | `/`                        | Server status and available endpoints |
| GET    | `/health`                  | Health check                    |
| GET    | `/test-monday`             | Test Monday.com connection       |
| POST   | `/google-forms-webhook`    | Google Forms webhook endpoint    |
| POST   | `/test-your-board`         | Test Monday.com item creation    |
| POST   | `/create-task`             | Manual task creation endpoint    |

## 🧪 Testing
```bash
curl http://localhost:5000/test-monday
curl -X POST http://localhost:5000/test-your-board
curl http://localhost:5000/health
```

## 🔄 Field Mapping
| Google Form Field                  | Monday.com Column            | Type           |
|------------------------------------|-------------------------------|----------------|
| Event Name                          | Item Name                     | Text            |
| Email                               | Email                         | Email           |
| Event Type                          | Event Type                    | Status          |
| Organization                        | Organization                  | Text            |
| What days will you attend?           | Days to Attend                | Dropdown (multi)|
| Dietary restrictions                | Dietary Restrictions          | Dropdown (single)|
| Payment acknowledgement             | Payment Acknowledgement        | Checkbox        |

## 🐛 Troubleshooting
- **Webhook not receiving data**: Check ngrok URL, Google Apps Script logs, server logs.
- **Monday.com items not created**: Verify API token, board ID, check /test-monday endpoint.
- **Field mapping issues**: Ensure form field names match exactly.

## 📝 Logs and Monitoring
The app logs webhook requests, data processing, Monday.com API responses, and errors.

## 🔒 Security Notes
- Do not commit `.env` file.
- Rotate tokens regularly.
- Use HTTPS in production.

## 🚀 Deployment
- Use Heroku, AWS, or DigitalOcean.
- Configure environment variables.
- Use a custom domain and SSL.

## 📄 License
MIT License

## 🤝 Contributing
1. Fork repo
2. Create branch
3. Make changes
4. Submit PR

## 📞 Support
Check troubleshooting section or review logs for errors.

## **Note**: Update `WEBHOOK_URL` after each ngrok restart.
