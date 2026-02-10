---
name: setup
description: Run initial Gandalf setup. Use when user wants to install dependencies, authenticate WhatsApp, register their main channel, or start the background services. Triggers on "setup", "install", "configure gandalf", or first-time setup requests.
---

# Gandalf Setup

Run all commands automatically. Only pause when user action is required (scanning QR codes).

**UX Note:** When asking the user questions, prefer using the `AskUserQuestion` tool instead of just outputting text. This integrates with Claude's built-in question/answer system for a better experience.

## 1. Install Dependencies

```bash
bun install
```

## 2. Configure Claude Authentication

Ask the user:
> Do you want to use your **Claude subscription** (Pro/Max) or an **Anthropic API key**?

### Option 1: Claude Subscription (Recommended)

Tell the user:
> Open another terminal window and run:
> ```
> claude setup-token
> ```
> A browser window will open for you to log in. Once authenticated, the token will be displayed in your terminal. Either:
> 1. Paste it here and I'll add it to `.env` for you, or
> 2. Add it to `.env` yourself as `CLAUDE_CODE_OAUTH_TOKEN=<your-token>`

If they give you the token, add it to `.env`:

```bash
echo "CLAUDE_CODE_OAUTH_TOKEN=<token>" > .env
```

### Option 2: API Key

Ask if they have an existing key to copy or need to create one.

**Copy existing:**
```bash
grep "^ANTHROPIC_API_KEY=" /path/to/source/.env > .env
```

**Create new:**
```bash
echo 'ANTHROPIC_API_KEY=' > .env
```

Tell the user to add their key from https://console.anthropic.com/

**Verify:**
```bash
KEY=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d= -f2)
[ -n "$KEY" ] && echo "API key configured: ${KEY:0:10}...${KEY: -4}" || echo "Missing"
```

## 3. WhatsApp Authentication

**USER ACTION REQUIRED**

**IMPORTANT:** Run this command in the **foreground**. The QR code is multi-line ASCII art that must be displayed in full. Do NOT run in background or truncate the output.

Tell the user:
> A QR code will appear below. On your phone:
> 1. Open WhatsApp
> 2. Tap **Settings → Linked Devices → Link a Device**
> 3. Scan the QR code

Run with a long Bash tool timeout (120000ms) so the user has time to scan. Do NOT use the `timeout` shell command (it's not available on macOS).

```bash
bun run auth
```

Wait for the script to output "Successfully authenticated" then continue.

If it says "Already authenticated", skip to the next step.

## 4. Configure Main Channel

This step configures the main channel type and selection.

### 4a. Explain security model and ask about main channel type

**Use the AskUserQuestion tool** to present this:

> **Important: Your "main" channel is your admin control portal.**
>
> The main channel has elevated privileges:
> - Can see messages from ALL other registered groups
> - Can manage and delete tasks across all groups
> - Can write to global memory that all groups can read
> - Has read-write access to the entire Gandalf project
>
> **Recommendation:** Use your personal "Message Yourself" chat or a solo WhatsApp group as your main channel. This ensures only you have admin control.
>
> **Question:** Which setup will you use for your main channel?
>
> Options:
> 1. Personal chat (Message Yourself) - Recommended
> 2. Solo WhatsApp group (just me)
> 3. Group with other people (I understand the security implications)

If they choose option 3, ask a follow-up:

> You've chosen a group with other people. This means everyone in that group will have admin privileges over Gandalf.
>
> Are you sure you want to proceed? The other members will be able to:
> - Read messages from your other registered chats
> - Schedule and manage tasks
> - Access any directories you've mounted
>
> Options:
> 1. Yes, I understand and want to proceed
> 2. No, let me use a personal chat or solo group instead

### 4b. Register the main channel

First build, then start the app briefly to connect to WhatsApp and sync group metadata. Use the Bash tool's timeout parameter (15000ms) — do NOT use the `timeout` shell command (it's not available on macOS). The app will be killed when the timeout fires, which is expected.

```bash
bun run build
```

Then run briefly (set Bash tool timeout to 15000ms):
```bash
bun run dev
```

**For personal chat** (they chose option 1):

Personal chats are NOT synced to the database on startup — only groups are. Instead, ask the user for their phone number (with country code, no + or spaces, e.g. `14155551234`), then construct the JID as `{number}@s.whatsapp.net`.

**For group** (they chose option 2 or 3):

Groups are synced on startup via `groupFetchAllParticipating`. Query the database for recent groups:
```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE jid LIKE '%@g.us' AND jid != '__group_sync__' ORDER BY last_message_time DESC LIMIT 40"
```

Show only the **10 most recent** group names to the user and ask them to pick one. If they say their group isn't in the list, show the next batch from the results you already have. If they tell you the group name directly, look it up:
```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE name LIKE '%GROUP_NAME%' AND jid LIKE '%@g.us'"
```

### 6d. Write the configuration

Once you have the JID, configure it. No trigger prefix is required.

