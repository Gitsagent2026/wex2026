/**
 * Comprehensive SEO Configuration
 * Based on YouTube SEO best practices and modern on-page optimization
 * Covers: Keywords, Schema Markup, Meta Tags, FAQ, Internal Linking, Analytics Tracking
 */

import { SITE_DISPLAY_NAME, SITE_ORIGIN, SITE_HOMEPAGE_CANONICAL } from "./site-url"

// ============================================================================
// 1. ENHANCED KEYWORD STRATEGY (Long-tail, Intent-based, Conversational)
// ============================================================================

export const LONG_TAIL_KEYWORDS = [
  // Informational (How-to, guides)
  "how to sign in to wex health benefits",
  "how to access my hsa account",
  "how to reset wex health password",
  "how to verify identity on wex benefits",
  "how to set up two-factor authentication wex",
  "how to find my wex health user id",
  
  // Transactional (Action-oriented)
  "wex health benefits login page",
  "sign in to wex health account",
  "access hsa fsa benefits online",
  "wex health secure login",
  "wex benefits portal access",
  
  // Local/Emergency
  "wex health support phone number",
  "wex health participant services contact",
  "wex health login help",
  "wex health password recovery",
  "wex health account locked",
  
  // Long-tail variants
  "wex health hsa fsa login two step verification",
  "how do i access my wex health benefits account",
  "what is my wex health user id",
  "wex health benefits sign in not working",
  "can't log into wex health account",
  "wex health login forgot password",
  "wex health secure sign in process",
  "manage hsa fsa account wex health",
  "view balance wex health benefits",
  "wex health direct deposit setup",
]

export const QUESTION_KEYWORDS = [
  "what is wex health",
  "what is an hsa vs fsa",
  "what benefits can i access",
  "where do i log in to wex",
  "when was my account created",
  "why can't i log into wex health",
  "is wex health secure",
  "can i use my benefits immediately",
  "how much can i contribute to hsa",
  "what documents do i need to verify",
]

export const SEMANTIC_KEYWORDS = [
  // Core benefit types
  "health savings account login",
  "flexible spending account access",
  "hsa fsa benefits management",
  "employee benefits portal",
  "workplace benefits platform",
  
  // Security/Trust
  "secure benefits login",
  "encrypted health account access",
  "two-factor authentication benefits",
  "identity verification login",
  
  // Use-case based
  "check benefit balance online",
  "claim reimbursement benefits",
  "dependent care account login",
  "cobra health continuation coverage",
  "commuter benefits management",
]

export const ALL_SEO_KEYWORDS = [
  ...LONG_TAIL_KEYWORDS,
  ...QUESTION_KEYWORDS,
  ...SEMANTIC_KEYWORDS,
]

// ============================================================================
// 2. SCHEMA MARKUP (JSON-LD) - STRUCTURED DATA
// ============================================================================

export interface SchemaMarkupConfig {
  organization: Record<string, any>
  website: Record<string, any>
  localBusiness: Record<string, any>
  faqPage: Record<string, any>
  breadcrumb: Record<string, any>
}

