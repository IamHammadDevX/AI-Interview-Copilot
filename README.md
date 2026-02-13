# 🧠 Interview Copilot

Your private AI-powered assistant for interviews — voice-enabled, real-time, and fully local.

> 🔒 **Private repository. Do not share or redistribute.**

## ✨ Features

- 🎙️ **Voice-enabled transcription** with real-time processing
- 🤖 **AI-powered assistance** using OpenAI's advanced models
- 🏠 **Fully local** - your data stays private
- 🌐 **Multi-language support** for global interviews
- ⚡ **Real-time responses** for seamless interaction

---

## 🚀 Quick Start

Before running the setup script, make sure you have **Git** installed.  


#### 1. Clone the project to your computer

```bash
git clone https://github.com/alikri/interview-copilot.git
cd interview-copilot
```

#### 2. Run command
on Mac:
```bash
chmod +x setup-mac.sh
./setup-mac.sh
```

on Windows:
```bash
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

#### 3. Follow the prompt during the execution

1. Select the AI provider OpenAI is default (simply press `Enter`) or select **2** for DeepSeek
2. **Enter your OpenAI API key** go to [Open AI Keys](https://platform.openai.com/account/api-keys) **for OpenAI** and go to [DeepSeek keys](https://platform.deepseek.com/api_keys) to generate the key. Please make sure you add your billing details, otherwise the API will not work if you have no tokens

#### 4. Select the language for WEB API (the option that provides live transcription, manual language selection is required, default to English, simply press `Enter`)
#### 5. When script finished, run the following command

```bash
npm run dev
```

#### 6. 🌐 **Open your browser to:** `http://localhost:3000`

### 🎉 You're All Set!

**Congratulations!** Your Interview Copilot is now ready to use. Here's what you can do:

✅ **Choose your transcription mode** using the toggle after launch  
✅ **Grant microphone permissions** when prompted  
✅ **Connect to your meeting** (Zoom, Teams, Google Meet, etc.)  
✅ **Start your interview practice** and let AI assist you!  
✅ **Ace your dream job** with confidence! 🚀

> 💡 **Pro Tip**: Test your microphone and transcription settings before your actual interview to ensure everything works smoothly.

---

#### 7. To close the app:

- **Windows:** Press `Ctrl + C`  
- **macOS:** Press `Command + C`

---



## Manual set up:

### 📋 Prerequisites

Before getting started, ensure you have:

- **Node.js 22+** - [Download here](https://nodejs.org/)
- **npm** (included with Node.js)
- **Git** for repository management
- **Terminal** (macOS/Linux) or **PowerShell** (Windows)
- **OpenAI API Key** - [Get yours here](https://platform.openai.com/account/api-keys)

---

#### 1. Clone the App, set up local env file:

```bash
git clone https://github.com/alikri/interview-copilot.git
cp .env.example .env.local
```

#### 2.Add your API Key to `.env.local`.
#### 3. Open config.ts file and change default language for WEB API if needed. Keep the format (BCP-47 code). Examples: en-US, en-US, en-GB, fr-FR, de-DE, es-ES, it-IT, pl-PL, pt-BR, ru-RU, uk-UA"
#### 4. Launch Application:

```bash
npm i && npm run dev
```

#### 4. Open your browser to: `http://localhost:3000`


## 📚 Additional Information

Need more details? Expand the sections below for advanced configuration and troubleshooting:

---

## 🎙️ Transcription Modes

Choose the transcription engine that best fits your needs using the toggle directly after launching the application:

| Mode           | Speed     | Accuracy     | Cost           | Browser Support | API Required | Language Detection                                   |
| -------------- | --------- | ------------ | -------------- | --------------- | ------------ | ---------------------------------------------------- |
| **Web Speech** | ⚡ Fast   | 🔶 Good      | 🆓 Free        | Chrome/Edge     | ❌ No        | 🇺🇸 English default, manual setup for other languages |
| **Whisper**    | 🔶 Medium | ⭐ Excellent | 💰 Pay-per-use | All browsers    | ✅ Yes       | 🤖 Automatic detection                               |

## ⚠️ Important: Headphone Compatibility

**For Web Speech API users:** 
- **Do not wear headphones** during the interview for optimal performance
- The Web Speech API does not hear audio from shared screen when headphones are used
- If you prefer to wear headphones, please **use Whisper API instead** for reliable transcription

**For Whisper API users:**
- Headphones are fully supported and recommended for better audio isolation

---

## 🌍 WEB API Manual Language Configuration

### Visual Editor

1. Open `config.ts` in your preferred editor
2. Modify the language setting:

```javascript
export const DEFAULT_WEB_SPEECH_LANGUAGE = 'en-US'; // English (US)
export const DEFAULT_WEB_SPEECH_LANGUAGE = 'fr-FR'; // French
export const DEFAULT_WEB_SPEECH_LANGUAGE = 'es-ES'; // Spanish
export const DEFAULT_WEB_SPEECH_LANGUAGE = 'de-DE'; // German
```

**Restart the application:**

```bash
npm run dev
```

---

## 🛠️ Troubleshooting

**Alternative Setup (If OpenAI is not available):**

## 🔑 Getting Your DeepSeek API Key (Alternative Provider)

> **Note:** DeepSeek is provided as an alternative if OpenAI is not available in your region or for other reasons. OpenAI is the recommended provider for the best experience.

1. **Sign up** at [DeepSeek Platform](https://platform.deepseek.com/signup)
2. **Navigate** to [API Keys](https://platform.deepseek.com/OPENAI_API_KEYs)
3. **Click** "Create API Key"
4. **Copy** the key and add it to your `.env.local` file

```env
DEEP_SEEK_API_KEY=sk-your-deepseek-key-here
NEXT_PUBLIC_LLM_PROVIDER=deepseek
```

## ⚠️ Important Limitations

- **DeepSeek models do not accept pictures/images**
- Only text-based interactions are supported with DeepSeek
- Whisper transcription isn’t compatible with DeepSeek, so you’ll need to use the Web Speech API instead
- For image analysis or vision tasks, use OpenAI provider
- **OpenAI provides the best overall experience and full feature support**

## 📝 Notes

- Store both keys securely in your environment variables
- Never commit API keys to version control
- Both APIs follow similar authentication patterns
- Make sure to keep your keys private and rotate them regularly

---

### Common Issues & Solutions

**🎤 Microphone not working?**

- Ensure browser microphone permissions are enabled
- Use Google Chrome for optimal Web Speech API support

**🔑 API key issues?**

- Verify your OpenAI API key is valid
- Check that your OpenAI account has available credits
- Ensure the key is correctly added to `.env.local`

**📦 Installation problems?**

- Confirm Node.js version 18+ is installed: `node -v`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**🌐 App won't start?**

- Check if port 3000 is available
- Try a different port: `npm run dev -- -p 3001`

### Manual Recovery Steps

If automated setup fails:

1. **Install Node.js** manually from [nodejs.org](https://nodejs.org/)
2. **Follow manual setup** instructions above
3. **Edit configuration** using any text editor
4. **Start application** with: `npm run dev`

---

## 📞 Support & Contact

Need assistance? We're here to help!

- 📧 **Email**: support@interviewcopilot.info
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/interview-copilot/issues)

---

## 📄 License

This project is private and confidential. Unauthorized distribution is prohibited.

---

<div align="center">
Made with ❤️ for successful interviews
Keep your conversations private, your preparation thorough, and your confidence high.
</div>
