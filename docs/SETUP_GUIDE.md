# Setup and Deployment Guide

> Step-by-step instructions for provisioning the Discord Application, activating Gateway Intents, configuring credentials, and managing runtime operations.

---

## 1. Discord Developer Portal Provisioning

### 1.1. Create Application
1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Log in with your Discord account credentials.
3. Click **New Application** in the upper-right corner.
4. Input an application name (for example, `HoangNek Bot`) and click **Create**.

### 1.2. Obtain Bot Token & Enable Gateway Intents
1. In the left navigation menu, select **Bot**.
2. Click **Reset Token** (or **View Token**) and copy the secret token string.
   - Store this token securely. Never commit this token to public source control.
   - Assign the token to `DISCORD_TOKEN` in your environment configuration file (`.env.development` or `.env.production`).
3. Under **Authorization Settings**, ensure **Public Bot** is enabled if the bot will be installed across multiple servers.
4. Scroll to **Privileged Gateway Intents** and enable the following:
   - **Server Members Intent**: Required for receiving `guildMemberAdd` and `guildMemberRemove` lifecycle events and resolving roles.
   - **Message Content Intent**: Required for reading message content to run automated moderation filters and prefix command parsing (`s!`, `!ask`, `!setup`).
5. Click **Save Changes**.

### 1.3. Generate OAuth2 Invitation URL
1. Navigate to **General Information** and copy the **Application ID** (assign to `CLIENT_ID` in `.env`).
2. Navigate to **OAuth2** -> **URL Generator**:
   - **Scopes**: Select `bot` and `applications.commands`.
   - **Bot Permissions**:
     - General / Text: `Manage Roles`, `Manage Channels`, `View Channels`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use External Emojis`, `Moderate Members`.
     - Voice: `Connect`, `Speak`, `Use Voice Activity`.
3. Alternatively, construct the direct authorization URL:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```
4. Open the link in a browser, select the target server where you have administrative access, and click **Authorize**.

---

## 2. Environment Configuration

### 2.1. File Initialization
Copy the template configuration file to your designated environment:

```bash
# For local development
cp .env.example .env.development

# For production deployment
cp .env.example .env.production
```

### 2.2. Configuration Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | Yes | Runtime environment (`development` or `production`). |
| `DISCORD_TOKEN` | String | Yes | Authentication token obtained from the Discord Developer Portal. |
| `CLIENT_ID` | String | Yes | Application ID from the Developer Portal for Slash Command registration. |
| `GUILD_ID` | String | Optional | Target guild ID for instantaneous slash command sync during development. Leave empty for global registration. |
| `GEMINI_API_KEY` | String | Optional | API Key from [Google AI Studio](https://aistudio.google.com/) for Gemini models. |
| `OPENROUTER_API_KEY` | String | Optional | API Key from [OpenRouter](https://openrouter.ai/) for multi-model fallback. |
| `TAVILY_API_KEY` | String | Optional | API Key from [Tavily](https://tavily.com/) for live search grounding. |
| `AI_PRIMARY_PROVIDER` | String | Optional | Default AI engine (`gemini` or `openrouter`). Default is `gemini`. |

---

## 3. Server Configuration & Setup Commands

The bot features per-guild configuration isolation managed entirely through Discord Slash and Prefix commands. Settings are stored persistently in `data/guild_settings.json`.

### 3.1. Notification Channels (Welcome & Leave)
By default, member join and leave notices are dispatched to the server default system channel (`guild.systemChannel`). Administrators can re-route notifications:

Slash Commands:
```
/setup notify set type:welcome channel:#welcome-channel
/setup notify set type:leave channel:#leave-channel
/setup notify set type:all channel:#general-channel
/setup notify reset
/setup notify status
```

Prefix Commands:
```
!setup notify welcome #welcome-channel
!setup notify leave #leave-channel
!setup welcome #welcome-channel
!setup leave #leave-channel
!setup notify reset
!setup notify status
```

### 3.2. Channel Command Whitelisting
To prevent command spam in conversation channels, command execution is restricted to authorized channels:

Slash Commands:
```
/setup channel add channel:#bot-commands scope:all
/setup channel add channel:#music-room scope:music
/setup channel remove channel:#bot-commands scope:all
/setup channel list
/setup channel clear
```

Prefix Commands:
```
!setup channel add #bot-commands
!setup channel remove #bot-commands
!setup channel list
!setup channel clear
```

### 3.3. Content Moderation Whitelist
Exempt trusted users or moderation roles from automated profanity and hate speech filters:

Slash Commands:
```
/setup whitelist add target:@Moderator
/setup whitelist remove target:@Moderator
/setup whitelist list
/setup whitelist clear
```

### 3.4. AI Model & Provider Customization
Configure default model parameters on a per-guild basis:

Slash Commands:
```
/setup ai set-provider provider:gemini
/setup ai set-provider provider:openrouter
/setup ai set-model provider:gemini model:gemini-2.5-flash
/setup ai status
/setup ai reset
```

Prefix Commands:
```
!setup ai provider gemini
!setup ai set gemini gemini-2.5-flash
!setup ai status
!setup ai reset
```

### 3.5. Dynamic Knowledge Base Setup
Inject custom server rules, pinned messages, or custom guidance texts into the AI prompt memory:

Slash Commands:
```
/setup knowledge add-channel channel:#rules
/setup knowledge add-message message_link:https://discord.com/channels/.../...
/setup knowledge add-text text:"Operating hours: Monday to Friday 9AM-6PM"
/setup knowledge status
/setup knowledge reset
```

---

## 4. Runtime Execution & Daemon Supervision

### 4.1. Development Execution
Run the development runner with automatic process reloading:

```bash
npm run dev
```

### 4.2. Production Service (Linux Systemd)
Deploy as a supervised systemd unit:

1. Create `/etc/systemd/system/discord-bot.service`:
   ```ini
   [Unit]
   Description=Discord Bot Platform
   After=network.target

   [Service]
   Type=simple
   User=botuser
   WorkingDirectory=/opt/hoangnek_bot_discord
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/node index.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```
2. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now discord-bot
   ```
3. Inspect operational logs:
   ```bash
   sudo journalctl -u discord-bot -f
   ```

### 4.3. Production Deployment (cPanel Setup Node.js App)
1. Log into cPanel and access **Setup Node.js App**.
2. Click **Create Application**.
3. Configure the application:
   - Node.js Version: `18.x` or `20.x`
   - Application Mode: `Production`
   - Application Root: `hoangnek_bot_discord`
   - Application Startup File: `index.js`
4. In the **Environment Variables** section, add your `DISCORD_TOKEN`, `CLIENT_ID`, `GEMINI_API_KEY`, etc.
5. Click **Run NPM Install** and then click **Restart**.
