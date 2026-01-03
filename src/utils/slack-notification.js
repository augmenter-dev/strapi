const webhookUrl = process.env.SLACK_INCOMING_WEBHOOK_URL;

/**
 * Formats contact data into Slack Block Kit payload
 * @param {Object} contact - The contact entity
 * @returns {Object} Slack webhook payload
 */
function formatSlackBlocks(contact) {
  const isSponsorship = contact.sponsorshipInquiry === true;
  const emoji = isSponsorship ? "🤝" : "📬";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${isSponsorship ? "Sponsorship Inquiry" : "New Contact Submission"}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:*\n${contact.firstname || ""} ${contact.lastname || ""}`.trim(),
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${contact.email || ""}`,
        },
      ],
    },
  ];

  // Add company info if present
  if (contact.companyName || contact.companyWebsite) {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Company:*\n${contact.companyName || "N/A"}`,
        },
        {
          type: "mrkdwn",
          text: `*Website:*\n${contact.companyWebsite || "N/A"}`,
        },
      ],
    });
  }

  // Add source if present
  if (contact.source) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Source:* ${contact.source}`,
      },
    });
  }

  // Divider
  blocks.push({ type: "divider" });

  // Sponsorship details
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Sponsorship Inquiry:* ${isSponsorship ? "Yes" : "No"}`,
      },
    ],
  });

  // Add budget for sponsorships
  if (isSponsorship && contact.budgetRange) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Budget Range:* ${contact.budgetRange.replace(/-/g, " ").replace(/from|to|above/g, "$& ")}`,
        },
      ],
    });
  }

  // Add additional info if present
  if (contact.additionalInfo) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Additional Info:*\n${contact.additionalInfo}`,
      },
    });
  }

  return { blocks };
}

/**
 * Sends a contact notification to Slack via incoming webhook
 * @param {Object} contact - The contact entity to notify about
 */
module.exports = async (contact) => {
  if (!webhookUrl) {
    console.warn("[Slack] SLACK_INCOMING_WEBHOOK_URL not configured, skipping notification");
    return;
  }

  if (!contact) {
    console.warn("[Slack] No contact data provided, skipping notification");
    return;
  }

  try {
    const payload = formatSlackBlocks(contact);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Slack] Webhook failed: ${response.status} ${response.statusText}`);
      return;
    }

    console.log(`[Slack] Contact notification sent for ${contact.email}`);
  } catch (error) {
    console.error("[Slack] Error sending notification:", error.message);
  }
};
