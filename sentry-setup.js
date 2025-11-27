const Sentry = require("@sentry/node");

const SENTRY_DSN = "https://a57e73b37f9be504aedf52664869f5d6@o1162014.ingest.us.sentry.io/4510379222433793";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Adjust release/environment as needed (GitHub Actions will set this up later)
    // environment: process.env.NODE_ENV || 'development', 
    // release: process.env.COMMIT_SHA || 'local',
    tracesSampleRate: 1.0, 
    sendDefaultPii: true,
  });

  console.log('Sentry initialized successfully.');
// --- Sentry Verification Code Added Here ---
  try {
    Sentry.setTag("verification_check", "initialization_test");
    // console.log('\n[Sentry Check] Attempting to throw and capture a test error...');
    foo(); 
  } catch (e) {
    Sentry.captureException(e);
    console.log(`[Sentry Check] Successfully captured error: ${e.message}`);

    Sentry.flush(2000)
        .then(() => console.log("[Sentry Check] Event sent to Sentry."))
        .catch(() => console.error("[Sentry Check] Failed to flush Sentry event."));
  }

} else {
  console.log('SENTRY_DSN not found. Sentry disabled.');
}

process.on('uncaughtException', (err) => {
    Sentry.captureException(err);
    console.error('Uncaught Exception captured by Sentry:', err.message);
    // Note: In CI, you might want to exit process after reporting.
});