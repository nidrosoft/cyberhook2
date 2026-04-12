import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // USERS & COMPANIES
  // ============================================

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    imageUrl: v.optional(v.string()),
    companyId: v.id("companies"),
    role: v.union(
      v.literal("sales_rep"),
      v.literal("sales_admin"),
      v.literal("billing")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("deactivated")
    ),
    timezone: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    inAppNotifications: v.optional(v.boolean()),
    slackNotifications: v.optional(v.boolean()),
    teamsNotifications: v.optional(v.boolean()),
    notificationFrequency: v.optional(v.string()),
    criticalAlertsOnly: v.optional(v.boolean()),
    // Guided tour (V2)
    guidedTourCompleted: v.optional(v.boolean()),
    guidedTourCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_companyId", ["companyId"])
    .index("by_status", ["status"]),

  companies: defineTable({
    name: v.string(),
    phone: v.string(),
    website: v.string(),
    logoUrl: v.optional(v.string()),
    // Business details
    primaryBusinessModel: v.string(),
    secondaryBusinessModel: v.optional(v.string()),
    annualRevenue: v.string(),
    geographicCoverage: v.array(v.string()),
    targetCustomerBase: v.array(v.string()),
    totalEmployees: v.string(),
    totalSalesPeople: v.string(),
    // V2 additions
    locationId: v.optional(v.string()),
    companyType: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    salesEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    salesPhone: v.optional(v.string()),
    salesTeamSize: v.optional(v.string()),
    // Multi-location support (V2)
    locations: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          address: v.optional(v.string()),
          city: v.optional(v.string()),
          state: v.optional(v.string()),
          country: v.optional(v.string()),
          zipCode: v.optional(v.string()),
          isHeadquarters: v.boolean(),
        })
      )
    ),
    // Brand & service area
    brandPrimaryColor: v.optional(v.string()),
    brandSecondaryColor: v.optional(v.string()),
    serviceArea: v.optional(v.array(v.string())),
    // Associations & programs
    associations: v.optional(v.array(v.string())),
    programs: v.optional(v.array(v.string())),
    // Legacy fields (kept for migration)
    country: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Settings
    defaultTimezone: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    mrrTarget: v.optional(v.number()),
    appointmentTarget: v.optional(v.number()),
    // Token system (legacy — kept for migration)
    tokenAllocation: v.number(),
    tokensUsed: v.number(),
    tokenResetDate: v.number(),
    // Plan-based usage tracking
    searchesUsed: v.optional(v.number()),
    reportsUsed: v.optional(v.number()),
    usageResetDate: v.optional(v.number()),
    planSelectedManually: v.optional(v.boolean()),
    // Stripe/Billing
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    planId: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    // Redrok API credentials
    redrokEmail: v.optional(v.string()),
    redrokPassword: v.optional(v.string()),
    redrokToken: v.optional(v.string()),
    redrokTokenExpiresAt: v.optional(v.number()),
    // Owner reference
    ownerId: v.optional(v.id("users")),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("pending_approval")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_name", ["name"]),

  // Team invitations
  invitations: defineTable({
    companyId: v.id("companies"),
    email: v.string(),
    role: v.union(
      v.literal("sales_rep"),
      v.literal("sales_admin"),
      v.literal("billing")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    invitedByUserId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // ============================================
  // LEADS & CONTACTS
  // ============================================

  leads: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    domain: v.string(),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    employeeCount: v.optional(v.string()),
    revenueRange: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    // Exposure data
    exposureCount: v.optional(v.number()),
    lastExposureDate: v.optional(v.number()),
    exposureSeverity: v.optional(v.string()),
    lastScanDate: v.optional(v.number()),
    // V2 Enrichment data
    enrichmentData: v.optional(
      v.object({
        headquarters: v.optional(v.string()),
        foundedYear: v.optional(v.number()),
        description: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        linkedinUrl: v.optional(v.string()),
        twitterUrl: v.optional(v.string()),
        facebookUrl: v.optional(v.string()),
        techStack: v.optional(v.array(v.string())),
        officeLocations: v.optional(
          v.array(
            v.object({
              address: v.optional(v.string()),
              city: v.optional(v.string()),
              state: v.optional(v.string()),
              country: v.optional(v.string()),
            })
          )
        ),
      })
    ),
    enrichedAt: v.optional(v.number()),
    enrichmentSource: v.optional(v.string()),
    // Source tracking
    source: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    // Status
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_createdBy", ["createdByUserId"])
    .index("by_domain", ["domain"])
    .searchIndex("search_name", { searchField: "name" }),

  contacts: defineTable({
    companyId: v.id("companies"),
    leadId: v.id("leads"),
    createdByUserId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    // Contact reveal tracking
    emailRevealed: v.optional(v.boolean()),
    emailRevealedAt: v.optional(v.number()),
    phoneRevealed: v.optional(v.boolean()),
    phoneRevealedAt: v.optional(v.number()),
    // Source
    source: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_leadId", ["leadId"]),

  // ============================================
  // SEARCHES & RESULTS
  // ============================================

  searches: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    tokensConsumed: v.number(),
    resultGuid: v.optional(v.string()),
    totalExposures: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_userId", ["userId"])
    .index("by_domain", ["domain"]),

  searchResults: defineTable({
    searchId: v.id("searches"),
    companyId: v.id("companies"),
    type: v.string(),
    severity: v.string(),
    source: v.optional(v.string()),
    detectedAt: v.optional(v.number()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    url: v.optional(v.string()),
    computerName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_searchId", ["searchId"])
    .index("by_companyId", ["companyId"]),

  // ============================================
  // WATCHLIST
  // ============================================

  watchlistItems: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    domain: v.string(),
    companyName: v.optional(v.string()),
    // Monitoring settings
    notifyByEmail: v.boolean(),
    monitoringWindow: v.number(), // 7, 30, or 90 days
    isPaused: v.optional(v.boolean()), // Whether monitoring is paused
    // Status
    hasNewExposures: v.boolean(),
    lastExposureDate: v.optional(v.number()),
    exposureCount: v.optional(v.number()),
    lastCheckedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_userId", ["userId"])
    .index("by_domain", ["domain"])
    .index("by_companyId_userId", ["companyId", "userId"]),

  // ============================================
  // RANSOM HUB (V2 Enhanced)
  // ============================================

  ransomIncidents: defineTable({
    companyName: v.string(),
    domain: v.optional(v.string()),
    industry: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    attackDate: v.number(),
    ransomwareGroup: v.optional(v.string()),
    // V2 additions
    incidentType: v.union(
      v.literal("ransomware"),
      v.literal("breach_notification")
    ),
    source: v.union(
      v.literal("ransomware_live"),
      v.literal("hhs_ocr"),
      v.literal("privacy_rights"),
      v.literal("california_ag"),
      v.literal("other")
    ),
    individualsAffected: v.optional(v.number()),
    breachType: v.optional(v.string()),
    breachVector: v.optional(v.string()),
    filedDate: v.optional(v.number()),
    // Metadata
    sourceUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_attackDate", ["attackDate"])
    .index("by_country", ["country"])
    .index("by_incidentType", ["incidentType"])
    .index("by_source", ["source"]),

  // ============================================
  // TASKS (To-Do List)
  // ============================================

  tasks: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    assignedToUserId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    status: v.union(v.literal("pending"), v.literal("completed")),
    // Linked entities
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
    linkedWatchlistId: v.optional(v.id("watchlistItems")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_assignedTo", ["assignedToUserId"])
    .index("by_status", ["status"])
    .index("by_dueDate", ["dueDate"]),

  // ============================================
  // CAMPAIGNS (AI Agents)
  // ============================================

  campaigns: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    // Cadence settings
    cadencePattern: v.optional(v.string()),
    sendingWindowStart: v.optional(v.string()),
    sendingWindowEnd: v.optional(v.string()),
    sendingDays: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    maxEmailsPerDay: v.optional(v.number()),
    minDelayBetweenSends: v.optional(v.number()),
    // Stats
    totalRecipients: v.optional(v.number()),
    emailsSent: v.optional(v.number()),
    emailsOpened: v.optional(v.number()),
    emailsClicked: v.optional(v.number()),
    // Template reference
    knowledgeBaseEntryId: v.optional(v.id("knowledgeBaseEntries")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_createdBy", ["createdByUserId"])
    .index("by_status", ["status"])
    .index("by_companyId_createdBy", ["companyId", "createdByUserId"]),

  campaignRecipients: defineTable({
    campaignId: v.id("campaigns"),
    companyId: v.id("companies"),
    contactId: v.optional(v.id("contacts")),
    leadId: v.optional(v.id("leads")),
    email: v.string(),
    name: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("unsubscribed")
    ),
    createdAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),

  campaignMessages: defineTable({
    campaignId: v.id("campaigns"),
    recipientId: v.id("campaignRecipients"),
    companyId: v.id("companies"),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("failed")
    ),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_status", ["status"]),

  // ============================================
  // KNOWLEDGE BASE (V2 - Replaces Scripts & Cadences)
  // ============================================

  knowledgeBaseEntries: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    type: v.union(
      v.literal("web_crawler"),
      v.literal("faq"),
      v.literal("rich_text"),
      v.literal("file_upload")
    ),
    // Web Crawler fields
    url: v.optional(v.string()),
    crawledContent: v.optional(v.string()),
    crawledAt: v.optional(v.number()),
    // FAQ fields
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    // Rich Text fields
    richTextContent: v.optional(v.string()),
    // File Upload fields
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileMimeType: v.optional(v.string()),
    // Scope
    scope: v.union(v.literal("global"), v.literal("personal")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_createdBy", ["createdByUserId"])
    .index("by_companyId_type", ["companyId", "type"])
    .index("by_scope", ["scope"])
    .searchIndex("search_name", { searchField: "name" }),

  // ============================================
  // RFP HUB (V2 New Module)
  // ============================================

  // Use Cases
  useCases: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    industry: v.optional(v.string()),
    headcount: v.optional(v.string()),
    revenue: v.optional(v.string()),
    problemStatement: v.optional(v.string()),
    scopeOfWork: v.optional(v.string()),
    howWeHelp: v.optional(v.string()),
    comparisonTable: v.optional(v.string()),
    valueAdds: v.optional(v.array(v.string())),
    isApprovedReference: v.boolean(),
    // Reference client info
    referenceCompanyName: v.optional(v.string()),
    referenceContactName: v.optional(v.string()),
    referenceContactEmail: v.optional(v.string()),
    referenceContactPhone: v.optional(v.string()),
    referenceIndustry: v.optional(v.string()),
    referenceWebsite: v.optional(v.string()),
    referenceProjectsSummary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_isApprovedReference", ["isApprovedReference"]),

  // Certifications
  certifications: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    category: v.union(
      v.literal("certification"),
      v.literal("insurance"),
      v.literal("award"),
      v.literal("accreditation"),
      v.literal("compliance"),
      v.literal("other")
    ),
    issuingAuthority: v.optional(v.string()),
    issueDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("pending"),
      v.literal("renewal_required")
    ),
    description: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
    documentFileId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_expiryDate", ["expiryDate"]),

  // RFP Tracker
  rfpEntries: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    clientProspect: v.string(),
    submissionDeadline: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("no_bid")
    ),
    assignedToUserId: v.optional(v.id("users")),
    assigneeName: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    rfpLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkedUseCaseId: v.optional(v.id("useCases")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_status", ["status"])
    .index("by_submissionDeadline", ["submissionDeadline"]),

  // RFP Answer Bank
  rfpAnswers: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    questionCategory: v.string(),
    answer: v.string(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_category", ["questionCategory"]),

  // RFP Quick Downloads
  rfpDownloads: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.optional(v.number()),
    fileMimeType: v.optional(v.string()),
    category: v.union(
      v.literal("capabilities_deck"),
      v.literal("security_whitepaper"),
      v.literal("compliance_evidence"),
      v.literal("insurance_certificate"),
      v.literal("case_studies"),
      v.literal("partner_overview"),
      v.literal("other")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_category", ["category"]),

  // ============================================
  // EVENTS & CALENDAR
  // ============================================

  events: defineTable({
    companyId: v.id("companies"),
    createdByUserId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("meeting"),
      v.literal("appointment"),
      v.literal("conference"),
      v.literal("webinar"),
      v.literal("call"),
      v.literal("trade_show"),
      v.literal("networking"),
      v.literal("workshop"),
      v.literal("lunch_and_learn"),
      v.literal("other")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    meetingUrl: v.optional(v.string()),
    // Organizer
    organizer: v.optional(v.string()),
    // Tickets
    ticketUrl: v.optional(v.string()),
    ticketCost: v.optional(v.number()),
    // Reminder
    reminderDate: v.optional(v.number()),
    // Archive
    isArchived: v.optional(v.boolean()),
    // Suggested events (admin-curated industry events)
    isSuggested: v.optional(v.boolean()),
    // Linked entities
    linkedLeadId: v.optional(v.id("leads")),
    linkedContactId: v.optional(v.id("contacts")),
    // Attendees
    attendeeUserIds: v.optional(v.array(v.id("users"))),
    // Calendar sync
    externalCalendarId: v.optional(v.string()),
    externalCalendarSource: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_createdBy", ["createdByUserId"])
    .index("by_startDate", ["startDate"])
    .index("by_type", ["type"])
    .index("by_companyId_startDate", ["companyId", "startDate"]),

  // ============================================
  // NOTIFICATIONS
  // ============================================

  notifications: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    // Link to related entity
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_companyId", ["companyId"]),

  // ============================================
  // INTEGRATIONS
  // ============================================

  integrations: defineTable({
    companyId: v.id("companies"),
    provider: v.union(
      v.literal("stripe"),
      v.literal("outlook_email"),
      v.literal("gmail"),
      v.literal("outlook_calendar"),
      v.literal("google_calendar"),
      v.literal("hubspot"),
      v.literal("ghl"),
      v.literal("teams"),
      v.literal("slack"),
      v.literal("linkedin"),
      v.literal("connectwise")
    ),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error")
    ),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    accountId: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    metadata: v.optional(v.string()),
    connectedByUserId: v.id("users"),
    connectedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_companyId_provider", ["companyId", "provider"]),

  // ============================================
  // AUDIT LOG
  // ============================================

  auditLogs: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_userId", ["userId"])
    .index("by_action", ["action"]),
});
