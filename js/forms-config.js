// Where each form sends its submissions.
//
// Paste a form-service URL for each form (for example a Formspree, Basin or
// Web3Forms endpoint). While an endpoint is empty the form runs in PREVIEW MODE:
// it validates and shows a thank-you message that says nothing was sent.
//
// The intake form collects sensitive details (date of birth, address, counseling
// concerns). Pick a service/plan that suits that, and see NOTES.md.
window.FORGE_FORMS = {
  endpoints: {
    intake: '',
    leader: '',
    groups: '',
    newsletter: '',
  },
  // Shown if a submission fails, so the visitor can still reach someone.
  fallbackEmail: 'info@theforge.org',
  fallbackPhone: '(913) 214-6914',
};
