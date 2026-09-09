import { CANONICAL_HOST, OPEN_GRAPH_TITLE, SITE_DISPLAY_NAME } from "@/lib/site-url"

const DEFAULT_TITLE = OPEN_GRAPH_TITLE

function dedupeKeywords(words: string[]): string[] {
  const seen = new Set<string>()
  return words.filter((w) => {
    const key = w.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Priority phrases for Wex Health / HSA FSA benefits login intent. */
export const USER_SUPPLIED_KEYWORDS = [
  "wex",
  "wex health",
  "wex login",
  "wex benefits",
  "wex benefits login",
  "wex health login",
  "we benefit login",
  "benefitslogin.wexhealth.com benefitslogin.wexhealth.com",
  "wexhealth login",
  "wex hsa",
  "wex hsa login",
  "benefitslogin.wexhealth.com",
  "wexhealth",
  "benefit-wexhealth.com",
  "www.benefit-wexhealth.com",
  "wex health HSA",
  "wex health FSA",
  "wex health benefits",
  "benefits by wex",
  "wex HSA login",
  "wex FSA login",
  "wex health participant portal",
  "discovery benefits wex",
] as const

/**
 * Keywords derived from LOGIN_REDIRECT_URL metadata + portal copy
 * https://benefitslogin.wexhealth.com/Login.aspx?ReturnUrl=%2f
 * Title: "Login - WEX Health Inc"; UI: Existing User, Username, Remember Me, Next;
 * Footer: Participant Services (866) 451-3399, Powered by WEX Health;
 * Related portals: mybenefits.wexhealth.com (benefitexpress), www.wexhealth.com (WEX Benefits).
 * Additive only — remaps destination wording onto this site’s brand/host.
 */
export const DESTINATION_KEYWORDS = [
  "benefitslogin.wexhealth.com",
  "benefitslogin.wexhealth.com login",
  "Login.aspx",
  "Login.aspx?ReturnUrl=%2f",
  "Login - WEX Health Inc",
  "WEX Health Inc",
  "WEX Health Inc login",
  "Login WEX Health Inc",
  "Existing User",
  "Existing User login",
  "Existing Users",
  "New Users",
  "New User",
  "Get Started",
  "Remember Me",
  "Username",
  "Username required",
  "Next",
  "Skip to content",
  "Wex Health member website login",
  "Wex Health benefitslogin",
  "benefitslogin wex health",
  "benefit-wexhealth.com Wex Health login",
  "www.benefit-wexhealth.com Wex Health login",
  "benefitslogin.wexhealth.com Username",
  "benefitslogin.wexhealth.com Existing User",
  "benefitslogin.wexhealth.com Remember Me",
  "benefitslogin.wexhealth.com Get Started",
  "Powered by WEX Health",
  "Participant Services",
  "Participant Services WEX",
  "Call Participant Services",
  "866-451-3399",
  "(866) 451-3399",
  "loginassistance.wexhealth",
  "benefitslogin.wexhealth.com loginassistance",
  "WEX Benefits",
  "WEX Benefits login",
  "Generic Login WEX Benefits",
  "mybenefits.wexhealth.com",
  "mybenefits.wexhealth.com login",
  "benefitexpress",
  "benefitexpress login",
  "benefitexpress Business Party",
  "benefitexpress WEX Health",
  "benefit account",
  "benefit account login",
  "benefit account(s)",
  "file a claim",
  "view account balance",
  "account balance and summary",
  "direct deposit benefits",
  "FREE direct deposit",
  "email notifications benefits",
  "single source benefit account",
  "WEX Health benefit accounts",
  "Wex Health Existing User login",
  "Wex Health New Users Get Started",
  "sign in to WEX Health Inc",
  "log in to benefitslogin.wexhealth.com",
  "access WEX Health benefits account",
  "WEX Health Inc participant portal",
  "WEX Health Inc HSA FSA login",
] as const

/**
 * SEO keywords — Wex Health / HSA FSA / final portal URL intents.
 * Final egress: https://benefitslogin.wexhealth.com/Login.aspx?ReturnUrl=%2f
 */
export const SITE_SEO_KEYWORDS = dedupeKeywords([
  "Wex Health",
  "WEX Health",
  "WEX",
  SITE_DISPLAY_NAME,
  CANONICAL_HOST,
  "www.benefit-wexhealth.com",
  "benefit-wexhealth.com",
  "benefit-wexhealth.com login",
  "www.benefit-wexhealth.com login",
  "health benefits",
  "HSA login",
  "FSA login",
  "health savings account",
  "flexible spending account",
  "employee benefits",
  DEFAULT_TITLE,
  "Wex Health login",
  "WEX Health login",
  "Wex Health HSA",
  "Wex Health FSA",
  "Wex Health HSA login",
  "Wex Health FSA login",
  "benefitslogin.wexhealth.com",
  "benefitslogin.wexhealth.com login",
  "benefitslogin.wexhealth.com Login.aspx",
  "Login.aspx Wex Health",
  "Wex Health Login.aspx",
  "WEX HSA login",
  "WEX FSA login",
  "WEX COBRA login",
  "HRA login",
  "health reimbursement arrangement",
  "commuter benefits Wex Health",
  "dependent care FSA WEX",
  "employee health benefits login",
  "employer health benefits portal",
  "benefits account login",
  "health benefits member portal",
  "Wex Health employee benefits",
  "WEX employee benefits login",
  "Wex Health benefits portal",
  "sign in",
  "log on",
  "forgot password",
  "reset password",
  "verify identity",
  "access code",
  "health benefits sign in",
  "Wex Health portal",
  "Wex Health open enrollment",
  "employee benefits portal",
  "employee benefits login",
  "open enrollment login",
  "health benefits login",
  ...USER_SUPPLIED_KEYWORDS,
  ...DESTINATION_KEYWORDS,
])

/** Alias used by CrawlerSeoPage / shared SEO body copy. */
export const SITE_KEYWORDS = SITE_SEO_KEYWORDS
