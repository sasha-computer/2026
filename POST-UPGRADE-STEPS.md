# After macOS Tahoe Upgrade - Complete NanoClaw Setup

## 1. Install Apple Container
```bash
brew install container
container system start
```

## 2. Build the NanoClaw agent container image
```bash
cd ~/nanoclaw
./container/build.sh
```

## 3. Test NanoClaw
```bash
cd ~/nanoclaw
npm run start
```
You should see "Connected to Discord" and "NanoClaw running on Discord" in the logs.
Send a message in any channel in your Gymnasium server to test.

## 4. Install as launchd service (auto-start on boot)
```bash
cd ~/nanoclaw
# Fill in the plist template
sed -e "s|{{NODE_PATH}}|$(which node)|g" \
    -e "s|{{PROJECT_ROOT}}|$(pwd)|g" \
    -e "s|{{HOME}}|$HOME|g" \
    -e "s|{{DISCORD_BOT_TOKEN}}|$(grep DISCORD_BOT_TOKEN .env | cut -d= -f2)|g" \
    -e "s|{{DISCORD_GUILD_ID}}|$(grep DISCORD_GUILD_ID .env | cut -d= -f2)|g" \
    -e "s|{{DISCORD_MAIN_CHANNEL_ID}}|$(grep DISCORD_MAIN_CHANNEL_ID .env | cut -d= -f2)|g" \
    launchd/com.nanoclaw.plist > ~/Library/LaunchAgents/com.nanoclaw.plist

# Load the service
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

## Config summary
- Bot: Gandalf#1198
- Guild: Gymnasium (1468650752321785959)
- Main channel: local-openclaw (1469270839542288445)
- All channels respond without @mention
- Threads and forum posts get their own context
