/** Vertaalt foutcodes van Supabase Auth naar begrijpelijke meldingen. Lekt geen interne details. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "E-mailadres of wachtwoord klopt niet.";
    case "email_not_confirmed":
      return "Bevestig eerst je e-mailadres via de link in de e-mail die we je stuurden.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Te veel pogingen. Wacht even en probeer het opnieuw.";
    case "weak_password":
      return "Dit wachtwoord is te zwak. Kies een langer of minder voorspelbaar wachtwoord.";
    case "same_password":
      return "Kies een ander wachtwoord dan je huidige.";
    case "signup_disabled":
      return "Registreren is op dit moment niet mogelijk.";
    case "otp_expired":
      return "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.";
    default:
      if (error?.status === 429) return "Te veel pogingen. Wacht even en probeer het opnieuw.";
      return "Er ging iets mis. Probeer het later opnieuw.";
  }
}