```json
{
  "JID_HERE": {
    "name": "main",
    "folder": "main",
    "trigger": "none",
    "added_at": "CURRENT_ISO_TIMESTAMP",
    "requiresTrigger": false
  }
}
```

Write to the database directly by creating a temporary registration script, or write `data/registered_groups.json` which will be auto-migrated on first run:

```bash
mkdir -p data
```

Then write `data/registered_groups.json` with the correct JID and timestamp.

Ensure the groups folder exists:
```bash
mkdir -p groups/main/logs
```

## 7. Configure External Directory Access (Mount Allowlist)

Ask the user:
> Do you want the agent to be able to access any directories **outside** the Gandalf project?
>
> Examples: Git repositories, project folders, documents you want Claude to work on.
>
> **Note:** This is optional. Without configuration, agents can only access their own group folders.

If **no**, create an empty allowlist to make this explicit:

```bash
mkdir -p ~/.config/gandalf
cat > ~/.config/gandalf/mount-allowlist.json << 'EOF'
{
  "allowedRoots": [],
  "blockedPatterns": [],
  "nonMainReadOnly": true
}
EOF
echo "Mount allowlist created - no external directories allowed"
```

Skip to the next step.

If **yes**, ask follow-up questions:

### 5a. Collect Directory Paths

Ask the user:
> Which directories do you want to allow access to?
>
> You can specify:
> - A parent folder like `~/projects` (allows access to anything inside)
> - Specific paths like `~/repos/my-app`
>
> List them one per line, or give me a comma-separated list.

For each directory they provide, ask:
> Should `[directory]` be **read-write** (agents can modify files) or **read-only**?
>
> Read-write is needed for: code changes, creating files, git commits
> Read-only is safer for: reference docs, config examples, templates

### 5b. Configure Non-Main Group Access

Ask the user:
> Should **non-main groups** (other WhatsApp chats you add later) be restricted to **read-only** access even if read-write is allowed for the directory?
>
> Recommended: **Yes** - this prevents other groups from modifying files even if you grant them access to a directory.

### 5c. Create the Allowlist

Create the allowlist file based on their answers:

```bash
mkdir -p ~/.config/gandalf
```

Then write the JSON file. Example for a user who wants `~/projects` (read-write) and `~/docs` (read-only) with non-main read-only:

```bash
cat > ~/.config/gandalf/mount-allowlist.json << 'EOF'
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true,
      "description": "Development projects"
    },
    {
      "path": "~/docs",
      "allowReadWrite": false,
      "description": "Reference documents"
    }
  ],
  "blockedPatterns": [],
  "nonMainReadOnly": true
}
EOF
```

Verify the file:

```bash
cat ~/.config/gandalf/mount-allowlist.json
```

Tell the user:
> Mount allowlist configured. The following directories are now accessible:
> - `~/projects` (read-write)
> - `~/docs` (read-only)
>
> **Security notes:**
> - Sensitive paths (`.ssh`, `.gnupg`, `.aws`, credentials) are always blocked
> - This config file is stored outside the project, so agents cannot modify it
> - Changes require restarting the Gandalf service
>
> To grant a group access to a directory, add it to the allowlist and restart the service.

## 6. Configure launchd Service

Generate the plist file with correct paths automatically:

```bash
BUN_PATH=$(which bun)
PROJECT_PATH=$(pwd)
HOME_PATH=$HOME

cat > ~/Library/LaunchAgents/com.gandalf.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gandalf</string>
    <key>ProgramArguments</key>
    <array>
        <string>${BUN_PATH}</string>
        <string>${PROJECT_PATH}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_PATH}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:${HOME_PATH}/.local/bin</string>
        <key>HOME</key>
        <string>${HOME_PATH}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${PROJECT_PATH}/logs/gandalf.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_PATH}/logs/gandalf.error.log</string>
</dict>
</plist>
EOF

echo "Created launchd plist with:"
echo "  Bun: ${BUN_PATH}"
echo "  Project: ${PROJECT_PATH}"
```

Build and start the service:

```bash
bun run build
mkdir -p logs
launchctl load ~/Library/LaunchAgents/com.gandalf.plist
```

Verify it's running:
```bash
launchctl list | grep gandalf
```

## 7. Test

Tell the user:
> Send `hello` in your registered chat and the agent should respond.

Check the logs:
```bash
tail -f logs/gandalf.log
```

The user should receive a response in WhatsApp.

## Troubleshooting

**Service not starting**: Check `logs/gandalf.error.log`

**No response to messages**:
- Verify the chat JID is registered
- Check that the chat JID is in the database: `sqlite3 store/messages.db "SELECT * FROM registered_groups"`
- Check `logs/gandalf.log` for errors

**WhatsApp disconnected**:
- The service will show a macOS notification
- Run `bun run auth` to re-authenticate
- Restart the service: `launchctl kickstart -k gui/$(id -u)/com.gandalf`

**Unload service**:
```bash
launchctl unload ~/Library/LaunchAgents/com.gandalf.plist
```
