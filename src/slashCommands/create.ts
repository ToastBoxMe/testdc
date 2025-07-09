import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import webhookClient from "../index";
import production_url from "../index"; // ✅ kept as you requested

const createCommand: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Start Workflow and Create...")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Project Name")
        .setRequired(true) // ✅ required
    ),

  execute: async (interaction) => {
    // ✅ Use hardcoded production_url
    const baseUrl = production_url;

    let title = "";

    for (const opt of interaction.options.data) {
      if (opt.name === "title" && opt.value) {
        title = String(opt.value);
      }
    }

    const query = new URLSearchParams();
    if (title) query.append("title", title);

    const finalUrl = query.toString() ? `${baseUrl}?${query}` : baseUrl;

    console.log("📥 Interaction Received:", {
      user: interaction.user.tag,
      command: interaction.commandName,
      finalUrl
    });

    await interaction.deferReply({ ephemeral: true });

    try {
      const res = await fetch(finalUrl);
      const contentType = res.headers.get("content-type");

      console.log(`🌐 Fetched URL: ${finalUrl}`);
      console.log(`↩️ Response status: ${res.status} ${res.statusText}`);
      console.log(`📄 Content-Type: ${contentType}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      let text: string;
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await res.text();
      }

      console.log("📝 Raw fetched content:", text.length > 500 ? text.slice(0, 500) + "...[truncated]" : text);

      if (text.length > 1900) {
        text = text.slice(0, 1900) + "\n...[truncated]";
      }

      const webhookMessage = await webhookClient.send({
        content: `📡 Fetched content from: ${finalUrl}`,
        embeds: [
          new EmbedBuilder()
            .setTitle(`✅ Webhook successfully sent`)
            .setDescription(`\`\`\`\n${title} Workflow Started\n\`\`\``)
            .setColor(0x00aaff)
        ],
        fetchReply: true
      });

      if (webhookMessage?.id) {
        console.log("📤 Webhook message sent:", {
          id: webhookMessage.id,
          url: webhookMessage.url,
          channelId: webhookMessage.channel?.id
        });
      } else {
        console.warn("⚠️ Webhook sent, but no message object was returned.");
      }

      const replyLines = [
        `✅ Webhook successfully sent\n📡 Fetched content from: \`${finalUrl}\``
      ];

      if (webhookMessage?.url) {
        replyLines.push(`🔗 [Jump to Webhook Message](${webhookMessage.url})`);
      }
      console.log("🔍 webhookMessage.url:", webhookMessage?.url);

      await interaction.editReply({ content: replyLines.join("\n") });

    } catch (error: any) {
      console.error("❌ Fetch or send error:", error);
      await interaction.editReply({
        content: `❌ Failed to fetch from URL: ${error.message}`
      });
    }
  },

  cooldown: 3
};

export default createCommand;