export const SCHEMA_MARKUP: SchemaMarkupConfig = {
  // Organization schema - establishes brand identity
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_DISPLAY_NAME,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/wex-logo-official.jpg`,
    description: "Wex Health benefits management platform for HSA, FSA, and employee benefits",
    sameAs: [
      "https://www.wexhealth.com",
      "https://mybenefits.wexhealth.com",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      telephone: "(866) 451-3399",
      url: "https://wexhealthinc.my.site.com/WEXbenefitscontactus/s/",
    },
  },

  // Website schema - improves SERP appearance
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_DISPLAY_NAME,
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },

  // Local business schema - adds phone, address if available
  localBusiness: {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: SITE_DISPLAY_NAME,
    url: SITE_ORIGIN,
    telephone: "(866) 451-3399",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "(866) 451-3399",
      availableLanguage: ["en"],
    },
  },

  // FAQ schema - rich snippet for featured snippets
  faqPage: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I sign in to my Wex Health benefits account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enter your User ID on the login page, then your password. Complete two-step verification using email or text message to access your HSA, FSA, or other benefits.",
        },
      },
      {
        "@type": "Question",
        name: "What is an HSA (Health Savings Account)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "An HSA is a tax-advantaged savings account that lets you set aside money for qualified medical expenses. Contributions are tax-deductible and unused funds roll over annually.",
        },
      },
      {
        "@type": "Question",
        name: "What is an FSA (Flexible Spending Account)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "An FSA is an employer-sponsored benefit that allows employees to contribute pre-tax income for eligible medical and dependent care expenses.",
        },
      },
      {
        "@type": "Question",
        name: "How do I reset my password if I forgot it?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Click 'Forgot Password?' on the login page. Enter your User ID and last name, then verify your identity using email or SMS. Follow the link to create a new password.",
        },
      },
      {
        "@type": "Question",
        name: "Is my Wex Health account secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Wex Health uses industry-standard encryption, two-step verification, and HIPAA-compliant security to protect your personal and financial information.",
        },
      },
    ],
  },

  // Breadcrumb schema - helps navigation
  breadcrumb: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sign In",
        item: `${SITE_ORIGIN}/`,
      },
    ],
  },
}

// ============================================================================
// 3. ENHANCED META DESCRIPTIONS (Page-specific, optimized for CTR)
// ============================================================================

export const META_DESCRIPTIONS = {
  homepage: "Wex Health Benefits Sign-In | HSA & FSA Access. Securely sign in to manage your health savings, FSA, and employee benefits with two-step verification.",
  
  forgot_password: "Wex Health Password Reset | Recover Your Account. Quickly reset your Wex Health password using email or SMS verification.",
  
  verification_method: "Wex Health Identity Verification | Secure Login. Choose email or text message to verify your identity and access benefits.",
  
  enter_code: "Wex Health Two-Factor Authentication | OTP Verification. Enter your verification code to complete secure login to Wex benefits.",
  
  get_started: "Create Wex Health Account | New Member Registration. Register for your Wex Health account to access HSA, FSA, and employee benefits.",
}

// ============================================================================
// 4. OPEN GRAPH & SOCIAL METADATA
// ============================================================================

export const SOCIAL_METADATA = {
  og: {
    type: "website",
    locale: "en_US",
    site_name: SITE_DISPLAY_NAME,
    image: `${SITE_ORIGIN}/og-image.png`,
    image_width: "1200",
    image_height: "630",
    image_type: "image/png",
  },
  
  twitter: {
    card: "summary_large_image",
    creator: "@WEXHealth",
    site: "@WEXHealth",
  },
}

// ============================================================================
// 5. INTERNAL LINKING STRATEGY
// ============================================================================

export const INTERNAL_LINKS = {
  homepage: {
    primary: [
      { href: "/#returning-member", text: "Sign In", anchor: "Returning Member" },
      { href: "/#first-time-access", text: "Get Started", anchor: "First-Time Access" },
      { href: "https://wexhealthinc.my.site.com/WEXbenefitscontactus/s/", text: "Contact Support" },
    ],
    secondary: [
      { href: "#", text: "Recover User ID", rel: "help" },
      { href: "#", text: "Reset Password", rel: "help" },
      { href: "#", text: "HSA Information", rel: "info" },
      { href: "#", text: "FSA Information", rel: "info" },
    ],
  },
  
  related_pages: [
    { url: "https://www.wexhealth.com", text: "WEX Health Main Site", rel: "related" },
    { url: "https://mybenefits.wexhealth.com", text: "MyBenefits Portal", rel: "related" },
  ],
}

// ============================================================================
// 6. ENGAGEMENT OPTIMIZATION
// ============================================================================

export const ENGAGEMENT_HOOKS = {
  // Call-to-Action copy
  ctas: {
    sign_in: "Sign In Securely",
    get_started: "Begin Your Journey",
    help: "Need Help? Contact Support",
  },

  // User engagement signals to track
  tracking_events: [
    "page_load",           // Page entry (watch time equivalent)
    "form_interaction",    // Username/password focus (engagement)
    "verification_sent",   // Verification code requested
    "login_completed",     // Successful login
    "help_clicked",        // User seeks help (bounce prevention)
    "contact_support",     // High intent action
  ],

  // Retention strategies
  retention_tactics: {
    hook_timing: "First 3 seconds - Show security badge and trust signals",
    pattern_interrupt: "Use visual changes in verification steps",
    preview: "Show balance/account info preview after successful login",
    cta_timing: "Place sign-in CTA above the fold",
  },
}

// ============================================================================
// 7. ANALYTICS HOOKS (Equivalent to YouTube watch time tracking)
// ============================================================================

export const ANALYTICS_CONFIG = {
  metrics_to_track: {
    engagement: [
      "time_on_page",          // Watch time equivalent
      "form_completion_rate",  // Conversion funnel
      "help_clicks",           // Bounce prevention
      "verification_attempts", // User persistence
      "exit_rate_by_step",     // Retention by step
    ],
    
    seo: [
      "organic_traffic",
      "keyword_rankings",
      "click_through_rate",
      "search_impressions",
      "bounce_rate",
    ],
  },

  // Events to trigger updates
  update_triggers: [
    "Low CTR on meta title/description",
    "High bounce rate on specific pages",
    "Low form completion rates",
    "High exit rates on verification step",
  ],

  // Improvement recommendations
  optimization_checklist: [
    "A/B test meta descriptions for higher CTR",
    "Analyze exit pages and add contextual help",
    "Improve first-step UX to increase progression",
    "Add progress indicators to show completion %",
    "Implement live chat for verification help",
  ],
}

// ============================================================================
// 8. TECHNICAL SEO CHECKLIST
// ============================================================================

export const TECHNICAL_SEO = {
  robots_txt: {
    allow: ["/"],
    disallow: ["/api/", "/admin/"],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  },

  sitemap_config: {
    pages: [
      {
        url: SITE_ORIGIN,
        changefreq: "weekly",
        priority: "1.0",
        lastmod: new Date().toISOString(),
      },
      {
        url: `${SITE_ORIGIN}/`,
        changefreq: "daily",
        priority: "0.9",
      },
    ],
  },

  headers: {
    "X-UA-Compatible": "IE=edge",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },

  performance: {
    target_lcp: "2.5s",           // Largest Contentful Paint
    target_fid: "100ms",          // First Input Delay
    target_cls: "0.1",            // Cumulative Layout Shift
    image_optimization: "Use Next.js Image component with lazy loading",
    font_optimization: "Use system fonts or preload Google Fonts",
  },
}

// ============================================================================
// 9. CONTENT STRATEGY (Keywords by page/intent)
// ============================================================================

export const CONTENT_STRATEGY = {
  homepage: {
    primary_intent: "Login to benefits",
    keywords: [
      "wex health login",
      "hsa fsa access",
      "benefits sign in",
      "secure login verification",
    ],
    h1: "Access Your Wex Health Benefits Securely",
    sections: [
      { heading: "h2", text: "Returning Members Sign In" },
      { heading: "h2", text: "New to Wex Health? Get Started" },
      { heading: "h2", text: "Need Help? We're Here" },
    ],
  },

  forgot_password: {
    primary_intent: "Password recovery",
    keywords: [
      "forgot password wex",
      "reset wex health password",
      "password recovery",
    ],
  },

  verification: {
    primary_intent: "Identity verification",
    keywords: [
      "two factor authentication",
      "identity verification",
      "secure verification",
    ],
  },
}

// ============================================================================
// 10. PERFORMANCE & INDEXING
// ============================================================================

export const INDEXING_CONFIG = {
  // IndexNow: Instant index notification
  indexnow: {
    enabled: true,
    key: "3e87f70a4a9c4f078d8caa2045002e9a",
    api_endpoint: "https://api.indexnow.org/indexnow",
  },

  // Sitemap submission
  sitemap: {
    google_search_console: `${SITE_ORIGIN}/sitemap.xml`,
    bing_webmaster: `${SITE_ORIGIN}/sitemap.xml`,
  },

  // Crawl budget optimization
  crawl_optimization: {
    compress_html: true,
    minimize_redirects: true,
    internal_link_limit: 100,
    nofollow_external: false,
  },
}

// ============================================================================
// 11. MONITORING & ITERATION (YouTube Analytics equivalent)
// ============================================================================

export const MONITORING_CHECKLIST = {
  weekly: [
    "Check Google Search Console for new keywords",
    "Monitor CTR and impressions by query",
    "Review bounce rate by landing page",
    "Check for indexing errors",
  ],

  monthly: [
    "Analyze keyword ranking changes",
    "Review traffic trends and sources",
    "Audit broken internal links",
    "Update underperforming meta descriptions",
    "Test and optimize CTA placement",
  ],

  quarterly: [
    "Comprehensive keyword gap analysis",
    "Competitor analysis and benchmarking",
    "Content refresh and update strategy",
    "Schema markup validation",
    "Core Web Vitals optimization",
  ],
}

// ============================================================================
// 12. EXPORT COMBINED CONFIG
// ============================================================================

export const COMPREHENSIVE_SEO_CONFIG = {
  keywords: ALL_SEO_KEYWORDS,
  longTailKeywords: LONG_TAIL_KEYWORDS,
  questionKeywords: QUESTION_KEYWORDS,
  semanticKeywords: SEMANTIC_KEYWORDS,
  schema: SCHEMA_MARKUP,
  descriptions: META_DESCRIPTIONS,
  social: SOCIAL_METADATA,
  internalLinks: INTERNAL_LINKS,
  engagement: ENGAGEMENT_HOOKS,
  analytics: ANALYTICS_CONFIG,
  technical: TECHNICAL_SEO,
  content: CONTENT_STRATEGY,
  indexing: INDEXING_CONFIG,
  monitoring: MONITORING_CHECKLIST,
}

export default COMPREHENSIVE_SEO_CONFIG
