Fixing the WhatsApp audio sending issue by ensuring the VPS bridge is properly configured and used.

### 1. Refine VPS Transcoder Script
The script at `scripts/vps-whatsapp-bridge.js` will be updated with:
- Better logging for every step (download, transcode, upload, send).
- Explicit 48kHz sampling and mono channel for maximum WhatsApp compatibility.
- Added a "Health Check" route that returns the IP and status for easy verification.

### 2. Improve CRM UI & Feedback
- Add a visual indicator in the Chat interface showing if the "Professional Transcoder (VPS)" is active.
- If the VPS URL is missing, show a warning badge near the microphone icon.
- Improve the "Mixed Content" warning logic to be more proactive.

### 3. Settings Tab Enhancements
- Add a "Test Connection" button next to the VPS URL field in the Settings tab to let the user verify if the CRM can reach the VPS.

### Technical Details:
- The VPS script uses `ffmpeg` with `libopus` to generate a true OGG file.
- The `CRM.tsx` uses `fetch` to communicate with the VPS.
- I will ensure the script handles the 2-second delay correctly to avoid Meta's "media not found" errors.

---
**Note:** The user must manually update the file on their VPS and run `pm2 restart whatsapp-audio`. They also need to make sure `vps_transcoder_url` is filled in the CRM Settings.