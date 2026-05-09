Implement improvements for the WhatsApp audio bridge (VPS) and enhance the Google Contacts sync UI.

### Technical Details
- Add `cors` to `package.json` and the VPS bridge script to allow cross-origin requests.
- Improve `scripts/vps-whatsapp-bridge.js` with better file extension handling and more detailed logging.
- Update `src/pages/CRM.tsx` to make Google Sync options more prominent and improve VPS error reporting.
- Provide clear commands for the user to update and restart their VPS server.

### Steps
1. **Update dependencies**: Add `cors` to `package.json`.
2. **Refine VPS Bridge**: Update `scripts/vps-whatsapp-bridge.js` to include CORS middleware, use proper temporary file extensions, and add detailed console logs for debugging.
3. **Enhance UI**:
    - Make the "Google Contacts" connection and "Auto-Sync" switch more visible in the Contacts tab.
    - Add a validation in `CRM.tsx` to warn about Mixed Content (HTTP vs HTTPS) when using the VPS transcoder.
4. **Finalize**: Provide instructions for the user to sync changes to their VPS and restart the service.