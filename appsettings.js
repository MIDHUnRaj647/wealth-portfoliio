/**
 * MI-AS Wealth - Application Settings
 * 
 * Edit this file to configure your security credentials and default application variables.
 * This file works across local file access (file:///) and web servers (http/https).
 */

const APP_SETTINGS = {
    /**
     * Application Name
     */
    appName: "MI-AS Wealth",

    /**
     * SHA-256 hash of your secret vault passphrase.
     * Password: MIAS2026
     */
    hashedPin: "e4c34ca88e8f408f689355c9a4be96951b7b89fee7985c9cb910e157b7d16fc0",

    /**
     * Optional hint displayed when an incorrect passphrase is typed.
     * Set to "" or null to hide the hint completely for maximum security.
     */
    passcodeHint: "",

    /**
     * Destination email for automated FD maturity, RD reminders, SIP reminders, and LIC premium due alerts
     */
    alertEmail: "midhunmoorthiyedam@gmail.com",

    /**
     * Baseline fallback gold price in ₹ per gram (approximate live market rate).
     */
    defaultGoldRate: 14438,

    /**
     * Supabase Cloud Realtime Database Configuration
     * Project: heypjrfnuiazhfgcvoyg
     */
    supabaseUrl: "https://heypjrfnuiazhfgcvoyg.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhleXBqcmZudWlhemhmZ2N2b3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTc2NTEsImV4cCI6MjEwODQzMzY1MX0.GuE625R09QLg5jIBIJC32Qm5fGpu7AqqEh8oFIhQR0M"
};

// Expose to window for global access
if (typeof window !== 'undefined') {
    window.APP_SETTINGS = APP_SETTINGS;
}
